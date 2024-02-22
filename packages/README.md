`tms-mongodb-web`功能模块

# tmw-data

数据类型定义。

```shell
pnpm build
```

# tmw-kit

封装`tms-mongodb-web`的通用操作，为开发插件提供支持。作为独立的包`tmw-kit`发布。

```shell
pnpm build
```

# tmw-back

在`tmw-back`目录下，启动服务

```sh
TMW_APP_PORT=3030 TMW_APP_AUTH_CAPTCHA_DISABLED=yes TMS_KOA_SKIP_TRUSTED_HOST=yes TMS_KOA_CONFIG_DIR=../../docker/back/config TMS_KOA_CONTROLLERS_DIR=./dist/controllers TMW_APP_PLUGIN_DIR=../plugins/dist/** TMW_PLUGIN_DOC_HTTP_SEND_WIDGET_URL=xxx TMW_APP_AUTH_JWT_KEY=tmw TMW_APP_AUTH_JWT_EXPIRESIN=86400 node dist/server
```

**注意**：可以使用`.env`文件指定环境变量的值。

新增插件时，需要在 tmw-back/src 下新建 plugins 文件夹

每次更改后，需要重新执行`pnpm build`

```shell
curl -X POST -H "Content-Type: application/json" "http://localhost:6030/auth/authenticate" -d '{"username":"admin","password":"admin"}'
```

# ue_admin

全功能的管理客户端。

客户端会从起始访问地址获取后端服务信息。需要在前端页面根目录下放置`settings.json`文件。例如：

```json
{
  "authApiBase": "auth",
  "authApiPort": 3020,
  "backApiBase": "api",
  "backApiPort": 3020,
  "loginCaptchaDisabled": false
}
```

运行在`nginx`中。

`start_nginx.sh`中包含的`nginx`环境变量的默认值。

`nginx.conf`中已经设置了转发规则

```
location / {
    proxy_pass $NGINX_BACK_BASE_URL;
}
```

启动测试服务

```
DEV_SERVER_PORT=7077 pnpm dev
```

# plugins

功能插件。

通过环境变量`TMW_APP_PLUGIN_DIR`指定插件位置。

```shell
pnpm build
```
