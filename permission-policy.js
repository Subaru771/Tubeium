'use strict';
const SAFE_HOST=/^(?:youtube\.com|[a-z\d-]+\.youtube\.com|google\.com|[a-z\d-]+\.google\.com|googleusercontent\.com|[a-z\d-]+\.googleusercontent\.com|gstatic\.com|[a-z\d-]+\.gstatic\.com)$/i;
function allowedHost(url){try{const u=new URL(url);return u.protocol==='https:' && SAFE_HOST.test(u.hostname);}catch{return false;}}
function websitePermission(permission,requestingUrl,settings){
 if(!allowedHost(requestingUrl))return false;
 switch(permission){
  case 'geolocation':return settings.allowLocation===true;
  case 'media':return settings.allowMedia===true;
  case 'notifications':return settings.allowNotifications===true;
  case 'fullscreen':case 'pointerLock':case 'clipboard-sanitized-write':return true;
  default:return false;
 }
}
module.exports={allowedHost,websitePermission};
