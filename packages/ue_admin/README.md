## 本地快速启动

在 `ue_admin2` 目录下

1. 执行`cnpm i`，安装依赖包

2. 如果需要自定义环境变量的值，可添加`.env.development.local` 文件(应设置忽略)，并根据实际情况设置变量值。启动时，.env.development.local 中相同变量的值会覆盖.env。

3. 执行`npm run dev`, 启动管理端服务

## 简介

这是用vue3 + TypeScript + Vite 重构的管理端，会逐步替代原本的管理端(ue_admin)，所以目前属于共存状态。

## 其他说明

1.  Vue 3 + TypeScript + Vite —— This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

2.  编辑器推荐 - [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volar)
