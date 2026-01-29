# Deployment Plan (Proxmox + Docker + Caddy)

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

## Files to add
- `Dockerfile`
- `docker-compose.yml`
- `Caddyfile`
- `docs/UPGRADE.md` (optional)

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
2) Place KanjiVG under `public/kanjisvg`.
3) `docker compose up -d`.
4) Configure Caddy to proxy `kanji.example.com` → container.
5) Verify storage persists by restarting container.

## Upgrade Steps (Planned)
1) `git pull` or update image tag.
2) `docker compose pull` (if using image) or `docker compose build`.
3) `docker compose up -d`.
4) Verify DB still intact.

## Backups
- Backup `/app/data/db` volume regularly.
- Optional: snapshot container volume in Proxmox.
