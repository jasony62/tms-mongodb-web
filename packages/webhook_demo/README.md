TMW Webhook 演示

启动服务

```shell
DEBUG=tms-koa:* node node_modules/tms-koa/dist/server
```

```shell
curl -X POST -H "Content-Type: application/json"  "http://localhost:3033/api/receive" -d '{"event":"afterCreate"}'

```

```json
{ "msg": "正常", "code": 0, "result": "ok" }
```
