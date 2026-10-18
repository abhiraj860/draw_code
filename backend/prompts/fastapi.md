## Mode: FastAPI services

Turn each backend component into a real HTTP service, the way it might be built
for production, while keeping it runnable on one machine.

- Each service is a FastAPI app in `services/<name>.py`. Infrastructure that
  is not a service you would write (database, cache, queue) is simulated in
  memory inside the service that owns it, with a comment naming the real
  technology to use (Postgres, Redis, Kafka, ...).
- Services call each other over HTTP with `httpx.AsyncClient`, following the
  arrows. Give each service its own port starting at 8001, defined in
  `config.py`.
- `main.py` starts every service with uvicorn in background threads, waits until
  they are healthy, sends a short scripted set of requests that exercises every
  arrow while printing each request and response, then shuts everything down and
  exits. It must finish within 20 seconds and must not wait for input.
- Include `requirements.txt` (fastapi, uvicorn, httpx and anything else used).
- Include `docker-compose.yml` that runs each service in its own container.
- Include a short `README.md` explaining the services and how to run them.
