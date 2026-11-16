import base64
import hashlib
import hmac

from dpi import hosted


def test_scram_verifier_matches_postgres_format():
    # Recompute the RFC 5802 / 7677 keys independently.
    salt = b"0123456789abcdef"
    v = hosted.scram_verifier("pa ss", salt=salt)
    head, keys = v.split("$", 1)[1].split("$")
    assert v.startswith("SCRAM-SHA-256$4096:")
    assert base64.b64decode(head.split(":")[1]) == salt
    salted = hashlib.pbkdf2_hmac("sha256", b"pa ss", salt, 4096)
    stored = hashlib.sha256(hmac.new(salted, b"Client Key", hashlib.sha256).digest()).digest()
    server = hmac.new(salted, b"Server Key", hashlib.sha256).digest()
    assert keys == base64.b64encode(stored).decode() + ":" + base64.b64encode(server).decode()
    assert "pa ss" not in v


def test_env_file_keeps_other_lines(tmp_path):
    f = tmp_path / ".env.hosted"
    f.write_text("OTHER=1\nHOSTED_DATABASE_URL=old\n")
    hosted.set_env_line(f, "HOSTED_DATABASE_URL", "new")
    assert f.read_text() == "OTHER=1\nHOSTED_DATABASE_URL=new\n"
    assert hosted.read_env_line(f, "HOSTED_DATABASE_URL") == "new"


def test_pooler_url_escapes_password():
    url = hosted.pooler_url("dpi_push", "ref", "a/b@c", "aws-1-x.pooler.supabase.com")
    assert url == "postgresql://dpi_push.ref:a%2Fb%40c@aws-1-x.pooler.supabase.com:5432/postgres?sslmode=require"


def test_push_plan_params_split_structure_from_detail():
    from dpi import push_public

    p = push_public.plan_params(["392", "681"], years=3, rent_years=1, all_structure=True)
    assert p["all_struct"] is True and p["codes"] == ["392", "681"]
    assert p["detail"] == ["392", "681"] and p["years"] == 3 and p["rent_years"] == 1
    q = push_public.plan_params(["392"], years=10)
    assert q["all_struct"] is False and q["rent_years"] == 10
    # every placeholder in the plan has a value
    import re
    wanted = set(re.findall(r"%\((\w+)\)s", " ".join(w for _, w in push_public.PLAN)))
    assert wanted <= set(p)
