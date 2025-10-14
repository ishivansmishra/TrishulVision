from __future__ import annotations
import httpx
from ..config import settings


class EarthdataAuthError(Exception):
    pass


def _auth_headers() -> dict:
    # Prefer bearer token if provided; else basic-auth via httpx
    token = getattr(settings, 'EARTHDATA_TOKEN', '') or ''
    if token:
        return { 'Authorization': f'Bearer {token}' }
    return {}


async def download(url: str, timeout: float = 120.0) -> bytes:
    # Supports two auth modes:
    # - Bearer token via EARTHDATA_TOKEN
    # - Basic auth via EARTHDATA_USERNAME / EARTHDATA_PASSWORD
    headers = _auth_headers()
    auth = None
    if not headers and (getattr(settings, 'EARTHDATA_USERNAME', None) and getattr(settings, 'EARTHDATA_PASSWORD', None)):
        auth = (settings.__dict__['EARTHDATA_USERNAME'], settings.__dict__['EARTHDATA_PASSWORD'])
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, auth=auth) as client:
        r = await client.get(url, headers=headers)
        if r.status_code == 401:
            raise EarthdataAuthError('Unauthorized: check EARTHDATA_TOKEN or EARTHDATA_USERNAME/PASSWORD')
        r.raise_for_status()
        return r.content


def select_download_url(links: list[dict]) -> str | None:
    """Pick the best downloadable link from CMR links array.
    Preference: rel contains 'data#' or 'download', fallback to first http(s) href.
    """
    if not isinstance(links, list):
        return None
    # Prefer data links
    for l in links:
        rel = (l or {}).get('rel', '')
        href = (l or {}).get('href')
        if href and isinstance(href, str) and ('data#' in rel or 'download' in rel):
            return href
    # Fallback to first http(s)
    for l in links:
        href = (l or {}).get('href')
        if isinstance(href, str) and href.startswith('http'):
            return href
    return None
