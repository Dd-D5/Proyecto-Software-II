// Check mínimo: node src/components/history/forensicReport.test.mjs
import assert from 'node:assert/strict';
import { parseHistory, buildReport, reportToPdfDoc, filterEntries } from './forensicReport.mjs';

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

console.log('OK: forensicReport pasa todos los asserts');
