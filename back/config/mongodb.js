let host
if (process.env.TMS_MONGODB_WEB_ENV === 'docker') {
  host = 'docker.for.mac.host.internal'
} else {
  host = process.env.TMS_MONGODB_HOST || "localhost"
}
module.exports = {
  host,
  user: process.env.TMS_MONGODB_USER || "admin",
  password: process.env.TMS_MONGODB_PASSWORD || "123456",
  port: parseInt(process.env.TMS_MONGODB_PORT) || 27017
}
