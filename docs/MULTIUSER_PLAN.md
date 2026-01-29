# Multi-User Plan (Admin for Data Only)

## Goals
- Support multiple users with separate progress (SRS) and private content.
- Admin account is **data-only** (no study). Admin manages shared/global content and users.
- Adults authenticate with email + password.
- Kids authenticate with a PIN.

## Roles
- **Admin (data-only)**
  - Manage shared catalog attributes (examples, compounds, mnemonics, standard decks).
  - Manage users (create/disable/reset PIN/password).
  - Can “sudo” into child accounts for support (view progress, fix data), but does not review under admin.
- **User (adult/kid)**
  - Study and track progress.
  - Manage personal content (custom decks, personal examples/compounds/mnemonics).

## Data Model Changes (SQLite)

### New tables
- `users`
  - `id`, `email`, `password_hash`, `pin_hash`, `role`, `createdAt`, `updatedAt`, `disabled`
- `sessions`
  - `id`, `user_id`, `expiresAt`, `createdAt`
- `user_settings`
  - `user_id`, `wanikani_token`, `preferences_json`, `updatedAt`

### Updated tables
- `review_states` → add `user_id`
- `review_logs` → add `user_id`
- `decks` → add `user_id` (null/empty = shared/standard)
- `deck_items` → add `user_id` (null/empty = shared/standard)
- `examples` → add `user_id`, `visibility` (shared/personal/hidden)
- `compounds` → add `user_id`, `visibility` (shared/personal/hidden)
- `mnemonics` → add `user_id`, `visibility` (shared/personal/hidden)

### Global vs Personal rules
- **Global**: rows with `user_id = NULL` (admin-managed)
- **Personal**: rows with `user_id = current_user`

## Auth Flow
- Login screen with tabs:
  - Adult: email + password
  - Kid: PIN
- Sessions stored in `sessions` table, cookie-based.
- Admin UI only accessible to role=admin.

## Content Visibility Rules
- Study views load:
  - Shared content (admin) + Personal content (user)
- Admin can set shared content visibility to “hidden” for everyone.
- User can mark their personal content as hidden (personal only).

## Admin UX
- `/admin` section with:
  - Users management
  - Global examples/compounds/mnemonics editor
  - Standard deck editor (add/remove items)
  - Data review queue for fetched content (approve/hide)

## User UX
- `/settings` per user:
  - WaniKani token
  - Content preferences (prefer personal vs shared)
- `/review` scoped to user
- `/decks` shows shared decks + personal decks

## Migration Strategy
- Add new tables + columns.
- Set `user_id = NULL` for existing shared content.
- Review states/logs start empty per user.
- Provide admin UI to bootstrap users.

## Phase Plan
1) Auth + sessions + user table
2) Add `user_id` columns + query scoping
3) Admin data-only UI
4) User settings + WaniKani token per user
5) Content visibility curation
