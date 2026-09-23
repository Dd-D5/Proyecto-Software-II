import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';

const DENORMALIZE = {
  '<BACKSPACE>': '\b \b',
  '<TAB>': '\t',
  '<CTRL+C>': '^C'
};

export default function TerminalFrame({ activeService, breached = false, registerTerminalListener, isPaused, onTogglePause }) {
  const terminalRef = useRef(null);
  const termInstanceRef = useRef(null);
  const fitAddonRef = useRef(null);
  const lastMsgTypeRef = useRef(null);
  const [bufferLines] = useState(10000);
  const [dumpStatus, setDumpStatus] = useState(null);

  useEffect(() => {
    if (termInstanceRef.current) {
      termInstanceRef.current.clear();
      lastMsgTypeRef.current = null;
    }
  }, [activeService]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 12,
      lineHeight: 1.3,
      theme: {
        background: '#000000',
        foreground: '#A7F3D0',
        cursor: '#FEF08A',
        selectionBackground: 'rgba(254, 240, 138, 0.3)',
        black: '#000000',
        red: '#FECACA',
        green: '#A7F3D0',
        yellow: '#FEF08A',
        blue: '#BAE6FD',
        magenta: '#DDD6FE',
        cyan: '#BAE6FD',
        white: '#FFFFFF'
      },
      scrollback: 10000,
      convertEol: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => webglAddon.dispose());
      term.loadAddon(webglAddon);
    } catch {}

    try {
      fitAddon.fit();
    } catch {}

    termInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => {
      try { fitAddon.fit(); } catch {}
    };

    window.addEventListener('resize', handleResize);

    const unregister = registerTerminalListener ? registerTerminalListener((msg) => {
      if (termInstanceRef.current) {
        const servicePrompts = {
          ssh: '\x1b[1;32mroot@ubuntu:~$\x1b[0m',
          ftp: '\x1b[1;36mftp>\x1b[0m',
          http: '\x1b[1;33mhttp-req>\x1b[0m'
        };

        const svc = msg.service || activeService || 'ssh';
        const prompt = servicePrompts[svc] || servicePrompts.ssh;

        if (msg.type === 'io' && msg.payload) {
          lastMsgTypeRef.current = 'io';
          const raw = DENORMALIZE[msg.payload] ?? msg.payload;
          if (raw && raw !== '<ARROW>') {
            termInstanceRef.current.write(raw);
          }
        } else if (msg.type === 'command' && (msg.command || msg.payload)) {
          const cmd = msg.command || msg.payload;
          if (lastMsgTypeRef.current === 'io') {
            termInstanceRef.current.writeln('');
          }
          lastMsgTypeRef.current = 'command';
          termInstanceRef.current.writeln(`${prompt} ${cmd}`);
        } else if (msg.type === 'alert' && msg.payload) {
          lastMsgTypeRef.current = 'alert';
          termInstanceRef.current.writeln(`\x1b[31m[ALERTA DETECTADA]: ${msg.payload}\x1b[0m`);
        } else if (msg.type === 'connection') {
          lastMsgTypeRef.current = 'connection';
          termInstanceRef.current.writeln(
            `\x1b[33m[INTRUSIÓN DETECTADA]: ${svc.toUpperCase()} - ${msg.ip || '127.0.0.1'} (MAC: ${msg.mac || 'n/a'})\x1b[0m`
          );
        } else if (msg.type === 'output' && msg.payload) {
          lastMsgTypeRef.current = 'output';
          termInstanceRef.current.write(msg.payload);
        }
      }
    }) : () => {};

    const fitTimer = setTimeout(() => {
      try { fitAddon.fit(); } catch {}
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
    setDumpStatus('Dump guardado: /tmp/honeypot_dump.dmp');
    setTimeout(() => setDumpStatus(null), 3000);
  };

  return (
    <section className="bg-white border-3 border-black shadow-[6px_6px_0px_0px_#000] overflow-hidden flex flex-col flex-1 h-full select-none">
      {/* Barra de Título Neobrutalista */}
      <div className="bg-[#FEF08A] px-4 py-2 flex items-center justify-between border-b-2 border-black">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 border border-black bg-[#FECACA] inline-block"></span>
            <span className="w-3 h-3 border border-black bg-[#FEF08A] inline-block"></span>
            <span className="w-3 h-3 border border-black bg-[#A7F3D0] inline-block"></span>
          </div>
          <div className="flex items-center gap-2 font-mono font-bold text-xs text-black uppercase">
            <span className="material-symbols-outlined text-[18px]">terminal</span>
            <span>Terminal en Vivo · AegisTrap Console</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-[#BAE6FD] border border-black px-2 py-0.5 text-[10px] font-black text-black uppercase">
            xterm.js Engine
          </span>
          <span className={`px-2 py-0.5 border border-black text-[10px] font-black uppercase ${
            breached ? 'bg-[#A7F3D0]' : 'bg-white'
          }`}>
            LIVE FEED
          </span>
        </div>
      </div>

      {/* Contenedor xterm.js */}
      <div className="p-3 bg-black flex-1 overflow-hidden relative border-b-2 border-black">
        <div ref={terminalRef} className="w-full h-full" />
      </div>

      {/* Botones y Footer de Terminal */}
      <div className="bg-[#FAF7F2] px-4 py-2 flex flex-wrap items-center justify-between text-black font-mono text-xs border-t border-black gap-2">
        <div className="flex items-center gap-4">
          <span className="font-bold">
            Buffer: <strong className="bg-[#FEF08A] px-1 border border-black">{bufferLines.toLocaleString()} líneas</strong>
          </span>
          {dumpStatus && (
            <span className="bg-[#A7F3D0] px-2 border border-black font-bold animate-pulse">
              {dumpStatus}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePause}
            className={`px-3 py-1 font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_0px_#000] cursor-pointer active:translate-x-[1px] ${
              isPaused ? 'bg-[#FED7AA]' : 'bg-[#BAE6FD]'
            }`}
          >
            {isPaused ? 'Reanudar Feed' : 'Pausar Feed'}
          </button>
          <button
            onClick={handleClear}
            className="bg-white hover:bg-[#FEF08A] text-black font-black text-xs px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_#000] cursor-pointer active:translate-x-[1px]"
          >
            Limpiar Pantalla
          </button>
          <button
            onClick={handleDumpMemory}
            className="bg-[#FECACA] hover:bg-[#FCA5A5] text-black font-black text-xs px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_#000] cursor-pointer active:translate-x-[1px]"
          >
            Dump Memoria
          </button>
        </div>
      </div>
    </section>
  );
}
