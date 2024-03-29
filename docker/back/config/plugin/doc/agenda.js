const {
  TMW_PLUGIN_DOC_AGENDA_DISABLED: Disabled,
  TMW_PLUGIN_DOC_AGENDA_DB_BLACK_LIST: DbBlacklist,
  TMW_PLUGIN_DOC_AGENDA_CL_BLACK_LIST: ClBlacklist,
  TMW_PLUGIN_DOC_AGENDA_SCHEMA_BLACK_LIST: SchemaBlacklist,
  TMW_PLUGIN_WIDGET_URL_HOST,
  TMW_PLUGIN_DOC_AGENDA_NAME: Name,
  TMW_PLUGIN_DOC_AGENDA_BUCKET: Bucket,
  TMW_PLUGIN_DOC_AGENDA_DB: Db,
  TMW_PLUGIN_DOC_AGENDA_CL: Cl,
  TMW_PLUGIN_DOC_AGENDA_SCHEMA: Schema,
  TMW_PLUGIN_DOC_AGENDA_TITLE: Title,
  TMW_PLUGIN_DOC_AGENDA_WIDGET_URL,
  TMW_PLUGIN_DOC_AGENDA_JOB_NAME_FIELD: JobNameField,
  TMW_PLUGIN_DOC_AGENDA_JOB_INTERVAL_FIELD: JobIntervalField,
  TMW_PLUGIN_DOC_AGENDA_JOB_URL_FIELD: JobUrlField,
  TMW_PLUGIN_DOC_AGENDA_JOB_METHOD_FIELD: JobMethodField,
  TMW_PLUGIN_DOC_AGENDA_JOB_BODY_FIELD: JobBodyField,
  TMW_PLUGIN_DOC_AGENDA_JOB_STATE_FIELD: JobStateField,
} = process.env

// 插件前端页面地址
const widgetUrl = TMW_PLUGIN_DOC_AGENDA_WIDGET_URL
  ? TMW_PLUGIN_DOC_AGENDA_WIDGET_URL
  : TMW_PLUGIN_WIDGET_URL_HOST
  ? TMW_PLUGIN_WIDGET_URL_HOST + '/plugin/doc-agenda'
  : '/plugin/doc-agenda'

export default {
  disabled: /true|yes/i.test(Disabled),
  dbBlacklist: DbBlacklist,
  clBlacklist: ClBlacklist,
  schemaBlacklist: SchemaBlacklist,
  widgetUrl,
  name: Name ? Name : 'doc-agenda',
  title: Title ? Title : '调度任务',
  bucket: Bucket,
  db: Db,
  cl: Cl,
  schema: Schema || `^tmw_agenda$`,
  jobFields: {
    name: JobNameField ? JobNameField : 'name',
    interval: JobIntervalField ? JobIntervalField : 'interval',
    url: JobUrlField ? JobUrlField : 'url',
    method: JobMethodField ? JobMethodField : 'method',
    body: JobBodyField ? JobBodyField : 'body',
    state: JobStateField ? JobStateField : 'state',
  },
}
