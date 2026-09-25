import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { normalizeIPv4 } from '../../hooks/useWebSocket';

// Desnormalización: el backend (normalizeInput) envía <BACKSPACE> etc. como texto legible.
// El inspector de teclas conserva la versión normalizada; solo la terminal recibe secuencias reales.
//  <ARROW> no se puede reconstruir (el backend colapsa las 4 direcciones en una sola);
// se suprime. Upgrade path: preservar la secuencia original (\x1b[A..D) en el backend.
const DENORMALIZE = {
  '<BACKSPACE>': '\b \b', // borrado real en terminal: backspace + espacio + backspace
  '<TAB>': '\t',
  '<CTRL+C>': '^C' // eco esperable de una terminal real para Ctrl+C
};

const SERVICE_PORTS = { ssh: 2222, ftp: 2121, http: 8081 };

// Tema xterm dual — light.html: bg #faf8f5, texto #1c1917, prompt verde #047857.
// xterm no transiciona por CSS (tema JS): cambia de golpe al togglear.
const TERM_THEME_DARK = {
  background: '#121212',
  foreground: '#ededed',
  cursor: '#3ecf8e',
  selectionBackground: 'rgba(62, 207, 142, 0.3)',
  black: '#171717',
  red: '#ff5f56',
  green: '#3ecf8e',
  yellow: '#ffdb13',
  blue: '#a1a1a1',
  magenta: '#ffbd2e',
  cyan: '#4ade80',
  white: '#ededed',
  brightBlack: '#8e8e8e',
  brightRed: '#ff2201',
  brightGreen: '#4ade80',
  brightYellow: '#ffdb13',
  brightBlue: '#ededed',
  brightMagenta: '#ffbd2e',
  brightCyan: '#71fcb6',
  brightWhite: '#ffffff'
};

const TERM_THEME_LIGHT = {
  background: '#faf8f5',
  foreground: '#1c1917',
  cursor: '#047857',
  selectionBackground: 'rgba(4, 120, 87, 0.3)',
  black: '#1c1917',
  red: '#dc2626',
  green: '#047857',
  yellow: '#ca8a04',
  blue: '#57534e',
  magenta: '#9333ea',
  cyan: '#0e7490',
  white: '#faf8f5',
  brightBlack: '#78716c',
  brightRed: '#b91c1c',
  brightGreen: '#059669',
  brightYellow: '#a16207',
  brightBlue: '#44403c',
  brightMagenta: '#7e22ce',
  brightCyan: '#155e75',
  brightWhite: '#ffffff'
};

export default function TerminalFrame({ activeService, breached = false, registerTerminalListener, isPaused, onTogglePause }) {
  const terminalRef = useRef(null);
  const termInstanceRef = useRef(null);
  const fitAddonRef = useRef(null);
  const lastMsgTypeRef = useRef(null);
  const [dumpStatus, setDumpStatus] = useState(null);

  // Clear terminal screen when active service changes (child effect runs before parent hook replay effect)
  useEffect(() => {
    if (termInstanceRef.current) {
      termInstanceRef.current.clear();
      lastMsgTypeRef.current = null;
    }
  }, [activeService]);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Crear instancia de xterm.js
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11,
      lineHeight: 1.3,
      letterSpacing: 0,
      theme: document.documentElement.classList.contains('light') ? TERM_THEME_LIGHT : TERM_THEME_DARK,
      scrollback: 10000,
      convertEol: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);

    // Aplicar tema xterm cuando el Sidebar togglea el modo claro
    const applyTermTheme = () => {
      if (termInstanceRef.current) {
        termInstanceRef.current.options.theme =
          document.documentElement.classList.contains('light') ? TERM_THEME_LIGHT : TERM_THEME_DARK;
      }
    };
    window.addEventListener('aegistrap:theme', applyTermTheme);

    // Intentar WebGL addon de forma segura
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => webglAddon.dispose());
      term.loadAddon(webglAddon);
    } catch {
      // Fallback a canvas estándar si WebGL no está disponible
    }

    try {
      fitAddon.fit();
    } catch {
      // safe fallback
    }

    termInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch {
        // safe
      }
    };

    window.addEventListener('resize', handleResize);

    // Conectar el listener de terminal del hook WebSocket
    const unregister = registerTerminalListener ? registerTerminalListener((msg) => {
      if (termInstanceRef.current) {
        if (msg.type === 'io' && msg.payload) {
          lastMsgTypeRef.current = 'io';
          const raw = DENORMALIZE[msg.payload] ?? msg.payload;
          if (raw && raw !== '<ARROW>') {
            termInstanceRef.current.write(raw);
          }
        } else if (msg.type === 'command' && (msg.command || msg.payload)) {
          const prefix = lastMsgTypeRef.current === 'io' ? '\r\n' : '';
          lastMsgTypeRef.current = 'command';
          termInstanceRef.current.writeln(`${prefix}\x1b[1;32mwww-data@prod-db-02:~$\x1b[0m ${msg.command || msg.payload}`);
        } else if (msg.type === 'alert' && msg.payload) {
          lastMsgTypeRef.current = 'alert';
          termInstanceRef.current.writeln(`\x1b[31m[ALERTA]: ${msg.payload}\x1b[0m`);
        } else if (msg.type === 'connection') {
          lastMsgTypeRef.current = 'connection';
          termInstanceRef.current.writeln(
            `\x1b[31m[INTRUSION DETECTADA]: ${msg.service || 'ssh'} - ${normalizeIPv4(msg.ip) || 'IP desconocida'} (MAC: ${msg.mac || 'n/a'})\x1b[0m`
          );
        } else if (msg.type === 'output' && msg.payload) {
          lastMsgTypeRef.current = 'output';
          // write crudo (NO writeln): el payload ya trae \r\n y puede contener ANSI (clear)
          termInstanceRef.current.write(msg.payload);
        }
      }
    }) : () => {};

    const fitTimer = setTimeout(() => {
      try {
        fitAddon.fit();
      } catch {}
    }, 100);

    return () => {
      clearTimeout(fitTimer);
      unregister();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('aegistrap:theme', applyTermTheme);
      term.dispose();
    };
  }, [registerTerminalListener]);

  const handleClear = () => {
    if (termInstanceRef.current) {
      termInstanceRef.current.clear();
      lastMsgTypeRef.current = null;
    }
  };

  const handleDumpMemory = () => {
    setDumpStatus('Volcando memoria...');
    setTimeout(() => {
      setDumpStatus('Dump guardado: /tmp/honeypot_mem_0x8f.dmp');
      setTimeout(() => setDumpStatus(null), 3000);
    }, 1000);
  };

  // Clave de servicio dinámica: "ssh:2223" → ("SSH", 2223); base "ssh" → ("SSH", default)
  const svcBase = String(activeService).split(':')[0].replace('default-', '');
  const svcPort = String(activeService).includes(':')
    ? String(activeService).split(':')[1]
    : (SERVICE_PORTS[svcBase] || 2222);

  return (
    <section className="flex flex-col rounded-xl bg-surface-container-lowest border border-hairline shadow-lg overflow-hidden flex-1 h-full select-none">
      {/* Terminal Window Top Bar */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-ink border-b border-edge-soft select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block"></span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px]">terminal</span>
            <span className="font-label-code text-label-code text-on-surface">
              Sesión {svcBase.toUpperCase()} Interceptada en Tiempo Real (Puerto {svcPort})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-label-code text-[11px] px-1.5 py-0.5 rounded bg-surface-container border border-hairline text-secondary">
            pts/3
          </span>
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-label-caps text-label-caps font-medium border ${
              breached
                ? 'bg-primary/10 text-primary-container border-primary/20'
                : 'bg-surface-container text-outline border-hairline'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${breached ? 'bg-primary animate-pulse' : 'bg-outline'}`}></span>
            <span>{breached ? 'TRANSMITIENDO' : 'EN ESPERA'}</span>
          </div>
        </div>
      </div>

      {/* xterm.js Mount Container */}
      <div className="p-3 flex-1 overflow-hidden relative bg-surface-container-lowest">
        <div ref={terminalRef} className="w-full h-full" />
      </div>

      {/* Terminal Action Bottom Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-3 py-2.5 bg-ink border-t border-edge-soft">
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePause}
            className="px-3 py-1.5 rounded-md bg-surface-container hover:bg-surface-bright text-on-surface border border-outline-variant font-body-sm text-body-sm transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">{isPaused ? 'play_arrow' : 'pause'}</span>
            <span>{isPaused ? 'Reanudar Captura' : 'Pausar Captura'}</span>
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-md bg-surface-container hover:bg-surface-bright text-on-surface border border-outline-variant font-body-sm text-body-sm transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">backspace</span>
            <span>Limpiar Consola</span>
          </button>
          <button
            onClick={handleDumpMemory}
            className="px-3 py-1.5 rounded-md bg-surface-container hover:bg-surface-bright text-error border border-outline-variant font-body-sm text-body-sm transition-colors flex items-center gap-1"
            title="Volcar memoria del sandbox"
          >
            <span className="material-symbols-outlined text-[16px]">developer_board</span>
            <span>Dump Memoria</span>
          </button>
          <span className="font-label-code text-[11px] text-outline hidden md:inline ml-2">
            Evasión activa: Atacante auditado en /dev/pts3
          </span>
        </div>

        {dumpStatus && (
          <span className="font-label-code text-[11px] text-primary-container font-semibold animate-pulse">
            [{dumpStatus}]
          </span>
        )}
      </div>
    </section>
  );
}
