## 本地快速启动

在 `ue_admin` 目录下

1、执行`cnpm i`，安装依赖包

2、如果需要自定义环境变量的值，可添加`.env.development.local` 文件(应设置忽略)，并根据实际情况设置变量值。

启动时，.env.development.local 中相同变量的值会覆盖.env。

3、执行`npm run dll`（项目开发环境采用了 DllPlugin，故启动前需要先执行，生成独立的第三方库，仅需执行一次。依赖的第三方库不更新，则无需再次执行）

4、执行 `npm run serve`，启动管理端服务

## 目录介绍

## 环境变量

| 环境变量                       | 说明                             | 默认值 |
| ------------------------------ | -------------------------------- | ------ |
| VUE_APP_TITLE                  | 页面标题                         | 管理端 |
| VUE_APP_BASE_URL               | 打包基础路径                     |        |
| VUE_APP_BACK_AUTH_BASE         | 鉴权接口前缀                     |        |
| VUE_APP_BACK_AUTH_SERVER       | 鉴权服务器地址                   |        |
| VUE_APP_BACK_API_BASE          | 后端接口前缀                     |        |
| VUE_APP_BACK_API_FS            | 文件上传/下载接口前缀            |        |
| VUE_APP_BACK_API_SERVER        | 后端服务器地址                   |        |
| VUE_APP_LOGIN_KEY_USERNAME     | 登录用户名键                     |        |
| VUE_APP_LOGIN_KEY_PASSWORD     | 登录密码键                       |        |
| VUE_APP_LOGIN_KEY_PIN          | 登录验证码键                     |        |
| VUE_APP_FRONT_DOCEDITOR_ADD    | 添加数据时，对数据进行的额外校验 |        |
| VUE_APP_FRONT_DOCEDITOR_MODIFY | 修改数据时，对数据进行的额外校验 |        |
| VUE_APP_STORETOKEN_WAY         | 存储 token 的方式                |        |

## 其它

- Run your tests, `yarn run test`

- Lints and fixes files, `yarn run lint`

- Run your unit tests, `yarn run test:unit`

- Customize configuration, See [Configuration Reference](https://cli.vuejs.org/config/).
