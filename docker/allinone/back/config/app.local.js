let appConfig = {
  port: 3020,
  auth: {
    disabled: false,
    client: {
      npm: {
        disabled: false,
        id: 'tms-koa-account',
        authentication: 'models/authenticate',
        register: 'models/register',
      },
    },
  },
}

module.exports = appConfig
