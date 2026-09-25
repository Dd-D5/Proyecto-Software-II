// ponytail: parser asume el formato actual de attack_history.txt (key=value + payload entre comillas);
// si el backend cambia el formato, esto se rompe silenciosamente — upgrade: que el backend emita lineas JSON.

export function fetchAttackHistory() {
  const host = window.location.hostname || '127.0.0.1';
  return fetch(`http://${host}:8080/logs/attacks`, { mode: 'cors' }).then((r) => {
    if (!r.ok) throw new Error('No hay historial disponible');
    return r.text();
  });
}

// ponytail: limites from/to interpretados en la zona horaria local del operador (las entradas traen su
// propio offset); suficiente para analisis local — si es multi-zona, normalizar todo a UTC aqui.
export function filterEntries(entries, { sessionId = '', ip = '', service = '', from = '', to = '' } = {}) {
  const fromTs = from ? new Date(from).getTime() : -Infinity;
  const toTs = to ? new Date(to).getTime() : Infinity;
  return entries.filter((e) =>
    (!sessionId || e.session_id === sessionId) &&
    (!ip || e.ip === ip) &&
    (!service || e.service === service) &&
    e.ts >= fromTs && e.ts <= toTs
  );
}

const SCAN_RE = /nmap|masscan|zmap|nessus|dirb|gobuster|nikto/i;
const ESCALATION_RE = /sudo|\bsu\b|passwd|\/etc\/shadow|chmod|curl.+\|.+(ba)?sh|wget.+\|.+(ba)?sh/i;

// ponytail: layout del PDF es una segunda representacion del reporte (documento vector, no clon de la UI);
// si agregas una seccion nueva, se toca en buildReport + ForensicReportView + reportToPdfDoc.
const GRID = {
  hLineColor: () => '#dddddd',
  vLineColor: () => '#dddddd',
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  paddingLeft: () => 6,
  paddingRight: () => 6,
  paddingTop: () => 4,
  paddingBottom: () => 4
};

export function reportToPdfDoc(r) {
  const d = (x) => (x ? x.toLocaleString() : '—');
  const H = (text) => ({ text, style: 'h1' });
  const now = new Date();
  const reportNo = `RF-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${now.toISOString().slice(11, 16).replace(':', '')}`;
  const metaRow = (label, value) => [{ text: label, style: 'metaLabel' }, value];
  const zebra = (cells, i) => cells.map((c) => ({ text: c, fillColor: i % 2 ? '#f7f7f7' : undefined }));
  const content = [
    { text: 'AEGISTRAP SOC · HONEYPOT INTELLIGENCE', style: 'brand' },
    { text: 'REPORTE DE ATAQUES', style: 'title' },
    { text: 'Documento de análisis post-incidente', style: 'subtitle' },
    {
      table: {
        widths: [140, '*'],
        body: [
          metaRow('Reporte Nº', reportNo),
          metaRow('Fecha de generación', d(now)),
          metaRow('Ventana analizada', `${d(r.summary.first)} → ${d(r.summary.last)}`),
          metaRow('Fuente de datos', 'attack_history.txt (telemetría honeypots)'),
          metaRow('Generado por', 'AegisTrap Dashboard'),
          metaRow('Clasificación', { text: 'USO INTERNO', bold: true })
        ]
      },
      layout: GRID,
      marginBottom: 4
    },
    H('1. Resumen Ejecutivo'),
    {
      table: {
        widths: [170, '*'],
        body: [
          [{ text: 'Métrica', style: 'th' }, { text: 'Valor', style: 'th' }],
          ...[
            ['Eventos totales', String(r.summary.totalEvents)],
            ['IPs atacantes únicas', String(r.summary.uniqueIps)],
            ['Sesiones registradas', String(r.summary.totalSessions)],
            ['Servicios afectados', String(Object.keys(r.summary.byService).length)],
            ['Ventana de actividad', `${d(r.summary.first)} → ${d(r.summary.last)}`],
            ['Desglose por servicio', Object.entries(r.summary.byService).map(([k, v]) => `${k} (${v})`).join(', ') || '—'],
            ['Desglose por evento', Object.entries(r.summary.byEvent).map(([k, v]) => `${k} (${v})`).join(', ') || '—']
          ].map(zebra)
        ]
      },
      layout: GRID
    },
    H('2. Recomendaciones de Mitigación'),
    // pdfmake no acepta ul: [] — con filtros sin resultados mostramos nota
    ...(r.attackers.length
      ? [{ ul: r.attackers.map((a) => ({ text: [{ text: `${a.ip} — `, bold: true }, { text: a.recommendation }] })) }]
      : [{ text: 'Sin actividad con los filtros aplicados.', color: '#777777' }]),
    H('3. Análisis por Sesión'),
    ...r.sessions.flatMap((s) => [
      {
        table: {
          widths: ['*'],
          body: [[{
            fillColor: '#fafafa',
            stack: [
              {
                text: [
                  { text: `[${s.service}] ${s.ip}`, bold: true },
                  { text: ` (${s.mac}) · ${d(s.start)} → ${d(s.end)} · ${s.commands.length} comandos · ${s.alerts} alertas${s.wpm > 0 ? ` · ${s.wpm} WPM` : ''}` }
                ]
              },
              ...(s.commands.length ? [{ text: `Comandos: ${s.commands.join(' ; ')}`, style: 'mono' }] : []),
              ...(s.typed ? [{ text: `Texto tecleado: ${s.typed}`, style: 'mono' }] : [])
            ]
          }]]
        },
        layout: GRID,
        marginBottom: 8
      }
    ]),
    H('4. Perfil de Atacantes'),
    {
      table: {
        headerRow: true,
        widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          ['IP', 'MAC', 'Servicios', 'Sesiones', 'Comandos', 'Alertas', 'Primera vista', 'Última vista'].map((t) => ({ text: t, style: 'th' })),
          ...r.attackers.map((a, i) => zebra([a.ip, a.macs.join(', '), a.services.join(', '), String(a.sessionCount), String(a.commands.length), String(a.alerts), d(a.firstSeen), d(a.lastSeen)], i + 1)),
          ...(!r.attackers.length ? [[{ text: 'Sin resultados con los filtros aplicados.', colSpan: 8, alignment: 'center', color: '#777777' }, '', '', '', '', '', '', '']] : [])
        ]
      },
      layout: GRID
    },
    H('5. Indicadores de Compromiso (IOCs)'),
    {
      table: {
        widths: [140, '*'],
        body: [
          [{ text: 'Tipo', style: 'th' }, { text: 'Indicadores', style: 'th' }],
          zebra(['IPs', r.iocs.ips.join(', ') || '—'], 1),
          zebra(['MACs', r.iocs.macs.join(', ') || '—'], 0),
          zebra(['Comandos observados', r.iocs.commands.join(' ; ') || '—'], 1)
        ]
      },
      layout: GRID
    },
    { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 0.5, lineColor: '#cccccc' }], margin: [0, 16, 0, 6] },
    { text: 'Reporte derivado de attack_history.txt. Refleja la actividad registrada por los honeypots y no constituye evidencia legal certificada.', style: 'disclaimer' }
  ];
  return {
    info: { title: 'Reporte Forense Post-Ataque', author: 'AegisTrap SOC', creator: 'AegisTrap Dashboard', subject: 'Análisis post-ataque' },
    pageSize: 'A4',
    pageMargins: [40, 55, 40, 50],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    header: (page) => (page === 1 ? null : ({
      columns: [
        { text: `Reporte Forense Post-Ataque · ${reportNo}`, alignment: 'left', fontSize: 8, color: '#777777' },
        { text: 'AEGISTRAP', alignment: 'right', fontSize: 8, bold: true, color: '#777777' }
      ],
      margin: [40, 18, 40, 0]
    })),
    footer: (page, count) => ({
      columns: [
        { text: 'AegisTrap SOC · Uso interno', alignment: 'left', fontSize: 8, color: '#777777' },
        { text: `Página ${page} de ${count}`, alignment: 'right', fontSize: 8, color: '#777777' }
      ],
      margin: [40, 10, 40, 0]
    }),
    content,
    styles: {
      brand: { fontSize: 8, bold: true, color: '#777777', characterSpacing: 2 },
      title: { fontSize: 20, bold: true, margin: [0, 4, 0, 2] },
      subtitle: { fontSize: 9, color: '#555555', margin: [0, 0, 0, 12] },
      h1: { fontSize: 13, bold: true, margin: [0, 14, 0, 6] },
      th: { bold: true, fillColor: '#222222', color: '#ffffff', fontSize: 9 },
      metaLabel: { bold: true, fontSize: 9 },
      mono: { fontSize: 9, color: '#333333' },
      disclaimer: { fontSize: 8, color: '#777777' }
    }
  };
}

export function parseHistory(text) {
  const entries = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const header = line.match(/^\[ATTACK (.+)\]$/);
    if (header) {
      if (current) entries.push(current);
      current = { timestamp: header[1], ts: Number(new Date(header[1])) || 0 };
      continue;
    }
    if (line === '---') {
      if (current) entries.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    const kv = line.match(/^(\w+)=(.*)$/);
    if (!kv) continue;
    const value = kv[2].startsWith('"') && kv[2].endsWith('"') ? kv[2].slice(1, -1) : kv[2];
    current[kv[1]] = value;
  }
  if (current) entries.push(current);
  return entries;
}

function recommend(attacker) {
  const cmds = attacker.commands.join(' ');
  if (SCAN_RE.test(cmds)) return 'Reconocimiento activo (nmap/masscan/scanners) — bloquear IP en firewall perimetral.';
  if (ESCALATION_RE.test(cmds)) return 'Intento de escalada de privilegios o ejecución remota — banear y auditar reglas del firewall.';
  if (attacker.alerts >= 3) return `Patrón agresivo (${attacker.alerts} alertas) — añadir a lista negra persistente.`;
  if (attacker.services.length >= 2) return 'IP persistente multi-servicio — ban permanente y reportar al ISP/upstream.';
  return 'Actividad de bajo impacto — mantener monitoreo.';
}

export function buildReport(entries) {
  const sessions = new Map();
  const attackers = new Map();
  const byService = {};
  const byEvent = {};

  for (const e of entries) {
    byService[e.service] = (byService[e.service] || 0) + 1;
    byEvent[e.event] = (byEvent[e.event] || 0) + 1;

    let s = sessions.get(e.session_id);
    if (!s) {
      s = { id: e.session_id, ip: e.ip, mac: e.mac, service: e.service, start: Infinity, end: 0, ios: [], commands: [], alerts: 0, outputs: 0, connections: 0 };
      sessions.set(e.session_id, s);
    }
    s.start = Math.min(s.start, e.ts);
    s.end = Math.max(s.end, e.ts);
    if (e.event === 'io') s.ios.push(e);
    else if (e.event === 'command') s.commands.push(e.payload);
    else if (e.event === 'alert') s.alerts++;
    else if (e.event === 'output') s.outputs++;
    else if (e.event === 'connection' || e.event === 'connection_end') s.connections++;

    let a = attackers.get(e.ip);
    if (!a) {
      a = { ip: e.ip, macs: new Set(), services: new Set(), sessionIds: new Set(), commands: [], alerts: 0, firstSeen: Infinity, lastSeen: 0 };
      attackers.set(e.ip, a);
    }
    a.macs.add(e.mac);
    a.services.add(e.service);
    a.sessionIds.add(e.session_id);
    if (e.event === 'command') a.commands.push(e.payload);
    if (e.event === 'alert') a.alerts++;
    a.firstSeen = Math.min(a.firstSeen, e.ts);
    a.lastSeen = Math.max(a.lastSeen, e.ts);
  }

  const sessionList = [...sessions.values()].map((s) => {
    const typed = s.ios.map((e) => e.payload).join('').replace(/\r/g, '⏎\n');
    const ioSpan = s.ios.length >= 2 ? s.ios[s.ios.length - 1].ts - s.ios[0].ts : 0;
    // ponytail: WPM aproximado sobre el tramo activo de tecleo; <2 teclas = sin dato (0), no inventar.
    const wpm = ioSpan > 0 ? Math.round(s.ios.length / 5 / (ioSpan / 60000)) : 0;
    return { ...s, typed, wpm, durationMs: s.end - s.start, start: new Date(s.start), end: new Date(s.end) };
  }).sort((a, b) => b.start - a.start);

  const attackerList = [...attackers.values()].map((a) => ({
    ip: a.ip,
    macs: [...a.macs],
    services: [...a.services],
    sessionCount: a.sessionIds.size,
    commands: a.commands,
    alerts: a.alerts,
    firstSeen: new Date(a.firstSeen),
    lastSeen: new Date(a.lastSeen),
  })).sort((a, b) => b.commands.length + b.alerts - a.commands.length - a.alerts)
    .map((a) => ({ ...a, recommendation: recommend(a) }));

  const timestamps = entries.map((e) => e.ts).filter(Boolean);
  return {
    summary: {
      totalEvents: entries.length,
      uniqueIps: attackerList.length,
      totalSessions: sessionList.length,
      first: timestamps.length ? new Date(Math.min(...timestamps)) : null,
      last: timestamps.length ? new Date(Math.max(...timestamps)) : null,
      byService,
      byEvent,
    },
    sessions: sessionList,
    attackers: attackerList,
    iocs: {
      ips: [...new Set(entries.map((e) => e.ip))],
      macs: [...new Set(entries.map((e) => e.mac))],
      commands: [...new Set(entries.filter((e) => e.event === 'command').map((e) => e.payload))],
    },
  };
}
