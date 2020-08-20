
function axiosIns() {
  const axios = require("axios")
  let axiosInstance = axios.create()
  return axiosInstance
}


module.exports = axiosIns