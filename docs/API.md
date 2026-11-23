# Backend API

All social operations use `POST /api/social/{action}` and JSON. Public reads use POST so member-specific flags and authenticated content are never cached in a shared CDN. API responses are no-store. Mutations reject foreign Origin and cross-site Fetch Metadata. Sessions use opaque random tokens, SHA-256 digests in PostgreSQL, HttpOnly / SameSite=Strict cookies, and Secure on Vercel.

## Public

| Action | Input | Result |
|---|---|---|
| feed | offset, optional kind/category/q/slug | 12 published posts, counts, member flags, more |
| stories | none | active publisher stories, expires after 24 hours |
| comments | slug | up to 200 comments, chronological, parent IDs |
| discover | none | published place/event/photo records |
| me | none | current user, saves, email configuration state |
| register | name,email,password,consent | member account; email verification status |
| login | email,password | session cookie |
| recover | email, optional staff | generic recovery acknowledgment |
| token | token, optional password | consume verification/reset token |
| staff-login | email,password,code | password plus TOTP; limited enrollment session for first login |
| staff-setup | key,email,password | first owner only; requires server setup secret |

## Member

| Actions | Authorization and behavior |
|---|---|
| logout, profile, saved, save, notifications, notifications-read, my-submissions, my-membership, verify-send | active member; records always scoped to session user |
| like | verified member; slug and active boolean; unique database key prevents duplicates |
| comment | verified member; slug, body, optional same-post parent |
| comment-edit, comment-delete | verified author only; id, body for edit; deletion hides record |
| comment-like | verified member; id, active boolean |
| report | verified member; slug, optional comment, reason |
| submit | verified member; title,body,category,location,media,consent; enters moderation |
| premium | verified member; one pending request per member |
| upload | verified member or authenticated staff; signature-checked JPG/PNG/WebP up to 1 MiB, MP4/WebM up to 3 MiB |
| view | verified member; distinct viewer/post/day; client reports after at least 2 seconds of actual playback |

## Staff

`staff-me`, `mfa-start`, `mfa-confirm` support TOTP enrollment. All management endpoints require a current active staff session with MFA. Roles are read from PostgreSQL on every request. `owner` has all grants. Existing `editor` has publishing, moderation and analytics. Other staff use explicit `permissions` grants; the stored legacy `viewer` role is used for custom administrator/moderator permissions. It grants nothing implicitly. Legacy newsroom endpoints refuse this custom role.

| Action | Grant |
|---|---|
| admin-dashboard | analytics |
| admin-posts, admin-publish | publish |
| admin-queue, admin-moderate, admin-reports, admin-comment-hide | moderate; publishing a submission additionally requires publish |
| admin-members, admin-member-update | members |
| admin-memberships, admin-membership-update | premium |
| admin-staff | owner only |
| admin-logout | active staff |

`admin-publish`: slug,title,body,category,contentType,state,media,location,source,date,optional liveAt/expiresAt,pinned,verified,confirmed,rights. Publishing requires an explicit rights/accuracy confirmation. Tahadhari requires an HTTPS source and editorial verification. Sponsored content is labeled. New media must belong to the publisher; media already attached to the edited post can be retained. Archive is reversible. Legacy remove now archives content instead of deleting it.

`admin-moderate`: id,status,note,confirmed. Statuses submitted/review/information/approved/published/rejected. `admin-member-update` suspends/restores active status and revokes sessions on suspension. `admin-membership-update` accepts approved/rejected/revoked and requires a future expiry when approving. Premium status confers no staff grants.

## Synchronization and media

The public feed polls at 20 seconds when visible; comments refresh at 12 seconds without replacing text being typed. Reloading from a second client queries the same database. This is polling, not a WebSocket system. Uploaded content persists in the existing `jamco_uploads` PostgreSQL bytea store. Private uploads are only served to their owner or an authorized editorial reviewer. New publish operations make attached media public. Large-video CDN/transcoding remains an external integration.

Notifications for immediate new posts, replies, submission decisions and membership decisions persist per member with preferences. Existing web-push supports opt-in and explicit editorial delivery via `/api/manage/push`. Provider acceptance counts are not claims of device delivery. Automatic push for every event and scheduled-post notification dispatch are not implemented.

## Topic feed and member media (23 November 2026)

GET /api/feed supports topic=bukoba|serikali|maendeleo|jamii|matukio|matangazo|michezo and media=image|video|text, together with offset/limit and existing kind filters. It returns public content only; personal interaction state is private. See FEED_WORKFLOWS.md for reader and publisher behavior.

GET/HEAD /media/:id supports one HTTP byte range. Authorization runs before media transformations and range selection: private member uploads are visible only to the uploading active member and authorized staff. Saving an owned profile avatar makes that avatar public. Approved member submissions include contributorId and obtain the current contributor display name/avatar from public profile fields, never email or credentials. Explicit Tangazo la biashara submissions receive the sponsored-content label only after authorized publication.

The QA fixture query and /__qa/media.mp4 are Preview-only; production ignores the fixture query and rejects the media route. No QA content is inserted into the database.
