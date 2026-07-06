## Context

Two Vue 3 SPAs share most dependencies. Both are pinned to Vue 3.3.4, Vite 5.0.13, TypeScript 5.2.2, and other packages 1-4 major versions behind latest. A previous upgrade (Tailwind v3→v4) also migrated both `vite.config.ts` → `.mts` for ESM support. The deep custom dependency on `tms-vue3` (0.0.6) and `tms-vue3-ui` (0.0.90) complicates upgrades since these are private internal packages with no published changelog.

## Goals / Non-Goals

**Goals:**
- Upgrade all dependencies in both SPAs to latest compatible versions
- Maintain identical behavior and visual appearance
- Keep both SPAs building without errors
- Resolve peer dependency incompatibilities

**Non-Goals:**
- Rewriting components to use new framework APIs (Vue 3.5 features, Pinia 3 API)
- Removing unused packages (except obvious ones like `@antv/layout`)
- Upgrading backend packages (`tmw-data`, `tmw-kit`, `tmw-back`, `plugins`)

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Upgrade strategy** | Phased, 4 batches, with build verification after each | Single `pnpm up --latest` would break too many things at once. Phasing isolates failures. |
| **Vite target** | 5.4.x first, then 8.x separately | `@tailwindcss/vite@4.3.2` requires `vite@"^5.2.0 \|\| ^6 \|\| ^7 \|\| ^8"`. Jumping to 8 directly risks build breakage. Two-step: first 5.4.x, then 8.x. |
| **TypeScript target** | 5.x latest only, skip 6.x | vue-tsc 3.x needs TS 6.x, but vue-tsc 2.x works with TS 5.x. Keeping TS 5.x avoids a risky vue-tsc major upgrade. |
| **vue-router target** | 4.x latest only, skip 5.x | vue-router 5.x requires Vue 3.4+. The existing 4.2.4 can go to 4.5.x without breaking changes. 5.x is a major with new API and can be done separately. |
| **pinia target** | 3.x latest | Pinia 3 is compatible with Vue 3.3+. The store usage (single options-store, 14 consumers) is basic. Pinia 3 migration is straightforward. |
| **tms-vue3 / tms-vue3-ui** | Bump to the latest published, test thoroughly | These are deeply embedded (25+10 files). No changelog available. Need comprehensive manual QA after bump. |
| **@antv/layout** | Remove | Search confirmed zero imports. Appears to be a leftover from an earlier ELK migration. |

## Batch Plan

### Batch 1 — Safe packages
`vue` → 3.5.x, `pinia` → 3.x, `element-plus` → 2.14.x, `jsoneditor`, `socket.io-client`, `lodash`, `mitt`, `debug`, `handlebars`, `jsondiffpatch`, `jsonpath-plus`, `jsonpointer`, `elkjs`, `web-worker`, `pinyin-pro`

*(run `pnpm --filter ue_admin build` + `pnpm --filter ue_plugin build`)*

### Batch 2 — Build toolchain
`vite` → 5.4.x, `@vitejs/plugin-vue` → 5.x latest, `typescript` → 5.x latest, `vue-tsc` → 2.x latest, `postcss` → 8.5.x, `sass` → latest, `@types/node` → 22.x, `@types/*` bumps

*(run both builds)*

### Batch 3 — UI / Specialized
`@antv/x6` → 3.x, `gitart-vue-dialog` → 4.x, `@element-plus/icons-vue` → latest, `@codemirror/view` → latest, `tms-vue3` → latest, `tms-vue3-ui` → latest, `tms-koa-crypto` → latest

*(run both builds + manual QA)*

### Batch 4 — Major final jumps
`vite` → 8.x, `@vitejs/plugin-vue` → 6.x, `vue-router` → 5.x, `typescript` → 6.x, `vue-tsc` → 3.x

*(run builds + full QA)*

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **element-plus 2.5→2.14 breaking changes** (ElTableV2, message imports, form model) | Review element-plus changelog for 2.5→2.9+; test all table views |
| **@antv/x6 2→3 API incompatibility** | Custom Node/Edge classes may need porting; test diagram view |
| **tms-vue3/tms-vue3-ui no changelog** | Bump to latest, run full manual regression on login, store, schema, document editing |
| **Pinia 2→3 migration** | Options-store API mostly stable; verify `facStore()` pattern still works |
| **vue-router 5.x API changes** | Deferred to Batch 4; skip initially |
| **Vite 8.x ESM config compatibility** | Already on `.mts` from Tailwind upgrade; should work |
| **TypeScript 6.x breaking changes** | Deferred to Batch 4; skip initially. Pervasive `any` usage insulates from strictness changes |

## Open Questions

- How should `autoprefixer` be loaded after removing PostCSS tailwind plugin? Keep PostCSS config or move to Vite?
- Are there any breaking changes in `element-plus` 2.5→2.14 that affect the specific table components used (`ElTableV2`, `ElTree`, `ElUpload`)?
- Does the latest `tms-vue3-ui` still export `Frame`, `Flex`, `JsonSchema`, `TmsJsonDoc` with compatible APIs?
