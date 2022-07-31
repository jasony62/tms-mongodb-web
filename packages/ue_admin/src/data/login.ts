import { LOGIN_CAPTCHA_DISABLED } from '@/global'
import { SubmitDataItem } from 'tms-vue3-ui'

/**解决需要加载完配置，再确定数据的问题*/
const schema = () => {
  const data: SubmitDataItem[] = [
    {
      // 当前双向绑定的属性名
      key: 'uname',
      // 组件类型
      type: 'text',
      placeholder: '用户名',
    },
    {
      key: 'password',
      type: 'password',
      placeholder: '密码',
    },
  ]

  if (!LOGIN_CAPTCHA_DISABLED()) {
    data.push({
      key: 'pin',
      type: 'captcha',
      placeholder: '验证码',
    })
  }

  return data
}

export { schema }
