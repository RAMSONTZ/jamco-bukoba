const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export async function studioAnalytics(db,d={}){
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Dar_es_Salaam'}).format(new Date());
 let end=validDate(d.end)&&d.end<=today?d.end:today;
 let days=[1,7,30,90].includes(Number(d.days))?Number(d.days):30;
 let start=validDate(d.start)&&d.start<=end&&Date.parse(end)-Date.parse(d.start)<=365*86400000?d.start:new Date(Date.parse(end)-(days-1)*86400000).toISOString().slice(0,10);
 const {rows}=await db.query(`WITH days AS (SELECT generate_series($1::date,$2::date,interval '1 day')::date AS day),
 events AS (
 SELECT (created_at AT TIME ZONE 'Africa/Dar_es_Salaam')::date AS day,'members' AS metric FROM jamco_community_users
 UNION ALL SELECT (created_at AT TIME ZONE 'Africa/Dar_es_Salaam')::date,'likes' FROM jamco_social_likes
 UNION ALL SELECT (created_at AT TIME ZONE 'Africa/Dar_es_Salaam')::date,'comments' FROM jamco_comments WHERE NOT hidden
 UNION ALL SELECT (happened_at AT TIME ZONE 'Africa/Dar_es_Salaam')::date,'logins' FROM jamco_audit WHERE action='member.login'
 UNION ALL SELECT v.day,'views' FROM jamco_views v JOIN jamco_content c ON c.slug=v.slug WHERE c.kind='video' OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(c.data->'media','[]'::jsonb)) m WHERE m->>'type'='video')
 ) SELECT to_char(days.day,'YYYY-MM-DD') AS day,count(*) FILTER(WHERE metric='members')::int members,count(*) FILTER(WHERE metric='likes')::int likes,count(*) FILTER(WHERE metric='comments')::int comments,count(*) FILTER(WHERE metric='logins')::int logins,count(*) FILTER(WHERE metric='views')::int views FROM days LEFT JOIN events USING(day) GROUP BY days.day ORDER BY days.day`,[start,end]);
 const first=(await db.query("SELECT min(happened_at) AS first FROM jamco_audit WHERE action='member.login'")).rows[0].first;
 return {start,end,series:rows,loginTrackingSince:first,definitions:{members:'Akaunti mpya',likes:'Likes zilizopo, kwa tarehe ya kuundwa',comments:'Maoni yanayoonekana, kwa tarehe ya kuundwa',views:'Mitazamo ya video iliyorekodiwa kwa mwanachama kwa siku',logins:'Logins za wanachama zilizorekodiwa; historia ya awali haikusanywi'}};
}
