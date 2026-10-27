/**
 * Task references like "task_128_NRB": the request's order number plus a short code for its area.
 *
 * The number is stored on the request as `taskNumber`. The admin website hands numbers out
 * (see admin/src/useTaskNumbering.ts), oldest request first, so every request keeps the same
 * number even if other requests are deleted later.
 */

// Main roads named after other towns but inside Nairobi ("Mombasa Road" is in Nairobi).
const NAIROBI_ROADS = ['mombasa road', 'mombasa rd', 'thika road', 'thika rd', 'thika superhighway', 'ngong road', 'ngong rd',
  'kiambu road', 'kiambu rd', 'limuru road', 'limuru rd', 'langata road', 'magadi road'];

// Area codes, checked in this order against the location text. Nairobi estates come first
// because most locations are typed as an estate name without "Nairobi".
const AREAS: [code: string, names: string[]][] = [
  ['MSA', ['mombasa', 'nyali', 'bamburi', 'likoni', 'shanzu', 'mtwapa', 'diani']],
  ['KSM', ['kisumu']],
  ['NKR', ['nakuru']],
  ['ELD', ['eldoret']],
  ['THK', ['thika']],
  ['MKS', ['machakos', 'mlolongo', 'syokimau', 'athi river']],
  ['NYR', ['nyeri']],
  ['NYK', ['nanyuki']],
  ['NVS', ['naivasha']],
  ['MLD', ['malindi']],
  ['KTL', ['kitale']],
  ['KKG', ['kakamega']],
  ['KRC', ['kericho']],
  ['MRU', ['meru']],
  ['EMB', ['embu']],
  ['KJD', ['kajiado', 'kitengela', 'ngong', 'ongata rongai', 'rongai']],
  ['KBU', ['kiambu', 'ruiru', 'ruaka', 'juja', 'limuru', 'kikuyu']],
  [
    'NRB',
    [
      'nairobi', 'cbd', 'westlands', 'kilimani', 'kileleshwa', 'lavington', 'karen', 'parklands', 'runda',
      'langata', "lang'ata", 'south b', 'south c', 'upper hill', 'upperhill', 'riverside', 'roysambu',
      'kasarani', 'embakasi', 'donholm', 'buruburu', 'umoja', 'kahawa', 'githurai', 'zimmerman',
      'muthaiga', 'gigiri', 'spring valley', 'loresho', 'kitisuru', 'hurlingham', 'ngara', 'pangani',
      'eastleigh', 'kibera', 'kawangware', 'dagoretti', 'madaraka', 'nairobi west', 'industrial area',
      'utawala', 'ruai', 'kayole', 'pipeline', 'fedha', 'tassia', 'imara daima',
      'thome', 'garden estate', 'ridgeways', 'mountain view', 'kangemi', 'uthiru', 'kabete', 'adams arcade',
      'yaya centre', 'sarit', 'two rivers', 'garden city', 'waiyaki way', 'jogoo road', 'outer ring',
    ],
  ],
];

/** Fallback when the location doesn't match a known area. */
export const DEFAULT_AREA_CODE = 'KE';

const has = (text: string, name: string) => new RegExp(`(^|[^a-z])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`).test(text);

/** A short code for the area a task is in, e.g. "NRB" for anywhere in Nairobi. */
export function areaCode(location: string | null | undefined): string {
  const text = (location || '').toLowerCase();
  if (!text.trim()) return 'NRB'; // Requests saved without a location default to Nairobi.
  if (has(text, 'nairobi') || NAIROBI_ROADS.some((r) => has(text, r))) return 'NRB';
  for (const [code, names] of AREAS) {
    if (names.some((n) => has(text, n))) return code;
  }
  return DEFAULT_AREA_CODE;
}

/**
 * "task_128_NRB", or null while the request has no number yet.
 * Shown with a leading "#" on screen.
 */
export function taskRef(request: { taskNumber?: unknown; location?: string | null }): string | null {
  const n = request.taskNumber;
  if (typeof n !== 'number' || !Number.isInteger(n) || n <= 0) return null;
  return `task_${n}_${areaCode(request.location)}`;
}

/**
 * Which requests still need a number, and which number each gets: the next numbers after the
 * highest one in use, oldest request first. Running it again on the same data gives the same
 * answer, so two admins with the site open at once hand out the same numbers.
 */
export function planTaskNumbers(
  requests: { id: string; taskNumber?: unknown; createdAt: Date | null }[],
): { id: string; taskNumber: number }[] {
  const isNumbered = (r: { taskNumber?: unknown }) => typeof r.taskNumber === 'number' && r.taskNumber > 0;
  let next = requests.reduce((max, r) => (isNumbered(r) ? Math.max(max, r.taskNumber as number) : max), 0) + 1;
  return requests
    .filter((r) => !isNumbered(r))
    .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0) || a.id.localeCompare(b.id))
    .map((r) => ({ id: r.id, taskNumber: next++ }));
}
