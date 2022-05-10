import { SubmitDataItem, CaptchaResponse, LoginResponse } from 'tms-vue3-ui'

import captcha from './captcha'

function fnCaptcha(): Promise<CaptchaResponse> {
  return Promise.resolve({ code: 0, captcha })
}

function fnLogin(submitData: {
  [key: string]: string
}): Promise<LoginResponse> {
  let { uname, password, pin } = submitData
  console.info('login submit data', { uname, password, pin })
  return Promise.resolve({
    code: 0,
    msg: '成功',
    result: { access_token: '89898989' },
  })
}

const schema: SubmitDataItem[] = [
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
  {
    key: 'pin',
    type: 'captcha',
    placeholder: '验证码',
  },
]

export { schema, fnCaptcha, fnLogin }
