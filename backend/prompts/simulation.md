## Mode: simulation

Write a single runnable program, `main.py`, that simulates this architecture
in one process so the user can watch requests flow through their design.

- Standard library only. No third-party packages.
- Use `asyncio`. Each component is a class with async methods. Each arrow is a
  method call, or an `asyncio.Queue` when the arrow means asynchronous
  messaging (queue, broker, pub/sub, events, "async").
- Add small random latencies (`asyncio.sleep`) that make sense for each
  component type, and occasional realistic failures where relevant.
- Print a clear trace line for every hop, aligned like:
  `[  0.012s] Client        -> LoadBalancer   GET /feed`
  Use ANSI colors, one color per component.
- Run a finite scenario of about 15 to 30 requests that exercises every path in
  the diagram (for example a cache miss and then a hit).
- Finish with a summary table: requests per component, average latency, errors.
- The whole run must finish within 15 seconds and must not wait for input.
- Use `random.seed(42)` so runs are repeatable.
