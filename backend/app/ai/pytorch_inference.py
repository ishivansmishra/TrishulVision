from __future__ import annotations

import io
import os
from dataclasses import dataclass
from typing import List

try:
    import torch  # type: ignore
    TORCH_AVAILABLE = True
except Exception:
    torch = None  # type: ignore
    TORCH_AVAILABLE = False

from PIL import Image
import numpy as np


@dataclass
class Detection:
    x: int
    y: int
    w: int
    h: int
    score: float
    label: str = "illegal_mining"


class MiningDetector:
    """Optional PyTorch-backed mining detector with safe fallbacks.

    - If TorchScript weights available, will attempt to load and run them.
    - Otherwise uses a simple brightness heuristic to return a coarse bbox.
    """

    def __init__(self, weights_path: str | None = None, device: str | None = None):
        self.device = self._resolve_device(device)
        self.model = self._load_model(weights_path)

    def _resolve_device(self, device: str | None):
        if TORCH_AVAILABLE and device and device.startswith("cuda"):
            try:
                return torch.device("cuda" if torch.cuda.is_available() else "cpu")
            except Exception:
                return "cpu"
        return torch.device("cpu") if TORCH_AVAILABLE else "cpu"

    def _load_model(self, path: str | None):
        if TORCH_AVAILABLE and path and os.path.exists(path):
            try:
                m = torch.jit.load(path, map_location="cpu")
                m.eval()
                return m
            except Exception:
                pass
        # Fallback lightweight stub
        if TORCH_AVAILABLE:
            return torch.nn.Sequential(
                torch.nn.Conv2d(3, 8, 3, padding=1),
                torch.nn.ReLU(),
                torch.nn.AdaptiveAvgPool2d((1, 1)),
                torch.nn.Flatten(),
                torch.nn.Linear(8, 1),
                torch.nn.Sigmoid(),
            ).eval()
        return None

    def _preprocess(self, image_bytes: bytes):
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        arr = np.array(img)
        if TORCH_AVAILABLE and self.model is not None:
            x = torch.from_numpy(arr).float().permute(2, 0, 1).unsqueeze(0) / 255.0
            return img, arr, x
        return img, arr, None

    def detect_from_image(self, image_bytes: bytes) -> List[Detection]:
        _, arr, x = self._preprocess(image_bytes)
        # If we had a real model, we'd run it here and post-process to boxes/polygons.
        # For safety and portability, return a coarse bbox of bright region as demo.
        gray = arr.mean(axis=2)
        th = gray > (float(gray.mean()) + float(gray.std()))
        ys, xs = np.where(th)
        if ys.size == 0:
            return []
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
        score = 0.65
        # Nudge score if torch "model" says higher activation (very rough demo)
        if TORCH_AVAILABLE and self.model is not None and x is not None:
            try:
                with torch.inference_mode():
                    s = float(self.model(x).item())
                    score = max(score, s)
            except Exception:
                pass
        return [Detection(x=x0, y=y0, w=max(1, x1 - x0), h=max(1, y1 - y0), score=float(score))]


class IoTAnomalyScorer:
    """Optional PyTorch-backed IoT anomaly scorer with safe stub."""

    def __init__(self, weights_path: str | None = None, device: str | None = None):
        self.device = self._resolve_device(device)
        self.model = self._load_model(weights_path)

    def _resolve_device(self, device: str | None):
        if TORCH_AVAILABLE and device and device.startswith("cuda"):
            try:
                return torch.device("cuda" if torch.cuda.is_available() else "cpu")
            except Exception:
                return "cpu"
        return torch.device("cpu") if TORCH_AVAILABLE else "cpu"

    def _load_model(self, path: str | None):
        if TORCH_AVAILABLE and path and os.path.exists(path):
            try:
                m = torch.jit.load(path, map_location="cpu")
                m.eval()
                return m
            except Exception:
                pass
        if TORCH_AVAILABLE:
            return torch.nn.Sequential(
                torch.nn.Linear(60, 32),
                torch.nn.ReLU(),
                torch.nn.Linear(32, 1),
                torch.nn.Sigmoid(),
            ).eval()
        return None

    def score_series(self, series: List[float]) -> float:
        if not series:
            return 0.0
        window = 60
        vals = np.array(series[-window:], dtype=float)
        if vals.size < window:
            pad = np.full((window - vals.size,), float(vals[-1]) if vals.size else 0.0)
            vals = np.concatenate([vals, pad], axis=0)
        # Simple stats-based baseline score
        z = (vals - vals.mean()) / (vals.std() + 1e-6)
        base = float(np.clip(np.abs(z).mean() / 3.0, 0.0, 1.0))
        if TORCH_AVAILABLE and self.model is not None:
            try:
                x = torch.from_numpy(vals.astype(np.float32)).unsqueeze(0)  # [1,60]
                with torch.inference_mode():
                    pred = float(self.model(x).item())
                return max(base, pred)
            except Exception:
                pass
        return base


# Lazy singletons to avoid import-time torch overhead
_mining_detector: MiningDetector | None = None
_iot_anomaly: IoTAnomalyScorer | None = None


def get_mining_detector() -> MiningDetector:
    global _mining_detector
    if _mining_detector is None:
        from ..config import settings
        _mining_detector = MiningDetector(
            weights_path=getattr(settings, 'MINING_MODEL_PATH', None),
            device=getattr(settings, 'TORCH_DEVICE', 'cpu'),
        )
    return _mining_detector


def get_iot_anomaly_scorer() -> IoTAnomalyScorer:
    global _iot_anomaly
    if _iot_anomaly is None:
        from ..config import settings
        _iot_anomaly = IoTAnomalyScorer(
            weights_path=getattr(settings, 'IOT_ANOMALY_MODEL_PATH', None),
            device=getattr(settings, 'TORCH_DEVICE', 'cpu'),
        )
    return _iot_anomaly
