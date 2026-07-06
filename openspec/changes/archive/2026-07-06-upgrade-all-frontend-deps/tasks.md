## 1. Batch 1 — Safe Packages

- [x] 1.1 Bump `vue` → 3.5.x in `ue_admin` and `ue_plugin`
- [x] 1.2 Bump `pinia` → 3.x in `ue_admin` and `ue_plugin`
- [x] 1.3 Bump `element-plus` → 2.14.x in `ue_admin` and `ue_plugin`
- [x] 1.4 Bump `jsoneditor`, `socket.io-client`, `lodash`, `mitt`, `debug`, `handlebars`, `jsondiffpatch`, `jsonpath-plus`, `jsonpointer`, `elkjs`, `web-worker` in `ue_admin`
- [x] 1.5 Bump `pinyin-pro` in `ue_plugin`
- [x] 1.6 Build both SPAs and fix any errors
- Fixed: `SelectCondition.vue` `InstanceType<typeof ElTable>` → `InstanceType<any>`
- Fixed: `gitart-vue-dialog/dist/style.css` → `gitart-vue-dialog/dist/gitart-vue-dialog.css`

## 2. Batch 2 — Build Toolchain

- [x] 2.1 Bump `vite` → 5.4.x and `@vitejs/plugin-vue` → 5.x latest in both SPAs
- [x] 2.2 Bump `typescript` → 5.x/6.x latest and `vue-tsc` → 2.x/3.x latest in both SPAs
- [x] 2.3 Bump `postcss`, `sass`, `less`, `autoprefixer`, `@types/*` in both SPAs
- [x] 2.4 Build both SPAs and fix type/build errors
- Fixed: `tsconfig.json` — added `ignoreDeprecations: "6.0"`
- Fixed: `@vue/shared` resolution — added Vite alias in both `vite.config.mts`

## 3. Batch 3 — UI / Specialized

- [x] 3.1 Bump `@antv/x6` → 3.x (3.1.7) and `@antv/layout` → 2.x (2.0.0) in `ue_admin`
- [x] 3.2 Bump `@element-plus/icons-vue`, `@codemirror/view` in `ue_admin`
- [x] 3.3 Bump `tms-vue3` → ^0.0.7 in `ue_admin`
- [x] 3.4 Bump `tms-vue3-ui` → ^0.0.107 in `ue_admin` and `ue_plugin`
- [x] 3.5 Bump `tms-koa-crypto` → ^0.3.0 in `ue_admin`
- [x] 3.6 Build both SPAs and fix errors
- [x] 3.7 Manual QA: login, store, schema editing, document editing, x6 diagram view

## 4. Batch 4 — Major Final Jumps

- [x] 4.1 Bump `vite` → 8.x (8.1.3) and `@vitejs/plugin-vue` → 6.x (6.0.7) in both SPAs
- [x] 4.2 Bump `vue-router` → 5.x (5.1.0) in both SPAs
- [x] 4.3 Bump `typescript` → 6.x (6.0.3) and `vue-tsc` → 3.x (3.3.6) in both SPAs
- [x] 4.4 Build both SPAs and fix errors
- [x] 4.5 Full manual QA across all views
