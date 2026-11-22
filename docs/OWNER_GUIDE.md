# JAMCO owner and publisher guide

## Activate the first owner

1. A random JAMCO_SETUP_KEY must be configured in the existing Vercel project. Keep it secret. It is never bundled into public source.
2. Visit https://jamco-bukoba.vercel.app/admin?setup . Enter the setup key, your own email and a password of at least 14 characters.
3. Add the displayed TOTP secret to an authenticator app (for example a standard TOTP app). Store the secret safely offline. Enter its current six-digit code.
4. The dashboard opens only after MFA. Subsequent sign-in requires password plus TOTP.
5. Remove JAMCO_SETUP_KEY in Vercel once the owner exists. The server also refuses any second owner bootstrap.

No production owner credentials are selected on your behalf. If you lose the authenticator, an operator with database authority must verify your identity and reset MFA out of band. Password recovery does not bypass MFA.

## Publish

Open Chapisha. Write a headline and full description; choose editorial type and category; add location and a source where applicable. Upload photographs or a short video. Use Hariri on a photograph to crop, rotate, zoom and adjust framing. Remove attachments before saving when necessary. The attachment order is the upload order and becomes the swipe carousel order.

Choose Rasimu, Ukaguzi, Chapisha / ratibu, or Hifadhi. Scheduling uses your device's local datetime control and stores UTC. Confirm facts, consent and rights before publishing. A new immediate post appears in the public database feed; no deployment is needed. Use Machapisho to edit a saved post, change its state, pin it or set expiry. Archiving retracts it from public feeds without deleting the record.

## Team

Owner opens Ruhusa and enters the colleague's email and initial password. Assign Editor for editorial publishing/moderation/analytics, or choose custom Administrator/Moderator and only the required checkboxes. New staff must enroll MFA. Existing staff can be suspended by clearing Akaunti hai. Changes revoke staff sessions. Never share the owner's account.

## Review

Taarifa za jamii shows content, attachments and review notes. Move through Under Review or More Information Needed before approving. Only staff with publishing permission can publish. Check facts and rights explicitly; do not automatically publish allegations or private personal data.

Ripoti allows a permitted moderator to hide reported comments. Wanachama supports search and suspension/restoration. Premium supports approval with an expiry, rejection and revocation. It does not confer administration. Arifa shows decisions and comment replies to the affected member.

## Member registration

Guests read without registering. Members register by email, then verify the address using a sent link before posting comments or submissions. Email delivery requires a configured verified sender. Profiles and saves work before verification; publication-related interactions remain disabled until verification succeeds.
