# 在线用户手册

系统支持给管理对象设置**在线用户手册**。

在线用户手册用于告知用户使用使用系统管理数据的方法等，例如：扩展的 api 等。

在线用户手册是一段 html 模板，支持用管理对象数据进行填充。

支持通过`settings.json`进行定制。

```json
{
  "manual": {
    "document": [
      {
        "db": "数据库名称的正在表达式",
        "cl": "集合名称的正则表达式",
        "template": "handlebars模板"
      }
    ]
  }
}
```

# 黏贴数据转化规则

`json-doc`支持对类型为`object`的字段执行粘贴操作，是想对子字段的快速赋值。但是，复制的数据字段名称可能和文档中的字段名称不一致，因此需要实现一种字段名转换的机制。

目前，支持在`collection`上设置转换规则。

复制的数据

```json
{
  "name": "blue.png",
  "url": "/blue.png",
  "size": 1111111,
  "type": "image/png",
  "thumbUrl": "/thumb/blue.png",
  "thumbSize": 2222,
  "thumbType": "image/png"
}
```

文档的字段

```
{
  "mediaUrl": "/blue.png",
  "mediaFileSize": 1111111,
  "thumbnailUrl": "/thumb/blue.png",
  "thumbnailFileSize": 2222
}
```

定义转换规则

```json
{
  "onPaste": {
    "contentText.message.generalPurposeCard.content.media": {
      "mediaUrl": "url",
      "mediaFileSize": "size",
      "thumbnailUrl": "thumbUrl",
      "thumbnailFileSize": "thumbSize"
    }
  }
}
```
