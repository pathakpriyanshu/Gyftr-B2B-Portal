from decimal import Decimal, ROUND_HALF_UP

_CENTS = Decimal("0.01")


def money(value) -> Decimal:
    """Round to 2 decimals (matches the Node `money()` helper)."""
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    return value.quantize(_CENTS, rounding=ROUND_HALF_UP)


def indian_group(value) -> str:
    """Group an integer the Indian way: 12,34,567."""
    n = int(round(float(value)))
    sign = "-" if n < 0 else ""
    s = str(abs(n))
    if len(s) <= 3:
        return sign + s
    head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    parts.insert(0, head)
    return sign + ",".join(parts) + "," + tail


def format_inr(value) -> str:
    """Indian rupee, no decimals: ₹4,725 (matches the frontend formatINR default)."""
    return "₹" + indian_group(value)
