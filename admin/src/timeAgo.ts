/** "just now", "5 min ago", "3 h ago", "2 d ago". */
export function timeAgo(date: Date | null, now = Date.now()): string {
  if (!date) return 'just now';
  const minutes = Math.floor(Math.max(0, now - date.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}
