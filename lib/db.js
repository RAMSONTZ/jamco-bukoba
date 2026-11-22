import pg from 'pg';
import { readFile } from 'node:fs/promises';
import seed from './seed.js';

let pool;
export async function database() {
  if (process.env.JAMCO_LOCAL_DB) {
    if (process.env.VERCEL) throw new Error('Local database disabled on Vercel');
    const { PGlite } = await import('@electric-sql/pglite');
    const local = new PGlite(process.env.JAMCO_LOCAL_DB);
    await local.waitReady;
    return { query: (query, args) => local.query(query, args), transaction: work => local.transaction(work) };
  }
  const connectionString=process.env.VERCEL_ENV==='preview'&&process.env.JAMCO_STAGING_DATABASE_URL?process.env.JAMCO_STAGING_DATABASE_URL:process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL missing');
  pool ??= new pg.Pool({ connectionString, max: 2, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000, allowExitOnIdle: true });
  return {
    query: (query, args) => pool.query(query, args),
    async transaction(work) {
      const connection = await pool.connect();
      try {
        await connection.query('BEGIN');
        const result = await work(connection);
        await connection.query('COMMIT');
        return result;
      } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
      } finally {
        connection.release();
      }
    }
  };
}
let bootstrap;
export function getDb() {
  bootstrap ??= database().catch(error => { bootstrap = undefined; throw error; });
  return bootstrap;
}
export async function migrate() {
  const db = await getDb();
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8') + await readFile(new URL('../db/migrations/002-social.sql', import.meta.url), 'utf8');
  for (const statement of schema.split(';').map(x => x.trim()).filter(Boolean)) await db.query(statement);
  await db.transaction(async tx => {
    for (const { slug, kind, date, ...data } of seed) {
      await tx.query("INSERT INTO jamco_content(slug,kind,state,live_at,data) VALUES ($1,$2,'published',$3,$4) ON CONFLICT DO NOTHING",
        [slug,kind,date,{date,...data}]);
    }
  });
}
export function record(row) {
  return { ...row.data, slug: row.slug, kind: row.kind, state: row.state, liveAt: new Date(row.live_at).toISOString() };
}
export async function published() {
  const db = await getDb();
  const { rows } = await db.query("SELECT * FROM jamco_content WHERE state='published' AND live_at<=now() ORDER BY data->>'date' DESC, live_at DESC LIMIT 600");
  return rows.map(record);
}
