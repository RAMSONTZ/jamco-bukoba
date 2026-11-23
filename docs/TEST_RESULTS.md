# Validation results — 23 November 2026

## Automated

`npm test` passes 27 test groups against isolated in-memory PostgreSQL-compatible PGlite storage, without touching production accounts or posts.

Covered: legacy public/editorial routes, SEO metadata and sitemap; owner bootstrap; mandatory TOTP; staff restrictions; genuine registration/session/verification-token workflow; private versus published media; image signature rejection; duplicate-like prevention under concurrent requests; author-only comment edits/deletion; threaded replies and notifications; comment likes; save synchronization across two sessions; restricted moderator grants; reports and hiding; submission review and publisher approval; premium approval/expiry/revocation; scheduling and expiration; warning verification; Origin/Fetch Metadata rejection; MFA replay rejection; suspension/session invalidation; audit records; legacy campaign tracking, Instagram review inputs and push subscription validation.

Email delivery is disabled during isolated tests. Verification uses a test token inserted into the isolated database, then exercises the normal single-use API. This is not evidence of production email delivery.

## Importer and media follow-up

Added tests cover responsive asset sizes and retained originals, bounded uploaded-image transformations, rejection of untrusted Instagram media hosts and missing authorization, public feed/HTML cache isolation, and the authorized importer against injected test-only Graph responses and an isolated database. Importer tests verify original caption/date preservation, review-before-publication, private media until publication, no creation of fake members, repeated import deduplication, zero-comment mode, and rejection of a different Instagram account. Mocked responses prove data handling, not live Meta authorization or delivery.

## Browser

Local feed rendered with the approved logo and existing licensed photos. Full-screen viewer opens and closes without retaining zoom. The preview deployment dpl_J5GMYXgyL7QMV2zJS2N5xyKBd3gK reached READY and loaded its database feed in the browser. Guest saves persisted after navigation. Responsive iframe checks at 320/375/390/430/768/1366 px found scrollWidth equal to clientWidth (no horizontal overflow); the 15 px browser scrollbar reduced layout width in each case. All five mobile destinations were visible. A 390 px screenshot was captured. Production verification is recorded in RELEASE.md.

## Explicit limitations

No claim of penetration-test certification, physical-device cross-device testing, verified email delivery, imported Instagram media, or confirmed push receipt is made. Owner production activation requires the account holder to choose credentials and enroll an authenticator.

## Gundua photographic categories

The 23 November release adds twelve 160/320/480 px transparent WebP category assets and shared server/client discovery markup. New checks verify preserved alpha, small thumbnail bytes, all category routes in initial HTML, safe search escaping, relevant category aliases, removal of reporter metadata, and exclusion of future/expired discovery records. All 24 test groups pass in isolated storage.

## Feed, member media and playback follow-up

All 27 tests pass. Added workflows cover member-owned private image preview (including transformed thumbnails), denial to guests and other members, profile photo synchronization, contributor names/avatars in moderated posts, explicit sponsored-content labels, real topic predicates, text-only posts, video media inside story records, byte-range serving and invalid-range rejection. QA media fixtures have a synthetic test pattern and generated tone, only appear in Vercel Preview, never enter the database, and are rejected in Production. Live browser playback checks are reported separately; automated tests do not prove physical-device audio quality.
