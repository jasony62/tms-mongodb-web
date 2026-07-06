## Why

Tailwind CSS v4 introduces a CSS-driven configuration model that eliminates boilerplate config files, reduces build times, and ships a smaller runtime. The project is currently on v3 (3.0.24 in ue_plugin, 3.2.4 in ue_admin), which relies on the legacy PostCSS plugin + JS config approach. Upgrading ensures we stay on a supported major version and can leverage upstream improvements.

## What Changes

- **BREAKING**: Replace PostCSS-based Tailwind setup with `@tailwindcss/vite` Vite plugin in both SPA projects
- Remove `tailwind.config.*` and `postcss.config.*` files from both `ue_admin` and `ue_plugin`
- Replace `@tailwind` directives with `@import "tailwindcss"` in entry CSS files
- Migrate any custom theme values from JS config to CSS `@theme` blocks
- Remove `corePlugins: { appearance: false }` override (v4 already excludes it)
- Update `package.json` dependency to `tailwindcss@^4`

## Capabilities

### New Capabilities
(none — this is a dependency upgrade, not a new feature)

### Modified Capabilities
(none — no existing specs to update)

## Impact

**Packages:**
- `packages/ue_admin/` — `tailwind.config.js`, `postcss.config.js`, `vite.config.ts`, entry CSS, `package.json`
- `packages/ue_plugin/` — `tailwind.config.cjs`, `postcss.config.cjs`, `vite.config.ts`, entry CSS, `package.json`

**Dependencies:**
- `tailwindcss`: ^3.x → ^4.x
- Add `@tailwindcss/vite` (new peer dependency for Vite integration)

**No impact on:**
- Backend packages (`tmw-data`, `tmw-kit`, `tmw-back`, `plugins`) — Tailwind is frontend-only
- Custom component CSS that uses Tailwind utility classes — these remain unchanged
