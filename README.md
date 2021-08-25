# tms-mongodb-web

可灵活扩展的 mongodb web 客户端。

支持独立的管理端和使用端。

支持多租户模式。

支持数据导出。

支持通过插件扩展系统功能。

**back**后端服务。

**ue_systema**系统端管理界面。

**ue_admin**管理端用户界面。

**ue_mongo**使用端用户界面。

**ue_comp**

**doc**说明文档。

# 运行

指定 nginx 的配置文件

> docker-compose up -d

启动 API 在线文档

> docker-compose -f docker-compose.swagger.yml -f docker-compose.swagger.override.yml up swagger-ui swagger-editor

# 上传导出文件

上传文件需要在项目根目录`/back/config/fs.js`中指定文件保存目录`rootDir: '文件夹路径'`。

导出文件时为将生成的 excel 文件保存在服务器中，默认保存在根目录/back/public/文件夹下，如需指定目录需在根目录`/back/config/fs.js`中指定生成文件保存目录`outDir: '文件夹路径'`。支持从环境变量中取值

```javascript
module.exports = {
  local: {
    rootDir: process.env.TMS_FINDER_FS_ROOTDIR || 'storage', // 指定保存文件的目录
    outDir: process.env.TMS_FINDER_FS_OUTDIR || 'storage' // 系统生成文件存放目录
  }
}
```

# 数据操作日志

系统支持记录数据操作日志，通过也没操作在添加、修改、删除、批量删除、移动数据时会把相关数据以及操作类型记录到日志(tms_admin 库下的 tms_app_data_action_log 集合)表中。

默认不记录，如需记录可在./back/config/app.js 中设置 tmsConfig.TMS_APP_DATA_ACTION_LOG = 'Y'

# 环境变量

## back

| 环境变量                   | 说明                                                                                                         | 默认值                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------- |
| TMS_APP_DEFAULT_CREATETIME | 集合中添加、创建、导入数据时默认添加创建时间字段，字段名。                                                   | TMS_DEFAULT_CREATE_TIME    |
| TMS_APP_DEFAULT_UPDATETIME | 修改集合中文档时默认增加修改时间字段，字段名名。                                                             | TMS_APP_DEFAULT_UPDATETIME |
| TMS_APP_DATA_ACTION_LOG    | 数据操作日志，日志会记录到`tms_admin`库下的`tms_app_data_action_log`集合中。                                 |                            |
| TMW_API_HOST               | 对外提供 API 服务的主机地址。                                                                                | http://localhost           |
| TMW_API_PORT               | 对外提供 API 服务的主机端口。                                                                                | 3000                       |
| TMW_REQUIRE_BUCKET         | 是否检查请求中的`bucket`参数，等于`yes`或`true`（不区分大小写）时打开。详细说明参见[多租户](doc/多租户.md)。 |                            |
| TMW_REALTIME_REPLICA       | 是否支持集合实时复制功能，等于`yes`或`true`（不区分大小写）时打开。详细说明参见[聚合集合](doc/复制集合.md)。 |                            |

## ue_admin

| 环境变量                       | 说明                             | 默认值 |
| ------------------------------ | -------------------------------- | ------ |
| VUE_APP_TITLE                  | 页面标题                         | 管理端 |
| VUE_APP_BASE_URL               | 打包基础路径                     |        |
| VUE_APP_BACK_AUTH_BASE         | 鉴权接口前缀                     |        |
| VUE_APP_BACK_AUTH_SERVER       | 鉴权服务器地址                   |        |
| VUE_APP_BACK_API_BASE          | 后端接口前缀                     |        |
| VUE_APP_BACK_API_FS            | 文件上传/下载接口前缀            |        |
| VUE_APP_BACK_API_SERVER        | 后端服务器地址                   |        |
| VUE_APP_LOGIN_KEY_USERNAME     | 登录用户名键                     |        |
| VUE_APP_LOGIN_KEY_PASSWORD     | 登录密码键                       |        |
| VUE_APP_LOGIN_KEY_PIN          | 登录验证码键                     |        |
| VUE_APP_FRONT_DOCEDITOR_ADD    | 添加数据时，对数据进行的额外校验 |        |
| VUE_APP_FRONT_DOCEDITOR_MODIFY | 修改数据时，对数据进行的额外校验 |        |
| VUE_APP_STORETOKEN_WAY         | 存储 token 的方式                |        |

## ue_mongo

| 环境变量                         | 说明                                                                                                     | 默认值 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ |
| VUE_APP_TMW_REQUIRE_BUCKET       | 是否编译为多租户模式，等于`yes`或`true`（不区分大小写）时打开。详细说明参见[多租户](doc/多租户.md)。     |        |
| VUE_APP_TMW_AGGREGATE_COLLECTION | 是否开放聚合集合功能，等于`yes`或`true`（不区分大小写）时打开。详细说明参见[聚合集合](doc/聚合集合.md)。 |        |
| VUE_APP_TITLE                    | 页面标题                                                                                                 | 管理端 |
| VUE_APP_BASE_URL                 | 打包基础路径                                                                                             |        |
| VUE_APP_BACK_AUTH_BASE           | 鉴权接口前缀                                                                                             |        |
| VUE_APP_BACK_AUTH_SERVER         | 鉴权服务器地址                                                                                           |        |
| VUE_APP_BACK_API_BASE            | 后端接口前缀                                                                                             |        |
| VUE_APP_BACK_API_FS              | 文件上传/下载接口前缀                                                                                    |        |
| VUE_APP_BACK_API_SERVER          | 后端服务器地址                                                                                           |        |
| VUE_APP_LOGIN_KEY_USERNAME       | 登录用户名键                                                                                             |        |
| VUE_APP_LOGIN_KEY_PASSWORD       | 登录密码键                                                                                               |        |
| VUE_APP_LOGIN_KEY_PIN            | 登录验证码键                                                                                             |        |
| VUE_APP_FRONT_DOCEDITOR_ADD      | 添加数据时，对数据进行的额外校验                                                                         |        |
| VUE_APP_FRONT_DOCEDITOR_MODIFY   | 修改数据时，对数据进行的额外校验                                                                         |        |
| VUE_APP_STORETOKEN_WAY           | 存储 token 的方式                                                                                        |        |
| VUE_APP_PLUGINSUB_NAMES          | 顶栏插件，主要用于插件放表格上方时的展示                                                                 | ''     |

# 说明文档

[白名单](doc/白名单.md)
[插件机制](doc/插件机制.md)
[多租户](doc/多租户.md)
[聚合集合](doc/聚合集合.md)

[元数据](doc/元数据.md)
