import time
from llm import ask

texts = {
    "english": "The cat sat on the mat.",
    "number":  "3141592653589793",
    "hindi":   "बिल्ली चटाई पर बैठी।",
    "code":    "def f(x): return x**2",
}

for name, t in texts.items():
    r = ask(t, max_tokens=1)  # we only care about INPUT tokens here
    print(f"{name:8} chars={len(t):3}  tokens={r.in_tokens}")
    time.sleep(1)
