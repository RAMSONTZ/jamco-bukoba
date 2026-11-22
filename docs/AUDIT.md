# Recovery audit — 22 November 2026

## Identified existing resources

- Production: https://jamco-bukoba.vercel.app/
- Existing Vercel project: `prj_TyOinjh5cT7AyfrVbvu6CJJKdin1` in `team_nLIRGc7MCLVVInWje5at0J9l`.
- Production before this work: `dpl_DVsYV4FsFuq9qNtmbwRGCmpYWAUR`, READY, newsroom interface.
- User-supplied latest preview: `dpl_2gwmLvtnwjLGD3d1napGiS5fnTan`, READY, not assigned to production.
- Existing GitHub repository: RAMSONTZ/jamco-bukoba. It was empty and was not connected to Vercel Git deployment. Source was recovered from an existing workspace newsroom checkout and compared with deployment file inventory and database columns. Vercel file-content retrieval truncated larger files; a byte-for-byte export of the latest preview was not available. The existing deployment remains a rollback reference.
- Database: existing Neon project `wild-violet-32460938`, main branch `br-red-thunder-b9gf8440`.
- Independent backup branch before changes: `br-noisy-field-b9dxdtvs`.
- Isolated staging branch for schema checks: `br-floral-waterfall-b9oaifbp`.

## Existing data

Audit found 38 content records, one community account, zero staff accounts, zero community submissions. Existing `jamco_content`, `jamco_community_users`, `jamco_community_sessions`, `jamco_community_saves`, `jamco_community_submissions`, staff, uploads, push subscriptions, requests and audit data were retained. No production record was removed. The additive migration adds fields, indexes and social tables.

## ZIP comparison

The supplied ZIP is an independent Next.js starter, not the deployed source. Its README explicitly identifies missing signup, recovery, notifications, moderation and other functionality. Its `users`, `posts`, and JWT role model conflict with the deployed `jamco_*` tables and opaque database sessions. Its database client also disables certificate verification. Those conflicting modules were not installed over the deployed backend. The approved branding was integrated, and the supplied UI reference was inspected and retained privately in docs for reference.

## Recovered capabilities

The existing newsroom had database publishing, public article routes, licensed photograph assets and credits, campaign requests, push subscriptions and a staff bootstrap process. Latest preview metadata and schema showed community accounts, saves and submissions. The social implementation uses those existing community tables instead of creating a replacement user database. Existing password hashes use the supported scrypt salt/hash representation.

## Content integrity

No news, engagement, business listings or urgent notices were invented. No new Instagram media was downloaded. Existing linked Instagram captions/dates/source links remain. Existing photo dates and attribution are visible. Pictures used as illustrations are labeled as such. Video source links are not represented as playable uploaded files.
