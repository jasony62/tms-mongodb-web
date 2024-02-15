/**
 * 自由表格修改日志
 */
export interface SpreadsheetChangelog {
  /**
   * 提交用户
   */
  client: {
    id: string
  }
  /**
   * 修改提交时间
   * 时间戳，精确到秒
   */
  ts: number
  /**
   * 修改内容
   * 具体格式参见jsondiffpatch库的说明
   */
  detla: any
}
/**
 * 自由表格
 */
export interface Spreadsheet {
  /**
   * 所属集合
   */
  cl: {
    name: string
  }
  /**
   * 表格数据
   */
  data: any
  /**
   * 当前版本
   */
  ver: number
  /**
   * 修改记录
   */
  changelog: SpreadsheetChangelog
}
