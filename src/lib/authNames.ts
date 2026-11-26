/**
 * A starting display name from an email address, for sign-ups that don't ask for a name:
 * "kelvin.wachira@gmail.com" -> "Kelvin Wachira". People can change it in their profile.
 */
export function nameFromEmail(email: string): string {
  const local = (email || '').trim().split('@')[0] || '';
  const words = local
    .replace(/\+.*$/, '')            // drop "+tag"
    .split(/[._\-]+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ''))
    .filter(Boolean);
  const name = words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return name.slice(0, 60) || 'Client';
}
