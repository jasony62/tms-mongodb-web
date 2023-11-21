在集合上定义 es 配置。

通过环境变量指定 es 连接参数。

| 环境变量                             |                          | 默认值      |
| ------------------------------------ | ------------------------ | ----------- |
| TMW_ELASTICSEARCH_URI                | Elasticsearch 服务地址。 |             |
| TMW_ELASTICSEARCH_ANALYZER           | 默认的文本分析器。       | ik_max_word |
| TMW_ELASTICSEARCH_SEARCH_RESULT_SIZE | 搜索结果的最大数量。     | 10          |

`index`的命令规则：`${dbName}+${clName}`

`tmw`中，`dbName`和`clName`中不允许包含字符`+`，所以用字符`+`作为分割符

`tmw-kit/src/model/document.ts`中添加提交到 es 的代码。

用 mongodb 文档的`_id`作为 es 文档的 id。

将字段设置为可全文检索的字段。

`tmw-kit/src/model/collection.ts`

```ts
if (attrs.type === 'string' && attrs.fulltextSearch === true) {
  Object.assign(properties, {
    [fullname]: { type: 'text', analyzer: 'ik_max_word' },
  })
}
```

执行增、删、改、批量导入操作时，同步执行 es 操作。

```shell
curl -X POST -H "Content-Type: application/json" "http://localhost:6030/api/admin/document/fulltextSearch?access_token=xxxx&db=llmqadb&cl=llmqa&size=1&from=0" -d '{"match":{"question":"大模型"}}'
```
