'use strict';
// Only accept community-trusted, non-original title submissions.
function communityTitle(raw){
  if(!raw || !Array.isArray(raw.titles))return null;
  const item=raw.titles.find(v=>v && typeof v.title==='string' && v.title.trim().length>=3 && v.title.length<=250 && !v.original && (v.locked===true || (Number.isFinite(v.votes) && v.votes>=0)));
  return item ? item.title.trim():null;
}
module.exports={communityTitle};
