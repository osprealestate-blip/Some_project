"""Every building gets a master community: the name people actually use (Dubai Marina, Al Furjan, DAMAC Hills ...),
not the official Dubai Municipality area name.

Order of evidence, first hit wins, and the basis is stored so nothing is passed off as more certain than it is:
1. `name`  - the building name contains a well-known master-development or project word (e.g. "Furjan", "Expo",
             "Damac Lagoons", "Citywalk"). Whole words only.
2. `area`  - the official DM area is known to be one popular community (e.g. 392 Marsa Dubai = Dubai Marina).
3. `official` - nothing better is known, so the official area name is used with its First/Second/... number dropped
             (Al Barsha First/Second/Third -> Al Barsha). Still a real place name, but flagged as official-area.
Buildings with no community at all stay unassigned.
"""
from __future__ import annotations

import re

# (master community, whole-word name fragments). Matched against the building name, lower-cased, punctuation -> space.
NAME_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("Expo City", ("expo", "expo city")),
    ("Al Furjan", ("furjan", "al furjan", "azizi amber", "azizi freesia", "azizi plaza", "glamz", "starz", "sparklz",
                   "murano residence", "murano residences")),
    ("Discovery Gardens", ("discovery gardens", "mediterranean cluster", "contemporary cluster", "zen cluster",
                           "mogul cluster", "streamz")),
    ("DAMAC Lagoons", ("damac lagoons", "lagoon views")),
    ("DAMAC Hills 2", ("damac hills 2", "akoya")),
    ("DAMAC Hills", ("damac hills", "golf promenade", "artesia", "golf veduta")),
    ("Remraam", ("remraam", "al thamam", "al ramth")),
    ("Al Barari", ("al barari", "barari")),
    ("Dubai Land Residence Complex (DLRC)", ("dlrc", "dubai land residence", "skycourts")),
    ("Emaar Beachfront", ("emaar beachfront", "beach vista", "beach isle", "beach mansion", "sunrise bay",
                          "palace beach residence", "marina vista", "grand bleu tower")),
    ("Bluewaters Island", ("bluewaters",)),
    ("Dubai Harbour", ("dubai harbour", "damac bay", "sobha seahaven")),
    ("Jumeirah Beach Residence (JBR)", ("jumeirah beach residence", "jbr", "jumeirah gate")),
    ("Palm Jumeirah", ("palm jumeirah",)),
    ("City Walk", ("city walk", "citywalk")),
    ("Mohammed Bin Rashid City (MBR City)", ("mbr", "mohammed bin rashid", "district one", "sobha hartland",
                                              "wilton terraces", "crest grande")),
    ("Meydan", ("meydan", "azizi riviera", "polo residence")),
    ("Dubai Hills Estate", ("dubai hills", "park heights", "golf place", "club drive", "sidra")),
    ("Jumeirah Village Triangle (JVT)", ("jumeirah village triangle", "jvt")),
    ("Dubai Internet City", ("internet city", "media city", "knowledge village")),
    ("DIFC", ("difc", "gate district")),
    ("Dubai Creek Harbour", ("creek harbour", "creek harbor", "creek beach", "dubai creek residences")),
    ("Downtown Dubai", ("downtown", "burj khalifa", "dubai mall", "boulevard point", "burj royale")),
    ("Dubai Studio City", ("studio city",)),
    ("Motor City", ("motor city",)),
    ("Dubai Sports City", ("sports city",)),
    ("Dubai Production City (IMPZ)", ("production city", "impz")),
    ("Dubai Silicon Oasis", ("silicon oasis", "silicon gates", "silicon heights")),
    ("Jumeirah Lake Towers (JLT)", ("jumeirah lake towers", "jlt")),
]

# Dubai Discovery Gardens clusters are written "Med 64", "Mog 183", "Con 109", "Zen 12". Only inside Jabal Ali First.
PREFIX_RULES: list[tuple[str, str, tuple[str, ...]]] = [
    ("Discovery Gardens", "591", ("med", "mog", "con", "zen")),
]

# Official DM area code -> master community. Only areas whose buildings are overwhelmingly that one community
# (checked against building names in the hosted database on 21 Nov 2026).
AREA_MAP: dict[str, str] = {
    "345": "Downtown Dubai",                         # Burj Khalifa
    "392": "Dubai Marina",                           # Marsa Dubai
    "393": "Jumeirah Lake Towers (JLT)",             # Al Thanyah Fifth
    "681": "Jumeirah Village Circle (JVC)",          # Al Barsha South Fourth
    "346": "Business Bay",
    "521": "Dubai South",                            # Madinat Al Mataar
    "631": "Dubai Hills Estate",                     # Hadaeq Sheikh Mohammed Bin Rashid
    "415": "Dubai Creek Harbour",                    # Al Kheeran First
    "381": "Palm Jumeirah", "101": "Palm Deira", "501": "Palm Jebel Ali", "303": "The World Islands",
    "373": "Al Barsha",
    "332": "Jumeirah", "342": "Jumeirah",
    "366": "Umm Suqeim",
    "598": "Dubai Investment Park (DIP)", "597": "Dubai Investment Park (DIP)",
    "591": "Jebel Ali", "518": "Jebel Ali",           # Jabal Ali First / Industrial Second
    "618": "Nad Al Sheba",                           # Nadd Al Shiba First
    "626": "Dubai Silicon Oasis",                    # Nadd Hessa
    "685": "Dubai Production City (IMPZ)",           # Me'Aisem First
    "675": "Dubai Studio City",                      # Al Hebiah Second
    "674": "Motor City",                             # Al Hebiah First
    "682": "Dubai Sports City",                      # Al Hebiah Fourth
    "676": "DAMAC Hills",                            # Al Hebiah Third
    "648": "Dubai Land Residence Complex (DLRC)",    # Wadi Al Safa 5
    "531": "Dubai Industrial City",                  # Saih Shuaib 2
    "343": "Al Wasl",
    "334": "Jumeirah Garden City",                   # Al Satwa
    "321": "Dubai Maritime City",                    # Madinat Dubai Al Melaheyah
    "326": "Al Jaddaf",
    "922": "Town Square",                            # Al Yalayis 2
    "673": "Arjan",                                  # Al Barsha South Third
    "412": "Dubai Festival City",                    # Al Kheeran
    "621": "International City",                     # Warsan First
    "382": "Dubai Internet City", "372": "Al Sufouh",
    "645": "Dubailand", "643": "Dubailand", "646": "Dubailand", "665": "Dubailand",
    "325": "Za'abeel", "337": "Za'abeel",
}

_ORDINAL = re.compile(r"\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+)$", re.I)


def norm(name: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9]+", " ", (name or "").lower()).split())


def _title(official: str) -> str:
    base = _ORDINAL.sub("", official.strip())
    return base or official.strip()


def assign(name: str, dm_code: str | None, official_area: str | None) -> tuple[str | None, str | None]:
    """(master community, basis) where basis is name | area | official; (None, None) with no community at all."""
    key = f" {norm(name)} "
    for master, frags in NAME_RULES:
        if any(f" {f} " in key for f in frags):
            return master, "name"
    for master, code, prefixes in PREFIX_RULES:
        if dm_code and str(dm_code) == code and any(key.startswith(f" {p} ") for p in prefixes):
            return master, "name"
    if dm_code and str(dm_code) in AREA_MAP:
        return AREA_MAP[str(dm_code)], "area"
    if official_area:
        return _title(official_area), "official"
    return None, None


NK_SQL = "(' ' || regexp_replace(lower(coalesce(b.name_en, '')), '[^a-z0-9]+', ' ', 'g') || ' ')"


def sql_case() -> str:
    """The same rules as a Postgres CASE over columns nk (padded normalised name), dm_code and name_official,
    for counting in SQL. Returns 'master|basis'."""
    q = lambda s: "'" + s.replace("'", "''") + "'"
    parts = []
    for master, frags in NAME_RULES:
        cond = " or ".join(f"nk like {q('% ' + f + ' %')}" for f in frags)
        parts.append(f"when {cond} then {q(master + '|name')}")
    for master, code, prefixes in PREFIX_RULES:
        cond = " or ".join(f"nk like {q(' ' + p + ' %')}" for p in prefixes)
        parts.append(f"when dm_code = {q(code)} and ({cond}) then {q(master + '|name')}")
    for code, master in AREA_MAP.items():
        parts.append(f"when dm_code = {q(code)} then {q(master + '|area')}")
    parts.append("when name_official is not null then regexp_replace(name_official, "
                 "'\\s+(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|[0-9]+)$', '', 'i') || '|official'")
    return "case " + " ".join(parts) + " end"
