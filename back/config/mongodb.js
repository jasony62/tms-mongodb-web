module.exports = {
  master: {
    host: process.env.TMS_MONGODB_HOST || 'localhost',
    port: parseInt(process.env.TMS_MONGODB_PORT) || 27017,
    user: process.env.TMS_MONGODB_USER || false,
    password: process.env.TMS_MONGODB_PASSWORD || false,
  },
}
