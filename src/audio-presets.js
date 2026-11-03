'use strict';
const PRESETS=Object.freeze({off:[0,0,0],balanced:[0,0,0],bass:[5,1,-1],voice:[-3,3,2],cinema:[3,0,2],music:[2,0,2]});
function gains(name,amount=100){const v=PRESETS[name]||PRESETS.off;const n=Math.max(0,Math.min(100,Number(amount)||0))/100;return v.map(x=>Number((x*n).toFixed(2)));}
module.exports={PRESETS,gains};
