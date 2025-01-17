const { env } = process

export default {
  disabled: !/false|no/i.test(env.TMW_APP_AGENDA_DISABLED),
  mongodb: {
    source: 'master',
    database: env.TMW_APP_AGENDA_DATABASE || 'agenda',
    collection: env.TMW_APP_AGENDA_COLLECTION || 'agendaJobs',
  },
  jobDir: env.TMW_APP_AGENDA_JOBDIR || 'jobs/**', // 逗号分隔，支持glob格式
}
