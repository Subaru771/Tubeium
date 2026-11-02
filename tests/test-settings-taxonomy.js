'use strict';
const assert = require('node:assert/strict');
const { DEFAULTS, metadata, normalize, publicGroups } = require('../settings-schema');
const groups = publicGroups();
const found = groups.flatMap(g => g.settings);
assert.equal(groups.length, 15);
assert.equal(found.length, 201);
assert.equal(new Set(found.map(m=>m.key)).size, 201);
assert.deepEqual(new Set(found.map(m=>m.key)), new Set(Object.keys(DEFAULTS)));
assert.deepEqual(new Set(found.map(m=>m.key)), new Set(Object.keys(metadata)));
for (const g of groups) for(const m of g.settings){
  assert.equal(m.group, g.id);
  assert.equal(typeof m.section, 'string');
  assert.ok(m.section.length>1);
  assert.deepEqual(normalize({[m.key]:m.defaultValue})[m.key], m.defaultValue);
}
function category(k){return metadata[k].group;}
assert.equal(category('hideWatchedProgress'),'appearance');
assert.equal(category('hidePlayerGradient'),'appearance');
assert.equal(category('disableAutoplayPreviews'),'home');
assert.equal(category('hideSuggestedSearches'),'home');
assert.equal(category('disableDoubleTapSkip'),'controls');
assert.equal(category('hideVideoAnnotations'),'watch');
assert.equal(category('highContrastText'),'accessibility');
assert.equal(category('hideToastMessages'),'general');
assert.equal(category('autoClearCache'),'privacy');
assert.equal(category('showDislikes'),'watch');
assert.equal(category('speedStep'),'shortcuts');
assert.equal(category('hideShorts'),'shorts');
assert.equal(category('toolQuality'),'controls');
assert.equal(category('downloadSubLanguage'),'downloads');
console.log('PASS: all 201 settings categorized once across 15 sections, with unchanged defaults.');
