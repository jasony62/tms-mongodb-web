const appConfig = {
  master: {
    host: process.env.TMW_MONGODB_HOST || 'host.docker.internal',
    port: parseInt(process.env.TMW_MONGODB_PORT) || 27017,
    user: process.env.TMW_MONGODB_USER || 'root',
    password: process.env.TMW_MONGODB_PASSWORD || 'root',
  },
}

export default appConfig
