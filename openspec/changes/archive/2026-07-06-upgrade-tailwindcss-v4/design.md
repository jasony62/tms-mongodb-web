## Context

The project uses Tailwind CSS v3 in two independent Vue 3 SPAs (`ue_admin` and `ue_plugin`). Both are built with Vite. Current setup relies on the legacy PostCSS plugin pattern: `postcss.config.*` declares `tailwindcss: {}`, and `tailwind.config.*` defines content paths and theme overrides. Neither SPA has custom theme values — both use empty `theme: { extend: {} }`. Tailwind is loaded via `@tailwind base/components/utilities` directives in entry CSS files.

## Goals / Non-Goals

**Goals:**
- Upgrade both SPAs from Tailwind v3 to v4
- Migrate from PostCSS plugin to `@tailwindcss/vite` Vite plugin
- Remove legacy `tailwind.config.*` and `postcss.config.*` files
- Update `@tailwind` directives to v4 CSS-first syntax
- Ensure no visual regression in existing utility class usage

**Non-Goals:**
- Custom theme additions or design tokens (no current need)
- Migrating any component CSS to use new v4 features
- Backend package changes (Tailwind is frontend-only)

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Integration method** | `@tailwindcss/vite` plugin | Both SPAs use Vite. The PostCSS plugin path in Tailwind v4 is deprecated in favor of framework-specific plugins. `@tailwindcss/vite` is the official Vite integration and avoids double-processing via PostCSS. |
| **Theme migration** | No migration needed | Both `tailwind.config.*` have only empty `theme: { extend: {} }`. v4 defaults are identical — no `@theme` blocks required. |
| **`corePlugins` handling** | Drop `appearance: false` from `ue_admin` | Tailwind v4 does not include `appearance` as a utility, so this override is unnecessary. |
| **Content path detection** | Rely on v4 auto-detection | Tailwind v4 scans CSS and template files automatically. The v3 `content: [...]` config is no longer needed. If auto-detection misses files, use CSS `@source` directive as a fallback. |

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **CSS import order change** — `@import "tailwindcss"` resolves differently than `@tailwind` directives | Test both SPAs after upgrade; if order-dependent CSS breaks, use `@layer` to control cascade |
| **Missing content detection** — v4 auto-detection may not scan all template paths | If styles are missing in production build, add `@source` directives to entry CSS |
| **PostCSS removal breaks other plugins** — `autoprefixer` is currently alongside `tailwindcss` in PostCSS | Keep `postcss.config.*` with `autoprefixer` only, or move `autoprefixer` to Vite config if needed |
| **No visual regression coverage** — no dedicated CSS regression tests | Manual review of key pages: login, admin dashboard, plugin views |
