'use strict';
// Only controls in this allowlist are temporarily affected; no settings are overwritten.
const PROFILES=Object.freeze({
 cinema:{autoTheater:true,hideComments:true,hideRelated:true,dimPageBackground:true},
 music:{hideShorts:true,hideComments:true,autoTheater:false},
 study:{hideComments:true,hideRelated:true,hideEndScreens:true,hideCards:true,autoCaptions:true},
 gaming:{autoTheater:true,hideComments:true,hideLiveChat:false},
 focus:{hideComments:true,hideRelated:true,hideSidebar:true,hideShorts:true,hideEndScreens:true},
});
function chooseProfile(mode,{title='',channel='',url=''}={}){
 if(mode==='off')return null;
 if(Object.hasOwn(PROFILES,mode))return mode;
 if(mode!=='auto')return null;
 const s=(title+' '+channel).toLowerCase();
 if(/\b(study|lecture|tutorial|lesson|course|explained|exam|class)\b/.test(s))return 'study';
 if(/\b(music|official audio|lyrics|album|playlist|instrumental|soundtrack|ost)\b/.test(s))return 'music';
 if(/\b(gameplay|walkthrough|speedrun|let.s play|boss fight|gaming)\b/.test(s))return 'gaming';
 if(/\b(trailer|movie|film|cinematic|documentary)\b/.test(s))return 'cinema';
 return null;
}
function overlay(settings,meta={}){const id=chooseProfile(settings.smartProfileMode,meta);return {id,settings:id?{...settings,...PROFILES[id]}:{...settings}};}
module.exports={PROFILES,chooseProfile,overlay};
