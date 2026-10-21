"""Sampling from scratch. `logits` = raw model scores for each candidate token."""
import math


def softmax(logits: dict[str, float], temperature: float) -> dict[str, float]:
    if temperature == 0:
        top = max(logits, key = lambda t: logits[t])
        return {t: 1.0 if t == top else 0.0 for t in logits}
    
    m = max(logits.values()) / temperature
    exps = {t:(math.exp(z/temperature - m)) for t, z in logits.items()}
    total = sum(exps.values())
    return {t: e / total for t, e in exps.items()}


def top_p(probs: dict[str, float], p: float) -> dict[str, float]:
    final_dict = {}
    total = 0
    probs = sorted(probs.items(), key = lambda kv:kv[1], reverse=True) 
    for tokens, prob in probs:
        if total < p:
            final_dict[tokens] = prob
            total += prob
        else:
            break
    return {tokens: prob/total for tokens, prob in final_dict.items()}