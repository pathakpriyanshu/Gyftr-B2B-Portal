"""
File storage for payment proofs + generated voucher files — mirrors
`src/lib/storage.ts`. Local-disk storage under MEDIA_ROOT/uploads, served by the
authenticated `/api/files/<path>` route. Returns absolute URLs so the file is
reachable cross-origin from the Next.js frontend.
"""
import re
import uuid
from datetime import date
from pathlib import Path

from django.conf import settings

UPLOAD_DIR = Path(settings.MEDIA_ROOT) / "uploads"

CONTENT_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".pdf": "application/pdf",
    ".webp": "image/webp",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


def _safe_name(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]", "_", name)[-80:]


def upload_file(bucket: str, filename: str, data: bytes, content_type: str) -> dict:
    inner = f"{date.today().isoformat()}/{uuid.uuid4()}-{_safe_name(filename)}"
    key = f"{bucket}/{inner}"
    full = UPLOAD_DIR / key
    full.parent.mkdir(parents=True, exist_ok=True)
    full.write_bytes(bytes(data))
    return {"key": key, "url": f"{settings.APP['url']}/api/files/{key}"}


def read_local_file(key: str):
    full = (UPLOAD_DIR / key).resolve()
    try:
        full.relative_to(UPLOAD_DIR.resolve())
    except ValueError:
        return None  # path traversal attempt
    if not full.exists() or not full.is_file():
        return None
    ext = full.suffix.lower()
    return {
        "data": full.read_bytes(),
        "content_type": CONTENT_TYPES.get(ext, "application/octet-stream"),
    }
