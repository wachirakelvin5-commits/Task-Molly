import { ADMIN_EMAILS } from '../../src/lib/admin';

/**
 * Who may use the admin site: one of the admin emails, verified by Google.
 * This only decides what the site shows. The data itself is protected by isAdmin() in
 * firestore.rules, which checks the same emails.
 */
export function isAllowedAdmin(user: { email?: string | null; emailVerified?: boolean } | null): boolean {
  return !!user?.email && user.emailVerified === true && ADMIN_EMAILS.includes(user.email.toLowerCase());
}
