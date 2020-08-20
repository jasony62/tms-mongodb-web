function init(data, columns) {
  const { axiosInstance } = require('../utils')
  const data1 = [{calledNumber: 123456}]
  return ['insertMany', data1]
  // return axiosInstance.post('')
  //         .catch(err => {
  //           logger.error(err)
  //           throw new Error('未知错误: ' + err)
  //         })
  //         .then(async res => {
  //           logger.info('res => openId', res.data)
  //           return new ResultData(res.data)
  //       })

}

module.exports = init