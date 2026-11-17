"""Every `dpi` help string must render (a bare % in argparse help crashes on Python 3.14)."""
from __future__ import annotations

import re
from pathlib import Path

import pytest

from dpi import cli

_SRC = Path(cli.__file__).read_text(encoding="utf-8")
_COMMANDS = re.findall(r'sub\.add_parser\(\s*"([^"]+)"', _SRC)


def test_commands_found() -> None:
    assert len(_COMMANDS) >= 5


def test_top_level_help(capsys: pytest.CaptureFixture[str]) -> None:
    with pytest.raises(SystemExit) as e:
        cli.main(["--help"])
    assert e.value.code == 0
    assert "usage: dpi" in capsys.readouterr().out


@pytest.mark.parametrize("cmd", _COMMANDS)
def test_subcommand_help(cmd: str, capsys: pytest.CaptureFixture[str]) -> None:
    with pytest.raises(SystemExit) as e:
        cli.main([cmd, "--help"])
    assert e.value.code == 0
    assert "usage: dpi" in capsys.readouterr().out
