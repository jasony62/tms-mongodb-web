const revicing = process.env.TMS_HTTP_ACCEPTCRM_URL ? JSON.parse(process.env.TMS_HTTP_ACCEPTCRM_URL) : [];
const ipsPluginIt = process.env.TRUSTIPS_PLUGIN_IT_IPS ? JSON.parse(process.env.TRUSTIPS_PLUGIN_IT_IPS) : [];
module.exports = {
	"mongo/revice": revicing,
	"plugin": ipsPluginIt
}