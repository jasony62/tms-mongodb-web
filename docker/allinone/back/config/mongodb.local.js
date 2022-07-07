let appConfig = {
  master: {
    host: process.env.TMS_MONGODB_HOST || 'localhost',
    port: parseInt(process.env.TMS_MONGODB_PORT) || 27017,
    user: 'root',
    password: 'root',
  },
}

module.exports = appConfig
