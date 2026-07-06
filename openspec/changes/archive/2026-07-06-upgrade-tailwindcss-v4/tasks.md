## 1. Install Dependencies

- [x] 1.1 Install `tailwindcss@^4` and `@tailwindcss/vite` in `packages/ue_admin`
- [x] 1.2 Install `tailwindcss@^4` and `@tailwindcss/vite` in `packages/ue_plugin`

## 2. Migrate `ue_admin`

- [x] 2.1 Add `@tailwindcss/vite` to `packages/ue_admin/vite.config.ts` plugins array
- [x] 2.2 Replace `@tailwind` directives with `@import "tailwindcss"` in `ue_admin/src/index.css`
- [x] 2.3 Delete `packages/ue_admin/tailwind.config.js`
- [x] 2.4 Update `packages/ue_admin/postcss.config.js` to remove `tailwindcss` plugin (keep `autoprefixer` only)

## 3. Migrate `ue_plugin`

- [x] 3.1 Add `@tailwindcss/vite` to `packages/ue_plugin/vite.config.ts` plugins array
- [x] 3.2 Replace `@tailwind` directives with `@import "tailwindcss"` in `ue_plugin/src/index.css`
- [x] 3.3 Delete `packages/ue_plugin/tailwind.config.cjs`
- [x] 3.4 Update `packages/ue_plugin/postcss.config.cjs` to remove `tailwindcss` plugin (keep `autoprefixer` only)

## 4. Verify

- [x] 4.1 Build `ue_admin` and verify no build errors
- [x] 4.2 Build `ue_plugin` and verify no build errors
- [x] 4.3 Start dev servers and visually verify key pages (login, dashboard, plugin views)
