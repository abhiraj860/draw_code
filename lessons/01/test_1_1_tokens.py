import importlib

import pytest

m = importlib.import_module("1_1_cost")


def test_cost_input_only():
    assert m.cost_usd(1_000_000, 0, 0.10, 0.40) == pytest.approx(0.10)


def test_cost_output_priced_separately():
    assert m.cost_usd(0, 1_000_000, 0.10, 0.40) == pytest.approx(0.40)


def test_cost_small_request():
    # 2,000 in + 500 out
    assert m.cost_usd(2_000, 500, 0.10, 0.40) == pytest.approx(0.0004)


def test_fits_counts_output():
    assert m.fits(900, 100, 1000) is True
    assert m.fits(900, 101, 1000) is False
    assert m.fits(100, 100, 1000) is True  # plenty of room


def test_monthly_cost():
    # 10k req/day * 30 days * $0.0004
    assert m.monthly_cost(10_000, 2_000, 500, 0.10, 0.40) == pytest.approx(120.0)
