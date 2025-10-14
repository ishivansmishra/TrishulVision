from __future__ import annotations
import os
from pathlib import Path
from typing import Optional
from ..config import settings

_HAS_BOTO3 = True
try:
    import boto3  # type: ignore
    from botocore.exceptions import BotoCoreError, ClientError  # type: ignore
except Exception:
    _HAS_BOTO3 = False


def s3_enabled() -> bool:
    return _HAS_BOTO3 and bool(settings.__dict__.get('S3_BUCKET'))


def s3_client():
    if not _HAS_BOTO3:
        raise RuntimeError('boto3 not installed')
    kwargs = {}
    if settings.__dict__.get('S3_ENDPOINT_URL'):
        kwargs['endpoint_url'] = settings.__dict__['S3_ENDPOINT_URL']
    if settings.__dict__.get('S3_ACCESS_KEY') and settings.__dict__.get('S3_SECRET_KEY'):
        kwargs['aws_access_key_id'] = settings.__dict__['S3_ACCESS_KEY']
        kwargs['aws_secret_access_key'] = settings.__dict__['S3_SECRET_KEY']
    if settings.__dict__.get('S3_REGION'):
        kwargs['region_name'] = settings.__dict__['S3_REGION']
    return boto3.client('s3', **kwargs)  # type: ignore


def save_bytes_to_s3(key: str, data: bytes, content_type: str = 'application/octet-stream') -> str:
    if not s3_enabled():
        raise RuntimeError('S3 not configured')
    c = s3_client()
    c.put_object(Bucket=settings.__dict__['S3_BUCKET'], Key=key, Body=data, ContentType=content_type)
    base = settings.__dict__.get('S3_PUBLIC_BASE')
    if base:
        return f"{base.rstrip('/')}/{key}"
    # Fallback to s3:// URL
    return f"s3://{settings.__dict__['S3_BUCKET']}/{key}"


def generate_s3_key(prefix: str, filename: str) -> str:
    from uuid import uuid4
    name = Path(filename).name
    return f"{prefix.rstrip('/')}/{uuid4()}_{name}"
