# doc-http-send

本插件实现将选择的文档数据发送到指定的地址。

## 插件属性

| 属性             | 用途                                              | 类型   | 默认值        | 必填 |
| ---------------- | ------------------------------------------------- | ------ | ------------- | ---- |
| **基本信息**     |                                                   |        |               |      |
| name             | 插件名称。需要有唯一性，同名插件只会加载一次。    | string | doc-http-send | 是   |
| scope            | 插件适用的数据对象类型。只用于文档类型。          | string | document      | 是   |
| title            | 插件在页面上的显示内容。                          | string | 发送数据      | 是   |
| amount           | 操作的数据量，可选择包括：`zero`，`one`，`many`。 | string | many          | 是   |
| bucketName       | 匹配的存储空间名称。                              | RegExp | 无            | 否   |
| dbName           | 匹配的数据库名称。                                | RegExp | 无            | 否   |
| clName           | 匹配的集合名称。                                  | RegExp | 无            | 否   |
| **部件基本信息** |                                                   |        |               |      |
| beforeWidget     |                                                   |        |               |      |
| --name           | 部件名称。指明是自定义外部部件。                  | string | external      | 是   |
| --url            | 部件获取地址。通过配置文件指定。                  | string | 无            | 是   |
| --size           | 部件在页面上的宽度。                              | string | 40%           | 是   |
| **部件用户输入** |                                                   |        |               |      |
| beforeWidget.ui  |                                                   |        |               |      |
| --url            | 文档数据的发送地址。                              | object | 无            | 否   |
| --method         | 发送数据的 http 方法。                            | object | 无            | 否   |
| --excludeId      | 发送的文档数据是否清楚`_id`字段。                 | object | 无            | 否   |

**注：**部件用户输入的属性的类型都是对象，都用`value`记录属性的值。

```json
{
  "name": "doc-http-send-01",
  "scope": "document",
  "title": "发送数据01",
  "description": "通过http将集合中的文档数据发送指定地址。",
  "clName": {},
  "beforeWidget": {
    "name": "external",
    "url": "http://localhost:9001/plugin/http-send-doc",
    "size": "40%",
    "ui": {
      "url": {
        "value": "http://127.0.0.1:3020/api/open/document/create?db=e2e5gmx&cl=rcs_text"
      },
      "method": {
        "value": "post"
      },
      "excludeId": {
        "value": true
      }
    }
  },
  "amount": "many",
  "disabled": false
}
```

## 配置与生成实例

`doc-http-send`插件提供了通用的数据发送功能，但是实际业务中，通常会有多个发送需求，每个发送需求都有明确的发送地址、HTTP 方法等。插件的基础代码将这些参数作为用户输入数据，需要用户在执行插件前通过前端部件输入。为了简化用户的操作，提供了两种机制：1、在浏览器的本地存储中保留用户最后一次输入，再次执行插件时，自动填充数据；2、通过配置文件指定插件参数，在执行`createPlugin`时根据配置创建多个插件实例。一个插件实例如果指定了`beforeWidget.ui`中的属性，该属性不允许用户修改，且不会保留用户输入。

`doc-http-send`插件的默认配置文件（docker/back/config/plugin/doc/http-send.js）如下：

```js
const {
  TMW_PLUGIN_DOC_HTTP_SEND_NAME: Name,
  TMW_PLUGIN_DOC_HTTP_SEND_BUCKET: Bucket,
  TMW_PLUGIN_DOC_HTTP_SEND_DB: Db,
  TMW_PLUGIN_DOC_HTTP_SEND_CL: Cl,
  TMW_PLUGIN_DOC_HTTP_SEND_TITLE: Title,
  TMW_PLUGIN_DOC_HTTP_SEND_URL: Url,
  TMW_PLUGIN_DOC_HTTP_SEND_METHOD: Method,
  TMW_PLUGIN_DOC_HTTP_SEND_EXCLUDEID: ExcludeId,
  TMW_PLUGIN_DOC_HTTP_SEND_WIDGET_URL,
} = process.env

module.exports = {
  widgetUrl: TMW_PLUGIN_DOC_HTTP_SEND_WIDGET_URL,
  name: Name ? Name.split(',') : ['doc-http-send'],
  title: Title ? Title.split(',') : ['发送数据'],
  url: Url ? Url.split(',') : [],
  method: Method ? Method.split(',') : [],
  excludeId: ExcludeId ? ExcludeId.split(',') : [],
  bucket: Bucket ? Bucket.split(',') : [],
  db: Db ? Db.split(',') : [],
  cl: Cl ? Cl.split(',') : [],
}
```

配置文件中的属性的数据类型都是数组，索引值代表了是第几个插件的值，如果索引不存在代表不需要赋值（注：采用该方式是为了便于用环境变量赋值）。通过环境变量赋值时，环境变量中用逗号分隔数组中的多个值。

## 其它

如果插件调用的是后台服务的 API，那么会自动携带`access_token`解决鉴权问题（`applyAccessTokenField`）。

插件部件执行插件操作后会等待执行结果（`handleResponse`），由用户主动关闭插件部件。

关闭插件部件后，调用方会重新加载数据，为了现实更新结果（`reloadOnClose`）。

上面 3 项特性目前并不支持进行配置，后面可以根据需要变为可以配置项。

另外：

除了支持按数据库、集合等级别提供，是否也可以按用户级别提供插件？

发送文档数据会有使用`get`方法的情况？需要传递哪些文档数据？

是否支持进行数据映射？是否可以给 post 数据叠加数据？

# doc-agenda

本插件实现将选择的文档数据作为调度任务的定义参数。

| 属性             | 用途                                           | 类型   | 默认值        | 必填 |
| ---------------- | ---------------------------------------------- | ------ | ------------- | ---- |
| **基本信息**     |                                                |        |               |      |
| name             | 插件名称。需要有唯一性，同名插件只会加载一次。 | string | doc-http-send | 是   |
| scope            | 插件适用的数据对象类型。只用于文档类型。       | string | document      | 是   |
| title            | 插件在页面上的显示内容。                       | string | 发送数据      | 是   |
| amount           | 操作的数据量。                                 | string | many          | 是   |
| bucketName       | 匹配的存储空间名称。                           | RegExp | 无            | 否   |
| dbName           | 匹配的数据库名称。                             | RegExp | 无            | 否   |
| clName           | 匹配的集合名称。                               | RegExp | 无            | 否   |
| jobFields        | 任务字段和文档字段的对应关系。                 | Object |               | 是   |
| --name           | 任务名称字段。                                 | string | name          | 是   |
| --interval       | 执行计划字段。                                 | string | interval      | 是   |
| --url            | 调用 url 字段。                                | string | url           | 是   |
| --method         | 调用 http 方法字段。                           | string | method        | 是   |
| --body           | 调用发送消息体字段。                           | string | body          | 是   |
| --state          | 任务状体字段。                                 | string | state         | 是   |
| **部件基本信息** |                                                |        |               |      |
| beforeWidget     |                                                |        |               |      |
| --name           | 部件名称。指明是自定义外部部件。               | string | external      | 是   |
| --url            | 部件获取地址。通过配置文件指定。               | string | 无            | 是   |
| --size           | 部件在页面上的宽度。                           | string | 40%           | 是   |

```js
const {
  TMW_PLUGIN_DOC_AGENDA_NAME: Name,
  TMW_PLUGIN_DOC_AGENDA_BUCKET: Bucket,
  TMW_PLUGIN_DOC_AGENDA_DB: Db,
  TMW_PLUGIN_DOC_AGENDA_CL: Cl,
  TMW_PLUGIN_DOC_AGENDA_TITLE: Title,
  TMW_PLUGIN_DOC_AGENDA_WIDGET_URL,
  TMW_PLUGIN_DOC_AGENDA_JOB_NAME_FIELD: JobNameField,
  TMW_PLUGIN_DOC_AGENDA_JOB_INTERVAL_FIELD: JobIntervalField,
  TMW_PLUGIN_DOC_AGENDA_JOB_URL_FIELD: JobUrlField,
  TMW_PLUGIN_DOC_AGENDA_JOB_METHOD_FIELD: JobMethodField,
  TMW_PLUGIN_DOC_AGENDA_JOB_BODY_FIELD: JobBodyField,
  TMW_PLUGIN_DOC_AGENDA_JOB_STATE_FIELD: JobStateField,
} = process.env

module.exports = {
  widgetUrl: TMW_PLUGIN_DOC_AGENDA_WIDGET_URL || '/plugin/doc-agenda',
  name: Name ? Name : 'doc-agenda',
  title: Title ? Title : '调度任务',
  bucket: Bucket,
  db: Db,
  cl: Cl,
  jobFields: {
    name: JobNameField ? JobNameField : 'name',
    interval: JobIntervalField ? JobIntervalField : 'interval',
    url: JobUrlField ? JobUrlField : 'url',
    method: JobMethodField ? JobMethodField : 'method',
    body: JobBodyField ? JobBodyField : 'body',
    state: JobStateField ? JobStateField : 'state',
  },
}
```
