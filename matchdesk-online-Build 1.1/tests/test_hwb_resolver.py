"""Hollywoodbets resolver: keep every selection, convert profit odds."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import resolver as R

def assert_true(cond, msg):
    if not cond:
        print("FAIL:", msg)
        raise SystemExit(1)
    print("ok:", msg)

legs = R._hwb_collect_legs({
    "selections": [
        {
            "marketName": "Double Chance",
            "selectionName": "Home or Draw",
            "odds": 0.45,
            "eventName": "Kaizer Chiefs vs Orlando Pirates",
        },
        {
            "marketName": "Full Time Result",
            "selectionName": "Mamelodi Sundowns",
            "price": 1.55,
            "homeTeam": "Mamelodi Sundowns",
            "awayTeam": "Stellenbosch FC",
        },
    ]
})
legs = R._hwb_dedupe_legs(legs)
assert_true(len(legs) == 2, f"JSON collector keeps both selections (got {len(legs)})")
assert_true(abs(legs[0]["odds"] - 1.45) < 1e-6, f"profit 0.45 -> 1.45, got {legs[0]['odds']}")
assert_true(abs(legs[1]["odds"] - 1.55) < 1e-6, f"decimal 1.55 stays, got {legs[1]['odds']}")
assert_true("Chiefs" in legs[0]["match"] and "Pirates" in legs[0]["match"],
            f"fixture 0 mapped: {legs[0]['match']}")
assert_true("Sundowns" in legs[1]["match"] and "Stellenbosch" in legs[1]["match"],
            f"fixture 1 mapped: {legs[1]['match']}")

text = R._hwb_legs_to_text(legs)
assert_true("Double Chance" in text and "Home or Draw" in text, "slip text has first market")
assert_true("Mamelodi Sundowns" in text and "Stellenbosch" in text, "slip text has second match")
assert_true("1.45" in text and "1.55" in text, "slip text has both converted prices")

page = [
    "Cookie", "Privacy", "Sign in",
    "Double Chance - Home or Draw",
    "1.45",
    "Kaizer Chiefs vs Orlando Pirates",
    "Full Time Result - Mamelodi Sundowns",
    "1.55",
    "Mamelodi Sundowns vs Stellenbosch FC",
    "Total Odds",
    "2.25",
    "Stake",
]
isolated, ok = R._isolate_slip_lines(page)
assert_true(ok, "hwb isolation marked isolated")
assert_true("Chiefs" in isolated and "Stellenbosch" in isolated,
            "isolation keeps both fixtures")
assert_true("Double Chance" in isolated and "Full Time Result" in isolated,
            "isolation keeps both markets")

one_each = [
    "Booking code",
    "Home or Draw",
    "1.45",
    "Total Odds",
    "1.45",
    "Mamelodi Sundowns",
    "1.55",
    "Total Odds",
    "1.55",
]
merged, ok2 = R._isolate_slip_lines(one_each)
assert_true(ok2, "two single-leg blocks isolated")
assert_true("1.45" in merged and "1.55" in merged, "merged both 1-leg blocks")

code, hint = R._extract_booking_code("1485945330", "Auto")
assert_true(code == "1485945330" and hint == "Hollywoodbets",
            f"numeric Bet ID maps to Hollywoodbets ({code}, {hint})")


# Current selection price must win over unrelated historical/boosted fields.
priority = R._hwb_leg_from_dict({
    "marketName": "Match Result",
    "selectionName": "Home",
    "eventName": "Team A vs Team B",
    "odds": 1.62,
    "oldOdds": 2.40,
    "originalPrice": 2.10,
    "boostedOdds": 3.50,
})
assert_true(abs(priority["odds"] - 1.62) < 1e-6,
            f"current odds selected instead of old/boosted odds ({priority['odds']})")

nested_priority = R._hwb_odds({
    "currentOdds": 1.73,
    "oldOdds": 2.80,
    "boostedPrice": 3.20,
})
assert_true(abs(nested_priority - 1.73) < 1e-6,
            f"nested current odds prioritized ({nested_priority})")

print("All Hollywoodbets resolver tests passed")
