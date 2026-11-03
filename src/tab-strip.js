"use strict";
const yt=document.getElementById('yt'),help=document.getElementById('help');
yt.addEventListener('click',()=>window.tubeiumTabs.select('youtube'));
help.addEventListener('click',()=>window.tubeiumTabs.select('welcome'));
window.tubeiumTabs.onState(active=>{yt.classList.toggle('active',active==='youtube');help.classList.toggle('active',active==='welcome');});
