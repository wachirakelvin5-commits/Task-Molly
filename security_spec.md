# Security Specification - Identity Concierge

## 1. Data Invariants
- A **Service Request** must have a valid `clientId` and `serviceType`.
- A **Service Request** status must follow the sequence: `pending` -> `assigned` -> `in-progress` -> `completed`.
- Users can only read/edit their own requests or requests assigned to them (if they are a tasker).
- **Analytics** and **Logs** are write-only for clients/visitors and read-only for admins.
- **Jobs** are created by the system and accessible to the involved client and tasker.

## 2. The Dirty Dozen Payloads (Targeting Logic Leaks)

1. **Identity Spoofing**: `POST /serviceRequests` with `clientId: "someone_else_uid"`.
2. **Ghost Field Injection**: Adding `isVerified: true` to a service request.
3. **Privilege Escalation**: Updating user profile to `role: "admin"`.
4. **State Shortcutting**: Creating a service request with `status: "completed"`.
5. **Orphaned Write**: Creating a job without a corresponding service request.
6. **Denial of Wallet**: Sending a 1MB string as a `description` or `location`.
7. **Resource Poisoning**: Using a 2KB string as a document ID if possible.
8. **PII Leakage**: Attempting to `list /users` as a non-admin.
9. **Terminal State Bypass**: Updating a `completed` task's budget.
10. **Timestamp Manipulation**: Sending a `createdAt` from 2020.
11. **Negative Budget**: Sending `budget: -500`.
12. **Bypass Master Gate**: Attempting to delete a request that doesn't belong to the user via client SDK.

## 3. Conflict Report & Mitigation Strategy

| Conflict | Severity | Mitigation |
|----------|----------|------------|
| Admin SDK Permissions | High | The server-side API needs to write regardless of client auth state. Rules must permit system-level writes or the Admin SDK must be verified to bypass. |
| Anonymous Analytics | Low | Allow `create` on `analytics` for anyone, but `read` only for admin. |
| Task Deletion | Med | Ensure only owners can initiate deletion via API/Rules. |

## 4. Test Runner Plan
I will generate `firestore.rules.test.ts` to verify these protections.
