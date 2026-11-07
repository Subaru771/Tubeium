'use strict';
// Favorites are UI references to existing settings, never extra settings.
// Keep unknown and malformed keys out of the persistent file.
const MAX_FAVORITES=24;
function normalizeFavorites(input,allowedKeys){
  if(!Array.isArray(input))return [];
  const allowed=new Set(allowedKeys);
  const result=[];
  for(const key of input){
    if(typeof key!=='string'||!allowed.has(key)||result.includes(key))continue;
    result.push(key);
    if(result.length===MAX_FAVORITES)break;
  }
  return result;
}
module.exports={MAX_FAVORITES,normalizeFavorites};
