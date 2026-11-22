# SurgeTrix Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Owner-Only Profile & Split PII**: A user's `users/{userId}` document and `users/{userId}/private/info` PII document are strictly readable and writable only by the verified authenticated owner (`request.auth.uid == userId && request.auth.token.email_verified == true` for writes). Blanket `list` queries on `users` or `private` are denied.
2. **Plan Privilege Lock**: Users registering an account (`create` on `users/{userId}`) may only initialize `plan: "Free"`. Self-escalation to `Plus`, `Pro`, or `Business` on create or update is rejected.
3. **Immutable Ownership & Timestamps**: `uid` and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
4. **Master Gate Sync**: `users/{userId}/private/info` cannot exist or be updated without a valid parent `users/{userId}` document owned by `request.auth.uid`.
5. **No Shadow Fields**: Strict `hasAll` + `hasOnly` on create and `affectedKeys().hasOnly(...)` on named update actions prevent arbitrary extra keys.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Cross-User Read/Write Spoof**: Authenticated user `uidA` attempting to create `users/uidB` with `uid: "uidB"`. -> `PERMISSION_DENIED`
2. **Privilege Escalation on Create**: Authenticated user creating `users/uidA` with `plan: "Business"`. -> `PERMISSION_DENIED`
3. **Privilege Escalation on Update**: Authenticated user updating `users/uidA` changing `plan` from `"Free"` to `"Pro"`. -> `PERMISSION_DENIED`
4. **Unverified Email Write**: Authenticated user with `email_verified: false` writing `users/uidA`. -> `PERMISSION_DENIED`
5. **Shadow Field Injection**: Creating `users/uidA` with extra key `isAdmin: true` or `role: "admin"`. -> `PERMISSION_DENIED`
6. **Username Length Overflow (DoW)**: Creating `users/uidA` with 500-char `username`. -> `PERMISSION_DENIED`
7. **Username Regex Violation**: Creating `users/uidA` with `<script>alert(1)</script>` in `username`. -> `PERMISSION_DENIED`
8. **Invalid Theme Enum**: Updating `preferredTheme` to `"hacked-theme"`. -> `PERMISSION_DENIED`
9. **Path ID Poisoning**: Accessing `users/bad$id..slash` exceeding regex/length guard. -> `PERMISSION_DENIED`
10. **Client-Spoofed Timestamp**: Creating `users/uidA` with `createdAt` != `request.time`. -> `PERMISSION_DENIED`
11. **Orphaned Private PII Write**: Creating `users/uidA/private/info` without atomic parent `users/uidA` write. -> `PERMISSION_DENIED`
12. **PII Leak Attempt**: Signed-in user `uidB` reading `users/uidA/private/info` or listing `users`. -> `PERMISSION_DENIED`
