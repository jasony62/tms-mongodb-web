const appConfig = {
  disabled: /true|yes/i.test(process.env.TMW_MONGODB_DISABLED),
  master: {
    host: process.env.TMW_MONGODB_HOST || 'localhost',
    port: parseInt(process.env.TMW_MONGODB_PORT) || 27017,
    user: process.env.TMW_MONGODB_USER || 'root',
    password: process.env.TMW_MONGODB_PASSWORD || 'root',
    authMechanism: process.env.TMW_MONGODB_AUTH_MECHANISM || undefined,
    replicaSet: process.env.TMW_MONGODB_REPLICASET,
  },
}

export default appConfig
