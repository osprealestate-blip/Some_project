# Moving the site and database to the VPS (Hostinger KVM 1: 1 vCPU, 4 GB)

Goal: run the same site on your own server, keep Vercel + Supabase live as the fallback until the VPS copy is checked.
Everything below is copy-paste. Never paste a password or private key into chat.

**Temporary address:** `https://213-190-4-3.sslip.io` (free; the name contains the server IP, HTTPS is automatic).
Alternatives: the `srvNNNNNN.hstgr.cloud` name shown in hPanel, or a free DuckDNS name. To change it later (real domain),
edit `SITE_HOST` in `deploy/.env` and run `bash scripts/deploy.sh`. Let's Encrypt limits how many certificates one shared
name like `sslip.io` can get per week; if HTTPS fails with a "rate limit" message use the hstgr.cloud name.

## What runs where
| Part | How | Notes |
|---|---|---|
| Caddy | container, ports 80/443 | HTTPS certificate + reverse proxy |
| Web app | container (`web/Dockerfile`, Next.js) | read-only DB login `dpi_web` |
| Database | `postgis/postgis:16-3.4`, volume `dbdata` | only reachable on the server (127.0.0.1) |
| Routing (optional) | 2 OSRM containers (walk, car) | Dubai-only data, ~0.5 GB RAM each |

Memory budget on 4 GB: database 1.5 GB cap, web 1 GB cap, routing 2 x 0.5 GB, plus 4 GB swap for the first build.
If the build is killed ("Killed" / exit 137), run it again; swap is already on after step 1.

## Step 0: where to type
hPanel -> VPS -> **Browser terminal** (you are `root`). After step 1 you can also use PowerShell:
`ssh deploy@213.190.4.3` (needs the key you added). Run steps 1-3 as root, then switch with `su - deploy`.

## Step 1: server basics (once)
Already done if you ran the earlier block (user `deploy`, firewall). Then, as root:
```bash
apt-get update && apt-get install -y git
su - deploy -c 'git clone --branch claude/project-thread-7cqsm8 https://github.com/osprealestate-blip/some_project.git ~/some_project'
bash /home/deploy/some_project/deploy/scripts/bootstrap.sh "PASTE-YOUR-PUBLIC-KEY-LINE"
```
If `git clone` asks for a username the repo is private: make a read-only deploy key
(`su - deploy -c 'ssh-keygen -t ed25519 -N "" -f ~/.ssh/github_deploy'`, show it with `cat /home/deploy/.ssh/github_deploy.pub`,
add it at GitHub -> repo -> Settings -> Deploy keys, leave "write access" off, then clone with
`GIT_SSH_COMMAND='ssh -i ~/.ssh/github_deploy' git clone git@github.com:osprealestate-blip/some_project.git`).

`bootstrap.sh` installs Docker, firewall, fail2ban, automatic security updates, 4 GB swap and `osmium-tool`.
Safe to run twice.

## Step 2: settings file
```bash
su - deploy
cd ~/some_project/deploy
cp .env.example .env
sed -i "s/^SITE_HOST=.*/SITE_HOST=213-190-4-3.sslip.io/" .env
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$(openssl rand -hex 24)/" .env
sed -i "s/^WEB_DB_PASSWORD=.*/WEB_DB_PASSWORD=$(openssl rand -hex 24)/" .env
chmod 600 .env
```
Passwords are generated on the server and stay there (`cat .env` only if you need them).

## Step 3: database up, then copy the data from Supabase
```bash
cd ~/some_project/deploy
docker compose up -d db          # first start applies db/migrations (about a minute)
docker compose ps                # wait until db says "healthy"
bash scripts/restore-from-supabase.sh
```
If `~/.dpi.env` exists (line `HOSTED_DATABASE_URL=...`, `chmod 600`) the script reads it, switching 6543 to 5432, and delete it afterwards (`shred -u ~/.dpi.env`). Otherwise it asks (hidden) for the **session pooler** connection string of the `dpi_push` login: on your PC open
`pipeline\.env.hosted`, copy the `HOSTED_DATABASE_URL=` value, and if it ends `:6543/postgres` change `6543` to `5432`
(pg_dump does not work through port 6543). It downloads about 400 MB; allow 5-15 minutes.

The copy replaces everything in the VPS tables, so it is safe to re-run. Check it, then create the read-only website login:
```bash
bash scripts/counts.sh           # compare with the same query in Supabase's SQL editor
bash scripts/create-web-role.sh
```

## Step 4: start the site
```bash
docker compose up -d --build     # first build: 5-10 minutes on 1 vCPU
docker compose ps
```
Open https://213-190-4-3.sslip.io . Check: home page, a building page (Dubai Marina), the map, the fair-price checker.
If the page shows "data not loaded" the web login is wrong: run `bash scripts/create-web-role.sh` again, then
`docker compose restart web`. Logs: `docker compose logs --tail 50 web caddy`.

## Step 5 (optional): walking and driving minutes
```bash
bash scripts/prepare-routing.sh                 # downloads OSM for the Gulf (~0.5 GB), cuts Dubai, builds route data: 15-40 min
sed -i "s/^ROUTING_ENABLED=.*/ROUTING_ENABLED=1/" .env
docker compose --profile routing up -d
```
The app calls the routing service through your own HTTPS address (`/routed-foot`, `/routed-car`; only `/route/v1/...` is
passed through). Test: open a building and use the Walk / Drive switch. To turn it off set `ROUTING_ENABLED=0` and run
`docker compose --profile routing down` then `docker compose up -d`. Data: (c) OpenStreetMap contributors, already in the
site's attribution.

## Step 6: nightly backups
```bash
(crontab -l 2>/dev/null; echo "0 23 * * * $HOME/some_project/deploy/scripts/backup.sh >> $HOME/backup.log 2>&1") | crontab -
bash ~/some_project/deploy/scripts/backup.sh     # first one now
```
(23:00 server time = 03:00 Dubai.) Keeps 7 files in `~/backups`. Copy one to your PC now and then (PowerShell):
`scp deploy@213.190.4.3:backups/dpi-*.dump $HOME\Downloads\` (a backup on the same server does not protect against losing the server).
Restore: `docker compose exec -T db pg_restore -U dpi -d dpi --clean --if-exists < ~/backups/FILE.dump`.

## Step 7: lock down SSH (only after `ssh deploy@213.190.4.3` works from PowerShell)
```bash
sudo bash ~/some_project/deploy/scripts/harden-ssh.sh
```
Turns off root and password logins. Keep the hPanel Browser terminal as your way back in.

## Deploying updates from GitHub
When a change is merged to `main` (switch the server once: `git -C ~/some_project checkout main`):
```bash
bash ~/some_project/deploy/scripts/deploy.sh     # fetch, fast-forward, rebuild, restart (about 5 minutes)
```
New database migrations are not applied automatically: run the new file with
`docker compose exec -T db psql -U dpi -d dpi < ../db/migrations/NNNN_name.sql`.

## Loading new data (what `dpi push-public` did for Supabase)
From your PC open a tunnel in one PowerShell window: `ssh -L 5434:localhost:5432 deploy@213.190.4.3`, and in another set
`HOSTED_DATABASE_URL` to `postgresql://dpi:<DB_PASSWORD from the server's .env>@localhost:5434/dpi` and run
`dpi push-public` as in `docs/runbook.md`. (`dpi_push` is a Supabase-only role; on the VPS the owner login `dpi` is used.
Untested here: do a `--dry-run` first.)

## Cut-over and rollback
1. Use the VPS address yourself for a few days. Vercel/Supabase are untouched, so rollback is "keep using Vercel".
2. When happy: set `NEXT_PUBLIC_SITE_URL` through `SITE_HOST`, point your real domain's A record to 213.190.4.3, change
   `SITE_HOST` in `.env`, `bash scripts/deploy.sh`.
3. Only then consider pausing the Supabase project (it is not needed once the VPS has the data and backups work).

## Security notes
- Only ports 22, 80, 443 are open. The database listens on 127.0.0.1 only (Docker bypasses `ufw`, so never publish `5432` without the `127.0.0.1:` prefix).
- The site only holds public, non-personal tables; the web login is read-only with a 20 s statement limit.
- `deploy/.env` holds the database passwords: never commit it (`.gitignore` already blocks `.env`).
- Routing is reachable publicly but only for `/route/v1/` requests; the app itself limits and caches calls.

## Not verified yet
These files were written without access to the server. First real run may need small fixes: the Docker build time/memory
on 1 vCPU, the OSRM profile paths in `prepare-routing.sh` (`/opt/foot.lua`, `/opt/car.lua`), and `pg_restore` warnings about
tables that exist only on one side.
