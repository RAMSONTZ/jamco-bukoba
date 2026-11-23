import {randomBytes} from 'node:crypto';
import {ApiError, audit, passwordHash, sha} from './actions.js';
import {directoryServices} from '../public/service-categories.js';

export const agentGrant='field-agent';
const invitePrefix='AGI-';
const profilePrefix='AGP-';
const clean=(value,length)=>typeof value==='string'?value.trim().slice(0,length):'';
const profileId=email=>profilePrefix+sha(email);
const fail=(status,message)=>{throw new ApiError(status,message);};
const address=value=>{
  const email=clean(value,220).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Weka barua pepe halali.');
  return email;
};
const phoneSyntax=/^\+?[\d(). -]{7,24}$/;
const isPhotoId=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

export function assertAgent(staff) {
  if(staff.role!=='viewer'||!staff.grants.includes(agentGrant))fail(403,'Akaunti ya wakala inahitajika.');
}

export async function inviteAgent(db,staff,value) {
  const email=address(value);
  const token=randomBytes(32).toString('hex');
  const expiresAt=new Date(Date.now()+48*60*60*1000).toISOString();
  await db.transaction(async tx=>{
    await tx.query('SELECT pg_advisory_xact_lock(5963118)');
    if((await tx.query('SELECT 1 FROM jamco_staff WHERE email=$1',[email])).rows.length)fail(409,'Akaunti ya barua pepe hii tayari ipo.');
    await tx.query("UPDATE jamco_requests SET status='closed' WHERE email=$1 AND reference LIKE 'AGI-%' AND status='received'",[email]);
    await tx.query("INSERT INTO jamco_requests(reference,kind,email,data) VALUES($1,'tip',$2,$3)",[invitePrefix+sha(token),email,{expiresAt}]);
    await audit(tx,staff.email,'staff.agent.invited',email);
  });
  return {token,expiresAt};
}

export async function acceptAgent(db,input) {
  const email=address(input.email);
  const password=clean(input.password,220);
  if(password.length<14)fail(400,'Nenosiri liwe na angalau herufi 14.');
  if(typeof input.token!=='string'||!/^[a-f0-9]{64}$/.test(input.token))fail(400,'Kiungo cha mwaliko si halali.');
  const reference=invitePrefix+sha(input.token);
  const hash=await passwordHash(password);
  await db.transaction(async tx=>{
    const invite=(await tx.query("SELECT data FROM jamco_requests WHERE reference=$1 AND email=$2 AND status='received' FOR UPDATE",[reference,email])).rows[0];
    if(!invite||Date.parse(invite.data.expiresAt)<=Date.now())fail(409,'Mwaliko umekwisha au umeshatumika.');
    const created=await tx.query("INSERT INTO jamco_staff(email,password,role,permissions) VALUES($1,$2,'viewer',$3) ON CONFLICT DO NOTHING RETURNING email",[email,hash,JSON.stringify([agentGrant])]);
    if(!created.rows.length)fail(409,'Akaunti tayari ipo.');
    await tx.query("UPDATE jamco_requests SET status='closed' WHERE reference=$1",[reference]);
    await audit(tx,email,'staff.agent.activated',email);
  });
  return {message:'Akaunti imefunguliwa. Ingia na usanidi uthibitisho wa hatua mbili.'};
}

export async function agentRoster(db) {
  const {rows}=await db.query("SELECT email,active,(totp_secret IS NOT NULL) AS mfa FROM jamco_staff WHERE role='viewer' AND permissions @> $1::jsonb ORDER BY email",[JSON.stringify([agentGrant])]);
  return {items:rows};
}
export async function updateAgent(db,staff,input) {
  const email=address(input.email);
  if(typeof input.active!=='boolean')fail(400,'Chagua hali ya akaunti.');
  await db.transaction(async tx=>{
    const updated=await tx.query("UPDATE jamco_staff SET active=$2 WHERE email=$1 AND role='viewer' AND permissions @> $3::jsonb RETURNING email",[email,input.active,JSON.stringify([agentGrant])]);
    if(!updated.rows.length)fail(404,'Akaunti ya wakala haipo.');
    if(!input.active)await tx.query('DELETE FROM jamco_sessions WHERE email=$1',[email]);
    await audit(tx,staff.email,'staff.agent.active.'+input.active,email);
  });
  return {message:'Hali ya wakala imehifadhiwa.'};
}

export async function agentProfile(db,staff) {
  const profile=(await db.query('SELECT data FROM jamco_requests WHERE reference=$1 AND email=$2',[profileId(staff.email),staff.email])).rows[0]?.data||{};
  const listings=(await db.query(`SELECT r.reference,r.status,r.data->>'name' AS name,r.data->>'service' AS service,
    CASE WHEN c.state='published' AND c.live_at<=now() AND (NOT(c.data ? 'expiresAt') OR (c.data->>'expiresAt')::timestamptz>now()) THEN c.slug END AS slug
    FROM jamco_requests r LEFT JOIN jamco_content c ON c.slug=r.data->>'publicSlug'
    WHERE r.email=$1 AND r.reference LIKE 'JC-%' AND r.data->>'agent'='true' ORDER BY r.created_at DESC LIMIT 50`,[staff.email])).rows;
  return {profile,listings};
}
export async function saveAgentProfile(db,staff,input) {
  const name=clean(input.name,100),location=clean(input.location,100),bio=clean(input.bio,500);
  const photoId=clean(input.photoId,36);
  if(name.length<2)fail(400,'Weka jina la wasifu.');
  if(photoId){
    if(!isPhotoId.test(photoId)||!(await db.query("SELECT 1 FROM jamco_uploads WHERE id=$1 AND owner=$2 AND mime LIKE 'image/%'",[photoId,staff.email])).rows.length)fail(403,'Picha hii si yako.');
  }
  const profile={name,location,bio,photoId};
  await db.query("INSERT INTO jamco_requests(reference,kind,email,status,data) VALUES($1,'tip',$2,'closed',$3) ON CONFLICT(reference) DO UPDATE SET data=excluded.data",[profileId(staff.email),staff.email,profile]);
  return {message:'Wasifu umehifadhiwa.'};
}
export async function submitAgentListing(db,staff,input) {
  const name=clean(input.name,100),location=clean(input.location,100),message=clean(input.message,3000);
  const phone=clean(input.phone,24),service=input.service,photoId=clean(input.photoId,36);
  if(input.consent!==true||name.length<2||!location||message.length<10||!directoryServices.includes(service))fail(400,'Jaza jina, eneo, maelezo na ridhaa ya mtoa huduma.');
  if(phone&&!phoneSyntax.test(phone))fail(400,'Namba ya simu si halali.');
  if(photoId&&(!isPhotoId.test(photoId)||!(await db.query("SELECT 1 FROM jamco_uploads WHERE id=$1 AND owner=$2 AND mime LIKE 'image/%'",[photoId,staff.email])).rows.length))fail(403,'Picha hii si yako.');
  const reference='JC-'+randomBytes(8).toString('hex').toUpperCase();
  await db.query("INSERT INTO jamco_requests(reference,kind,email,data) VALUES($1,'tip',$2,$3)",
    [reference,staff.email,{name,location,message,phone,service,photoId,delivery:input.delivery===true,publicContact:input.publicContact===true,agent:true}]);
  return {reference,message:'Ombi limetumwa kwa JAMCO.'};
}
