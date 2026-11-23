import {randomUUID} from 'node:crypto';
import {ApiError} from './actions.js';

let engine;
async function getEngine() {
  engine ??= import('@spelling-creator/spellophone/node')
    .then(async library => ({voice:await library.createEspeak(), encode:library.encodeWav}))
    .catch(error => {engine = undefined;throw error;});
  return engine;
}

export async function synthesizeNotice(db, owner, input) {
  const text = typeof input.text==='string' ? input.text.trim() : '';
  if (text.length < 4 || text.length > 1400) {
    throw new ApiError(400, 'Tumia herufi 4 hadi 1,400 kwa toleo la sauti.');
  }
  const {voice, encode} = await getEngine();
  voice.setVoice(input.language==='en' ? 'en-gb' : 'sw');
  const result = voice.synthesize(text);
  const bytes = Buffer.from(encode(result.samples, result.sampleRate));
  if (bytes.length > 10_000_000) throw new ApiError(400, 'Punguza urefu wa maandishi ya kusomwa.');
  const id = randomUUID();
  await db.query('INSERT INTO jamco_uploads(id,mime,data,owner) VALUES($1,$2,$3,$4)',[id,'audio/wav',bytes,owner]);
  return {id,url:'/media/'+id,type:'audio'};
}
