import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/mongo/document'

export default {
  list(olddbName, oldclName, ruleDbName, ruleClName) {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/getDocsByRule?db=${olddbName}&cl=${oldclName}&ruleDb=${ruleDbName}&ruleCl=${ruleClName}`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  movebyRule(newdbName, newclName, olddbName, oldclName, ruleDbName, ruleClName, transforms, docIds) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/moveByRule?newDb=${newdbName}&newCl=${newclName}&oldDb=${olddbName}&oldCl=${oldclName}&ruleDb=${ruleDbName}&ruleCl=${ruleClName}&markResultColumn=import_status&transforms=${transforms}`, docIds)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  }
}