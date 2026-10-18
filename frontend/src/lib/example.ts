import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { arrowSkeleton, componentSkeleton, NODE, type DrawStyle } from "./insert";

type Place = { key: string; component: string; label?: string; x: number; y: number };

const places: Place[] = [
  { key: "user", component: "user", x: 0, y: 250 },
  { key: "cdn", component: "cdn", x: 0, y: 60 },
  { key: "lb", component: "load-balancer", x: 280, y: 250 },
  { key: "api1", component: "api-server", label: "API Server 1", x: 560, y: 150 },
  { key: "api2", component: "api-server", label: "API Server 2", x: 560, y: 350 },
  { key: "cache", component: "cache", label: "Redis Cache", x: 860, y: 60 },
  { key: "db", component: "sql-db", label: "Postgres", x: 860, y: 250 },
  { key: "queue", component: "message-queue", label: "Job Queue", x: 860, y: 440 },
  { key: "worker", component: "worker", label: "Email Worker", x: 1140, y: 440 },
];

const links: [string, string, string?][] = [
  ["user", "cdn", "static assets"],
  ["user", "lb", "HTTPS"],
  ["lb", "api1"],
  ["lb", "api2"],
  ["api1", "cache", "read feed"],
  ["api1", "db"],
  ["api2", "db"],
  ["api2", "queue", "publish"],
  ["queue", "worker", "consume"],
];

/** The point on a box's edge facing another box, so arrows start and end cleanly. */
function edgePoint(from: Place, to: Place) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) return { x: from.x + Math.sign(dx) * (NODE.w / 2), y: from.y };
  return { x: from.x, y: from.y + Math.sign(dy) * (NODE.h / 2) };
}

/** A small sample design built from palette components. */
export function exampleElements(style: DrawStyle) {
  const byKey = new Map(places.map((p) => [p.key, p]));
  const ids = new Map<string, string>();
  const vpc = componentSkeleton("vpc", { x: 700, y: 250 }, style, { label: "VPC", size: { w: 1060, h: 560 } });
  const nodes = places.flatMap((p) => {
    const { skeleton, shapeId } = componentSkeleton(p.component, p, style, { label: p.label });
    ids.set(p.key, shapeId);
    return skeleton;
  });
  const arrows = links.map(([a, b, label]) => {
    const from = byKey.get(a)!;
    const to = byKey.get(b)!;
    return arrowSkeleton(
      { id: ids.get(a)!, at: edgePoint(from, to) },
      { id: ids.get(b)!, at: edgePoint(to, from) },
      style,
      label,
    );
  });
  const note = componentSkeleton("note", { x: 0, y: 560 }, style, {
    label: "Cache feed reads for 60s.\nSend welcome emails\nasynchronously.",
  });
  return convertToExcalidrawElements([...vpc.skeleton, ...nodes, ...arrows, ...note.skeleton], { regenerateIds: false });
}
