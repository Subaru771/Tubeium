"use strict";
const yt=document.getElementById('yt'),help=document.getElementById('help');
yt.addEventListener('click',()=>window.tubeiumTabs.select('youtube'));
help.addEventListener('click',()=>window.tubeiumTabs.select('welcome'));
document.getElementById('hide-tabs').addEventListener('click',()=>window.tubeiumTabs.hide());
document.getElementById('show-tabs').addEventListener('click',()=>window.tubeiumTabs.show());
window.tubeiumTabs.onState(state=>{
  const tab=typeof state==='string'?state:state.tab;
  const collapsed=typeof state==='object' && state.showHelpTabs===false;
  document.documentElement.classList.toggle('collapsed',collapsed);
  yt.classList.toggle('active',tab==='youtube');
  help.classList.toggle('active',tab==='welcome');
});
