'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'web', 'app.js'), 'utf8');
const start = src.indexOf("const MK=Object.entries");
const end = src.indexOf('function sim(a,b)');
if (start < 0 || end < 0) {
  console.error('Could not extract parser from app.js');
  process.exit(1);
}
const code = src.slice(start, end) + '\nmodule.exports={parseHWB,toHW,hwbFlatten};';
const mod = {exports: {}};
new Function('module', 'exports', code)(mod, mod.exports);
const {parseHWB, toHW} = mod.exports;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

assert(toHW('0.45') === 1.45, 'profit 0.45 -> 1.45');
assert(toHW('.45') === 1.45, 'profit .45 -> 1.45');
assert(toHW('1.00') === 2, 'profit 1.00 -> 2.00');
assert(toHW('1.55') === 1.55, 'decimal 1.55 stays 1.55');
assert(toHW('2.10') === 2.10, 'decimal 2.10 stays 2.10');

const classic = `Hollywoodbets
Double Chance - Home or Draw
0.45
Kaizer Chiefs vs Orlando Pirates
30 Oct 2026 | 19:30
Full Time Result - Mamelodi Sundowns
1.55
Mamelodi Sundowns vs Stellenbosch FC
30 Oct 2026 | 20:00
Multiple Accumulator
Final Odds
2.25`;

const legs = parseHWB(classic);
assert(legs && legs.length === 2, 'classic slip keeps both selections (got ' + (legs && legs.length) + ')');
if (legs && legs.length === 2) {
  assert(legs[0].sel.toLowerCase().includes('home') || legs[0].sel.toLowerCase().includes('draw'), 'leg 0 pick is Home or Draw: ' + legs[0].sel);
  assert(Math.abs(legs[0].odds - 1.45) < 0.001, 'leg 0 profit odds converted to 1.45, got ' + legs[0].odds);
  assert(/chiefs/i.test(legs[0].match) && /pirates/i.test(legs[0].match), 'leg 0 fixture Chiefs vs Pirates: ' + legs[0].match);
  assert(/sundowns/i.test(legs[1].sel), 'leg 1 pick Sundowns: ' + legs[1].sel);
  assert(Math.abs(legs[1].odds - 1.55) < 0.001, 'leg 1 odds 1.55, got ' + legs[1].odds);
  assert(/sundowns/i.test(legs[1].match) && /stellenbosch/i.test(legs[1].match), 'leg 1 fixture Sundowns vs Stellenbosch: ' + legs[1].match);
  assert(legs[0].match !== legs[1].match, 'fixtures stay associated with the correct selections');
}

const stacked = `Double Chance
Home or Draw
1.45
Kaizer Chiefs vs Orlando Pirates
Full Time Result
Mamelodi Sundowns
1.55
Mamelodi Sundowns vs Stellenbosch FC`;
const legs2 = parseHWB(stacked);
assert(legs2 && legs2.length === 2, 'stacked market/pick layout keeps both (got ' + (legs2 && legs2.length) + ')');
if (legs2 && legs2.length === 2) {
  assert(/chiefs/i.test(legs2[0].match), 'stacked leg 0 fixture: ' + legs2[0].match);
  assert(/stellenbosch/i.test(legs2[1].match), 'stacked leg 1 fixture: ' + legs2[1].match);
  assert(Math.abs(legs2[0].odds - 1.45) < 0.001, 'stacked leg 0 odds');
  assert(Math.abs(legs2[1].odds - 1.55) < 0.001, 'stacked leg 1 odds');
}

const ocr = `Double Chance - Home or Draw
1.45
Kaizer Chiefs
vs
Orlando Pirates
Full Time Result - Mamelodi Sundowns
1.55
Mamelodi Sundowns vs Stellenbosch FC`;
const legs3 = parseHWB(ocr);
assert(legs3 && legs3.length === 2, 'OCR split vs keeps both (got ' + (legs3 && legs3.length) + ')');
if (legs3 && legs3.length === 2) {
  assert(/chiefs/i.test(legs3[0].match) && /pirates/i.test(legs3[0].match), 'OCR fixture joined: ' + legs3[0].match);
  assert(/stellenbosch/i.test(legs3[1].match), 'OCR second fixture: ' + legs3[1].match);
}

const inline = `Double Chance - Home or Draw 0.45 Kaizer Chiefs vs Orlando Pirates
Full Time Result - Mamelodi Sundowns 1.55 Mamelodi Sundowns vs Stellenbosch FC`;
const legs4 = parseHWB(inline);
assert(legs4 && legs4.length === 2, 'inline mashed line keeps both (got ' + (legs4 && legs4.length) + ')');
if (legs4 && legs4.length === 2) {
  assert(Math.abs(legs4[0].odds - 1.45) < 0.001, 'inline profit converted, got ' + legs4[0].odds);
  assert(/pirates/i.test(legs4[0].match), 'inline fixture 0: ' + legs4[0].match);
  assert(/stellenbosch/i.test(legs4[1].match), 'inline fixture 1: ' + legs4[1].match);
}

// Real OCR text captured from the two Hollywoodbets screenshots supplied for v31.
const ocrStart = src.indexOf('function ocrClean(t){');
const ocrEnd = src.indexOf('\nlet tessP;', ocrStart);
const cleanMod = {exports:{}};
new Function('module', 'exports', src.slice(ocrStart, ocrEnd) + '\nmodule.exports=ocrClean;')(cleanMod, cleanMod.exports);
const ocrClean = cleanMod.exports;
const screenshot1 = ocrClean(`F Myeets
=D
o CD ID
7
Full Time ~ TOTTENHAM
0.50
‘TOTTENHAM vs COVENTRY
18 October 2026 12:00
Full Time ~ NOTTINGHAM
130
IPSWICH vs NOTTINGHAM
23 October 2026 | 2:00
Full Time - MAN CITY
0.70
ASTON VILA vs MAN CITY
24 October 2026 18:30
Multiple Accumulator
Odds
Bonus
Final Odds
487
3%
501`);
const real1 = parseHWB(screenshot1);
assert(real1 && real1.length === 3, 'actual 3-leg screenshot OCR yields all 3 fixtures (got ' + (real1 && real1.length) + ')');
if (real1 && real1.length === 3) {
  assert(/tottenham/i.test(real1[0].match) && /coventry/i.test(real1[0].match), 'actual screenshot leg 1 has both teams');
  assert(real1[0].home_team==='TOTTENHAM' && real1[0].away_team==='COVENTRY', 'fixture also carries explicit home_team and away_team fields');
  assert(/ipswich/i.test(real1[1].match) && /nottingham/i.test(real1[1].match), 'actual screenshot leg 2 has both teams');
  assert(/aston vila/i.test(real1[2].match) && /man city/i.test(real1[2].match), 'actual screenshot leg 3 has both teams');
  assert(real1[0].odds === 1.50 && real1[1].odds === 1.30 && real1[2].odds === 1.70, 'actual screenshot odds remain paired and converted correctly');
}
const screenshot2 = ocrClean(`Double Chance - MAN CITY ORDRAW 0.16
MAN CITY vs BRIGHTON
31 October 2026 17:00
Full Time - SUNDOWNS 0.33
SUNDOWNS vs DURBAN CITY FC
31 October 2026 | 20:15
Multiple Accumulator
Odds | Bonus Final Odds
0.54 25% ~ 0.56`);
const real2 = parseHWB(screenshot2);
assert(real2 && real2.length === 2, 'actual 2-leg screenshot OCR yields both fixtures (got ' + (real2 && real2.length) + ')');
if (real2 && real2.length === 2) {
  assert(/man city/i.test(real2[0].match) && /brighton/i.test(real2[0].match), 'actual screenshot leg 1 has both teams');
  assert(real2[0].home_team==='MAN CITY' && real2[0].away_team==='BRIGHTON', 'second screenshot carries both structured team fields');
  assert(/sundowns/i.test(real2[1].match) && /durban city fc/i.test(real2[1].match), 'actual screenshot leg 2 has both teams');
  assert(real2[0].odds === 1.16 && real2[1].odds === 1.33, 'actual screenshot odds remain paired and converted correctly');
}

if (process.exitCode) {
  console.error('Some Hollywoodbets parser tests failed');
  process.exit(1);
}
console.log('All Hollywoodbets parser tests passed');
