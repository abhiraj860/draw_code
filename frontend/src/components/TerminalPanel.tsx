import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal, type ITheme } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { CodeFile, Theme } from "../lib/types";

export type TerminalHandle = {
  run: (files: CodeFile[], entry: string) => void;
  shell: (files: CodeFile[]) => void;
  stop: () => void;
  clear: () => void;
};

const THEMES: Record<Theme, ITheme> = {
  dark: { background: "#16171d", foreground: "#d6d8e0", cursor: "#a5a3ff", selectionBackground: "#3b3d4a" },
  light: { background: "#fbfbfd", foreground: "#24262e", cursor: "#6965db", selectionBackground: "#d9d8f5" },
};

const DIM = "\x1b[90m";
const RESET = "\x1b[0m";

type Props = {
  theme: Theme;
  onRunningChange: (running: boolean) => void;
};

export const TerminalPanel = forwardRef<TerminalHandle, Props>(function TerminalPanel({ theme, onRunningChange }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onRunningRef = useRef(onRunningChange);
  onRunningRef.current = onRunningChange;

  const send = (msg: object) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return true;
    }
    termRef.current?.writeln(`\r\n${DIM}[not connected to the backend: is it running on port 8000?]${RESET}`);
    return false;
  };

  useEffect(() => {
    const term = new Terminal({
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace",
      fontSize: 13,
      cursorBlink: true,
      convertEol: false,
      scrollback: 5000,
      theme: THEMES[theme],
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(hostRef.current!);
    termRef.current = term;
    term.writeln(`${DIM}Terminal ready. Press Run (Ctrl+Shift+Enter) to run your code, or Shell for bash.${RESET}`);

    const sendSize = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      }
    };

    let closed = false;
    let retry: number | undefined;
    let warned = false;
    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${location.host}/api/terminal`);
      wsRef.current = ws;
      ws.onopen = () => {
        warned = false;
        sendSize();
      };
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "output") term.write(msg.data);
        else if (msg.type === "started") {
          term.write(`${DIM}$ ${msg.command}${RESET}\r\n`);
          onRunningRef.current(true);
        } else if (msg.type === "exit") {
          term.write(`\r\n${DIM}[process exited with code ${msg.code}]${RESET}\r\n`);
          onRunningRef.current(false);
        } else if (msg.type === "error") {
          term.write(`\r\n\x1b[31m${msg.message}${RESET}\r\n`);
        }
      };
      ws.onclose = () => {
        onRunningRef.current(false);
        if (closed) return;
        if (!warned) term.writeln(`\r\n${DIM}[backend disconnected, reconnecting…]${RESET}`);
        warned = true;
        retry = window.setTimeout(connect, 1500);
      };
    };
    connect();

    const input = term.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "input", data }));
      }
    });

    const observer = new ResizeObserver(() => {
      try {
        fit.fit();
        sendSize();
      } catch {
        // The panel is collapsed to zero size.
      }
    });
    observer.observe(hostRef.current!);

    return () => {
      closed = true;
      window.clearTimeout(retry);
      observer.disconnect();
      input.dispose();
      wsRef.current?.close();
      term.dispose();
    };
    // The terminal is created once; theme changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (termRef.current) termRef.current.options.theme = THEMES[theme];
  }, [theme]);

  useImperativeHandle(ref, () => ({
    run(files, entry) {
      termRef.current?.write("\r\n");
      if (send({ type: "run", files, entry })) termRef.current?.focus();
    },
    shell(files) {
      termRef.current?.write("\r\n");
      if (send({ type: "shell", files })) termRef.current?.focus();
    },
    stop() {
      send({ type: "stop" });
    },
    clear() {
      termRef.current?.clear();
    },
  }));

  return <div className="terminal" ref={hostRef} />;
});
