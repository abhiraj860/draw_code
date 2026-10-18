import { convertToExcalidrawElements } from "@excalidraw/excalidraw";

type Shape = { id: string; type: "rectangle" | "ellipse" | "diamond"; x: number; y: number; text: string };

const W = 170;
const H = 70;

const shapes: Shape[] = [
  { id: "client", type: "ellipse", x: 0, y: 200, text: "Client" },
  { id: "lb", type: "rectangle", x: 260, y: 200, text: "Load Balancer" },
  { id: "api1", type: "rectangle", x: 540, y: 110, text: "API Server 1" },
  { id: "api2", type: "rectangle", x: 540, y: 290, text: "API Server 2" },
  { id: "cache", type: "rectangle", x: 840, y: 40, text: "Redis Cache" },
  { id: "db", type: "rectangle", x: 840, y: 200, text: "Postgres" },
  { id: "queue", type: "rectangle", x: 840, y: 360, text: "Job Queue" },
  { id: "worker", type: "rectangle", x: 1120, y: 360, text: "Email Worker" },
];

const arrows: [string, string, string?][] = [
  ["client", "lb", "HTTPS"],
  ["lb", "api1"],
  ["lb", "api2"],
  ["api1", "cache", "read feed"],
  ["api1", "db"],
  ["api2", "db"],
  ["api2", "queue", "publish"],
  ["queue", "worker", "consume"],
];

/** A small sample design so you can try Generate without drawing first. */
export function exampleElements() {
  const byId = new Map(shapes.map((s) => [s.id, s]));
  return convertToExcalidrawElements([
    ...shapes.map((s) => ({
      id: s.id,
      type: s.type,
      x: s.x,
      y: s.y,
      width: W,
      height: H,
      roundness: s.type === "rectangle" ? { type: 3 } : null,
      label: { text: s.text },
    })),
    ...arrows.map(([from, to, label]) => {
      const a = byId.get(from)!;
      const b = byId.get(to)!;
      const x = a.x + W;
      const y = a.y + H / 2;
      return {
        type: "arrow" as const,
        x,
        y,
        width: b.x - x,
        height: b.y + H / 2 - y,
        start: { id: from },
        end: { id: to },
        ...(label ? { label: { text: label } } : {}),
      };
    }),
    {
      type: "text",
      x: 0,
      y: 480,
      text: "Cache feed reads for 60s.\nSend welcome emails asynchronously.",
    },
  ] as Parameters<typeof convertToExcalidrawElements>[0]);
}
