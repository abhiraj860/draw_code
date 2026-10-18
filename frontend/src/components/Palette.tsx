import { useMemo, useState } from "react";
import { CATEGORIES, type Category, type ComponentDef } from "../lib/components";
import type { DrawStyle } from "../lib/insert";
import { load, save } from "../lib/storage";

export const DRAG_MIME = "application/x-drawcode-component";

type Props = {
  theme: "light" | "dark";
  style: DrawStyle;
  onStyleChange: (style: DrawStyle) => void;
  onPick: (componentId: string) => void;
};

function matches(def: ComponentDef, category: Category, query: string) {
  const haystack = `${def.label} ${def.keywords ?? ""} ${category.label}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

export function Palette({ theme, style, onStyleChange, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => load("collapsed", {}));

  const visible = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        items: query.trim() ? category.items.filter((d) => matches(d, category, query.trim())) : category.items,
      })).filter((group) => group.items.length > 0),
    [query],
  );

  const toggle = (id: string) => {
    const next = { ...collapsed, [id]: !collapsed[id] };
    setCollapsed(next);
    save("collapsed", next);
  };

  return (
    <aside className="palette" aria-label="System design components">
      <div className="palette-search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search components…"
          aria-label="Search components"
        />
      </div>

      <div className="palette-list">
        {visible.length === 0 && <p className="palette-empty">No components match “{query}”.</p>}
        {visible.map(({ category, items }) => {
          const open = query.trim() !== "" || !collapsed[category.id];
          return (
            <section key={category.id} className="palette-group">
              <button className="palette-heading" onClick={() => toggle(category.id)} aria-expanded={open}>
                <span className="chevron" data-open={open} aria-hidden>
                  ›
                </span>
                {category.label}
                <span className="count">{items.length}</span>
              </button>
              {open && (
                <div className="palette-grid">
                  {items.map((def) => (
                    <button
                      key={def.id}
                      className="tile"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(DRAG_MIME, def.id);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => onPick(def.id)}
                      title={`Click to add, or drag onto the canvas`}
                    >
                      <span
                        className="tile-icon"
                        style={{ color: category.uiColor[theme] }}
                        // Trusted, bundled SVG markup from lucide-static.
                        dangerouslySetInnerHTML={{ __html: def.icon }}
                      />
                      <span className="tile-label">{def.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="palette-footer">
        <div className="segmented" role="radiogroup" aria-label="Drawing style for new components">
          {(["sketch", "clean"] as const).map((s) => (
            <button key={s} role="radio" aria-checked={style === s} className={style === s ? "on" : ""} onClick={() => onStyleChange(s)}>
              {s === "sketch" ? "Sketchy" : "Clean"}
            </button>
          ))}
        </div>
        <p className="hint">
          Press <kbd>A</kbd> for arrows and drag between components. Double-click a component to rename it.
        </p>
      </div>
    </aside>
  );
}
