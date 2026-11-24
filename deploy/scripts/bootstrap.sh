#!/usr/bin/env bash
# Run ONCE as root on a fresh Ubuntu 22.04/24.04 VPS:  bash bootstrap.sh "<your public ssh key line>"
# Creates a non-root user `deploy`, installs Docker, firewall, fail2ban, automatic security updates and swap.
set -euo pipefail
PUBKEY="${1:?usage: bash bootstrap.sh \"ssh-ed25519 AAAA... you@pc\"}"
export DEBIAN_FRONTEND=noninteractive

apt-get update && apt-get -y upgrade
apt-get -y install ufw fail2ban unattended-upgrades git curl ca-certificates openssl osmium-tool

# Non-root user with your key
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-deploy && chmod 440 /etc/sudoers.d/90-deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
grep -qxF "$PUBKEY" /home/deploy/.ssh/authorized_keys 2>/dev/null || echo "$PUBKEY" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys

# Docker
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy

# Swap (the web build needs it on 4 GB)
if ! swapon --show | grep -q .; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

# Firewall: only SSH, HTTP, HTTPS. (The database is bound to 127.0.0.1, so Docker does not expose it.)
ufw default deny incoming && ufw default allow outgoing
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp
ufw --force enable

# Automatic security updates + brute-force protection
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
CONF
systemctl enable --now fail2ban unattended-upgrades

echo
echo "Done. NOW, from your PC, open a NEW terminal and check:  ssh deploy@<server-ip>"
echo "Only after that works, run:  bash harden-ssh.sh   (turns off password and root login)."
