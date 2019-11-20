import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import { TmsAxiosPlugin } from 'tms-vue'
Vue.use(TmsAxiosPlugin)

Vue.config.productionTip = false

const name = 'mongodb-api'
Vue.TmsAxios({ name })

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
