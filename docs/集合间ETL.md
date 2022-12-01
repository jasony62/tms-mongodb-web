实现 A 集合从 B 集合导入数据。

通过`分屏`可以在 A 集合的界面上打开并选择 B 集合的数据。

需要知道是要把 B 集合的哪个或哪些字段填写到 A 集合的哪个或哪些字段

A 集合与 B 集合之间的数据映射关系也是一种需要管理的业务数据。

用户通过赋值黏贴单字段数据的方式解决。效率低，用户需要记住规则，容易出错。

假设 A 集合的字段 F1 数据来源于 B 集合的字段 F2 记录为 R1

单文档，基于规则填写数据（fill）

集合，基于规则新增记录（create）

通过插件实现？

接收集合

输出集合

适用范围，文档（document），集合（collection）

意图：文档到文档；文档到集合

转换规则：transform

解决映射

一个规则定义一次

文档到文档

使用`jsonpath-plus`定义提取路径，用`lodash`赋值

接收文档 jsonpath 到输出文档的 jsonpath

```json
{
  "name": "查找名",
  "title": "显示名",
  "description": "说明",
  "scope": "collection",
  "multiple": false,
  "destination": {
    "db": "A",
    "coll": "a"
  },
  "source": {
    "db": "B",
    "coll": "b"
  },
  "rules": [{ "dst": "", "src": "", "default": "" }]
}
```

通过环境变量指定保存 etl 规则的数据库和集合。

TMW_APP_ETL_DISABLED

TMW_APP_ETL_DB tmw_app

TMW_APP_ETL_CL etl

插件告知分屏要进行 etl 的规则

分屏根据传入的规则直接进入数据库和集合（根据名称构造路由）

选择数据

确认返回结果（id 的数组）

发给 etl 接口生成要转换的数据

插件显示转换结果

确认后更新数据文档数据，或新建

如果选择的数据中包含敏感数据，存储时不需要再次加密。
