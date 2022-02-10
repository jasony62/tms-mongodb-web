## 本地快速启动

在 `back` 目录下

1、执行`cnpm i`，安装依赖包

2、添加`.env` 文件(应设置忽略)，并根据本地服务的端口号覆盖应用中已设置的值来启动后端。

3、执行 `node server.js`，启动后端模块

## 目录介绍

| 文件夹名            | 说明                                                                                                                                                       |
| :------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| config              | 配置文件                                                                                                                                                   |
| controllers         | 控制器，前端调用的接口路径与该文件夹下一一对应，比如管理端的接口地址`/admin/collection/create`则对应`back/controllers/admin/collection.js`中的`create`方法 |
| models              | 模型，基本与数据库的交互逻辑应写在此处                                                                                                                     |
| oas                 | 包含 API 的文件夹                                                                                                                                          |
| replica             | 复制集                                                                                                                                                     |
| tms                 | 通用方法                                                                                                                                                   |
| .dockerignore       | docker 忽略文件                                                                                                                                            |
| .gitignore          | git 忽略文件                                                                                                                                               |
| Dockerfile          | 制作后端镜像的源码文件                                                                                                                                     |
| ecosystem.config.js | 项目启动文件                                                                                                                                               |
| package.json        | 项目或者模块包的描述文件                                                                                                                                   |
| README.md           | 说明文档                                                                                                                                                   |
| server.js           | 项目初始化文件                                                                                                                                             |
| wait-for.sh         | 检测 mongodb 是否已启动的命令行文件                                                                                                                        |

## 上传/导出文件

上传文件需要在项目根目录`/back/config/fs.js`中指定文件保存目录`rootDir: '文件夹路径'`。

导出文件时为将生成的 excel 文件保存在服务器中，默认保存在根目录/back/public/文件夹下，如需指定目录需在根目录`/back/config/fs.js`中指定生成文件保存目录`outDir: '文件夹路径'`。支持从环境变量中取值

```javascript
module.exports = {
  local: {
    rootDir: process.env.TMS_FINDER_FS_ROOTDIR || 'storage', // 指定保存文件的目录
    outDir: process.env.TMS_FINDER_FS_OUTDIR || 'storage', // 系统生成文件存放目录
  },
}
```

## 数据操作日志

系统支持记录数据操作日志，通过页面操作在添加、修改、删除、批量删除、移动数据时会把相关数据以及操作类型记录到日志(tms_admin 库下的 tms_app_data_action_log 集合)表中。

默认不记录，如需记录可在./back/config/app.js 中设置 tmsConfig.TMS_APP_DATA_ACTION_LOG = 'Y'

## 环境变量

| 环境变量                   | 说明                                                                                                         | 默认值                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------- |
| TMS_APP_DEFAULT_CREATETIME | 集合中添加、创建、导入数据时默认添加创建时间字段，字段名。                                                   | TMS_DEFAULT_CREATE_TIME    |
| TMS_APP_DEFAULT_UPDATETIME | 修改集合中文档时默认增加修改时间字段，字段名名。                                                             | TMS_APP_DEFAULT_UPDATETIME |
| TMS_APP_DATA_ACTION_LOG    | 数据操作日志，日志会记录到`tms_admin`库下的`tms_app_data_action_log`集合中。                                 | 'N'                        |
| TMW_API_HOST               | 对外提供 API 服务的主机地址。                                                                                | http://localhost           |
| TMW_API_PORT               | 对外提供 API 服务的主机端口。                                                                                | 3000                       |
| TMW_REQUIRE_BUCKET         | 是否检查请求中的`bucket`参数，等于`yes`或`true`（不区分大小写）时打开。详细说明参见[多租户](doc/多租户.md)。 |                            |
| TMW_REALTIME_REPLICA       | 是否支持集合实时复制功能，等于`yes`或`true`（不区分大小写）时打开。详细说明参见[聚合集合](doc/复制集合.md)。 |                            |
| TMS_FINDER_FS_ROOTDIR      | 导入文件存放目录                                                                                             | 'storage'                  |
| TMS_FINDER_FS_ROOTDIR      | 导出文件存放目录                                                                                             | 'storage'                  |
| TMS_FINDER_FS_CUSTOMNAME   | 是否使用文件自身命名                                                                                         | false                      |
| TMS_APP_LOG4JS_LEVEL       | 日志输出级别                                                                                                 | 'debug'                    |
| TMS_MONGODB_HOST           | 数据库主机名                                                                                                 | 'localhost'                |
| TMS_MONGODB_PORT           | 数据库端口号                                                                                                 | 27017                      |
| TMS_MONGODB_USER           | 数据库用户名                                                                                                 | false                      |
| TMS_MONGODB_PASSWORD       | 数据库密码                                                                                                   | false                      |
| TMW_REALTIME_REPLICA       | 是否开启复制集                                                                                               |                            |
| TMS_MONGODB_S_HOST         | 从节点主机名                                                                                                 | 'localhost'                |
| TMS_MONGODB_A_HOST         | 仲裁节点主机名                                                                                               | 'localhost'                |
| TMW_MONGODB_S_PORT         | 从节点端口号                                                                                                 | 27018                      |
| TMW_MONGODB_A_PORT         | 仲裁节点端口号                                                                                               | 27019                      |
| TMW_REPLICA_SET_NAME       | 复制集名称                                                                                                   | 'tmw-rs'                   |
| TMS_REDIS_PREFIX           | redis 前缀                                                                                                   | 'tms-mongodb-web'          |
| TMS_REDIS_HOST             | redis 主机名                                                                                                 | '127.0.0.1'                |
| TMS_REDIS_PORT             | redis 端口号                                                                                                 | 6379                       |
| TMS_REDIS_EXPIRESIN        | redis 过期时间                                                                                               | 7200                       |
| TMS_REDIS_PWD              | redis 密码                                                                                                   | ''                         |
| TMS_APP_ROUTER_AUTH        | 鉴权接口前缀                                                                                                 | 'auth'                     |
| TMS_APP_ROUTER_CONTROLLER  | 控制器接口前缀                                                                                               | 'api'                      |
| TMS_APP_ROUTER_PLUGIN      | 插件接口前缀                                                                                                 | 'plugin'                   |
| TMS_APP_ROUTER_FSDOMAIN    | 文件下载接口前缀                                                                                             | 'fs'                       |
