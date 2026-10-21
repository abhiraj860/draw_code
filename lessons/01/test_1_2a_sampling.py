import importlib

import pytest

m = importlib.import_module("1_2a_sampling")

LOGITS = {"Apple": 5.0, "Banana": 3.0, "Mango": 2.0, "Tree": 0.0}


def test_probs_sum_to_one():
    assert sum(m.softmax(LOGITS, 1.0).values()) == pytest.approx(1.0)


def test_order_preserved():
    p = m.softmax(LOGITS, 1.0)
    assert p["Apple"] > p["Banana"] > p["Mango"] > p["Tree"]


def test_low_temp_sharpens():
    assert m.softmax(LOGITS, 0.1)["Apple"] > 0.99


def test_high_temp_flattens():
    assert m.softmax(LOGITS, 2.0)["Apple"] < m.softmax(LOGITS, 1.0)["Apple"]
    assert m.softmax(LOGITS, 2.0)["Tree"] > m.softmax(LOGITS, 1.0)["Tree"]


def test_top_p_drops_tail():
    probs = {"Apple": 0.6, "Banana": 0.25, "Mango": 0.1, "Tree": 0.05}
    kept = m.top_p(probs, 0.8)
    assert set(kept) == {"Apple", "Banana"}
    assert sum(kept.values()) == pytest.approx(1.0)
    assert kept["Apple"] == pytest.approx(0.6 / 0.85)


def test_top_p_one_keeps_all():
    probs = {"Apple": 0.6, "Banana": 0.25, "Mango": 0.1, "Tree": 0.05}
    assert set(m.top_p(probs, 1.0)) == set(probs)
