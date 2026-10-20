// Accounts allowed into the admin screens. Keep in sync with isAdmin() in firestore.rules,
// which is what actually protects the data.
export const ADMIN_EMAILS = ['wachirakelvin5@gmail.com', 'taskmolly254@gmail.com'];

export function isAdminUser(user: { role?: string; email?: string } | null | undefined): boolean {
  return !!user && (user.role === 'admin' || ADMIN_EMAILS.includes((user.email || '').toLowerCase()));
}
