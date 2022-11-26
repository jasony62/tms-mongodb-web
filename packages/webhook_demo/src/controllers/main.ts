import { Ctrl, ResultData, ResultFault } from 'tms-koa'

class Webhook extends Ctrl {
  /**
   * 提供跳过认证机制方法的列表
   */
  static tmsAccessWhite() {
    return ['receive']
  }
  /**
   * 接收webhook事件
   */
  async receive() {
    const evt = this.request.body
    console.log('接收webhook事件\n', JSON.stringify(evt, null, 2))

    return new ResultData('ok')
  }
  /**
   * 阻止before操作
   * code = 20400
   */
  async preventBefore() {
    const evt = this.request.body
    console.log('接收webhook事件\n', JSON.stringify(evt, null, 2))
    if (evt.event.indexOf('before') === 0)
      return new ResultFault('测试阻止before操作', 20400)

    return new ResultData('ok')
  }
  /**
   * 阻止after操作
   * code = 20400
   */
  async preventAfter() {
    const evt = this.request.body
    console.log('接收webhook事件\n', JSON.stringify(evt, null, 2))

    if (evt.event.indexOf('after') === 0)
      return new ResultFault('测试阻止after操作', 20400)

    return new ResultData('ok')
  }
  /**
   * 改写before操作
   * code = 20301
   */
  async rewriteBefore() {
    const evt = this.request.body
    console.log('接收webhook事件\n', JSON.stringify(evt, null, 2))
    if (evt.event.indexOf('before') === 0) {
      let { document } = evt
      document.webhook_text = 'test'
      return new ResultFault('测试改写before操作', 20301, document)
    }

    return new ResultData('ok')
  }
  /**
   * 改写after操作
   * code = 20301
   */
  async rewriteAfter() {
    const evt = this.request.body
    console.log('接收webhook事件\n', JSON.stringify(evt, null, 2))

    if (evt.event.indexOf('after') === 0) {
      let { document } = evt
      document.webhook_text = 'test'
      return new ResultFault('测试改写after操作', 20301, document)
    }

    return new ResultData('ok')
  }
}

export default Webhook
