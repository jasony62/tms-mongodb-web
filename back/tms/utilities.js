const _ = require('lodash')

/**
 * 对数组中的元素去重
 */
function unrepeatByArray(arr, columns, keepFirstRepeatData = false) {
  let hash = []
  let repeatData = []
  let newArr = _.filter(arr, (d) => {
    let dd = {}
    columns.forEach((v) => {
      dd[v] = d[v]
    })
    dd = JSON.stringify(dd)
    if (hash.includes(dd)) {
      repeatData.push(dd)
      return false
    } else {
      hash.push(dd)
      return true
    }
  })
  // 不保留重复数据
  if (keepFirstRepeatData === false) {
    newArr = _.filter(newArr, (d) => {
      let dd = {}
      columns.forEach((v) => {
        dd[v] = d[v]
      })
      dd = JSON.stringify(dd)
      if (repeatData.includes(dd)) {
        return false
      } else {
        return true
      }
    })
  }

  return newArr
}

module.exports = { unrepeatByArray }
