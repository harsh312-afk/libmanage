from datetime import datetime, timezone

def utc_now() -> datetime:
    """Returns current UTC datetime (naive or timezone-aware as standard UTC)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
