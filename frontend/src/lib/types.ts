export type CodeFile = { path: string; content: string };

export type ModelInfo = { id: string; label: string; vision: boolean };

export type Mode = "simulation" | "modules" | "fastapi";

export const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "simulation", label: "Simulation", hint: "One runnable asyncio program that traces requests through your design" },
  { id: "modules", label: "Clean modules", hint: "A structured package: one module per component, interfaces, tests" },
  { id: "fastapi", label: "FastAPI services", hint: "Real HTTP services + docker-compose (pip install -r requirements.txt first)" },
];

export type Theme = "light" | "dark";
