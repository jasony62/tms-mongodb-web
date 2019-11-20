# tms-mongodb-web

可灵活扩展的 mongodb web 客户端。

# 接口清单

| 接口                     | 方法 | 说明                           |
| ------------------------ | ---- | ------------------------------ |
| /admin/db/list           | GET  | 所有的数据库                   |
| /admin/db/create         | POST | 新建数据库                     |
| /admin/db/remove         | GET  | 删除数据库                     |
| /admin/collection/list   | GET  | 指定库下所有的集合             |
| /admin/collection/create | POSt | 指定库下新建集合               |
| /admin/collection/remove | GET  | 指定库下删除指定的集合         |
| /admin/document/list     | GET  | 指定库中的指定集合下所有的文档 |
| /admin/document/create   | POST | 指定库中的指定集合下新建文档   |

## 新建数据库

**url**

> /admin/db/create

**参数**

| 名称 | 类型   | 说明       |
| ---- | ------ | ---------- |
| db   | string | 数据库名称 |

## 获得集合清单

**url**

> /admin/collection/list

**参数**

| 名称 | 类型   | 说明       |
| ---- | ------ | ---------- |
| db   | string | 数据库名称 |

**返回**

| 返回参数 | 参数类型 | 参数说明      |
| -------- | -------- | ------------- |
| code     | Integer  | 执行结果 code |
| msg      | String   | 执行结果说明  |
| result   | Array    | 集合列表      |
