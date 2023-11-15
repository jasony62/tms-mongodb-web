在集合上定义 es 配置。

通过环境变量指定 es 连接参数。

`TMW_ELASTICSEARCH_URI`

`TMW_ELASTICSEARCH_ANALYZER`

执行增、删、改操作时，同步执行 es 操作。

index 的命令规则：`${dbName}+${clName}`

`tmw`中，`dbName`和`clName`中不允许包含字符`+`，所以用字符`+`作为分割符

`tmw-kit/src/model/document.ts`中添加提交到 es 的代码。

用 mongodb 文档的`_id`作为 es 文档的 id。

`tmw-kit/src/model/collection.ts`

```ts
if (attrs.format === 'longtext') {
  Object.assign(properties, {
    [fullname]: { type: 'text', analyzer: 'ik_max_word' },
  })
}
```
