# Validation results — 22 November 2026

## Automated

`npm test` passes 16 test groups against isolated in-memory PostgreSQL-compatible PGlite storage, without touching production accounts or posts.

Covered: legacy public/editorial routes, SEO metadata and sitemap; owner bootstrap; mandatory TOTP; staff restrictions; genuine registration/session/verification-token workflow; private versus published media; image signature rejection; duplicate-like prevention under concurrent requests; author-only comment edits/deletion; threaded replies and notifications; comment likes; save synchronization across two sessions; restricted moderator grants; reports and hiding; submission review and publisher approval; premium approval/expiry/revocation; scheduling and expiration; warning verification; Origin/Fetch Metadata rejection; MFA replay rejection; suspension/session invalidation; audit records; legacy campaign tracking, Instagram review inputs and push subscription validation.

Email delivery is disabled during isolated tests. Verification uses a test token inserted into the isolated database, then exercises the normal single-use API. This is not evidence of production email delivery.

## Browser

Local feed rendered with the approved logo and existing licensed photos. Full-screen viewer opens and closes without retaining zoom. Further mobile and deployed checks are recorded in the release report.

## Explicit limitations

No claim of penetration-test certification, physical-device cross-device testing, verified email delivery, imported Instagram media, or confirmed push receipt is made. Owner production activation requires the account holder to choose credentials and enroll an authenticator.
