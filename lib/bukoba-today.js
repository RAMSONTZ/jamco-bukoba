export const bukobaDate = (date = new Date()) => new Intl.DateTimeFormat('sv-SE', {timeZone:'Africa/Dar_es_Salaam', year:'numeric', month:'2-digit', day:'2-digit'}).format(date);

export async function today(db) {
  const day = bukobaDate();
  const {rows} = await db.query(`SELECT slug, data FROM jamco_content
    WHERE state='published' AND live_at<=now() AND kind IN ('story','event','video')
    AND (NOT(data ? 'expiresAt') OR (data->>'expiresAt')::timestamptz>now())
    AND ((data->>'eventDate'=$1) OR (coalesce(data->>'eventDate','')='' AND (data->>'date'=$1 OR
      (data->>'date' IS NULL AND (live_at AT TIME ZONE 'Africa/Dar_es_Salaam')::date::text=$1))))
    ORDER BY coalesce((data->>'pinned')::boolean,false) DESC, data->>'eventTime' NULLS LAST,live_at DESC LIMIT 12`, [day]);
  return {day, items: rows.map(({slug,data}) => ({
    slug, title:data.title, eventDate:data.eventDate, eventTime:data.eventTime, category:data.category,
    location:data.location, pinned:data.pinned===true, phone:data.phone, directions:data.directions, booking:data.booking,
  }))};
}
