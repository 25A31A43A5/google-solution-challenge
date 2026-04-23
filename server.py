import json
import os
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlencode, urlparse
from urllib.error import HTTPError
from urllib.request import Request, urlopen


REPORTS_FILE = "reports.shared.json"
RECAPTCHA_SECRET_KEY = os.environ.get("RECAPTCHA_SECRET_KEY", "").strip()
RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"
RECAPTCHA_MIN_SCORE = 0.3
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
# Default to a currently supported model; older model IDs can return 404.
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip()
DEBUG_AI = os.environ.get("DEBUG_AI", "").strip().lower() in {"1", "true", "yes", "on"}
REPORT_COOLDOWN_SECONDS = 8
DUPLICATE_SPOT_WINDOW_SECONDS = 120
SPOT_BUCKET_DECIMALS = 4


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


def is_spam_report(reports, source, lat, lng, now_ms):
    cooldown_ms = REPORT_COOLDOWN_SECONDS * 1000
    duplicate_window_ms = DUPLICATE_SPOT_WINDOW_SECONDS * 1000
    bucket_lat = round(lat, SPOT_BUCKET_DECIMALS)
    bucket_lng = round(lng, SPOT_BUCKET_DECIMALS)

    for report in reversed(reports):
        try:
            report_ts = int(report.get("timestamp", 0))
            report_lat = float(report.get("lat"))
            report_lng = float(report.get("lng"))
        except Exception:
            continue

        age_ms = now_ms - report_ts
        if age_ms < 0:
            continue

        report_source = str(report.get("source") or "")
        if source and report_source == source and age_ms < cooldown_ms:
            return True, "report_cooldown_active"

        if (
            age_ms < duplicate_window_ms
            and round(report_lat, SPOT_BUCKET_DECIMALS) == bucket_lat
            and round(report_lng, SPOT_BUCKET_DECIMALS) == bucket_lng
        ):
            return True, "duplicate_spot_recently_reported"

    return False, ""


def generate_ai_safety_advice(payload):
    lat = float(payload.get("lat"))
    lng = float(payload.get("lng"))
    nearby_zone_count = int(payload.get("nearbyZoneCount") or 0)
    nearby_report_count = int(payload.get("nearbyReportCount") or 0)
    total_zone_count = int(payload.get("totalZoneCount") or 0)
    total_report_count = int(payload.get("totalReportCount") or 0)

    if not GEMINI_API_KEY:
        return (
            "Gemini API key is not configured. Safety tip: reduce speed near intersections, "
            "avoid sudden lane changes, and keep a 3-second following gap."
        )

    prompt = (
        "You are an assistant for a road safety app. Provide exactly 2 short actionable bullet points "
        "for safer driving now. Keep it under 50 words total. Context: "
        f"user_location=({lat:.5f},{lng:.5f}), nearby_zones_1km={nearby_zone_count}, "
        f"nearby_reports_1km={nearby_report_count}, total_zones={total_zone_count}, "
        f"total_reports={total_report_count}."
    )

    body = json.dumps(
        {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 120},
        },
        ensure_ascii=True,
    ).encode("utf-8")

    def call_gemini(model_name):
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_name}:generateContent?key={GEMINI_API_KEY}"
        )
        request = Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
        with urlopen(request, timeout=12) as response:
            return json.loads(response.read().decode("utf-8"))

    try:
        parsed = call_gemini(GEMINI_MODEL)
    except HTTPError as exc:
        # Model IDs/aliases can change; retry a couple of known-good aliases on 404.
        if int(getattr(exc, "code", 0)) == 404:
            for fallback_model in ("gemini-flash-latest", "gemini-2.5-flash"):
                if fallback_model == GEMINI_MODEL:
                    continue
                try:
                    parsed = call_gemini(fallback_model)
                    break
                except HTTPError:
                    continue
            else:
                raise
        else:
            raise
    candidates = parsed.get("candidates") or []
    if not candidates:
        raise ValueError("No candidates returned by Gemini")
    parts = ((candidates[0].get("content") or {}).get("parts")) or []
    text = "\n".join(str(part.get("text") or "").strip() for part in parts).strip()
    if not text:
        raise ValueError("Empty Gemini response")
    return text


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
        if urlparse(self.path).path in {"/api/reports", "/api/ai-advice"}:
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
        path = urlparse(self.path).path
        if path == "/api/ai-advice":
            length = int(self.headers.get("Content-Length", "0"))
            try:
                raw = self.rfile.read(length) if length else b"{}"
                payload = json.loads(raw.decode("utf-8"))
                advice = generate_ai_safety_advice(payload)
            except Exception as exc:
                response = {
                    "advice": (
                        "AI insight is temporarily unavailable. Drive cautiously, "
                        "watch for blind spots, and reduce speed in dense traffic."
                    )
                }
                if DEBUG_AI:
                    response["debug"] = {
                        "gemini_key_configured": bool(GEMINI_API_KEY),
                        "gemini_model": GEMINI_MODEL,
                        "error": f"{type(exc).__name__}: {exc}",
                    }
                self._send_json(response, 200)
                return
            self._send_json({"advice": advice}, 200)
            return

        if path != "/api/reports":
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
        server_timestamp = int(time.time() * 1000)
        is_spam, spam_reason = is_spam_report(reports, remote_ip, lat, lng, server_timestamp)
        if is_spam:
            self._send_json({"error": "Report blocked", "reason": spam_reason}, 429)
            return

        # Use server time and source for anti-spam checks and consistency.
        reports.append(
            {
                "id": report_id,
                "lat": lat,
                "lng": lng,
                "timestamp": server_timestamp,
                "source": remote_ip,
            }
        )
        save_reports(reports)
        self._send_json({"ok": True, "count": len(reports)}, 201)


if __name__ == "__main__":
    host = "0.0.0.0"
    port = int(os.environ.get("PORT", "5500"))
    server = ThreadingHTTPServer((host, port), AppHandler)
    print(f"Serving app + API on http://{host}:{port}")
    server.serve_forever()
