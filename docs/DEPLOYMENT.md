# Deployment Plan (Proxmox + Docker + Caddy)

## TL;DR:
```
  1. Commit changes
  git add -A
  git commit -m "Release prep"

  2. Tag + push
  git tag -a v0.1.1 -m "v0.1.1"
  git push origin main v0.1.1

  3. Build release asset
  ./scripts/release/package-release.sh v0.1.1

  4. Create GitHub release (uploads asset)
  ./scripts/release/create-release.sh v0.1.1
  
  5. Update container in place
  bash -c "$(curl -fsSL 'https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop-host.sh?cb='$(date +%s))" -- update
```

## Goals
- Run the Nuxt app in a container on Proxmox.
- Use SQLite on a persistent volume.
- Reverse proxy with Caddy and TLS.
- Straightforward install and upgrade.

## Container Strategy
- Build a production image for the Nuxt server.
- Mount volumes:
  - `/app/data/db` for SQLite
  - `/app/public/kanjisvg` for KanjiVG assets

## Proxmox LXC (no Docker) Option
### Community-scripts style (recommended)
- Use `scripts/proxmox/kanjipop.sh` (ct script) and `scripts/proxmox/kanjipop-install.sh` (install script).
- It pulls a prebuilt GitHub Release asset tar.gz, installs Node, downloads KanjiVG, and creates a systemd service.
- Requires: `APP_REPO` and `APP_TAG` env vars.
- Persistent host mounts (required):
  - `HOST_DATA_DIR` → `/opt/kanjipop/data/db` (SQLite, SRS progress)
  - `HOST_KANJISVG_DIR` → `/opt/kanjipop/public/kanjisvg` (KanjiVG assets)
  - Defaults: `/var/lib/kanjipop/data/db` and `/var/lib/kanjipop/kanjisvg`

One-line install (no repo on host):
```
export APP_REPO="gruis/kanjipop"
export APP_TAG="v1.0.0"
bash -c "$(curl -fsSL https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop.sh)"
```

Optional override:
```
export APP_ASSET="kanjipop-v1.0.0.tar.gz"
export APP_PORT="3000"
```

### Update (run inside container)
```
export APP_REPO="gruis/kanjipop"
export APP_ASSET="kanjipop-v1.0.0.tar.gz" # optional
bash -c "$(curl -fsSL https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop-update.sh)"
```

### Uninstall (run inside container)
```
export APP_REPO="gruis/kanjipop"
export PRESERVE_DATA=yes
export PRESERVE_KANJISVG=yes
bash -c "$(curl -fsSL https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop-uninstall.sh)"
```

### Unified host helper (recommended)
```
export APP_REPO="gruis/kanjipop"
export CT_HOSTNAME="kanjipop" # optional override
bash -c "$(curl -fsSL https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop-host.sh)" status
```

Cheat sheet:
```
bash -c "$(curl -fsSL https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop-host.sh)" status
bash -c "$(curl -fsSL https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop-host.sh)" start
bash -c "$(curl -fsSL https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop-host.sh)" stop
bash -c "$(curl -fsSL https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop-host.sh)" restart
bash -c "$(curl -fsSL https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop-host.sh)" logs
bash -c "$(curl -fsSL https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop-host.sh)" update
bash -c "$(curl -fsSL https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop-host.sh)" backup
bash -c "$(curl -fsSL https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop-host.sh)" uninstall
```

### Backups (SQLite-safe)
Host helper command:
```
export BACKUP_DIR="/var/lib/kanjipop/backups"
export RETAIN=10
bash -c "$(curl -fsSL https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop-host.sh)" backup
```

Standalone backup script (host-side):
```
export CT_ID=123
export BACKUP_DIR="/var/lib/kanjipop/backups"
export RETAIN=10
./scripts/proxmox/kanjipop-backup.sh
```

If auto-detection by hostname fails, you can pass the container ID as the second argument:
```
bash -c "$(curl -fsSL https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop-host.sh)" status 123
```

## Files to add
- `Dockerfile`
- `docker-compose.yml`
- `Caddyfile`
- `docs/UPGRADE.md`

## Environment Variables
- `PORT` (default 3000)
- `HOST` (0.0.0.0)
- Optional `BASE_URL`

## Example docker-compose
- One service for the app
- Persistent volume for `data/db`
- Bind mount for `public/kanjisvg`

## Reverse Proxy (Caddy)
- Caddy handles TLS
- Proxy to app container

## Install Steps (Planned)
1) Clone repo on Proxmox host (or build image locally and push).
2) Place KanjiVG under `public/kanjisvg` (inside the repo on the host).
3) `docker compose up -d --build`.
4) Configure Caddy to proxy `kanji.example.com` → container.
5) Verify storage persists by restarting container (`docker compose restart`).

## Upgrade Steps (Planned)
1) `git pull` or update image tag.
2) `docker compose build` (or `docker compose pull` if using a registry image).
3) `docker compose up -d`.
4) Verify DB still intact.

## Backups
- Backup `/app/data/db` volume regularly.
- Optional: snapshot container volume in Proxmox.

## GitHub Release Setup (quick)
0) Commit your changes and push to `main`.
1) Create an annotated tag and push it:
   - `git tag -a v0.1.0-rc1 -m "v0.1.0-rc1"`
   - `git push origin v0.1.0-rc1`
2) Build and package on your dev machine:
   - `./scripts/release/package-release.sh v0.1.0-rc1`
3) Create a GitHub Release and upload the tarball as an asset:
   - `./scripts/release/create-release.sh v0.1.0-rc1`
4) Deploy with `APP_TAG=v0.1.0-rc1` (and `APP_ASSET=kanjipop-v0.1.0-rc1.tar.gz` if you want to be explicit).

If you need to move a tag to a newer commit:
```
git tag -d v0.1.0-rc1
git push --delete origin v0.1.0-rc1
git tag -a v0.1.0-rc1 -m "v0.1.0-rc1"
git push origin v0.1.0-rc1
```
