#!/usr/bin/env bash
# Run as root (or with sudo) ONLY after `ssh deploy@<ip>` works with your key.
set -euo pipefail
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'CONF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
CONF
sshd -t && systemctl reload ssh || systemctl reload sshd
echo "SSH hardened: key-only, no root login."
