from dpi.matching import master_communities as mc


def test_name_rules_beat_area() -> None:
    assert mc.assign("Murano Furjan Tower 1", "591", "Jabal Ali First") == ("Al Furjan", "name")
    assert mc.assign("Beach Vista Tower 1", "392", "Marsa Dubai") == ("Emaar Beachfront", "name")
    assert mc.assign("Expo Valley 3", "521", "Madinat Al Mataar") == ("Expo City", "name")
    assert mc.assign("Citywalk Residential Building 11A", "343", "Al Wasl") == ("City Walk", "name")


def test_whole_words_only() -> None:
    assert mc.assign("Mbrace Tower", "346", "Business Bay")[0] == "Business Bay"
    assert mc.assign("Exponent", "346", "Business Bay")[0] == "Business Bay"


def test_area_then_official_rollup() -> None:
    assert mc.assign("Some Tower", "392", "Marsa Dubai") == ("Dubai Marina", "area")
    assert mc.assign("Some Tower", "373", "Al Barsha First") == ("Al Barsha", "area")
    assert mc.assign("Some Tower", "999", "Al Hebiah Sixth") == ("Al Hebiah", "official")
    assert mc.assign("Some Tower", None, None) == (None, None)


def test_discovery_gardens_clusters_only_in_jabal_ali_first() -> None:
    assert mc.assign("Med 64", "591", "Jabal Ali First") == ("Discovery Gardens", "name")
    assert mc.assign("Con 109", "591", "Jabal Ali First")[0] == "Discovery Gardens"
    assert mc.assign("Con 109", "681", "Al Barsha South Fourth")[0] == "Jumeirah Village Circle (JVC)"
