"""Token budget math. Prices are USD per 1 MILLION tokens."""


def cost_usd(in_tokens: int, out_tokens: int,
             in_price_per_m: float, out_price_per_m: float) -> float:
    # TODO: input and output are priced separately. Return total cost in USD.
    return (in_tokens * in_price_per_m + out_tokens * out_price_per_m) / 1_000_000


def fits(prompt_tokens: int, max_output: int, context_window: int) -> bool:
    # TODO: does this request fit in the context window?
    # Hint: the window must hold the prompt AND the tokens the model may generate.
    return (prompt_tokens + max_output <= context_window)


def monthly_cost(requests_per_day: int, in_tokens: int, out_tokens: int,
                 in_price_per_m: float, out_price_per_m: float) -> float:
    return requests_per_day * 30 * cost_usd(in_tokens, out_tokens, in_price_per_m, out_price_per_m)