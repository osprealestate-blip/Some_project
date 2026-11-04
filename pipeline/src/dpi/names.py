"""Name normalising and the community name resolver (logic ported from osp-crm community_map.py)."""
from __future__ import annotations

import re
from dataclasses import dataclass

BLANK = {"", "0", "null", "none", "na", "n a", "nan", "-", "unknown"}

_SPELLING = [
    (re.compile(r"\bjumeriah\b"), "jumeirah"),
    (re.compile(r"\bjumeira\b"), "jumeirah"),
    (re.compile(r"\bemar\b"), "emaar"),
    (re.compile(r"\bbeach front\b"), "beachfront"),
    (re.compile(r"\bmohammad\b"), "mohammed"),
]


def name_key(raw: str | None) -> str:
    """Lower case, no punctuation, single spaces, common misspellings fixed."""
    if not raw:
        return ""
    s = str(raw).lower().replace("&", " and ").replace("'", "")
    s = " ".join(re.sub(r"[^a-z0-9]+", " ", s).split())
    for pattern, fix in _SPELLING:
        s = pattern.sub(fix, s)
    return s


def is_blank(raw: str | None) -> bool:
    k = name_key(raw)
    return k in BLANK or k.isdigit()


@dataclass(frozen=True)
class CommunityRef:
    id: int
    official: str
    common: str | None


class CommunityResolver:
    """Raw DLD area/master-project name -> community id. Unknown names return None (reported, never guessed)."""

    def __init__(self, communities: list[CommunityRef]):
        self._by_key: dict[str, int] = {}
        for c in communities:
            self._by_key.setdefault(name_key(c.official), c.id)
        for c in communities:  # common names never override an official name
            if c.common:
                self._by_key.setdefault(name_key(c.common), c.id)
        self.unmatched: dict[str, int] = {}

    def resolve(self, *candidates: str | None) -> int | None:
        """First candidate (e.g. area, then master project) that matches a community."""
        first_raw = None
        for raw in candidates:
            if is_blank(raw):
                continue
            first_raw = first_raw or str(raw).strip()
            hit = self._by_key.get(name_key(raw))
            if hit is not None:
                return hit
        if first_raw:
            self.unmatched[first_raw] = self.unmatched.get(first_raw, 0) + 1
        return None
