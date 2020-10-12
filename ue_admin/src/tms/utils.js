import { Message } from 'element-ui'
import { v5 as uuidv5 } from 'uuid'

function priceValidate(schema, key, val) {
  if (isNaN(Number(val))) {
    Message.error({ message: schema[key].title + '应填入正确的数字', customClass: 'mzindex' })
    return false
  }
  if (Number(val) < 0) {
    Message.error({ message: schema[key].title + '的值不能小于0', customClass: 'mzindex' })
    return false
  }
  const value = val.split('.')
  if (value.length > 2) {
    Message.error({ message: schema[key].title + '格式错误', customClass: 'mzindex' })
    return false
  }
  if (value.length !== 1) {
    const float = value[1]
    if (float.length > 3) {
      Message.error({ message: this.schema[key].title + '格式错误,小数点后不能大于3位', customClass: 'mzindex' })
      return false
    }
  }
  return true
}

function priceFormat(value) {
  if (value === "") return val
  let val = String(Number(value))
  let arrOfVal = val.split('.')
  if (arrOfVal.length === 1) {
    val = val + '.00'
  } else {
    let floatVal = arrOfVal[1].split('')
    if (floatVal.length === 1) {
      val = val + '0'
    } else if (floatVal.length === 3 && floatVal[2] === '0') {
      val = val.substr(0, val.length - 1)
    }
  }
  return val
}

function randomUUID() {
  const name = new Date().getTime()
  const namespace = '1b671a64-40d5-491e-99b0-da01ff1f3341'
  const result = uuidv5(name.toString(), namespace)
  return result.replace(/-/g, '')
}

export { priceValidate, priceFormat, randomUUID }