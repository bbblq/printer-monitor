// Regression test for ricoh binary-state supplies (MPC 3054, etc.).// Mirrors the parser in src/lib/snmp.ts so we can validate behavior without booting the full module.
const assert = require('node:assert/strict');

function classify(desc) {
  const lower = desc.toLowerCase();
  if (lower.includes('waste') || lower.includes('A')) return 'waste';
  if (lower.includes('toner') || lower.includes('A') || lower.includes('cartridge') ||
      lower.includes('black') || lower.includes('cyan') || lower.includes('magenta') || lower.includes('yellow')) return 'toner';
  return 'other';
}

function parseRow(row, rule) {
  const originalLevel = row.level;
  let level = row.level;
  let max = row.max;
  let percent = 0;
  if (level === -3) percent = 100;
  else if (level === -2 || max === -2) percent = 50;
  else if (level === -1) percent = 0;
  else if (max > 0 && level >= 0) percent = Math.round((level / max) * 100);
  else if (max <= 0 && level > 0 && level <= 100) percent = level;
  if (percent < 0) percent = 0;
  if (percent > 100) percent = 100;
  const type = classify(row.desc);
  const isRicoh = rule && rule.brand && rule.brand.toLowerCase() === 'ricoh';
  const isBinary = originalLevel === -3 || (isRicoh && type === 'toner' && originalLevel === 0 && max > 0);
  return { color: row.desc, level, max, percent, type, isBinary };
}

function test(name, fn) {
  try { fn(); console.log('ok  -', name); }
  catch (e) { console.error('FAIL -', name); console.error(e); process.exitCode = 1; }
}

const ricoh = { brand: 'ricoh' };
  const canon = { brand: 'canon' };

test('Ricoh toner at 0% is binary exhausted (matches MPC 3054 raw data)', () => {
  const out = parseRow({ desc: 'cartridge', level: 0, max: 100 }, ricoh);
  assert.equal(out.isBinary, true);
  assert.equal(out.percent, 0);
  assert.equal(out.type, 'toner');
});

test('Non-Ricoh toner at 0% stays percentage (no false positive)', () => {
  const out = parseRow({ desc: 'Black Toner', level: 0, max: 100 }, canon);
  assert.equal(out.isBinary, false);
  assert.equal(out.percent, 0);
});

test('Ricoh -3 means binary some_remaining', () => {
  const out = parseRow({ desc: 'Toner', level: -3, max: 100 }, ricoh);
  assert.equal(out.isBinary, true);
  assert.equal(out.percent, 100);
});

test('Ricoh -2 stays non-binary unknown', () => {
  const out = parseRow({ desc: 'Toner', level: -2, max: 100 }, ricoh);
  assert.equal(out.isBinary, false);
  assert.equal(out.percent, 50);
});

test('Ricoh toner with positive level is not binary', () => {
  const out = parseRow({ desc: 'Toner', level: 80, max: 100 }, ricoh);
  assert.equal(out.isBinary, false);
  assert.equal(out.percent, 80);
});

console.log('done');
