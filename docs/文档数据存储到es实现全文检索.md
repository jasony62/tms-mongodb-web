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
if (attrs.type === 'string' && attrs.fulltextSearch === true) {
  Object.assign(properties, {
    [fullname]: { type: 'text', analyzer: 'ik_max_word' },
  })
}
```

批量导入

```
curl -X POST -H "Content-Type: application/json" "http://localhost:6030/api/admin/document/fulltextSearch?db=llmqadb&cl=llmqa&access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluIiwiZGF0YSI6eyJ1c2VybmFtZSI6ImFkbWluIn0sImlzQWRtaW4iOnRydWUsImFsbG93TXVsdGlMb2dpbiI6ZmFsc2UsImV4cGlyZXNJbiI6MCwiaWF0IjoxNzAwMDI3MTA3LCJleHAiOjE3MDAxMTM1MDd9.RxE7SEwJiBYum7tTUFOHvohbStZVjknn1l_uNsfiZvQ" -d '{"question":"风向"}'
```
