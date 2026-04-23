import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen


REPORTS_FILE = "reports.shared.json"
RECAPTCHA_SECRET_KEY = os.environ.get("RECAPTCHA_SECRET_KEY", "").strip()
RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"
RECAPTCHA_MIN_SCORE = 0.3


def load_reports():
    if not os.path.exists(REPORTS_FILE):
        return []
    try:
        with open(REPORTS_FILE, "r", encoding="utf-8") as handle:
            data = json.load(handle)
            return data if isinstance(data, list) else []
    except Exception:
        return []


def save_reports(reports):
    with open(REPORTS_FILE, "w", encoding="utf-8") as handle:
        json.dump(reports, handle, ensure_ascii=True)


def verify_recaptcha(token, remote_ip):
    if not RECAPTCHA_SECRET_KEY:
        return True, "recaptcha_secret_not_configured"
    if not token:
        return False, "recaptcha_token_missing"

    payload = {"secret": RECAPTCHA_SECRET_KEY, "response": token}
    if remote_ip:
        payload["remoteip"] = remote_ip

    body = urlencode(payload).encode("utf-8")
    request = Request(
        RECAPTCHA_VERIFY_URL,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=5) as response:
            parsed = json.loads(response.read().decode("utf-8"))
    except Exception:
        return False, "recaptcha_verification_failed"

    if not parsed.get("success"):
        return False, "recaptcha_unsuccessful"
    if float(parsed.get("score", 0.0)) < RECAPTCHA_MIN_SCORE:
        return False, "recaptcha_score_too_low"
    return True, "recaptcha_verified"


class AppHandler(SimpleHTTPRequestHandler):
    def _send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        if urlparse(self.path).path == "/api/reports":
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
            return
        super().do_OPTIONS()

    def do_GET(self):
        if urlparse(self.path).path == "/api/reports":
            self._send_json(load_reports(), 200)
            return
        super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/reports":
            self._send_json({"error": "Not Found"}, 404)
            return

        length = int(self.headers.get("Content-Length", "0"))
        try:
            raw = self.rfile.read(length) if length else b"{}"
            payload = json.loads(raw.decode("utf-8"))
        except Exception:
            self._send_json({"error": "Invalid JSON"}, 400)
            return

        try:
            lat = float(payload.get("lat"))
            lng = float(payload.get("lng"))
            report_id = str(payload.get("id") or f"report-{int(__import__('time').time() * 1000)}")
            timestamp = int(payload.get("timestamp") or int(__import__("time").time() * 1000))
            recaptcha_token = str(payload.get("recaptchaToken") or "")
        except Exception:
            self._send_json({"error": "Invalid report payload"}, 400)
            return

        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            self._send_json({"error": "Coordinates out of bounds"}, 400)
            return

        remote_ip = self.client_address[0] if self.client_address else ""
        verified, reason = verify_recaptcha(recaptcha_token, remote_ip)
        if not verified:
            self._send_json({"error": "reCAPTCHA verification failed", "reason": reason}, 403)
            return

        reports = load_reports()
        reports.append({"id": report_id, "lat": lat, "lng": lng, "timestamp": timestamp})
        save_reports(reports)
        self._send_json({"ok": True, "count": len(reports)}, 201)


if __name__ == "__main__":
    host = "0.0.0.0"
    port = int(os.environ.get("PORT", "5500"))
    server = ThreadingHTTPServer((host, port), AppHandler)
    print(f"Serving app + API on http://{host}:{port}")
    server.serve_forever()
