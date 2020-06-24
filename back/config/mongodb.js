let host
if (process.env.TMS_MONGODB_WEB_ENV === 'docker') {
  host = 'docker.for.mac.host.internal'
} else {
  host = process.env.TMS_MONGODB_HOST || "localhost"
}
module.exports = {
  host,
	port: parseInt(process.env.TMS_MONGODB_PORT) || 27017,
	user: process.env.TMS_MONGODB_USER_NAME || false,
	password: process.env.TMS_MONGODB_USER_PWD || false
}
