"""Offline regression checks; run: python -m unittest discover -s scripts/store."""
import unittest
import contextlib
import io
import json
from unittest.mock import MagicMock, patch

from store_metadata import load_listings
import fill_google_play_metadata
import fill_appstore_metadata


class StoreMetadataTests(unittest.TestCase):
    def test_should_preview_without_credentials_or_network(self):
        for publisher in (fill_google_play_metadata, fill_appstore_metadata):
            with self.subTest(publisher=publisher.__name__):
                output = io.StringIO()
                with patch("sys.argv", ["publisher"]), patch.dict("os.environ", {}, clear=True):
                    with contextlib.redirect_stdout(output):
                        publisher.main()
                self.assertEqual(set(json.loads(output.getvalue())), {"es-ES", "en-US"})

    def test_should_discard_edit_when_one_play_locale_fails(self):
        service_account = MagicMock()
        discovery = MagicMock()
        edits = discovery.build.return_value.edits.return_value
        edits.insert.return_value.execute.return_value = {"id": "test-edit"}
        edits.listings.return_value.patch.return_value.execute.side_effect = [
            {}, RuntimeError("second locale failed")
        ]
        modules = {
            "google": MagicMock(), "google.oauth2": MagicMock(service_account=service_account),
            "googleapiclient": MagicMock(), "googleapiclient.discovery": discovery,
        }

        with patch.dict("sys.modules", modules), patch("sys.argv", ["publisher", "--apply"]):
            with patch.dict("os.environ", {"GOOGLE_APPLICATION_CREDENTIALS": "mock-file"}):
                with self.assertRaisesRegex(RuntimeError, "Store update failed"):
                    fill_google_play_metadata.main()

        edits.commit.assert_not_called()
        edits.delete.assert_called_once_with(packageName="es.deamap.mobile", editId="test-edit")

    def test_should_preserve_other_fields_and_not_interrupt_review_when_publishing(self):
        service = MagicMock()
        edits = service.edits.return_value
        edits.insert.return_value.execute.return_value = {"id": "test-edit"}
        listings = {"es-ES": {"title": "DeaMap"}}

        fill_google_play_metadata.apply_listings(service, listings)

        edits.listings.return_value.patch.assert_called_once_with(
            packageName="es.deamap.mobile", editId="test-edit", language="es-ES",
            body={"title": "DeaMap"},
        )
        edits.commit.assert_called_once_with(
            packageName="es.deamap.mobile", editId="test-edit",
            changesInReviewBehavior="ERROR_IF_IN_REVIEW",
        )

    def test_should_accept_both_locales_for_each_store(self):
        for store in ("googlePlay", "appStore"):
            with self.subTest(store=store):
                self.assertEqual(set(load_listings(store)), {"es-ES", "en-US"})

    def test_should_reject_overlong_title_before_publishing(self):
        import json
        listing = {"es-ES": {"googlePlay": {
            "title": "x" * 31, "shortDescription": "short", "fullDescription": "full"
        }}}
        with patch("store_metadata.Path.read_text", return_value=json.dumps(listing)):
            with self.assertRaisesRegex(ValueError, "title"):
                load_listings("googlePlay")

    def test_should_count_keyword_bytes_instead_of_characters(self):
        import json
        listing = {"es-ES": {"appStore": {
            "name": "DeaMap", "subtitle": "Mapa", "keywords": "á" * 51,
            "promotionalText": "Mapa", "description": "Mapa"
        }}}
        with patch("store_metadata.Path.read_text", return_value=json.dumps(listing)):
            with self.assertRaisesRegex(ValueError, "keywords"):
                load_listings("appStore")


if __name__ == "__main__":
    unittest.main()
