# JAMCO Bukoba — release verification

Production: https://jamco-bukoba.vercel.app/
Repository: https://github.com/RAMSONTZ/jamco-bukoba
Runtime source commit: 2c4752486a2c74106f6036a195407072890fc1b9
Vercel project: prj_TyOinjh5cT7AyfrVbvu6CJJKdin1 (existing project)
Production deployment: dpl_E4k2HzcrV1VrUNERAVfn6oE8gvHb, READY
Tested preview: dpl_5seLvH4g9XgRieWFEEkA7Txipr7v
Database backup: br-calm-base-b9q76rm2

## Verified on 22 November 2026

- Production homepage, Discovery, Submit, Saved, Account, Admin login and public article routes returned HTTP 200.
- Production GET /api/feed?limit=2 returned public JSON with responsive AVIF/WebP descriptors and no member-specific likes.
- The 480 px aircraft AVIF returned HTTP 200, 9,151 bytes. The optimized logo returned HTTP 200, 21,962 bytes.
- Guest requests to the privileged dashboard API were rejected with HTTP 401.
- Browser checks confirmed deployed optimized images loaded, light/dark switching worked, and the dark selection survived reload.
- Local responsive browser checks at 320, 375, 390, 430, 768 and 1366 px found no horizontal overflow. These are browser viewport checks, not physical-device certification.
- Production retained 38 content records. New Instagram media/posts/comments imported by this release: zero.
- Follow-up checks revalidated production HTML, feed descriptors, theme script and optimized AVIF delivery.

The follow-up commit changes tests and documentation only; it does not change runtime behavior or require a new deployment.

## Remaining account-holder integrations

The production environment contains database, staging, setup and VAPID configuration. It still lacks INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID, INSTAGRAM_API_VERSION, RESEND_API_KEY and JAMCO_EMAIL_FROM. Official Instagram authorization is required before importing genuine posts, media and comments. The importer must verify @jamcobukoba2013 and retains dates, captions, sources and separate imported identities. No external comments have been fabricated. A Windsor.ai connection may provide authorized account access for assisted import; it is not installed or connected at this check.

Verified email delivery and account recovery require an email provider and a verified sender. First-owner activation requires the account holder to choose credentials and enroll MFA through the protected setup workflow. Do not substitute hardcoded credentials or grant membership administrative roles.

Push delivery to an opted-in physical device, adaptive video delivery for large uploads and full production owner/member journeys remain external or unverified. See OPERATIONS.md for the complete limitations. This release is not a claim that every item in the original full-platform brief is complete.

## Source package

The updated source ZIP includes tracked source, approved branding, original and optimized licensed photographs, additive migrations, API documentation, owner guide, operations/rollback instructions and tests. It excludes real environment files, node_modules, local databases and the private owner activation key. Use npm ci, then npm test. For local preview, npm run dev (isolated local storage when configured); preserve the production database and project configuration.

## Rollback

Redeploy previous production dpl_6myBxShBx1W9HmEZzrK5f8TJqsyK for a runtime regression. Keep the additive imported-comments table; do not rewind the database for a frontend rollback. The backup branch br-calm-base-b9q76rm2 preserves the pre-release database state. Preserve any newer production data before considering a database recovery.
