# tms-mongodb-web

可灵活扩展的 mongodb web 客户端。

# 运行

指定 nginx 的配置文件

> docker-compose up -d

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

# 连接mysql

在项目的根目录下建立文件`/config/db.js`，指定下列 MySQL 或 Sqlite 数据库（可选）连接信息：
```javascript
module.exports = {
  mysql: {
    master: {
      connectionLimit: 10,
      host: '',
      port: '',
      user: '',
      password: '',
      database: ''
    },
    write: {
      connectionLimit: 10,
      host: '',
      port: '',
      user: '',
      password: '',
      database: ''
    }
  },
  sqlite: {
    path: ''
  }
}
```
参考：https://www.npmjs.com/package/mysql

参考：https://github.com/JoshuaWise/better-sqlite3/blob/HEAD/docs/api.md

# 上传导出文件

上传文件需要在项目根目录`/back/config/fs.js`中指定文件保存目录`rootDir: '文件夹路径'`。
导出文件时为将生成的excel文件保存在服务器中，默认保存在根目录/back/public/文件夹下，如需指定目录需在根目录`/back/config/fs.js`中指定生成文件保存目录`outDir: '文件夹路径'`。支持从环境变量中取值
```javascript
module.exports = {
  local: {
    rootDir: process.env.TMS_FINDER_FS_ROOTDIR || 'storage',   // 指定保存文件的目录
    outDir: process.env.TMS_FINDER_FS_OUTDIR || 'storage'     // 系统生成文件存放目录
  }
}
```

# 数据操作日志

系统支持记录数据操作日志，通过也没操作在添加、修改、删除、批量删除、移动数据时会把相关数据以及操作类型记录到日志(tms_admin库下的 tms_app_data_action_log 集合)表中。
默认不记录，如需记录可在./back/config/app.js中设置tmsConfig.TMS_APP_DATA_ACTION_LOG = 'Y'
```