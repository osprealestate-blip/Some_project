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
    # Dubai Municipality writes "Al Qouz IndustrialFirst" with no space.
    (re.compile(r"\bindustrial(first|second|third|fourth|fifth)\b"), r"industrial \1"),
]

# DLD `area_name_en` spelling -> the Dubai Municipality community name in the GeoJSON.
# Checked on 7 Nov 2026 against the 2 Nov sales and rent exports: these are the DLD names that had no community.
# Only one-to-one renames are listed. Names that could be several communities ("AL QUSAIS", "Jabal Ali",
# "Nad Al Shiba", "Um Suqaim", "Lehbab") and areas with no Dubai Municipality polygon ("Madinat Hind 1-4",
# "Al Twar Fourth/Fifth", "Al Mizhar Third/Fourth", "Ghadeer Al tair") stay unmatched on purpose.
_DLD_AREA_RAW = {
    "Palm Jumeirah": "Nakhlat Jumeira",
    "Palm Deira": "Nakhlat Deira",
    "Palm Jabal Ali": "Nakhlat Jabal Ali",
    "Al Warsan First": "Warsan First",
    "Al Warsan Second": "Warsan Second",
    "Al Warsan Third": "Warsan Third",
    "Al Khairan First": "Al Kheeran First",
    "Al Barshaa South First": "Al Barsha South First",
    "Al Barshaa South Second": "Al Barsha South Second",
    "Al Barshaa South Third": "Al Barsha South Third",
    "Al Thanayah Fourth": "Al Thanyah Fourth",
    "Al Yelayiss 1": "Al Yalayis 1",
    "Al Yelayiss 2": "Al Yalayis 2",
    "Al Yelayiss 3": "Al Yalayis 3",
    "Al Yelayiss 4": "Al Yalayis 4",
    "Al Yelayiss 5": "Al Yalayis 5",
    "Madinat Dubai Almelaheyah": "Madinat Dubai Al Melaheyah",
    "Bukadra": "Bu Kadra",
    "Nad Al Shiba First": "Nadd Al Shiba First",
    "Nad Al Shiba Second": "Nadd Al Shiba Second",
    "Nad Al Shiba Third": "Nadd Al Shiba Third",
    "Nad Al Shiba Fourth": "Nadd Al Shiba Fourth",
    "Nad Al Hamar": "Nadd Al Hamar",
    "Nad Shamma": "Nadd Shamma",
    "Um Suqaim First": "Umm Suqeim First",
    "Um Suqaim Second": "Umm Suqeim Second",
    "Um Suqaim Third": "Umm Suqeim Third",
    "Um Hurair First": "Umm Hurair First",
    "Um Hurair Second": "Umm Hurair Second",
    "Um Al Sheif": "Umm Al Sheif",
    "Um Ramool": "Umm Ramool",
    "Um Esalay": "Umm Eselay",
    "Al Goze First": "Al Qouz First",
    "Al Goze Second": "Al Qouz Second",
    "Al Goze Third": "Al Qouz Third",
    "Al Goze Fourth": "Al Qouz Fourth",
    "Al Goze Industrial First": "Al Qouz Industrial First",
    "Al Goze Industrial Second": "Al Qouz Industrial Second",
    "Al Goze Industrial Third": "Al Qouz Industrial Third",
    "Al Goze Industrial Fourth": "Al Qouz Industrial Fourth",
    "Al Warqa First": "Al Warqa'a First",
    "Al Warqa Second": "Al Warqa'a Second",
    "Al Warqa Third": "Al Warqa'a Third",
    "Al Warqa Fourth": "Al Warqa'a Fourth",
    "Al Warqa Fifth": "Al Warqa'a Fifth",
    "Al Saffa First": "Al Safa First",
    "Al Saffa Second": "Al Safa Second",
    "Al Khawaneej First": "Al Khwaneej First",
    "Al Khawaneej Second": "Al Khwaneej Second",
    "Al Aweer First": "Al Awir First",
    "Al Aweer Second": "Al Awir Second",
    "Muhaisanah First": "Muhaisnah First",
    "Al Mararr": "Al Murar",
    "Al Mamzer": "Al Mamzar",
    "Al Suq Al Kabeer": "Al Souq Al Kabeer",
    "Al Murqabat": "Al Muraqqabat",
    "Al Dhagaya": "Al Daghaya",
    "Al Rega": "Al Rigga",
    "Rega Al Buteen": "Riggat Al Buteen",
    "Al Jafliya": "Al Jafiliya",
    "Eyal Nasser": "Ayal Nasir",
    "Al Khabeesi": "Al Khabaisi",
    "Al Waheda": "Al Wuheida",
    "Wadi Al Amardi": "Wadi Alamardi",
    "Al Eyas": "Aleyas",
    "Al Lusaily": "Al Lesaily",
    "Al Layan1": "Al Layan 1",
    "Saih Aldahal": "Saih Al Dahal",
    "Mushrif": "Mushraif",
    "Shandagha": "Al Shindagha",
    "Cornich Deira": "Corniche Deira",
    "Al-Cornich": "Al Corniche",
}



def name_key(raw: str | None) -> str:
    """Lower case, no punctuation, single spaces, common misspellings fixed."""
    if not raw:
        return ""
    s = str(raw).lower().replace("&", " and ").replace("'", "")
    s = " ".join(re.sub(r"[^a-z0-9]+", " ", s).split())
    for pattern, fix in _SPELLING:
        s = pattern.sub(fix, s)
    return s


DLD_AREA_ALIASES = {name_key(k): v for k, v in _DLD_AREA_RAW.items()}


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
        for alias, official in DLD_AREA_ALIASES.items():  # DLD spellings of a community's official name
            target = self._by_key.get(name_key(official))
            if target is not None:
                self._by_key.setdefault(alias, target)
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
