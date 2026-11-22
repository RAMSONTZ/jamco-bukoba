# Validation results — 22 November 2026

## Automated

`npm test` passes 21 test groups against isolated in-memory PostgreSQL-compatible PGlite storage, without touching production accounts or posts.

Covered: legacy public/editorial routes, SEO metadata and sitemap; owner bootstrap; mandatory TOTP; staff restrictions; genuine registration/session/verification-token workflow; private versus published media; image signature rejection; duplicate-like prevention under concurrent requests; author-only comment edits/deletion; threaded replies and notifications; comment likes; save synchronization across two sessions; restricted moderator grants; reports and hiding; submission review and publisher approval; premium approval/expiry/revocation; scheduling and expiration; warning verification; Origin/Fetch Metadata rejection; MFA replay rejection; suspension/session invalidation; audit records; legacy campaign tracking, Instagram review inputs and push subscription validation.

Email delivery is disabled during isolated tests. Verification uses a test token inserted into the isolated database, then exercises the normal single-use API. This is not evidence of production email delivery.

## Importer and media follow-up

Added tests cover responsive asset sizes and retained originals, bounded uploaded-image transformations, rejection of untrusted Instagram media hosts and missing authorization, public feed/HTML cache isolation, and the authorized importer against injected test-only Graph responses and an isolated database. Importer tests verify original caption/date preservation, review-before-publication, private media until publication, no creation of fake members, repeated import deduplication, zero-comment mode, and rejection of a different Instagram account. Mocked responses prove data handling, not live Meta authorization or delivery.

## Browser

Local feed rendered with the approved logo and existing licensed photos. Full-screen viewer opens and closes without retaining zoom. The preview deployment dpl_J5GMYXgyL7QMV2zJS2N5xyKBd3gK reached READY and loaded its database feed in the browser. Guest saves persisted after navigation. Responsive iframe checks at 320/375/390/430/768/1366 px found scrollWidth equal to clientWidth (no horizontal overflow); the 15 px browser scrollbar reduced layout width in each case. All five mobile destinations were visible. A 390 px screenshot was captured. Production verification is recorded in RELEASE.md.

## Explicit limitations

No claim of penetration-test certification, physical-device cross-device testing, verified email delivery, imported Instagram media, or confirmed push receipt is made. Owner production activation requires the account holder to choose credentials and enroll an authenticator.
