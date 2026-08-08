"""gunnchOS ai_interface HTTP client stub (Continuance VI).

Copy/adapt into gunnchos-device-os AiInterfaceService to call host-forwarded
gunnchAI3k product-service. QEMU may forward 127.0.0.1:8791 to the host.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any


class GunnchAiInterfaceClient:
    def __init__(self, base_url: str = "http://127.0.0.1:8791", timeout_s: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.timeout_s = timeout_s

    def _request(self, method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
        data = None if body is None else json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            data=data,
            method=method,
            headers={"content-type": "application/json"} if body is not None else {},
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout_s) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.URLError as exc:
            return {
                "ok": False,
                "errorCode": "AI_UNAVAILABLE",
                "errorMessage": str(exc),
                "fallback": "deterministic-local-unavailable",
            }

    def discover(self) -> dict[str, Any]:
        return self._request("GET", "/v1/os/discover")

    def model_status(self) -> dict[str, Any]:
        return self._request("GET", "/v1/os/model-status")

    def rag_status(self) -> dict[str, Any]:
        return self._request("GET", "/v1/os/rag-status")

    def tutor_start(self, profile: str = "student", topic: str = "intro") -> dict[str, Any]:
        assist = self._request(
            "POST",
            "/v1/assist/tutoring",
            {"query": f"WAIKE tutoring for {profile}: {topic}", "timeoutMs": int(self.timeout_s * 1000)},
        )
        return {
            "started": bool(assist.get("ok")),
            "profile": profile,
            "topic": topic,
            "privacy_mode": "local_only",
            "runtime_service": True,
            "mock": False,
            "assist": assist,
        }

    def set_consent(self, user_cloud_consent: bool) -> dict[str, Any]:
        return self._request("POST", "/v1/governance/consent", {"userCloudConsent": user_cloud_consent})

    def cancel(self, request_id: str) -> dict[str, Any]:
        return self._request("POST", "/v1/assist/cancel", {"requestId": request_id})
