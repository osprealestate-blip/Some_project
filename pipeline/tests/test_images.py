from dpi.images import ImageRow, check_row, commons_candidates, read_manifest
from dpi.importers.projects import _parse_date


def row(**kw):
    base = dict(building="marina-gate", url="https://upload.wikimedia.org/x.jpg", source="wikimedia",
                author="Jane Doe", licence="CC BY-SA 4.0")
    base.update(kw)
    return ImageRow(**base)


def test_free_licence_with_credit_is_fine():
    assert check_row(row()) is None
    assert check_row(row(licence="CC0")) is None
    assert check_row(row(licence="Public domain")) is None


def test_rejects_missing_credit_or_non_free_licence():
    assert "author" in check_row(row(author=""))
    assert "licence" in check_row(row(licence="All rights reserved"))
    assert "licence" in check_row(row(licence=""))


def test_rejects_portals_and_http():
    assert "not allowed" in check_row(row(url="https://cdn.propertyfinder.ae/a.jpg"))
    assert "not allowed" in check_row(row(source_url="https://www.bayut.com/x"))
    assert "https" in check_row(row(url="http://example.com/a.jpg"))


def test_own_photo_needs_no_licence_text():
    assert check_row(ImageRow("b", "https://x.supabase.co/a.jpg", "own")) is None


def test_commons_candidates_filter_licence_and_shape():
    def page(i, lic, w, h, mime="image/jpeg"):
        return {"index": i, "title": f"File:T{i}.jpg", "imageinfo": [{
            "thumburl": f"https://upload.wikimedia.org/t{i}.jpg", "descriptionurl": f"https://commons.wikimedia.org/wiki/File:T{i}.jpg",
            "width": w, "height": h, "mime": mime,
            "extmetadata": {"LicenseShortName": {"value": lic}, "Artist": {"value": "<a href='#'>Ann</a>"}, "LicenseUrl": {"value": "https://cc"}}}]}
    data = {"query": {"pages": {"1": page(1, "CC BY-SA 4.0", 1600, 900), "2": page(2, "Fair use", 1600, 900),
                                "3": page(3, "CC BY 2.0", 800, 1200), "4": page(4, "CC0", 1600, 900, "image/svg+xml")}}}
    out = commons_candidates("Marina Gate", "Dubai Marina", fetch=lambda url: data)
    assert [c.title for c in out] == ["T1.jpg"]
    assert out[0].author == "Ann" and out[0].licence == "CC BY-SA 4.0"


def test_manifest_reads_headers_loosely(tmp_path):
    p = tmp_path / "m.csv"
    p.write_text("Building, URL ,Source\nx,https://a/b.jpg,own\n", encoding="utf-8")
    assert read_manifest(p) == [{"building": "x", "url": "https://a/b.jpg", "source": "own"}]


def test_project_dates():
    assert str(_parse_date("2027-03-31")) == "2027-03-31"
    assert str(_parse_date("31/03/2027")) == "2027-03-31"
    assert _parse_date("2204-01-01") is None and _parse_date("") is None
