"""Load and validate the shared, reviewable store listings without credentials."""
import json
from pathlib import Path

LISTINGS_PATH = Path(__file__).resolve().parents[2] / "public/app-store/01-store-listings.json"
LIMITS = {
    "googlePlay": {"title": 30, "shortDescription": 80, "fullDescription": 4000},
    "appStore": {"name": 30, "subtitle": 30, "keywords": 100,
                 "promotionalText": 170, "description": 4000},
}


def load_listings(store):
    listings = json.loads(LISTINGS_PATH.read_text(encoding="utf-8"))
    result = {}
    for locale, stores in listings.items():
        listing = stores[store]
        for field, limit in LIMITS[store].items():
            value = listing[field]
            length = len(value.encode("utf-8")) if field == "keywords" else len(value)
            if not value.strip() or length > limit:
                raise ValueError(f"{locale}/{store}/{field}: invalid length {length}, limit {limit}")
        result[locale] = listing
    return result
