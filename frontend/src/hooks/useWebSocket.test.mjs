// Check mínimo: node src/hooks/useWebSocket.test.mjs
import assert from 'node:assert/strict';
import { buildKeystrokeEntry } from './useWebSocket.js';

// id único e incremental (key estable para el Inspector)
const a = buildKeystrokeEntry('a', 1000, 900);
const b = buildKeystrokeEntry('b', 1200, 1000);
assert.ok(Number.isInteger(a.id) && b.id === a.id + 1, 'id debe ser incremental');

// delta en ms
assert.equal(a.delta, 'Δ 100ms');
assert.equal(b.delta, 'Δ 200ms');

// delta cap 9999 (atacante idle no infla el número)
const idle = buildKeystrokeEntry('x', 100000, 1000);
assert.equal(idle.delta, 'Δ 9999ms');

// display de teclas especiales
assert.equal(buildKeystrokeEntry(' ', 0, 0).key, "'Space'");
assert.equal(buildKeystrokeEntry('\n', 0, 0).key, "'Enter'");
assert.equal(buildKeystrokeEntry('z', 0, 0).key, "'z'");

// scancode client-side (charCodeAt, per AGENTS.md)
assert.equal(a.scancode, 'code:97');

console.log('useWebSocket.test.mjs OK');
