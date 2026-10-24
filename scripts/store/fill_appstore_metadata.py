#!/usr/bin/env python3
"""Preview App Store listings; --apply updates an existing editable iOS version.

Supply APP_STORE_PRIVATE_KEY, APP_STORE_KEY_ID and APP_STORE_ISSUER_ID in the
process environment from the credential vault. No versions or releases are created.
"""
import argparse
import json
import os
import time
import urllib.error
import urllib.request

from store_metadata import load_listings

APP_ID = "6760004634"
BASE = "https://api.appstoreconnect.apple.com/v1"
EDITABLE = {"PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    listings = load_listings("appStore")
    if not args.apply:
        print(json.dumps(listings, ensure_ascii=True, indent=2))
        return

    import jwt

    now = int(time.time())
    token = jwt.encode(
        {"iss": os.environ["APP_STORE_ISSUER_ID"], "iat": now,
         "exp": now + 1200, "aud": "appstoreconnect-v1"},
        os.environ["APP_STORE_PRIVATE_KEY"], algorithm="ES256",
        headers={"kid": os.environ["APP_STORE_KEY_ID"], "typ": "JWT"},
    )

    def api(method, path, data=None):
        body = json.dumps(data).encode() if data else None
        request = urllib.request.Request(
            BASE + path, data=body, method=method,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                content = response.read()
                return json.loads(content) if content else {}
        except urllib.error.HTTPError as error:
            # API bodies can contain sensitive request details; report only status.
            raise RuntimeError(f"App Store API {method}: HTTP {error.code}") from None

    versions = api("GET", f"/apps/{APP_ID}/appStoreVersions?filter[platform]=IOS&limit=200")["data"]
    versions = [version for version in versions if version["attributes"]["appStoreState"] in EDITABLE]
    if len(versions) != 1:
        raise RuntimeError("Expected one editable iOS version. Prepare it in App Store Connect first.")
    version_id = versions[0]["id"]
    infos = api("GET", f"/apps/{APP_ID}/appInfos?limit=200")["data"]
    infos = [info for info in infos if info["attributes"].get("appStoreState") in EDITABLE]
    if len(infos) != 1:
        raise RuntimeError("Expected one editable app info. Check App Store Connect before updating.")
    info_id = infos[0]["id"]

    def update_localizations(parent_type, parent_id, resource_type, fields):
        existing = api("GET", f"/{parent_type}/{parent_id}/{resource_type}?limit=200")["data"]
        by_locale = {item["attributes"]["locale"]: item["id"] for item in existing}
        for locale, listing in listings.items():
            attributes = {field: listing[field] for field in fields}
            resource = {"type": resource_type, "attributes": attributes}
            if locale in by_locale:
                resource["id"] = by_locale[locale]
                api("PATCH", f"/{resource_type}/{by_locale[locale]}", {"data": resource})
            else:
                attributes["locale"] = locale
                relationship = "appInfo" if parent_type == "appInfos" else "appStoreVersion"
                resource["relationships"] = {
                    relationship: {"data": {"type": parent_type, "id": parent_id}}
                }
                api("POST", f"/{resource_type}", {"data": resource})

    update_localizations("appInfos", info_id, "appInfoLocalizations",
                         ("name", "subtitle", "privacyPolicyUrl"))
    update_localizations("appStoreVersions", version_id, "appStoreVersionLocalizations",
                         ("description", "keywords", "promotionalText", "supportUrl", "marketingUrl"))
    print("App Store draft metadata updated; no review submission or release requested.")


if __name__ == "__main__":
    main()
