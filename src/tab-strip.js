"use strict";
const $=id=>document.getElementById(id);
const yt=$('yt'),help=$('help'),launcher=$('launcher'),menu=$('launcher-menu');
yt.addEventListener('click',()=>window.tubeiumTabs.select('youtube'));
help.addEventListener('click',()=>window.tubeiumTabs.select('welcome'));
$('hide-tabs').addEventListener('click',()=>window.tubeiumTabs.hide());
$('show-tabs').addEventListener('click',()=>window.tubeiumTabs.show());
$('open-settings').addEventListener('click',()=>window.tubeiumTabs.openSettings());
launcher.addEventListener('click',()=>window.tubeiumTabs.toggleMenu());
$('menu-youtube').addEventListener('click',()=>window.tubeiumTabs.select('youtube'));
$('menu-settings').addEventListener('click',()=>window.tubeiumTabs.openSettings());
$('menu-downloads').addEventListener('click',()=>window.tubeiumTabs.openDownloads());
$('menu-help').addEventListener('click',()=>window.tubeiumTabs.select('welcome'));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && !menu.hidden){
    event.preventDefault();
    window.tubeiumTabs.toggleMenu();
    launcher.focus();
  }
});
window.tubeiumTabs.onState(state=>{
  const tab=typeof state==='string'?state:state.tab;
  const collapsed=typeof state==='object' && state.showHelpTabs===false;
  const menuOpen=collapsed && state?.menuOpen===true;
  document.documentElement.classList.toggle('collapsed',collapsed);
  yt.classList.toggle('active',tab==='youtube');
  help.classList.toggle('active',tab==='welcome');
  const allowHelp=state?.showSigninHelpButton!==false;
  help.hidden=!allowHelp;
  $('menu-help').hidden=!allowHelp;
  menu.hidden=!menuOpen;
  launcher.setAttribute('aria-expanded',String(menuOpen));
  launcher.setAttribute('aria-label',menuOpen?'Close Tubeium menu':'Open Tubeium menu');
});
