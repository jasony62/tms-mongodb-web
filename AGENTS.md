# tms-mongodb-web — AGENTS.md

## Project structure

pnpm workspace monorepo under `packages/`.

| Package | Type | Entry | Description |
|---------|------|-------|-------------|
| `tmw-data` | library | `src/index.ts` → `dist/` | Data structure types |
| `tmw-kit` | library | `src/index.ts` → `dist/` | Shared toolkit for plugins; has [tests](#testing) |
| `tmw-back` | app | `src/server.ts` → `dist/server.js` | Koa backend via `tms-koa` |
| `plugins` | lib | `src/` → `dist/` | Backend plugins (doc/export, doc/import, cl/vecdb, etc.) |
| `ue_admin` | SPA | `src/main.ts` | Vue 3 + Element Plus admin UI |
| `ue_plugin` | SPA | `src/main.ts` | Plugin frontend widgets |
| `webhook_demo` | app | — | Demo webhook receiver |

## Build order (critical)

`tmw-data` → `tmw-kit` → `tmw-back` and `plugins` (parallel). Each builds with `pnpm build` (rimraf + tsc).

`ue_admin` and `ue_plugin` are independent Vite SPAs — no dependency on the backend packages at build time.

```sh
# from root — builds all workspace packages
pnpm -r build

# or per-package
pnpm --filter tmw-data build && pnpm --filter tmw-kit build
```

## Running

### Backend (tmw-back)

Configured via env vars (see `docs/环境变量.md` for the full list). Start after building:

```sh
pnpm --filter tmw-back build
TMW_APP_PORT=3030 \
  TMW_APP_AUTH_CAPTCHA_DISABLED=yes \
  TMS_KOA_SKIP_TRUSTED_HOST=yes \
  TMS_KOA_CONFIG_DIR=../../docker/back/config \
  TMS_KOA_CONTROLLERS_DIR=./dist/controllers \
  TMW_APP_PLUGIN_DIR=../plugins/dist/** \
  TMW_APP_AUTH_JWT_KEY=tmw \
  TMW_APP_AUTH_JWT_EXPIRESIN=86400 \
  node packages/tmw-back/dist/server
```

`.env` file is supported (placed in `packages/tmw-back/`).

Requires a running MongoDB. Default admin: `root/root`.

### Frontend (ue_admin)

```sh
pnpm --filter ue_admin dev        # uses DEV_SERVER_PORT from env or 9000
DEV_SERVER_PORT=7077 pnpm dev     # in packages/ue_admin/
```

Loads `settings.json` from the Vite base URL path before app init. The `.env` file in `packages/ue_admin/` sets defaults. Customize via `.env.development.local`.

### All-in-one Docker

See `docker/Dockerfile` (multi-stage) and `docker/docker-compose.yml`/`docker/docker-compose.dev.yml`.

## Testing

Only `tmw-kit` has tests. Jest + ts-jest:

```sh
pnpm --filter tmw-kit test        # jest
```

No root-level test/lint/typecheck commands.

## Code style

Prettier enforced: **no semicolons, single quotes, tabWidth 2** (`.prettierrc.json` agrees with `.vscode/settings.json`).
Backend `tsconfig` disables `noImplicitAny`; frontend uses `strict: true`.

## Key conventions

- **Backend controllers** in `tmw-back/src/controllers/` follow tms-koa convention: named exports as handler methods on classes
- **Plugin dir** is configured via `TMW_APP_PLUGIN_DIR` env, loaded at startup in `afterInit()` in `server.ts`
- **Plugin config** loaded from `plugin.js` files in the config dir — see `docker/back/config/plugin/` for examples
- **ue_admin settings.json** is fetched via HTTP at runtime from the public path (e.g. `/admin/settings.json`) — not embedded at build time
- **No CI** — no `.github/` directory found
- **MongoDB driver 5.6.0** — check compatibility when upgrading
