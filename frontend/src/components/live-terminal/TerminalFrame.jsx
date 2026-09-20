import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';

export default function TerminalFrame({ activeService, registerTerminalListener, isPaused, onTogglePause }) {
  const terminalRef = useRef(null);
  const termInstanceRef = useRef(null);
  const fitAddonRef = useRef(null);
  const lastMsgTypeRef = useRef(null);
  const [bufferLines, setBufferLines] = useState(10000);
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
      theme: {
        background: '#05080e',
        foreground: '#dfe2ef',
        cursor: '#4edea3',
        selectionBackground: 'rgba(78, 222, 163, 0.3)',
        black: '#0a0e17',
        red: '#ffb4ab',
        green: '#4edea3',
        yellow: '#ffb95f',
        blue: '#4cd7f6',
        magenta: '#d0bcff',
        cyan: '#03b5d3',
        white: '#dfe2ef',
        brightBlack: '#86948a',
        brightRed: '#f43f5e',
        brightGreen: '#10b981',
        brightYellow: '#e29100',
        brightBlue: '#acedff',
        brightMagenta: '#e8def8',
        brightCyan: '#acedff',
        brightWhite: '#ffffff'
      },
      scrollback: 10000,
      convertEol: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);

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
          termInstanceRef.current.write(msg.payload);
        } else if (msg.type === 'command' && (msg.command || msg.payload)) {
          const prefix = lastMsgTypeRef.current === 'io' ? '\r\n' : '';
          lastMsgTypeRef.current = 'command';
          termInstanceRef.current.writeln(`${prefix}\x1b[1;32mwww-data@prod-db-02:~$\x1b[0m ${msg.command || msg.payload}`);
        } else if (msg.type === 'alert' && msg.payload) {
          lastMsgTypeRef.current = 'alert';
          termInstanceRef.current.writeln(`\x1b[31m[ALERTA]: ${msg.payload}\x1b[0m`);
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

  return (
    <section className="bg-surface-container-lowest border border-[#1e2330] rounded-xl shadow-md overflow-hidden flex flex-col flex-1 h-full select-none">
      {/* Terminal Title Bar */}
      <div className="bg-surface-container-high px-3 py-1.5 flex items-center justify-between border-b border-[#1e2330]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-error inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
          </div>
          <div className="flex items-center gap-1.5 font-mono-sm text-[12px] text-on-surface font-semibold">
            <span className="material-symbols-outlined text-[15px] text-secondary">terminal</span>
            <span>aegistrap-pty03 · bash (emulated pty :2222)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-label-caps text-[9px] bg-surface-container-lowest px-2 py-0.5 rounded text-outline uppercase font-mono-sm border border-outline-variant/30">
            xterm.js WebGL Engine
          </span>
          <span className="font-mono-sm text-[11px] text-primary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
            LIVE_INTRUSION
          </span>
        </div>
      </div>

      {/* xterm.js Mount Container */}
      <div className="p-3 bg-[#05080e] flex-1 overflow-hidden relative">
        <div ref={terminalRef} className="w-full h-full" />
      </div>

      {/* Terminal Footer Controls */}
      <div className="bg-surface-container px-3 py-1.5 flex items-center justify-between text-outline font-mono-sm text-[11px] border-t border-[#1e2330]">
        <div className="flex items-center gap-4">
          <span>
            Buffer: <strong className="text-on-surface">{bufferLines.toLocaleString()} líneas</strong>
          </span>
          <span>
            Retardo Sintético: <strong className="text-secondary">450ms</strong>
          </span>
          <span>
            Escape Jail: <strong className="text-primary">ACTIVO (Read-Only OverlayFS)</strong>
          </span>
          {dumpStatus && (
            <span className="text-tertiary font-semibold animate-pulse">
              [{dumpStatus}]
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onTogglePause}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              isPaused
                ? 'bg-tertiary text-[#472a00] font-bold'
                : 'bg-surface-container-high hover:bg-surface-bright text-on-surface'
            }`}
          >
            {isPaused ? 'Reanudar Feed' : 'Pausar Feed'}
          </button>
          <button
            onClick={handleClear}
            className="bg-surface-container-high hover:bg-surface-bright text-on-surface px-2 py-0.5 rounded text-[11px] transition-colors"
          >
            Limpiar Pantalla
          </button>
          <button
            onClick={handleDumpMemory}
            className="bg-error hover:bg-rose-600 text-surface px-2 py-0.5 rounded text-[11px] font-bold transition-colors"
          >
            Dump Memoria
          </button>
        </div>
      </div>
    </section>
  );
}
