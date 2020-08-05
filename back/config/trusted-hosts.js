const revicing = process.env.TMS_HTTP_ACCEPTCRM_URL ? JSON.parse(process.env.TMS_HTTP_ACCEPTCRM_URL) : [];

module.exports = {
	"mongo/transRevice": revicing
}