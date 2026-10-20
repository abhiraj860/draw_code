from llm import ask
r = ask("Write a 300-word story about a robot.", max_tokens=20)
print(r.finish_reason, r.out_tokens, round(r.latency, 2), repr(r.text))
r = ask("Write a 300-word story about a robot.", max_tokens=600)
print(r.finish_reason, r.out_tokens, round(r.latency, 2))
