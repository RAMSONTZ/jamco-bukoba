const days = 365;
export const sessionSeconds = days * 86400;
export const sessionInterval = `interval '${days} days'`;

export function sessionToken(req, key) {
  return (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${key}=([a-f0-9]{64})(?:;|$)`))?.[1] || '';
}

export function sessionCookie(res, key, token, age = sessionSeconds) {
  res.setHeader('Set-Cookie', `${key}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${process.env.VERCEL ? '; Secure' : ''}`);
}

// Renew once a week while active. Expired and revoked sessions are never restored.
export async function renewSession(db, req, res, session, key) {
  if (!session || Date.parse(session.expires_at) >= Date.now() + (days - 7) * 86400000) return;
  const table = key === 'jamco_session' ? 'jamco_sessions' : 'jamco_community_sessions';
  const {rows} = await db.query(`UPDATE ${table} SET expires_at=now()+${sessionInterval} WHERE digest=$1 AND expires_at>now() RETURNING digest`, [session.digest]);
  if (rows.length) sessionCookie(res, key, sessionToken(req, key));
}
