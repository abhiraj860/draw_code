from llm import ask
print(ask("Name one fruit.", max_tokens=10, temperature=3.0).text)
