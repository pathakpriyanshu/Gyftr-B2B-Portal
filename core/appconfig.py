"""
Small environment-variable helpers shared by settings and the app.

Kept dependency-free (no Django import) so `config.settings` can import it while
it is still being constructed.
"""
import os


def get_env(name: str, default: str = "") -> str:
    val = os.environ.get(name)
    return default if val is None else val


def env_str(name: str, default: str = "") -> str:
    val = os.environ.get(name)
    if val is None or val.strip() == "":
        return default
    return val


def env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def env_bool(name: str, default: bool) -> bool:
    val = os.environ.get(name)
    if val is None or val.strip() == "":
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")
