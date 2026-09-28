// Check mínimo: node src/components/history/forensicReport.test.mjs
import assert from 'node:assert/strict';
import { parseHistory, buildReport, reportToPdfDoc, filterEntries, wsMessageToEntry } from './forensicReport.mjs';

const sample = `[ATTACK 2026-09-23T09:47:22.201199701-04:00]
service=ssh
event=connection
ip=10.0.0.5
mac=AA:BB:CC:DD:EE:FF
session_id=s1
payload="Nuevo intruso conectado al puerto 2222"
---
[ATTACK 2026-09-23T09:47:23.5-04:00]
service=ssh
event=io
ip=10.0.0.5
mac=AA:BB:CC:DD:EE:FF
session_id=s1
payload="a"
---
[ATTACK 2026-09-23T09:47:24.5-04:00]
service=ssh
event=io
ip=10.0.0.5
mac=AA:BB:CC:DD:EE:FF
session_id=s1
payload="b"
---
[ATTACK 2026-09-23T09:47:25.5-04:00]
service=ssh
event=command
ip=10.0.0.5
mac=AA:BB:CC:DD:EE:FF
session_id=s1
payload="nmap -sV 10.0.0.0/24"
---
[ATTACK 2026-09-23T09:50:00-04:00]
service=http
event=alert
ip=10.0.0.9
mac=11:22:33:44:55:66
session_id=s2
payload="Login sospechoso"
`;

const entries = parseHistory(sample);
assert.equal(entries.length, 5, 'debe parsear 5 entradas');
assert.equal(entries[0].ip, '10.0.0.5');
assert.equal(entries[0].ts, Date.parse('2026-09-23T09:47:22.201199701-04:00'));
assert.equal(entries[3].payload, 'nmap -sV 10.0.0.0/24', 'payload con espacios sin recortar');

const report = buildReport(entries);
assert.equal(report.summary.totalEvents, 5);
assert.equal(report.summary.uniqueIps, 2);
assert.equal(report.summary.totalSessions, 2);
assert.equal(report.summary.byService.ssh, 4);
assert.equal(report.sessions.length, 2);
assert.equal(report.sessions.find((s) => s.id === 's1').typed, 'ab');
assert.ok(report.sessions.find((s) => s.id === 's1').wpm > 0, 'WPM con 2+ teclas seguidas');
assert.ok(report.attackers[0].ip === '10.0.0.5');
assert.match(report.attackers[0].recommendation, /bloquear IP/i, 'regla de escaneo dispara recomendacion');
assert.match(report.attackers.find((a) => a.ip === '10.0.0.9').recommendation, /bajo impacto/i, 'sin comandos -> monitoreo');
assert.deepEqual(report.iocs.ips, ['10.0.0.5', '10.0.0.9']);
assert.ok(report.iocs.commands.includes('nmap -sV 10.0.0.0/24'));

assert.deepEqual(parseHistory(''), [], 'texto vacio -> sin entradas');
assert.deepEqual(buildReport([]).summary.totalEvents, 0, 'sin entradas -> reporte vacio sin crash');

// --- filterEntries ---
assert.equal(filterEntries(entries).length, 5, 'filtros vacios -> todo');
assert.equal(filterEntries(entries, { sessionId: 's1' }).length, 4, 'filtro por sesion');
assert.equal(filterEntries(entries, { ip: '10.0.0.9' }).length, 1, 'filtro por ip');
assert.equal(filterEntries(entries, { service: 'http' }).length, 1, 'filtro por servicio');
assert.equal(filterEntries(entries, { from: '2026-09-23T09:47:24', to: '2026-09-23T09:47:26' }).length, 2, 'rango fecha+hora');
assert.equal(filterEntries(entries, { sessionId: 's1', service: 'http' }).length, 0, 'filtros combinados sin match');
assert.equal(filterEntries(entries, { ip: '10.0.0.5', service: 'ssh' }).length, 4, 'filtros combinados con match');
assert.equal(buildReport(filterEntries(entries, { ip: '10.0.0.9' })).summary.totalEvents, 1, 'reporte filtrado no crashea');
assert.equal(buildReport(filterEntries(entries, { ip: 'nadie' })).summary.totalEvents, 0, 'sin resultados -> reporte vacio valido');

// --- reportToPdfDoc: estructura ---
const doc = reportToPdfDoc(report);
const docJson = JSON.stringify(doc.content);
for (const s of ['1. Resumen Ejecutivo', '2. Recomendaciones de Mitigación', '3. Análisis por Sesión', '4. Perfil de Atacantes', '5. Indicadores de Compromiso (IOCs)']) {
  assert.ok(docJson.includes(s), `seccion presente: ${s}`);
}
assert.ok(docJson.includes('Reporte Nº'), 'cuadro de metadatos con numero de reporte');
assert.ok(docJson.includes('USO INTERNO'), 'clasificacion presente');
assert.ok(docJson.includes('Ventana de actividad'), 'cuadro de resumen ejecutivo');
assert.ok(docJson.includes('AEGISTRAP SOC'), 'marca corporativa');
assert.ok(docJson.includes('nmap -sV 10.0.0.0/24'), 'comandos en el PDF');
assert.ok(docJson.includes('10.0.0.5'), 'IP en el PDF');
assert.ok(Array.isArray(reportToPdfDoc(buildReport([])).content), 'reporte vacio -> doc valido sin crash');

// --- e2e: doc a traves del motor real de pdfmake -> bytes %PDF ---
const { default: pdfMake } = await import('pdfmake');
const { default: fontContainer } = await import('pdfmake/build/fonts/Roboto.js');
for (const [name, { data }] of Object.entries(fontContainer.vfs)) {
  pdfMake.virtualfs.writeFileSync(name, data, 'base64');
}
pdfMake.addFonts(fontContainer.fonts);
const b64 = await pdfMake.createPdf(reportToPdfDoc(report)).getBase64();
const magic = Buffer.from(b64, 'base64').slice(0, 5).toString();
assert.equal(magic, '%PDF-', 'salida con magic %PDF-');
assert.ok(b64.length > 1000, 'PDF con contenido real');
const emptyB64 = await pdfMake.createPdf(reportToPdfDoc(buildReport([]))).getBase64();
assert.ok(Buffer.from(emptyB64, 'base64').slice(0, 5).toString() === '%PDF-', 'reporte vacio -> PDF valido (guard ul)');

// --- wsMessageToEntry: telemetría WS → entry compatible con parseHistory ---
// null para lo que no va al archivo
assert.equal(wsMessageToEntry({ type: 'system_stats', connections: {} }), null, 'system_stats → null');
assert.equal(wsMessageToEntry({ type: 'ban_added', service: 'security', payload: 'x' }), null, 'bans (security) → null');
assert.equal(wsMessageToEntry({ type: 'raw', payload: 'x', service: 'ssh' }), null, 'tipo desconocido → null');
assert.equal(wsMessageToEntry(null), null, 'null → null');

// mapping completo de un evento connection
const wsMsg = {
  service: 'ssh:2222', type: 'connection', payload: 'Nuevo intruso',
  ip: '10.0.0.5', mac: 'AA:BB:CC:DD:EE:FF', session_id: '127.0.0.1-123',
  timestamp: '2026-09-28T10:00:00.5-04:00',
  bot: 'human'
};
const wsEntry = wsMessageToEntry(wsMsg);
assert.equal(wsEntry.service, 'ssh:2222');
assert.equal(wsEntry.event, 'connection');
assert.equal(wsEntry.bot, 'human', 'la marca bot viaja en los entries vivos');
assert.equal(wsEntry.ip, '10.0.0.5');
assert.equal(wsEntry.session_id, '127.0.0.1-123');
assert.ok(wsEntry.ts > 0, 'ts numérico');
assert.equal(wsEntry.timestamp, wsMsg.timestamp, 'timestamp preservado');

// compatibilidad de shape: el entry WS alimenta el mismo buildReport que el parser
const fromWs = buildReport([wsEntry]);
assert.equal(fromWs.summary.totalEvents, 1);
assert.equal(fromWs.attackers[0].ip, '10.0.0.5');

// fallback sin timestamp: reloj del cliente (~ahora)
const noTs = wsMessageToEntry({ service: 'ssh:2222', type: 'io', payload: 'a', ip: '1.2.3.4', mac: 'm', session_id: 's1' });
assert.ok(Math.abs(noTs.ts - Date.now()) < 5000, 'sin timestamp → ts del cliente');

// --- marca bot= absorbida gratis por parseHistory y agregada por buildReport ---
const botSample = `[ATTACK 2026-09-28T11:00:00-04:00]
service=ssh:2222
event=connection
ip=10.0.0.7
mac=AA:BB:CC:DD:EE:FF
session_id=sBot
bot=bot
payload="x"
---
[ATTACK 2026-09-28T11:00:01-04:00]
service=ssh:2222
event=io
ip=10.0.0.7
mac=AA:BB:CC:DD:EE:FF
session_id=sBot
bot=bot
payload="a"
---
[ATTACK 2026-09-28T11:00:02-04:00]
service=ssh:2222
event=io
ip=10.0.0.8
mac=AA:BB:CC:DD:EE:FF
session_id=sHuman
bot=human
payload="z"
---`;
const botEntries = parseHistory(botSample);
assert.equal(botEntries[0].bot, 'bot', 'parser absorbe bot=bot');
assert.equal(botEntries[2].bot, 'human', 'parser absorbe bot=human');
const botReport = buildReport(botEntries);
assert.equal(botReport.sessions.length, 2, 'dos sesiones');
const sBot = botReport.sessions.find((s) => s.id === 'sBot');
const sHuman = botReport.sessions.find((s) => s.id === 'sHuman');
assert.equal(sBot.bot, 'bot', 'sesión marcada por moda de entries');
assert.equal(sHuman.bot, 'human');
assert.equal(botReport.attackers.find((a) => a.ip === '10.0.0.7').botSessions, 1, 'atacante con 1 sesión BOT');
assert.equal(botReport.attackers.find((a) => a.ip === '10.0.0.8').botSessions, 0, 'atacante humano sin sesiones BOT');

console.log('OK: forensicReport pasa todos los asserts');
