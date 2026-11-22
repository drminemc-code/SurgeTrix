# SurgeTrix Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Owner-Only Profile & Split PII**: A user's `users/{userId}` document and `users/{userId}/private/info` PII document are strictly readable and writable only by the verified authenticated owner (`request.auth.uid == userId && request.auth.token.email_verified == true` for writes). Blanket `list` queries on `users` or `private` are denied.
2. **Plan Privilege Lock**: Users registering an account (`create` on `users/{userId}`) may only initialize `plan: "Free"`. Self-escalation to `Plus`, `Pro`, or `Business` on create or update is rejected.
3. **Immutable Ownership & Timestamps**: `uid` and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
4. **Master Gate Sync**: `users/{userId}/private/info` cannot exist or be updated without a valid parent `users/{userId}` document owned by `request.auth.uid`.
5. **No Shadow Fields**: Strict `hasAll` + `hasOnly` on create and `affectedKeys().hasOnly(...)` on named update actions prevent arbitrary extra keys.
6. **Platform Owner Exclusive Plugin Control**: Only verified `drminemc@gmail.com` (`request.auth.token.email_verified == true && request.auth.token.email == 'drminemc@gmail.com'`) can create, update, hide, or delete `/plugins/{pluginId}`, post `ownerReply` on reviews, or moderate/delete reviews and domains.
7. **Review Integrity**: Only verified signed-in users can create reviews referencing an existing published `/plugins/{pluginId}`, cannot spoof `authorUid` or inject `ownerReply` during review creation, and can only edit their own rating/title/comment/testedVersion.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Cross-User Read/Write Spoof**: Authenticated user `uidA` attempting to create `users/uidB` with `uid: "uidB"`. -> `PERMISSION_DENIED`
2. **Privilege Escalation on Create**: Authenticated user creating `users/uidA` with `plan: "Business"`. -> `PERMISSION_DENIED`
3. **Privilege Escalation on Update**: Authenticated user updating `users/uidA` changing `plan` from `"Free"` to `"Pro"`. -> `PERMISSION_DENIED`
4. **Unverified Email Write**: Authenticated user with `email_verified: false` writing `users/uidA` or `/plugins/p1`. -> `PERMISSION_DENIED`
5. **Shadow Field Injection**: Creating `users/uidA` with extra key `isAdmin: true` or creating review with injected `ownerReply`. -> `PERMISSION_DENIED`
6. **Username Length Overflow (DoW)**: Creating `users/uidA` with 500-char `username`. -> `PERMISSION_DENIED`
7. **Username Regex Violation**: Creating `users/uidA` with `<script>alert(1)</script>` in `username`. -> `PERMISSION_DENIED`
8. **Non-Owner Plugin Upload Spoof**: Signed-in non-owner (`other@gmail.com`, `email_verified: true`) attempting to create `/plugins/my-hack`. -> `PERMISSION_DENIED`
9. **Unverified Owner Email Spoof**: Signed-in `drminemc@gmail.com` with `email_verified: false` attempting to create `/plugins/p1` or reply to a review. -> `PERMISSION_DENIED`
10. **Client-Spoofed Timestamp**: Creating `users/uidA` or `/plugins/p1/reviews/r1` with `createdAt` != `request.time`. -> `PERMISSION_DENIED`
11. **Orphaned Review / PII Write**: Creating `/plugins/missing/reviews/r1` when `/plugins/missing` does not exist. -> `PERMISSION_DENIED`
12. **PII Leak & Query Scraping Attempt**: Signed-in user `uidB` reading `users/uidA/private/info`, listing `users`, or listing `domains` belonging to `uidA`. -> `PERMISSION_DENIED`
