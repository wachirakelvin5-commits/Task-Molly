#!/usr/bin/env node
// Finds the outside services Task Molly's code connects to and flags any that aren't
// listed in ../connections.json, so new tools get added to the cost inventory.
//
//   node .claude/skills/ops-cost/scripts/scan-connections.mjs          # full report
//   node .claude/skills/ops-cost/scripts/scan-connections.mjs --ci     # only new items, as GitHub warnings
//
// Always exits 0: a new connection is something to review, not a broken build.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const config = JSON.parse(fs.readFileSync(path.join(here, '../connections.json'), 'utf8'));
const ci = process.argv.includes('--ci');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.claude', 'tests']);
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.html', '.vue', '.svelte', '.css']);
// Files that usually mean a new place the app is hosted or deployed.
const INFRA_FILES = [
  'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'Procfile', 'app.yaml', 'apphosting.yaml',
  'cloudbuild.yaml', 'cloudbuild.json', 'wrangler.toml', 'wrangler.json', 'wrangler.jsonc', 'vercel.json',
  'netlify.toml', 'fly.toml', 'render.yaml', 'railway.json', 'railway.toml', '.firebaserc', 'supabase/config.toml',
  'amplify.yml', 'serverless.yml', 'functions/package.json',
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name) || entry.name.endsWith('.d.ts')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const rel = (f) => path.relative(root, f).split(path.sep).join('/');
const found = { packages: new Map(), hosts: new Map(), env: new Map(), actions: new Map(), secrets: new Map(), files: new Map() };
const note = (kind, item, where) => {
  if (!found[kind].has(item)) found[kind].set(item, new Set());
  found[kind].get(item).add(where);
};

const files = walk(root);

// npm packages (every package.json outside node_modules)
for (const f of files.filter((f) => path.basename(f) === 'package.json')) {
  const pkg = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies })) {
    note('packages', name, rel(f));
  }
}

// hosts and environment variables in code
const HOST_RE = /\bhttps?:\/\/(?:[^\s/'"`@]+@)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|localhost|127\.0\.0\.1)/g;
const WSS_RE = /\bwss?:\/\/(?:[^\s/'"`@]+@)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const ENV_RE = /\b(?:process\.env|import\.meta\.env|Deno\.env\.get\(['"])\.?([A-Za-z_][A-Za-z0-9_]*)/g;
for (const f of files.filter((f) => CODE_EXT.has(path.extname(f)))) {
  const text = fs.readFileSync(f, 'utf8');
  for (const m of text.matchAll(HOST_RE)) note('hosts', m[1].toLowerCase(), rel(f));
  for (const m of text.matchAll(WSS_RE)) note('hosts', m[1].toLowerCase(), rel(f));
  for (const m of text.matchAll(ENV_RE)) note('env', m[1], rel(f));
}

// .env.example keys
for (const f of files.filter((f) => /^\.env\.(example|sample|template)$/.test(path.basename(f)))) {
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (m) note('env', m[1], rel(f));
  }
}

// GitHub workflows: actions used and secrets read
for (const f of files.filter((f) => rel(f).startsWith('.github/workflows/') && /\.ya?ml$/.test(f))) {
  const text = fs.readFileSync(f, 'utf8');
  for (const m of text.matchAll(/^\s*-?\s*uses:\s*['"]?([^@\s'"]+)/gm)) note('actions', m[1], rel(f));
  for (const m of text.matchAll(/\bsecrets\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
    if (m[1] !== 'GITHUB_TOKEN') note('secrets', m[1], rel(f));
  }
}

// hosting / deploy config files
for (const f of files) {
  const r = rel(f);
  if (INFRA_FILES.some((name) => r === name || r.endsWith('/' + name))) note('files', r, r);
}
// files each known service says it uses (so "listed but not seen" is accurate)
for (const s of config.services) for (const f of s.files || []) if (fs.existsSync(path.join(root, f))) note('files', f, f);

// --- match against connections.json ---
const matches = (pattern, value) => {
  if (pattern.startsWith('*.')) return value === pattern.slice(2) || value.endsWith(pattern.slice(1));
  if (pattern.endsWith('*')) return value.startsWith(pattern.slice(0, -1));
  return pattern === value;
};
function owner(kind, value) {
  for (const s of config.services) if ((s[kind] || []).some((p) => matches(p, value))) return s.name;
  if ((config.reviewed[kind] || []).some((p) => matches(p, value))) return 'reviewed (no cost)';
  return null;
}

const LABELS = {
  packages: 'npm packages', hosts: 'Outside websites/APIs called', env: 'Environment variables (keys/settings)',
  actions: 'GitHub Actions used', secrets: 'GitHub secrets read by workflows', files: 'Hosting/deploy config files',
};
const newItems = [];
const report = [];
for (const kind of Object.keys(found)) {
  const rows = [...found[kind].entries()].sort(([a], [b]) => a.localeCompare(b));
  if (!rows.length) continue;
  report.push(`\n## ${LABELS[kind]}`);
  for (const [item, where] of rows) {
    const who = owner(kind, item);
    const places = [...where].slice(0, 3).join(', ') + (where.size > 3 ? ` (+${where.size - 3} more)` : '');
    if (!who) newItems.push({ kind, item, places });
    report.push(`${who ? '  ok ' : ' NEW '} ${item}  ->  ${who || 'not in connections.json'}   [${places}]`);
  }
}

if (ci) {
  for (const n of newItems) {
    console.log(`::warning title=New outside connection (${LABELS[n.kind]})::${n.item} found in ${n.places}. If it can cost money, add it to the ops-cost skill (inventory.md + connections.json); if not, add it to "reviewed" in connections.json.`);
  }
  console.log(newItems.length ? `${newItems.length} new connection(s) to review.` : 'No new outside connections.');
  if (process.env.GITHUB_STEP_SUMMARY && newItems.length) {
    const md = ['### New outside connections to review (ops-cost skill)', '', '| Type | Item | Where |', '|---|---|---|',
      ...newItems.map((n) => `| ${LABELS[n.kind]} | \`${n.item}\` | ${n.places} |`)];
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
  }
} else {
  console.log('# Task Molly outside connections' + report.join('\n'));
  console.log(`\n${newItems.length ? `${newItems.length} NEW item(s) - review them and update connections.json / inventory.md.` : 'Nothing new: everything found is in connections.json.'}`);
  const listed = config.services.filter((s) => !s.outsideRepo && !Object.keys(found).some((k) => [...found[k].keys()].some((v) => (s[k] || []).some((p) => matches(p, v)))));
  if (listed.length) console.log(`Listed but not seen in the code (may be removed, or only set up outside the repo): ${listed.map((s) => s.id).join(', ')}`);
}
