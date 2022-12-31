TMW 支持通过 Webhook 方式实现功能的扩展。

支持通过环境变量对 Webhook 进行设置，具体的环境变量参见文档[环境变量](环境变量.md)。

# 基本使用

环境变量`TMW_APP_WEBHOOK`用于给整个系统指定回调接口。当发生回调事件时，会向该环境变量指定的 URL 发送 POST 请求，传递回调事件。

回调数据包含如下字段：

| 名称     | 说明                   | 类型   | 必填 | 默认值 |
| -------- | ---------------------- | ------ | ---- | ------ |
| event    | 回调事件名称。         | string | 是   | 否     |
| document | 事件操作的文档。       | object | 是   | 否     |
| ns       | 对象的归属。           | object |      |
| ns.db    | 对象所属数据库的名称。 | string | 是   | 否     |
| ns.coll  | 对象所属数集合的名称。 | string | 是   | 否     |

回调事件包括`beforeCreate`，`afterCreate`，`beforeUpdate`，`afterUpdate`，`beforeRemove`，`afterRemove`分别对应增改删操作。

接收回调数据可以告知处理结果，返回内容定义如下：

| 名称   | 说明             | 类型   | 必填 | 默认值 |
| ------ | ---------------- | ------ | ---- | ------ |
| code   | 处理结果代码。   | number | 是   |        |
| msg    | 响应结果说明。   | string | 否   |        |
| result | 改写的文档数据。 | object | 否   |        |

示例：

```json
{ "msg": "ok", "code": 0, "result": {} }
```

其中`code`通过不同值告知要求的操作。

| 值    | 说明                   |
| ----- | ---------------------- |
| 0     | 没有要求进行的操作。   |
| 20400 | 停止后续操作。         |
| 20301 | 后续操作使用改写数据。 |

# 账号管理插件的 Webhook

系统内置了账号管理插件，它的操作会跳过默认的 Webhook 机制，需要通过环境变量`TMW_APP_WEBHOOK_ACCOUNT`指定回调地址。

# 屏蔽 Webhook 事件

默认情况下，对文档对象的所有增删改操作都会产生回调事件，但是通常并不是所有的业务数据都需要回调处理，因此，需要提供屏蔽回调数据的机制。

## 按事件类型

通过`_EVENT`后缀的环境变量指定进行回调事件，事件列表用逗号分隔，可以用`after`和`before`简写。

## 按黑白名单

使用`TMW_APP_WEBHOOK_WHITELIST_XXX`和`TMW_APP_WEBHOOK_BLACKLIST_XXX`。

## 按指定集合

使用`TMW_APP_WEBHOOK_SPECIFIC`。
