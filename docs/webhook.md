TMW_APP_WEBHOOK

为了灵活扩展，提供 webhook 支持。

同步

启动时提供 webhook 地址

发送 post 事件

```json
{
  "event": "create",
  "documentId": "",
  "document": {},
  "ns": {
    "db": "test",
    "coll": "names"
  }
}
```

```json
{ "msg": "ok", "code": 20000, "result": "ok" }
```

`code`等于 0 或 20000 时不做处理。

阻止操作

`code`等于`20400`时

`msg`用于说明原因，

提交前改写数据

提交后改写数据

`msg`等于`rewrite`，`code`等于`20301`时

TMW_APP_WEBHOOK

允许修改返回的数据？

增删改数据时调用。

数据库

集合

文档

create
