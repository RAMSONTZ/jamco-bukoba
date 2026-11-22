# Media speed, themes and Instagram — 22 November 2026

Media: existing full photographs remain unchanged for full-screen viewing. Content-hashed AVIF/WebP derivatives serve 96 px story thumbnails and 320/480/768/1280 px responsive feed images (bounded by original size). Originals are not fetched for every thumbnail. Carousel images load near the viewport. The sidebar logo is 21,962 bytes versus the original 583,380 bytes. The aircraft story thumbnail is 984 bytes versus 24,960 bytes. Run `python scripts/optimize-media.py` after changing bundled photographs.

The homepage sends a public server-rendered first photograph and bootstraps eight feed records. Member authentication runs independently. GET /api/feed contains public data only, with 10-second CDN cache and 20-second stale refresh. Personal likes and saves come through private authenticated requests. Private uploads are authorized before image transformation. Image transformation sizes and formats are allowlisted. Native tests use temporary databases.

Use the sun/moon button in the header to switch light and dark. The preference is saved on the device, shared across tabs, and applied before styles render. Without an explicit choice, the system theme is used. Both social and editorial pages support the setting.

## Authorized Instagram import

No new Instagram posts or comments were imported during this release: the site requires sign-in and no official Meta credentials exist in the deployment environment. Existing sourced links are preserved. No comments or identities were invented.

Configure server-only INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID and INSTAGRAM_API_VERSION using an approved Meta Instagram Login application for the official professional account @jamcobukoba2013. Required permissions: instagram_business_basic and instagram_business_manage_comments. Use the current approved Graph API version. Do not put credentials into the frontend or commit them.

Authorized staff with both publish and moderate permissions can use Admin → Instagram. Imports default to review; publishing requires explicit selection and confirmation of media rights and comment review. Each run accepts 1–5 posts and up to 10 top-level comments per post. Original captions, timestamps, source links and usernames are retained. Comments are separately labeled Instagram imports and never impersonate registered JAMCO members. Graph calls verify the official username; media downloads allow only Instagram/Facebook CDN hosts, bound bytes, validate images, and send bearer credentials only to Graph. Oversize/unsupported videos are reported and retain the original source link. Native comments remain separate.

POST /api/social/admin-instagram-status returns connection readiness (no token). POST /api/social/admin-instagram-import accepts {limit,comments,confirmed:true,publish:false}. POST /api/social/admin-instagram-hide accepts {id,hidden:true}. Privileged endpoints require staff session, MFA and the relevant grants. Migration db/migrations/003-instagram-comments.sql is additive and idempotent.

Rollback: redeploy the preceding production deployment dpl_6myBxShBx1W9HmEZzrK5f8TJqsyK if required. The additive imported-comments table can remain without affecting older code. Production data backup branch before this release: br-calm-base-b9q76rm2. No production content was removed.
