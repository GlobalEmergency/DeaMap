#!/usr/bin/env python3
"""Preview listings by default; --apply updates listings in a validated Play edit.

For --apply, supply GOOGLE_APPLICATION_CREDENTIALS from the credential vault.
This script does not upload a binary or modify release tracks.
"""
import argparse
import json
import os

from store_metadata import load_listings


def apply_listings(service, listings):
    """Publish validated texts without changing videos, images or release tracks."""
    package = "es.deamap.mobile"
    edits = service.edits()
    edit_id = edits.insert(body={}, packageName=package).execute()["id"]
    try:
        for locale, listing in listings.items():
            edits.listings().patch(
                packageName=package, editId=edit_id, language=locale,
                body=listing,
            ).execute()
        edits.validate(packageName=package, editId=edit_id).execute()
        edits.commit(
            packageName=package, editId=edit_id,
            changesInReviewBehavior="ERROR_IF_IN_REVIEW",
        ).execute()
    except Exception:
        # A failed localization must never publish a partially updated edit.
        try:
            edits.delete(packageName=package, editId=edit_id).execute()
        except Exception:
            pass
        raise RuntimeError("Store update failed; verify the edit status in Play Console.") from None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    listings = load_listings("googlePlay")
    if not args.apply:
        print(json.dumps(listings, ensure_ascii=True, indent=2))
        return

    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    credentials = service_account.Credentials.from_service_account_file(
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"],
        scopes=["https://www.googleapis.com/auth/androidpublisher"],
    )
    service = build(
        "androidpublisher", "v3", credentials=credentials,
        cache_discovery=False, static_discovery=False,
    )
    apply_listings(service, listings)
    print("Google Play listings updated: " + ", ".join(listings))


if __name__ == "__main__":
    main()
