# JAMCO Bukoba — Jamii na Maendeleo Bukoba

This is the recovered existing JAMCO newsroom with an integrated social application. It retains PostgreSQL content, staff accounts, media storage, the newsroom APIs, Instagram source links and web-push support. It does not create another hosting project.

## Run

Node 22+, `npm ci`, `npm test`, `npm start`. Development without DATABASE_URL uses an isolated in-memory PGlite database and bundled editorial records. Production never falls back to a local database. `npm run dev -- --port 4173` is supported.

Production uses DATABASE_URL; Vercel Preview uses JAMCO_STAGING_DATABASE_URL when configured. Apply `lib/schema.sql` only for a new database, then `db/migrations/002-social.sql` for the social additions. Do not run the seed script against production as an update process.

## Screens

- `/`: paginated social feed, images and video uploads, carousels, native share, guest saves, likes and threaded comments.
- `/gundua`: discovery categories and existing verified records; no invented listings.
- `/shiriki`: authenticated moderated submissions.
- `/hifadhi`: saved posts, synchronized for members.
- `/akaunti`: registration, sign-in, profile, verification, premium requests, submission status, notification preferences.
- `/arifa`: account notifications.
- `/admin`: staff sign-in, mandatory TOTP enrollment, owner and permission-controlled publishing and moderation.
- Existing `/habari`, `/tv`, `/picha`, `/matukio`, `/biashara` and editorial pages remain available. `/habari/:slug` opens the social reading view.

## Credentials

No credentials are included. For first owner activation, configure a random 32+ character JAMCO_SETUP_KEY in Vercel, open `/admin?setup`, choose your own owner email/password, then enroll a TOTP app. Remove JAMCO_SETUP_KEY after activation. Owner setup refuses to replace an existing owner. New members can never choose a staff role.

Email verification/recovery requires RESEND_API_KEY and a verified JAMCO_EMAIL_FROM. Unverified members can save and update profiles; verified email is required for comments, likes, submissions and premium requests.

See docs/API.md, docs/OWNER_GUIDE.md, docs/OPERATIONS.md, docs/AUDIT.md and docs/TEST_RESULTS.md.
