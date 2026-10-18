## Mode: clean modules

Implement the design as a small, well-structured Python package that shows how
the real code would be organized.

- Standard library only. No third-party packages.
- One module per component under `components/` (for example
  `components/cache.py`), plus `components/__init__.py`.
- Define the interfaces between components with `typing.Protocol` or abstract
  base classes, and use `dataclasses` for the data passed along the arrows.
- Use in-memory implementations for infrastructure (database, cache, queue,
  blob storage) so everything runs locally.
- Wire everything together in `main.py` with dependency injection, then run a
  short demo that exercises every arrow and prints what happens.
- Include `tests/test_flow.py` using `unittest`, runnable with
  `python -m unittest`.
- `python main.py` must finish within 15 seconds and must not wait for input.
