import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useEffect, useRef, useState } from "react";
import { DiagramPanel } from "./components/DiagramPanel";
import { Palette } from "./components/Palette";
import { exampleElements } from "./lib/example";
import { allIconFiles, ensureFonts, insertComponent, type DrawStyle } from "./lib/insert";
import { load, save } from "./lib/storage";

type Theme = "light" | "dark";

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => load("theme", "light"));
  const [style, setStyle] = useState<DrawStyle>(() => load("style", "sketch"));
  const [paletteOpen, setPaletteOpen] = useState<boolean>(() => load("paletteOpen", true));
  const excalidraw = useRef<ExcalidrawImperativeAPI | null>(null);

  useEffect(() => save("theme", theme), [theme]);
  useEffect(() => save("style", style), [style]);
  useEffect(() => save("paletteOpen", paletteOpen), [paletteOpen]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const add = (componentId: string, client?: { clientX: number; clientY: number }) => {
    if (excalidraw.current) insertComponent(excalidraw.current, componentId, style, client);
  };

  const loadExample = async () => {
    const api = excalidraw.current;
    if (!api) return;
    if (api.getSceneElements().length && !confirm("Replace the current drawing with the example?")) return;
    await ensureFonts();
    const elements = exampleElements(style);
    api.addFiles(Object.values(allIconFiles()));
    api.updateScene({ elements });
    api.scrollToContent(elements, { fitToViewport: true, viewportZoomFactor: 0.85 });
  };

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="btn ghost icon"
          onClick={() => setPaletteOpen(!paletteOpen)}
          aria-label={paletteOpen ? "Hide components" : "Show components"}
          aria-pressed={paletteOpen}
          title={paletteOpen ? "Hide components" : "Show components"}
        >
          ☰
        </button>
        <div className="brand">
          <span className="logo" aria-hidden>
            {"</>"}
          </span>
          draw_code
        </div>
        <span className="tagline">System design canvas</span>
        <div className="spacer" />
        <button className="btn" onClick={loadExample}>
          Load example
        </button>
        <button className="btn ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? "☀ Light" : "☾ Dark"}
        </button>
      </header>

      <main className="workspace">
        {paletteOpen && <Palette theme={theme} style={style} onStyleChange={setStyle} onPick={(id) => add(id)} />}
        <DiagramPanel theme={theme} onReady={(api) => (excalidraw.current = api)} onDropComponent={add} />
      </main>
    </div>
  );
}
