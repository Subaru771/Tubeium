'use strict';
// Runs in Tubeium's sandboxed local windows; YouTube has its own preload detector.
// Avoid changing the User-Agent or forcing mobile.youtube.com (which can break sign-in).
(() => {
  const view=window,doc=document,root=doc.documentElement;
  const queries=['(any-pointer: coarse)','(pointer: coarse)'].map(q=>view.matchMedia?.(q)).filter(Boolean);
  let observed=false;
  function update(){
    const touch=observed||Number(view.navigator?.maxTouchPoints||0)>0||queries.some(q=>q.matches);
    root.classList.toggle('tubeium-touch',touch);
    root.classList.toggle('tubeium-touch-compact',touch&&view.innerWidth<=820);
    root.dataset.tubeiumInput=touch?'touch':'desktop';
  }
  for(const q of queries)q.addEventListener?.('change',update);
  view.addEventListener('resize',update,{passive:true});
  doc.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch'||event.pointerType==='pen'){
      observed=true;update();
    }
  },{passive:true});
  update();
})();
