`tms-mongodb-web`功能模块

# tmw-sdk

对数据库操作进行封装。

# tms-back

基于`tms-koa`进行二次开发，实现`controller`，提供 API。

在本地启动启动服务。通过环境变量指定配置文件和控制器位置（支持相对路径）。

```shell
TMS_KOA_CONFIG_DIR=xxx TMS_KOA_CONTROLLERS_DIR=./dist/controllers node dist/server
```
