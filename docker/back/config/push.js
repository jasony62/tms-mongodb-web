const { env } = process

export default {
  port: env.TMW_APP_PUSH_PORT || 3001,
}
