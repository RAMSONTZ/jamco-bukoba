import sharp from 'sharp';
import {ApiError} from './actions.js';

const chunkSize = 2_500_000;
const mediaLimit = 20_000_000;
const videoLimit = 100_000_000;
const audioLimit = 10_000_000;
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const formats = new Set(['image', 'video/mp4', 'video/quicktime', 'video/webm', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav']);
let setup,lastCleanup=0;

export const mediaKind = mime => mime.split('/')[0];

function table(db) {
  setup ??= db.query(`CREATE TABLE IF NOT EXISTS jamco_media_ingest (
    id uuid NOT NULL, part integer NOT NULL, owner text NOT NULL, mime text NOT NULL,
    total integer NOT NULL, payload bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, part)
  )`).catch(error => { setup = undefined; throw error; });
  return setup;
}

async function normalize(bytes, mime) {
  if (mime === 'image') {
    try {
      const image = sharp(bytes, {limitInputPixels: 80_000_000, failOn: 'error'});
      const meta=await image.metadata();
      const types={jpeg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif',heif:'image/heif',tiff:'image/tiff',gif:'image/gif'};
      if(!types[meta.format]||!meta.width||!meta.height||meta.width*meta.height>80_000_000)throw Error('Unsupported image');
      await image.clone().resize({width:96,height:96,fit:'inside',withoutEnlargement:true}).webp().toBuffer();
      return {mime:meta.format==='heif'&&meta.compression==='av1'?'image/avif':types[meta.format],bytes};
    } catch {
      throw new ApiError(415, 'Picha haijasomeka. Jaribu JPEG, PNG, WebP au AVIF.');
    }
  }
  const mp4 = ['ftyp','moov','mdat','wide','free'].includes(bytes.toString('ascii',4,8));
  const webm = bytes.subarray(0, 4).toString('hex') === '1a45dfa3';
  const ogg = bytes.toString('ascii', 0, 4) === 'OggS';
  const mp3 = bytes.toString('ascii', 0, 3) === 'ID3' || (bytes[0] === 255 && (bytes[1] & 0xe0) === 0xe0);
  const wav = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE';
  const valid = {'video/mp4':mp4,'video/quicktime':mp4,'audio/mp4':mp4,'video/webm':webm,'audio/webm':webm,'audio/ogg':ogg,'audio/mpeg':mp3,'audio/wav':wav};
  if (bytes.length < 24 || !valid[mime]) throw new ApiError(415, 'Faili ya sauti au video haijasomeka.');
  return {bytes, mime};
}

const uploaded = (id, mime) => ({id, url: '/media/' + id, type: mediaKind(mime)});

export async function uploadPart(db, owner, input) {
  const {id, mime, size, part, data, finish, status} = input;
  const limit = mime?.startsWith('audio/') ? audioLimit : mime?.startsWith('video/') ? videoLimit : mediaLimit;
  if (!uuid.test(id || '') || !formats.has(mime) || !Number.isInteger(size) || size < 1 || size > limit) {
    throw new ApiError(400, 'Faili si halali au imezidi kikomo.');
  }
  const count = Math.ceil(size / chunkSize);
  await table(db);
  if(status===true){const existing=(await db.query('SELECT mime,octet_length(data) AS size FROM jamco_uploads WHERE id=$1 AND owner=$2',[id,owner])).rows[0];if(existing){if(Number(existing.size)!==size)throw new ApiError(409,'Ukubwa wa original hauendani.');return {complete:uploaded(id,existing.mime),parts:[],binary:true};}const rows=(await db.query('SELECT part FROM jamco_media_ingest WHERE id=$1 AND owner=$2 AND mime=$3 AND total=$4 ORDER BY part',[id,owner,mime,size])).rows;return {parts:rows.map(r=>r.part),binary:true};}
  let payload;
  if (!finish) {
    if (!Number.isInteger(part) || part < 0 || part >= count)throw new ApiError(400,'Sehemu ya faili si halali.');
    if(Buffer.isBuffer(data))payload=data;
    else if(typeof data==='string'&&data.length<=Math.ceil(chunkSize/3)*4&&/^[A-Za-z0-9+/]+={0,2}$/.test(data))payload=Buffer.from(data,'base64');
    else throw new ApiError(400,'Sehemu ya faili si halali.');
    if (payload.length !== Math.min(chunkSize, size - part * chunkSize)) throw new ApiError(400, 'Ukubwa wa sehemu si sahihi.');
  }
  if (!finish) {
    if(part===0&&Date.now()-lastCleanup>3600000){lastCleanup=Date.now();await db.query("DELETE FROM jamco_media_ingest WHERE created_at < now() - interval '3 days'").catch(()=>{lastCleanup=0});}
    const result = await db.query(`INSERT INTO jamco_media_ingest(id,part,owner,mime,total,payload)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id,part) DO UPDATE SET payload=excluded.payload
      WHERE jamco_media_ingest.owner=excluded.owner AND jamco_media_ingest.mime=excluded.mime
      AND jamco_media_ingest.total=excluded.total AND jamco_media_ingest.payload=excluded.payload RETURNING part`,
    [id, part, owner, mime, size, payload]);
    if (!result.rows.length) throw new ApiError(409, 'Sehemu ya faili inakinzana na iliyopakiwa.');
    return {part};
  }
  return db.transaction(async tx => {
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[id]);
    const existing = (await tx.query('SELECT mime FROM jamco_uploads WHERE id=$1 AND owner=$2', [id, owner])).rows[0];
    if (existing) return uploaded(id, existing.mime);
    if(mime.startsWith('video/')){
      const parts=(await tx.query('SELECT part,octet_length(payload) AS n FROM jamco_media_ingest WHERE id=$1 AND owner=$2 AND mime=$3 AND total=$4 ORDER BY part',[id,owner,mime,size])).rows;
      if(parts.length!==count||parts.some((r,i)=>r.part!==i||Number(r.n)!==Math.min(chunkSize,size-i*chunkSize)))throw new ApiError(409,'Baadhi ya sehemu za video hazijafika.');
      const prefix=(await tx.query('SELECT substring(payload FROM 1 FOR 64) AS payload FROM jamco_media_ingest WHERE id=$1 AND owner=$2 AND part=0',[id,owner])).rows[0];await normalize(Buffer.from(prefix.payload),mime);
      const inserted=await tx.query("INSERT INTO jamco_uploads(id,mime,data,owner) SELECT $1,$3,string_agg(payload,''::bytea ORDER BY part),$2 FROM jamco_media_ingest WHERE id=$1 AND owner=$2 AND mime=$3 AND total=$4 ON CONFLICT DO NOTHING RETURNING mime",[id,owner,mime,size]);
      if(!inserted.rows.length)throw new ApiError(409,'Kitambulisho cha faili kinatumika.');await tx.query('DELETE FROM jamco_media_ingest WHERE id=$1 AND owner=$2',[id,owner]);return uploaded(id,mime);
    }
    const parts = (await tx.query('SELECT part,payload FROM jamco_media_ingest WHERE id=$1 AND owner=$2 AND mime=$3 AND total=$4 ORDER BY part',
      [id, owner, mime, size])).rows;
    if (parts.length !== count || parts.some((entry, index) => entry.part !== index)) throw new ApiError(409, 'Baadhi ya sehemu za faili hazijafika.');
    const file = await normalize(Buffer.concat(parts.map(entry => Buffer.from(entry.payload))), mime);
    const inserted = await tx.query('INSERT INTO jamco_uploads(id,mime,data,owner) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING mime',
      [id, file.mime, file.bytes, owner]);
    const saved = inserted.rows[0] || (await tx.query('SELECT mime FROM jamco_uploads WHERE id=$1 AND owner=$2', [id, owner])).rows[0];
    if (!saved) throw new ApiError(409, 'Kitambulisho cha faili kinatumika.');
    await tx.query('DELETE FROM jamco_media_ingest WHERE id=$1 AND owner=$2', [id, owner]);
    return uploaded(id, saved.mime);
  });
}
