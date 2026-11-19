'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, '..', 'src', name), 'utf8');

const preload = read('preload.js');
const begin = preload.indexOf('function tubeiumTouchSeekDelta(dx,width){');
const end = preload.indexOf('function initTubeiumPhoneGestures(){', begin);
assert(begin >= 0 && end > begin, 'Fullscreen seek calculation must be present');
const context = {};
vm.runInNewContext(preload.slice(begin, end), context);
const seek = context.tubeiumTouchSeekDelta;
assert.equal(seek(150, 600), 30, 'Quarter-width fullscreen swipe seeks 30 seconds');
assert.equal(seek(-150, 600), -30, 'Backward swipe seeks backwards');
assert.equal(seek(1000, 600), 90, 'Long swipe is capped at 90 seconds');
assert.equal(seek(-1000, 600), -90, 'Backward seek is capped');
assert.equal(seek(150, 100), 0, 'Tiny players cannot activate seek');
assert.equal(seek(NaN, 600), 0, 'Invalid drag distance is ignored');
assert(preload.includes("!location.pathname.startsWith('/shorts/')&&!!document.fullscreenElement"), 'Dragging seeks only in fullscreen, not Shorts');
assert(preload.includes('if(active.scrub){'), 'Seek must commit only after the gesture ends');
assert(preload.includes("if(event.cancelable!==false)event.preventDefault()"), 'Fullscreen swipe is permitted to claim touch events');
assert(preload.includes("if(inputClock()-lastTouchAt>=850)"), 'Web player ignores synthetic mouse events from touch');

let clock = 1000;
const classes = new Set(), listeners = new Map();
const root = {classList:{toggle(k,enabled){if(enabled)classes.add(k);else classes.delete(k);}},dataset:{}};
const document = {documentElement:root,addEventListener(name,callback){listeners.set(name,callback);}};
const window = {
  innerWidth:760,navigator:{maxTouchPoints:2},performance:{now:()=>clock},
  matchMedia(){return {matches:false,addEventListener(){}};},
  addEventListener(){}
};

vm.runInNewContext(read('touch-mode.js'), {window,document});
assert(classes.has('tubeium-touch') && classes.has('tubeium-touch-compact'), 'Touchscreen uses compact density');
const pointer = listeners.get('pointerdown');
assert.equal(typeof pointer, 'function');
pointer({pointerType:'touch'});
clock = 1120;
pointer({pointerType:'mouse'});
assert(classes.has('tubeium-touch'), 'Synthetic mouse must not switch to desktop mode');
clock = 1950;
pointer({pointerType:'mouse'});
assert(!classes.has('tubeium-touch'), 'Real mouse must restore desktop density');
pointer({pointerType:'pen'});
assert(classes.has('tubeium-touch'), 'Pen restores touch targets');
for (const name of ['downloads','settings','tab-strip','library','offline-player']) {
  const css = read(name+'.css');
  assert(css.includes('Touch Overhaul 2.0:'), name+' must provide an explicit touch layout');
  assert(css.includes('html.tubeium-touch'), name+' must scope changes to touch input');
}
console.log('PASS: Touch Overhaul 2.0 scrub math, hybrid pointer detection and responsive UI');
