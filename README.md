# 简介

`TMW(tms-mongodb-web)`定位于一个灵活的、通用的数据管理工具，可以快速实现数据的在线管理和使用。TMW 采用 mongodb 提供持久话存储，提供访问 mongodb 数据的 REST API 和可灵活扩展的 mongodb web 客户端，可以让用户通过 API 或前端界面直观的看到数据库中存储了哪些字段以及字段的值是什么，并对数据库进行增删改查的操作。

# 特性

- 通过 web 界面和 api 创建 mongodb 的数据库、集合和文档
- 通过 JSONSchema 定义文档的字段，并自动生成列表界面和编辑表单界面
- 文档数据支持导出为 excel
- 支持通过导入 excel 直接创建集合（自动生成文档 schema）
- 支持按系统管理员、数据库创建人和访问控制列表控制数据访问权限
- 支持在线表格方式编辑数据
- 支持将文档数据存储到 elasticsearch
- 支持通过插件扩展系统功能，具体文档参见[插件机制 2](./doc/插件机制2.md)
- 支持集成本地文件服务，具体文档参见[文件服务](https://github.com/jasony62/tms-koa/blob/master/doc/%E6%96%87%E4%BB%B6%E6%9C%8D%E5%8A%A1.md)

# 快速上手

启动前，需要提前安装好 nodejs、mongodb、pnpm 等。

[各模块详细说明](./packages/README.md)

[建议采用单镜像方式使用](./docker/构造单体docker镜像.md)

## 启动 mongodb 服务

## 启动 back 服务

添加.env，可根据本地服务的端口号覆盖应用中已设置的值来启动后端

```shell
pnpm i

node dist/server.js
```

## 启动 ue_admin

添加.env.development.local，可在本地自定义某些变量的值

```shell
pnpm i

pnpm dev
```

## 访问应用

访问管理界面，默认用户名口令：root/root

> http://localhost:4082/admin

# 主要依赖

tms-mongo-web 是一个使用 TypeScript 搭建起来的轻量应用。

- 数据库采用的是非关系型数据库—— mongodb；
- back 使用的语言为 nodejs，基于对 koa 封装的一个 API 服务框架——[tms-koa](https://github.com/jasony62/tms-koa)；
- 系统端、管理端、使用端主要采用的是 vue 框架和 elementui 样式库，以及自行封装的两个库 [tms-vue](https://github.com/jasony62/tms-vue) 和 [tms-vue-ui](https://github.com/jasony62/tms-vue-ui)。

| 层级   | 后端模块名 | 前端模块名          |
| ------ | ---------- | ------------------- |
| 第一层 | tms-koa    | tms-vue、tms-vue-ui |
| 第二层 | tmw-back   | ue_admin            |
| 第三层 | plugins    | ue_plugin           |

# 参考链接

根据[json-schame](https://json-schema.org/understanding-json-schema/index.html)规范，定义文档的字段。具体文档参见[JSONSchema 编辑器（json-schema）](https://github.com/jasony62/tms-vue-ui/blob/master/doc/json-schema.md)

根据文档字段定义的 json 对象生成编辑表单。具体文档参见[json 文档编辑器（json-doc）](https://github.com/jasony62/tms-vue-ui/blob/master/doc/json-doc.md)

[用 Docker 简化 Nodejs 开发 4-全栈项目模板](https://www.jianshu.com/p/1105b25410fa)
