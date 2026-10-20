import time
from llm import ask

prompt = "Name one fruit. Reply with one word only."

for temp in [0.0, 2.0]:
    answers = []
    for _ in range(3):
        r = ask(prompt, max_tokens=10, temperature=temp)
        answers.append(r.text.strip())
        time.sleep(1)
    print(f"temp={temp}: {answers}")
