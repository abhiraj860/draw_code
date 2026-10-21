import time
from llm import ask

prompt = "List 5 fruits as a numbered list, one per line. No other text."

r = ask(prompt, max_tokens=60)
print(r.finish_reason, repr(r.text))
time.sleep(1)

r = ask(prompt, max_tokens=60, stop=["4."])
print(r.finish_reason, repr(r.text))
