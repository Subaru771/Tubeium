'use strict';
// Local Tubeium pages adapt to the *current* input instead of permanently
// staying in tablet mode just because a mouse-equipped PC has a touchscreen.
(() => {
 const view=window,doc=document,root=doc.documentElement;
 const queries=['(any-pointer: coarse)','(pointer: coarse)'].map(q=>view.matchMedia?.(q)).filter(Boolean);
 let input=null,enabled=null,compact=null;
 function update(){
  const hasTouch=Number(view.navigator?.maxTouchPoints||0)>0||queries.some(q=>q.matches);
  const touch=input==='touch'||(input===null&&hasTouch);
  const narrow=touch&&view.innerWidth<=820;
  if(touch!==enabled){root.classList.toggle('tubeium-touch',touch);enabled=touch;}
  if(narrow!==compact){root.classList.toggle('tubeium-touch-compact',narrow);compact=narrow;}
  root.dataset.tubeiumInput=touch?'touch':'desktop';
 }
 for(const query of queries)query.addEventListener?.('change',update);
 view.addEventListener('resize',update,{passive:true});
 doc.addEventListener('pointerdown',event=>{
  if(event.pointerType==='touch'||event.pointerType==='pen')input='touch';
  else if(event.pointerType==='mouse')input='mouse';
  else return;
  update();
 },{passive:true});
 update();
})();
