let host
if (process.env.TMS_MONGODB_WEB_ENV === 'docker') {
  host = 'docker.for.mac.host.internal'
} else {
  host = process.env.TMS_MONGODB_HOST || "localhost"
}
module.exports = {
  host,
  user: process.env.TMS_MONGODB_USER || "root",
  password: process.env.TMS_MONGODB_PASSWORD || "root",
  port: parseInt(process.env.TMS_MONGODB_PORT) || 27017
}
