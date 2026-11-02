'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { migrateUserData } = require('../migration-userdata');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tubeium-migrate-'));
try {
  const legacy = path.join(temp, 'YouPlus PC');
  const next = path.join(temp, 'Tubeium');
  fs.mkdirSync(legacy);
  fs.writeFileSync(path.join(legacy, 'settings.json'), '{"dashboardFontSize":145}');
  fs.writeFileSync(path.join(legacy, 'download-queue.json'), '{"version":1,"jobs":[]}');
  fs.writeFileSync(path.join(legacy, 'unknown.txt'), 'Do not copy me');
  assert.deepEqual(migrateUserData(temp, next).sort(), ['download-queue.json','settings.json']);
  assert.equal(fs.readFileSync(path.join(next,'settings.json'),'utf8'), '{"dashboardFontSize":145}');
  assert.equal(fs.existsSync(path.join(next,'unknown.txt')), false);
  fs.writeFileSync(path.join(next, 'settings.json'), '{"dashboardFontSize":170}');
  assert.deepEqual(migrateUserData(temp, next), []);
  assert.equal(fs.readFileSync(path.join(next,'settings.json'),'utf8'), '{"dashboardFontSize":170}');
  assert.equal(fs.readFileSync(path.join(legacy,'settings.json'),'utf8'), '{"dashboardFontSize":145}');
  console.log('PASS: preferences and download queue migrate without overwriting existing data.');
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
