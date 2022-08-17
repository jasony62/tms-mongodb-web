## 本地快速启动

在 `ue_admin2` 目录下

1. 执行`cnpm i`，安装依赖包

2. 如果需要自定义环境变量的值，可添加`.env.development.local` 文件(应设置忽略)，并根据实际情况设置变量值。启动时，.env.development.local 中相同变量的值会覆盖.env。

3. 执行`npm run dev`, 启动管理端服务

## 简介

这是用 vue3 + TypeScript + Vite 重构的管理端，会逐步替代原本的管理端(ue_admin)，所以目前属于共存状态。

## 其他说明

1.  Vue 3 + TypeScript + Vite —— This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

2.  编辑器推荐 - [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volar)

# 黏贴数据转化规则

`json-doc`支持对类型为`object`的字段执行粘贴操作，是想对子字段的快速赋值。但是，复制的数据字段名称可能和文档中的字段名称不一致，因此需要实现一种字段名转换的机制。

目前，支持在`collection`上设置转换规则。

复制的数据

```json
{
  "name": "blue.png",
  "url": "/blue.png",
  "size": 1111111,
  "type": "image/png",
  "thumbUrl": "/thumb/blue.png",
  "thumbSize": 2222,
  "thumbType": "image/png"
}
```

文档的字段

```
{
  "mediaUrl": "/blue.png",
  "mediaFileSize": 1111111,
  "thumbnailUrl": "/thumb/blue.png",
  "thumbnailFileSize": 2222
}
```

定义转换规则

```json
{
  "onPaste": {
    "contentText.message.generalPurposeCard.content.media": {
      "mediaUrl": "url",
      "mediaFileSize": "size",
      "thumbnailUrl": "thumbUrl",
      "thumbnailFileSize": "thumbSize"
    }
  }
}
```
