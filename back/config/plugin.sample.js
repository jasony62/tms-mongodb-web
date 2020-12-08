const commonConfig = {
  db: [],
  collection: [],
  document: [
    {
      name: 'sync',
      title: '同步按钮',
      description: '请求外部接口',
      type: 'http',
      batch: ['all', 'filter', 'ids'],
      auth: ['*'],
    },
    {
      name: 'demo',
      title: '内部按钮',
      description: '调用模块自身方法',
      type: 'native',
      batch: ['all', 'filter', 'ids'],
      auth: ['*'],
    },
  ],
}

const sendConfig = {
  sync: [
    { url: process.env.TMS_PLUGINS_SEND_IP, methos: 'post' },
    { docSchemas: true, isNeedGetParams: true },
  ],
}

const pluginConfig = {
  commonConfig,
  sendConfig,
}

module.exports = pluginConfig
