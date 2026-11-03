'use strict';
const bindings=Object.freeze({0:'toggle-play',4:'seek-back',5:'seek-forward',12:'volume-up',13:'volume-down'});
function pressedActions(buttons,previous=[]){if(!Array.isArray(buttons))return [];return Object.entries(bindings).filter(([index])=>!!buttons[index]&&!previous[index]).map(([,action])=>action);}
module.exports={pressedActions};
