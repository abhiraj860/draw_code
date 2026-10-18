/**
 * Turns an Excalidraw scene into a compact graph an LLM can read reliably:
 * shapes become nodes, arrows become edges, text becomes labels or notes.
 */

type Binding = { elementId: string } | null | undefined;

// The subset of Excalidraw's element type that we read.
export type SceneElement = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDeleted?: boolean;
  text?: string;
  containerId?: string | null;
  frameId?: string | null;
  name?: string | null;
  points?: readonly (readonly [number, number])[];
  startBinding?: Binding;
  endBinding?: Binding;
  startArrowhead?: string | null;
  endArrowhead?: string | null;
};

export type GraphNode = { id: string; label: string; shape: string; inside?: string };
export type GraphEdge = { from: string; to: string; label?: string; bidirectional?: boolean };
export type Graph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  frames: { name: string; nodes: string[] }[];
  notes: string[];
};

const SHAPES = new Set(["rectangle", "ellipse", "diamond"]);
const SNAP = 24; // px: an unbound arrow end this close to a shape connects to it

type Box = { x: number; y: number; w: number; h: number };
const box = (e: SceneElement): Box => ({
  x: Math.min(e.x, e.x + e.width),
  y: Math.min(e.y, e.y + e.height),
  w: Math.abs(e.width),
  h: Math.abs(e.height),
});
const area = (b: Box) => b.w * b.h;
const containsPoint = (b: Box, px: number, py: number, pad = 0) =>
  px >= b.x - pad && px <= b.x + b.w + pad && py >= b.y - pad && py <= b.y + b.h + pad;
const containsBox = (o: Box, i: Box) =>
  i.x >= o.x && i.y >= o.y && i.x + i.w <= o.x + o.w && i.y + i.h <= o.y + o.h && area(i) < area(o);
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function smallest<T>(items: T[], size: (t: T) => number): T | undefined {
  return items.reduce<T | undefined>((best, t) => (best === undefined || size(t) < size(best) ? t : best), undefined);
}

export function sceneToGraph(all: readonly SceneElement[]): Graph {
  const els = all.filter((e) => !e.isDeleted);
  const byId = new Map(els.map((e) => [e.id, e]));
  const texts = els.filter((e) => e.type === "text");
  const shapes = els.filter((e) => SHAPES.has(e.type));
  const arrows = els.filter((e) => e.type === "arrow");
  const frames = els.filter((e) => e.type === "frame" || e.type === "magicframe");

  const labels = new Map<string, string>();
  const addLabel = (id: string, text: string) => {
    const t = clean(text);
    if (t) labels.set(id, labels.has(id) ? `${labels.get(id)} / ${t}` : t);
  };
  const usedText = new Set<string>();

  // 1. Text typed inside a shape or on an arrow (Excalidraw binds it via containerId).
  for (const t of texts) {
    if (t.containerId && byId.has(t.containerId)) {
      addLabel(t.containerId, t.text ?? "");
      usedText.add(t.id);
    }
  }

  // 2. Plain text that an arrow points at is a component on its own.
  const arrowTargets = new Set(
    arrows.flatMap((a) => [a.startBinding?.elementId, a.endBinding?.elementId]).filter(Boolean) as string[],
  );
  const textNodes = texts.filter((t) => !usedText.has(t.id) && arrowTargets.has(t.id));
  for (const t of textNodes) {
    addLabel(t.id, t.text ?? "");
    usedText.add(t.id);
  }

  // 3. Loose text placed over a shape labels the smallest shape under it.
  const notes: string[] = [];
  for (const t of texts) {
    if (usedText.has(t.id)) continue;
    const b = box(t);
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const under = smallest(
      shapes.filter((s) => containsPoint(box(s), cx, cy)),
      (s) => area(box(s)),
    );
    if (under) addLabel(under.id, t.text ?? "");
    else if (clean(t.text ?? "")) notes.push(clean(t.text ?? ""));
  }

  // Nodes, with readable unique ids derived from their labels.
  const nodeEls = [...shapes, ...textNodes];
  const idOf = new Map<string, string>();
  const taken = new Map<string, number>();
  const nodes: GraphNode[] = nodeEls.map((e, i) => {
    const label = labels.get(e.id) ?? `Unlabeled ${e.type} ${i + 1}`;
    const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `node_${i + 1}`;
    const n = (taken.get(base) ?? 0) + 1;
    taken.set(base, n);
    const id = n === 1 ? base : `${base}_${n}`;
    idOf.set(e.id, id);
    return { id, label, shape: e.type };
  });

  // Visual nesting: a node drawn inside a bigger shape (e.g. "VPC") or a frame.
  const frameName = (f: SceneElement) => clean(f.name ?? "") || "Frame";
  nodeEls.forEach((e, i) => {
    const parent = smallest(
      shapes.filter((s) => s.id !== e.id && containsBox(box(s), box(e))),
      (s) => area(box(s)),
    );
    if (parent) nodes[i].inside = idOf.get(parent.id);
    else if (e.frameId && byId.has(e.frameId)) nodes[i].inside = frameName(byId.get(e.frameId)!);
  });

  // Edges. Use the arrow's binding, or snap a loose end to the nearest shape.
  const resolve = (binding: Binding, px: number, py: number): string | undefined => {
    let target = binding?.elementId ? byId.get(binding.elementId) : undefined;
    if (target?.type === "text" && target.containerId) target = byId.get(target.containerId);
    if (target && idOf.has(target.id)) return idOf.get(target.id);
    const near = smallest(
      nodeEls.filter((n) => containsPoint(box(n), px, py, SNAP)),
      (n) => area(box(n)),
    );
    return near ? idOf.get(near.id) : undefined;
  };

  const edges: GraphEdge[] = [];
  for (const a of arrows) {
    const pts = a.points ?? [[0, 0]];
    const first = pts[0];
    const last = pts[pts.length - 1];
    let from = resolve(a.startBinding, a.x + first[0], a.y + first[1]);
    let to = resolve(a.endBinding, a.x + last[0], a.y + last[1]);
    if (!from || !to || from === to) continue;
    if (!a.endArrowhead && a.startArrowhead) [from, to] = [to, from];
    const edge: GraphEdge = { from, to };
    const label = labels.get(a.id);
    if (label) edge.label = label;
    if (a.endArrowhead && a.startArrowhead) edge.bidirectional = true;
    edges.push(edge);
  }

  return {
    nodes,
    edges,
    frames: frames.map((f) => ({
      name: frameName(f),
      nodes: nodeEls.filter((e) => e.frameId === f.id).map((e) => idOf.get(e.id)!),
    })),
    notes,
  };
}
