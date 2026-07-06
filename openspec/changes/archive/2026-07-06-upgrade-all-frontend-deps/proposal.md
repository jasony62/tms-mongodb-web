## Why

Both frontend SPAs (`ue_admin` and `ue_plugin`) have drifted significantly from their dependency latest versions — Vue is at 3.3.4 (latest 3.5), Vite at 5.0.13 (latest 8.x), TypeScript at 5.2.2 (latest 6.x), and many other packages are multiple major versions behind. This gap introduces risk: no security patches, no bug fixes, and growing migration difficulty over time. A systematic batch upgrade reduces future friction.

## What Changes

- **BREAKING**: Bump `vue` from `3.3.4` to `3.5.x`
- **BREAKING**: Bump `vue-router` from `4.2.4` to `5.x`
- **BREAKING**: Bump `pinia` from `2.1.6` to `3.x`
- **BREAKING**: Bump `typescript` from `5.2.2` to `5.x latest` / `6.x`
- **BREAKING**: Bump `vite` from `5.0.13` to `8.x` (with `@vitejs/plugin-vue` and `@tailwindcss/vite` compatibility)
- **BREAKING**: Bump `vue-tsc` from `2.0.6` to `3.x`
- **BREAKING**: Bump `@antv/x6` from `2.4.0` to `3.x`
- **BREAKING**: Bump `element-plus` from `2.5.0` to `2.14.x`
- **BREAKING**: Bump `@antv/layout` from `0.3.x` to `2.x`
- Bump `jsoneditor`, `jsonpath-plus`, `jsondiffpatch`, `socket.io-client`, `elkjs`, `gitart-vue-dialog`, `@element-plus/icons-vue` to latest compatible
- Bump `tms-vue3` from `0.0.6` to `0.0.7` and `tms-vue3-ui` from `0.0.90` to `0.0.107`
- Remove unused `@antv/layout` if confirmed unused
- Verify no visual regression across all views

## Capabilities

### New Capabilities
(none — dependency modernization only)

### Modified Capabilities
(none — no existing specs to update)

## Impact

**Affected packages:**
- `packages/ue_admin/` — all deps + devDeps
- `packages/ue_plugin/` — all deps + devDeps

**Critical dependency chains:**
- `vite` ↔ `@vitejs/plugin-vue` ↔ `@tailwindcss/vite` — must stay compatible
- `typescript` ↔ `vue-tsc` — must stay on same major
- `vue` ↔ `vue-router` ↔ `pinia` ↔ `element-plus` ↔ `tms-vue3`/`tms-vue3-ui` — must stay interoperable

**No impact on:**
- Backend packages (`tmw-data`, `tmw-kit`, `tmw-back`, `plugins`) — frontend-only
