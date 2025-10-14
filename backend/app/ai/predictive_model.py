# Volume/depth estimation using Simpson's rule placeholder.
from typing import Dict, Any
import math

def _simpson_1d(y: list[float], dx: float) -> float:
    n = len(y) - 1
    if n < 2 or n % 2 == 1:
        # require even number of intervals; fallback to trapezoidal
        return dx * (sum(y) - 0.5*(y[0]+y[-1]))
    s = y[0] + y[-1]
    s4 = sum(y[i] for i in range(1, n, 2)) * 4.0
    s2 = sum(y[i] for i in range(2, n-1, 2)) * 2.0
    return (dx/3.0) * (s + s4 + s2)


def estimate_depth_volume(dem_path: str | None, polygon_geojson: Dict[str, Any]) -> Dict[str, float]:
    """
    Placeholder: if no DEM available, synthesize a 2D height-delta grid and integrate with Simpson's rule.
    Returns aggregate depth (avg) and volume in cubic meters.
    """
    # Create a synthetic delta height field (meters) over a 100x100 grid
    N = 100
    dx = 1.0  # meter grid spacing (placeholder)
    rows = []
    for i in range(N+1):
        # gentle bowl-like depression: depth peaks near center
        row = []
        for j in range(N+1):
            r = math.hypot(i - N/2, j - N/2) / (N/2)
            h = max(0.0, 20.0 * (1.0 - r))  # peak 20 m decreasing to 0 at edges
            row.append(h)
        rows.append(row)
    # Integrate each row using Simpson's rule, then across columns similarly
    row_integrals = [_simpson_1d(row, dx) for row in rows]
    volume = _simpson_1d(row_integrals, dx)  # m^3
    # Average depth is average of the field
    avg_depth = sum(sum(row) for row in rows) / ((N+1)*(N+1))
    return {"depth_m": float(round(avg_depth, 2)), "volume_m3": float(round(volume, 2))}
