"""Serve only mobile/dist for visual review, never Vite/source or private files.

Run after npm run build in mobile. --demo-location uses fixed public Madrid
coordinates for screenshots; no browser/device location is requested or recorded.
Only anonymous GET requests to the public AED endpoints are forwarded.
"""
import argparse
import http.server
from pathlib import Path
import re
import urllib.request
import urllib.error

DIST = Path(__file__).resolve().parents[2] / "mobile/dist"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=3202)
    parser.add_argument("--demo-location", action="store_true")
    args = parser.parse_args()
    if not (DIST / "index.html").is_file():
        raise SystemExit("Build mobile before opening the preview.")

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *handler_args, **kwargs):
            super().__init__(*handler_args, directory=str(DIST), **kwargs)

        def do_GET(self):
            path = self.path.split("?", 1)[0]
            if path.startswith("/api/"):
                if not re.fullmatch(r"/api/aeds/(by-bounds|nearby|[a-zA-Z0-9-]+)", path):
                    self.send_error(404)
                    return
                try:
                    request = urllib.request.Request("https://deamap.es" + self.path,
                                                     headers={"Accept": "application/json"})
                    with urllib.request.urlopen(request, timeout=20) as response:
                        content = response.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(content)
                except (urllib.error.URLError, TimeoutError):
                    self.send_error(502, "Public AED service unavailable")
                return
            if path == "/" or path.startswith(("/tabs", "/dea/", "/login", "/register")):
                content = (DIST / "index.html").read_text(encoding="utf-8")
                if args.demo_location:
                    fixture = """<script>
                    Object.defineProperty(navigator, 'geolocation', {value: {
                      getCurrentPosition(success) { success({coords: {
                        latitude:40.4168, longitude:-3.7038, accuracy:20,
                        altitude:null, altitudeAccuracy:null, heading:null, speed:null
                      }, timestamp:Date.now()}); }
                    }});
                    </script>"""
                    content = content.replace("<head>", "<head>" + fixture)
                data = content.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return
            if path.startswith("/assets/") and path.endswith(".js"):
                file = (DIST / path.lstrip("/")).resolve()
                if not file.is_relative_to(DIST.resolve()) or not file.is_file():
                    self.send_error(404)
                    return
                # Route the compiled public API base through this anonymous preview proxy.
                data = file.read_bytes().replace(b"https://deamap.es", b"")
                self.send_response(200)
                self.send_header("Content-Type", "text/javascript")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(data)
                return
            super().do_GET()

    print(f"Public compiled preview: http://{args.host}:{args.port}", flush=True)
    http.server.ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
