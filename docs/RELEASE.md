# Current release status — 23 November 2026

## Production verified

https://jamco-bukoba.vercel.app/gundua
Production deployment dpl_qrYpNHBnbS1FWmpK8jGMtY8Rq8rv is READY and serves the new photographic Gundua experience. Its source commit is b55bb5a18a5e5f882fb5fef07f21c2689669cca1. Twelve transparent category assets, real categorized discovery content, the existing Bukoba photo gallery and both themes were verified in production. No new Instagram media/comments were imported.

## Completed feed code, deployment blocked

The completed feed source is on GitHub main at 9a41d1d66b8ad309d0ab509dc12b009b7a9bb5c4. Twenty-seven isolated automated tests passed. The feed Preview deployment dpl_6PoDysZ92YCHYth3Y1HR5acshcNz is READY at https://jamco-bukoba-h1ugytbvt-majidra7-7283s-projects.vercel.app/ . It contains functional topic rails, text notes, controlled video playback, profile/contributor pictures, reviewed promotions and optional auto-scroll. Later source changes add video-viewer CSS polish, let CSS aspect ratios override intrinsic image height attributes, and record the browser results. Those CSS changes await the next allowed build.

Browser checks verified real video decoding and pause, mute/unmute, volume slider 0.95, one playing video, offscreen pause, full-screen controls, automatic photo rotation, image zoom/previous/next, auto-scroll at eight seconds, Stop and disabled-on-reload behavior. Topic links filtered real preview content and Back returned to the earlier topic. The fixture media is conspicuously labeled, isolated to Preview and never written into the database. Production ignores ?qa=media and rejects /__qa/media.mp4.

Vercel rejected creation of the next deployment with HTTP 402, api-deployments-free-per-day, reporting more than 100 deployment requests and retryAfter 86400. No billing or plan changes were made. The local Vercel CLI is not available, and the existing Vercel project currently has no Git integration link, so updating GitHub alone does not deploy it. A preview is not substituted for production: it uses a separate staging database and preview-only QA controls. The new feed is therefore not claimed to be deployed at the production hostname yet.

After the provider allows deployments again, create a production deployment from current GitHub main in the existing Vercel project prj_TyOinjh5cT7AyfrVbvu6CJJKdin1, team team_nLIRGc7MCLVVInWje5at0J9l, primary connected account. Use the production target and its existing DATABASE_URL, not the staging database. Verify root topic controls, text/media filters, media delivery and privileged API rejection at the actual production hostname. Do not create another JAMCO project or promote a staging environment by merely reassigning domains.

## Remaining external requirements

Verified email delivery/recovery requires RESEND_API_KEY and JAMCO_EMAIL_FROM. Official Instagram import requires account authorization; zero new external posts/comments were fabricated or imported. Large/adaptive video storage and confirmed physical-device push/audio delivery remain external or unverified. First-owner activation still requires the account holder's credentials and MFA setup.

## Delivery

Source/assets/docs are packaged from tracked repository files without real environment files, private activation keys, node_modules or local database files. Discovery assets are in public/discovery; prompt/provenance records are in docs/discovery-prompts.json. Guides: FEED_WORKFLOWS.md, DISCOVERY_ASSETS.md, OWNER_GUIDE.md, API.md and OPERATIONS.md. Current production screenshots are in docs/screenshots/gundua-*.jpg. The tested feed preview screenshot is docs/screenshots/feed-preview-mobile.jpg.

Rollback of the feed, once deployed, is dpl_qrYpNHBnbS1FWmpK8jGMtY8Rq8rv. Keep production data; this feed change requires no migration. The earlier backup br-calm-base-b9q76rm2 is retained.

---

The following historical record describes the earlier speed/theme release:

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
