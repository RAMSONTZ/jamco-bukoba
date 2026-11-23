# JAMCO social feed — 23 November 2026

## Readers

The upper topic rail has Shiriki nasi, Bukoba, Serikali, Maendeleo, Jamii, Matukio, Matangazo and Michezo. Tapping a topic filters actual published content on the server; unpopulated topics show an honest empty state. An official government topic is not automatically marked verified. Existing real 24-hour Stories appear alongside the topic rail, with expiry controlled in the database. Category circles do not invent personal stories or counts.

The feed supports photo carousels, video and text-only posts, with publisher/contributor identity, location, publication date/time where known, comments, likes, saving, sharing and expanded descriptions. Historical photographs retain dates and source credits instead of invented precise publication times. Registered member names and avatars appear on approved contributions and native comments; staff publication privileges remain server-controlled.

Inline videos start muted when visible and browser policy permits. Play/pause and mute buttons reflect actual media events. The volume slider changes audio only after a user gesture. Other videos pause when one plays; offscreen and hidden-tab video playback pauses. Full-screen playback has native controls. Small video files support HTTP byte ranges for seeking. A failure to load is reported rather than displayed as successful playback.

Auto-scroll is off on every fresh visit. The reader can explicitly start it, select 8/15/25 seconds between posts, and stop it. Touching a post, mouse-wheel scrolling or navigation keys stop it. It waits while a dialog is open or the page is hidden. Optional automatic rotation applies only to multiple-photo carousels in view; manual interaction pauses that carousel. Reduced-motion users get instant rather than animated transitions. Full-screen images support zoom, previous/next controls and arrow keys.

## Members

Choose Akaunti to update a display name, optional public profile picture and general location. Private uploads can be previewed only by the uploading active member or authorized staff before publication. Another member cannot see them. A selected profile avatar becomes public intentionally as part of saving the profile.

Shiriki accepts text with optional pictures/video. Members cannot publish directly or gain staff privileges. Submissions enter the existing moderation queue. Use Tangazo la biashara for an explicit business promotion; after authorized editorial approval it receives a sponsored-content label and the contributor's public identity. Ordinary announcements remain distinct.

Registration participation requires verified email. Production email verification/recovery still needs RESEND_API_KEY and JAMCO_EMAIL_FROM. No verification bypass or hidden administrator account was introduced. Existing small-file limits remain: images are compressed before upload, and video clips are limited to 3 MB until external media storage/streaming is configured.

## Owner/publisher

Open the protected admin publisher, choose an editorial content type and topic, add location and text, and optionally upload media. Media is not required for a notice or note. Serikali uses Taarifa za Serikali with a proper attributed source; Maendeleo is a topic/category. Choose Business Promotions only for approved sponsored content. Draft, schedule, immediate publication, archive, pin and expiry controls remain persistent. Use the Story checkbox for a 24-hour media Story.

The moderator can review member submissions; public publication additionally requires the publishing grant. Approval alone does not grant a member editorial authority.

## API and verification

GET /api/feed accepts topic=bukoba|serikali|maendeleo|jamii|matukio|matangazo|michezo, optional media=image|video|text, offset and limit. Topic/media filters combine; existing kind filters retain compatibility. Cached public responses omit private user state. Personal likes, saves and avatars are reconciled through private account requests. The /?mada=serikali link selects the topic in the initial public feed.

Preview-only /?qa=media provides three conspicuously labeled QA fixtures (a generated test pattern with a tone, an existing-photo carousel and a text note), without database writes. /__qa/media.mp4 is served only in Preview. Production ignores the fixture query and returns 404 for the QA media route. The fixture is not genuine news, imported content or evidence of user engagement.

The 27 automated tests use isolated storage and cover server-side authorization, private media ownership, moderation, topic/media filtering, profile persistence, text notes and byte ranges, alongside earlier social workflows. Production data is preserved; this release needs no database migration.

Rollback: the preceding Gundua production deployment is dpl_qrYpNHBnbS1FWmpK8jGMtY8Rq8rv. Preserve the database and new user data when rolling back frontend/runtime code.
