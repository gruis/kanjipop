# Dev Checklist (Multi-User + Deployment)

## Multi-User (Phase 1: Auth + Sessions)
- [x] Add `users` and `sessions` tables
- [x] Create admin bootstrap (initial admin)
- [x] Implement login endpoints (adult email/password, kid PIN)
- [x] Implement session middleware (current user in request context)
- [x] Add login UI (adult + kid)
- [x] Add logout endpoint/UI

## Multi-User (Phase 2: Scope Progress)
- [x] Add `user_id` to `review_states` and `review_logs`
- [x] Update review endpoints to use `user_id`
- [x] Update review stats/state endpoints to use `user_id`
- [x] Update deck progress bars to use scoped data

## Multi-User (Phase 3: Scope Personal Data)
- [x] Add `user_id` to `decks` and `deck_items` (custom only)
- [x] Add `user_id` + `visibility` to examples/compounds/mnemonics
- [x] Update create/fetch endpoints to respect shared + personal visibility
- [x] Add per-user WaniKani token storage

## Admin (Data-Only)
- [x] Admin users management UI
- [x] Admin shared content editor (examples/compounds/mnemonics)
- [x] Admin standard decks editor
- [x] Admin content curation (approve/hide fetched items)

## Deployment
- [x] Dockerfile
- [x] fly.toml
- [x] docker-compose.yml (local self-hosting)
- [x] Deployment guide
