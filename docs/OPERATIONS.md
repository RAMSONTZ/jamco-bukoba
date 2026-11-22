# Deployment, integrations and rollback

## Existing resources

Use only Vercel project `prj_TyOinjh5cT7AyfrVbvu6CJJKdin1`, production hostname jamco-bukoba.vercel.app, GitHub RAMSONTZ/jamco-bukoba, and existing Neon project wild-violet-32460938. Source deployments use api/site.js with the existing Vercel routes and static public output. No new JAMCO Vercel project is needed.

## Environment variables

| Variable | Purpose |
|---|---|
| DATABASE_URL | existing production database; retained |
| JAMCO_STAGING_DATABASE_URL | isolated database selected only when VERCEL_ENV=preview |
| JAMCO_SETUP_KEY | temporary first-owner bootstrap secret; remove after activation |
| RESEND_API_KEY | verification/recovery email provider credential; not configured at audit |
| JAMCO_EMAIL_FROM | provider-verified sender; not configured at audit |
| VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT | existing opt-in web-push configuration |
| INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_USER_ID | existing Meta import workflow; absent at audit |

Do not put secret values into source, documentation, Git commits, public previews or support screenshots. Existing cookies cannot be promoted to admin by editing browser values; server records decide access.

## External requirements and current limits

- Email: configure Resend and a verified sender before expecting email verification and password recovery delivery. The application reports unconfigured delivery rather than inventing success.
- Instagram: authorize the official professional account through Meta, for read access use instagram_business_basic with Instagram Login (graph.instagram.com), or instagram_basic and pages_read_engagement with Facebook Login (graph.facebook.com); pages_show_list is needed when enumerating the linked Pages. Business Manager-granted roles may additionally require ads_read or ads_management. Confirm media republication rights. Reference: https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/v21.0/ . Public source links are preserved; new media imports in this implementation: zero.
- Large video: existing PostgreSQL media storage supports small clips only. Integrate a storage/CDN/transcoding provider for larger and adaptive streaming video. No external media provider credential was present.
- Push: device delivery cannot be verified without an opted-in supported device. Existing explicit publisher sends remain supported; automatic push and scheduled notification jobs remain pending.
- Timed stories use the publishing checkbox and expire after 24 hours. When no active story exists the round rail opens existing photographs. There is no fabricated story content.
- Discovery opens real categories and existing records. Empty categories invite moderated submissions; contact details/ratings/availability are never invented.
- Comments are capped at 200 per post in this release; cursor pagination for very large threads remains pending.
- Multi-client API workflows are tested with isolated PostgreSQL-compatible storage. Physical-device production workflows require owner activation and verified email.

## Backup

Before this migration, backup branch `br-noisy-field-b9dxdtvs` was created from main. Preserve it. The pre-change production deployment is `dpl_DVsYV4FsFuq9qNtmbwRGCmpYWAUR` (https://jamco-bukoba-gjj7ys88z-majidra7-7283s-projects.vercel.app). Latest user preview `dpl_2gwmLvtnwjLGD3d1napGiS5fnTan` is also retained.

## Roll back

For a frontend/runtime regression, roll the existing project back to the pre-change deployment using Vercel's rollback operation or redeploy its saved source. The migration is additive: do not drop the new tables or restore an old database merely to undo UI changes. The old code ignores added columns.

For confirmed database damage, first take a new branch of current main to preserve any new user content, then compare with the pre-change backup and restore only the affected data after review. A complete database rewind can lose new comments/accounts and must not be automatic.

For a new release: run npm test; apply reviewed migrations to staging; deploy preview to the same project; check guest pages, uploads, member and staff authorization; only then deploy production and verify its actual hostname. Do not promote a staging preview without selecting the production DATABASE_URL at build/deployment time.
