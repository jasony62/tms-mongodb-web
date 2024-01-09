## 简介

tms-mongodb-web, 提供访问 mongodb 数据的 REST API 和可灵活扩展的 mongodb web 客户端，可以让用户通过 API 或前端界面直观的看到数据库中存储了哪些字段以及字段的值是什么，并对数据库进行增删改查的操作。

## 主要依赖

tms-mongo-web 是一个使用 JavaScript 搭建起来的轻量应用。

- 数据库采用的是非关系型数据库—— mongodb；
- back 使用的语言为 nodejs，基于对 koa 封装的一个 API 服务框架——[tms-koa](https://github.com/jasony62/tms-koa)；
- 系统端、管理端、使用端主要采用的是 vue 框架和 elementui 样式库，以及自行封装的两个库 [tms-vue](https://github.com/jasony62/tms-vue) 和 [tms-vue-ui](https://github.com/jasony62/tms-vue-ui)。

| 层级   | 后端模块名         | 前端模块名                                  |
| :----- | :----------------- | ------------------------------------------- |
| 第一层 | tms-koa            | tms-vue、tms-vue-ui                         |
| 第二层 | tms-mongo-web/back | tms-mongo-web/ue_admin、ue_mongo、ue_system |
| 第三层 | 处理业务数据       | 插件                                        |

由上个表格表明，在这个 mongoweb 的基础上，延伸出了诸多已上线的模块，例如订单管理 mg_order、号池管理 mg_pool、话单查询等等。因此，在实际使用中，某一个功能的正常呈现，从前到后的贯通，基本都需要上述模块的参与。所以，在考虑一个需求的实现时，需要正确分析这个需求的实现应该属于哪个模块的功能。

## 设计思路

- 支持独立的管理端和使用端、系统端

  为了区分对一个应用不同层级的设置，因此分为了三个不同的端。但都拥有一些基本配置，比如对数据库、集合、文档的增删改查。

  **系统端**，配置多租户模式。代码参见`./ue_system`

  **管理端**，通俗理解来说，是提供给管理员使用的。除基本配置外，还拥有配置集合列定义；配置数据库、集合的扩展属性定义；配置标签；配置关联关系；对集合操作进行一些特定配置；管理 bucket 空间等等。代码参见`./ue_admin`

  **使用端**，主要使用者为除超级管理员、管理员之外的用户。除基本配置外，更多的是对文档的操作。比如对文档进行批量复制、批量迁移、批量删除；以及配置给当前文档的插件操作。代码参见`./ue_mongo`

- 支持 jwt 和 redis 两种认证方式，具体文档参见[访问控制](https://github.com/jasony62/tms-koa/blob/master/doc/%E8%AE%BF%E9%97%AE%E6%8E%A7%E5%88%B6.md)

- 支持本地文件服务，具体文档参见[文件服务](https://github.com/jasony62/tms-koa/blob/master/doc/%E6%96%87%E4%BB%B6%E6%9C%8D%E5%8A%A1.md)

- 支持[多租户](./doc/多租户.md)模式

- 支持集合数据同步

  由于采用的是非关系型数据库，各个集合中的文档数据独立。因此，当需要将所有集合的数据集中到一个集合中查看，且实时更新时，连表查或者实时推送就会导致需要写很多的逻辑。因此，利用 mongodb 的复制集+changestream 机制，在 mongoweb 中实现了这个集合数据同步的功能。

  原理解释参见[复制集合](./doc/复制集合.md)，接口数据参见[元数据](./doc/元数据.md)中的`集合复制对应关系`部分。

- 支持日志记录

  可自定义是否开启日志记录，需在`back/config/app.js`中设置`TMS_APP_DATA_ACTION_LOG`的值。当开启后，日志会记录到 tms_admin 库下的 tms_app_data_action_log 集合中。

  具体代码参见`back/models/document.js`中的`dataActionLog`方法。

- 支持数据库字段的配置

  因为 mongoweb 的作用就是可以让用户在前端界面很直观的看到数据库中存储了哪些字段以及字段的值是什么，因此通过页面的方式规范化配置字段是较为合理的实现。且由于配置字段、编辑单条数据均属于通用功能，因此这部分逻辑写在了 tms-vue-ui 组件库中。

  在**管理端**的**文档内容定义**配置字段，根据[json-schame](https://json-schema.org/understanding-json-schema/index.html)的规范，已实现常用数据类型的配置。具体文档参见[JSONSchema 编辑器（json-schema）](https://github.com/jasony62/tms-vue-ui/blob/master/doc/json-schema.md)

  在**管理端/使用端**的**文档**中，添加或修改单条数据时，tms-vue-ui 中实现了 json 文档编辑器的功能。主要原理是根据 jsonschema 定义的字段类型，翻译为对应的控件进行展示。具体文档参见[json 文档编辑器（json-doc）](https://github.com/jasony62/tms-vue-ui/blob/master/doc/json-doc.md)

  在**管理端/使用端**的**文档**中，对于数据的 table 表格展示、筛选等功能，都对这些类型进行了对应的判断。

  注：当需要支持新的数据类型时，应先在 tms-vue-ui 的 json-schema 中增加数据类型，然后在 tms-vue-ui 的 json-doc 中对需要的控件添加或优化。而后还要注意该类型的数据，在表格展示和筛选中的逻辑优化。

- 支持对数据增删改查、批量复制、批量迁移、批量修改、批量删除的操作

- 支持通过插件扩展系统功能，具体文档参见[插件机制 2](./doc/插件机制2.md)

- 支持通过接口与外部模块传输数据

## 总体代码结构

| 英文名                     | 说明                                                                                             |
| :------------------------- | :----------------------------------------------------------------------------------------------- |
| back                       | 后端                                                                                             |
| doc                        | 说明文档                                                                                         |
| mongodb                    | mongodb 的 docker service 配置                                                                   |
| ue_admin                   | 管理端                                                                                           |
| ue_comp                    | 通用组件，原意是管理端、使用端、系统端通用的组件，目前抽离组件还没那么彻底，因此只有使用端在用。 |
| ue_mongo                   | 使用端(用户端)                                                                                   |
| ue_system                  | 系统端                                                                                           |
| .dockerignore              | docker 忽略文件                                                                                  |
| .gitignore                 | git 忽略文件                                                                                     |
| .prettierrc.json           | 格式化配置文件                                                                                   |
| docker-compose.local.yml   | 启动 docker 容器的补充模板文件，主要写入各个服务的映射端口号、ip 配置等                          |
| docker-compose.swagger.yml | 启动 api 服务的模板文件                                                                          |
| docker-compose.yml         | 快速启动 docker 容器的模板文件，主要内容是各个服务的镜像名称、容器名称、参数、环境变量等         |
| Dockerfile-ueadmin         | admin 服务的 dockerfile 配置文件                                                                 |
| Dockerfile-uemongo         | mongo 服务的 dockerfile 配置文件                                                                 |
| init_replicate.sh          | 复制集初始化命令行                                                                               |
| LICENSE                    | 许可文件                                                                                         |
| README.md                  | 说明文档                                                                                         |

_注：想用 docker 快速方便的启动应用，建议新建一个名为 docker-compose.override.yml 的配置文件，按照下述命令启动即可_

## 快速上手

启动前，需要提前安装好 nodejs 环境、mongodb 服务。

目前应用支持两种启动方式，Docker 启动和本地启动。

默认为 jwt 认证方式。

在项目根目录下执行

- Docker 启动

  1.  安装 docker、docker-compose
  2.  构建镜像，`docker-compose -f ./docker/docker-compose.yml build mongodb back ue_admin`
  3.  新建 docker-compose.override.yml
  4.  启动镜像，`docker compose -p tmw -f ./docker/docker-compose.yml -f ./docker/docker-compose.override.yml up -d mongodb back ue_admin`

- 本地启动
  |模块 |配置 |启动命令 |
  |:---- |:-----|:----|
  |mongodb|启动 mongodb 服务 | |
  |back | 1、cnpm i，安装依赖包；2、添加.env 文件(禁止提交到 gitlab)，可根据本地服务的端口号覆盖应用中已设置的值来启动后端 |node server.js |
  |ue_admin |1、pnpm i，安装依赖包；2、添加.env.development.local，可在本地自定义某些变量的值 |npm run serve| |

访问管理界面，默认用户名口令：root/root

> http://localhost:4082/admin

## 参考链接

[用 Docker 简化 Nodejs 开发 4-全栈项目模板](https://www.jianshu.com/p/1105b25410fa)
