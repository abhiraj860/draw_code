
# Weak spots

- 1.1 Output tokens drive latency (guessed "few ms"; was ~6x slower)
- 1.1 Boundary conditions: used `==` instead of `<=` in fits()
- 1.2a Temperature can't create diversity when one token dominates (guessed varied fruits at temp 0 and temp 2)
- 1.2a Numerical stability: softmax overflowed on large logits / low temperature (fixed with max-subtraction)
