const {
  TMW_PLUGIN_DOC_AGENDA_NAME: Name,
  TMW_PLUGIN_DOC_AGENDA_BUCKET: Bucket,
  TMW_PLUGIN_DOC_AGENDA_DB: Db,
  TMW_PLUGIN_DOC_AGENDA_CL: Cl,
  TMW_PLUGIN_DOC_AGENDA_TITLE: Title,
  TMW_PLUGIN_DOC_AGENDA_WIDGET_URL,
  TMW_PLUGIN_DOC_AGENDA_JOB_NAME_FIELD: JobNameField,
  TMW_PLUGIN_DOC_AGENDA_JOB_INTERVAL_FIELD: JobIntervalField,
  TMW_PLUGIN_DOC_AGENDA_JOB_URL_FIELD: JobUrlField,
  TMW_PLUGIN_DOC_AGENDA_JOB_METHOD_FIELD: JobMethodField,
  TMW_PLUGIN_DOC_AGENDA_JOB_BODY_FIELD: JobBodyField,
  TMW_PLUGIN_DOC_AGENDA_JOB_STATE_FIELD: JobStateField,
} = process.env

module.exports = {
  widgetUrl: TMW_PLUGIN_DOC_AGENDA_WIDGET_URL || '/plugin/doc-agenda',
  name: Name ? Name : 'doc-agenda',
  title: Title ? Title : '调度任务',
  bucket: Bucket,
  db: Db,
  cl: Cl,
  jobFields: {
    name: JobNameField ? JobNameField : 'name',
    interval: JobIntervalField ? JobIntervalField : 'interval',
    url: JobUrlField ? JobUrlField : 'url',
    method: JobMethodField ? JobMethodField : 'method',
    body: JobBodyField ? JobBodyField : 'body',
    state: JobStateField ? JobStateField : 'state',
  },
}
