import Vue from 'vue'
import VueRouter from 'vue-router'
import Login from '../views/Login.vue.js'
import Home from '../views/Home.vue.js'
import Bucket from '../views/Bucket.vue.js'
import Database from '../views/Database.vue.js'
import { TmsRouterHistoryPlugin } from 'tms-vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: Login,
  },
  {
    path: '/bucket',
    name: 'bucket',
    component: Bucket,
  },
  {
    path: `/home`,
    name: 'home',
    component: Home,
    props: true,
  },
  {
    path: `/database/:dbName`,
    name: 'database',
    component: Database,
    props: true,
  },
  {
    path: '*',
    redirect: { name: 'home' },
  },
]

Vue.use(VueRouter).use(TmsRouterHistoryPlugin)

let router = new VueRouter({
  mode: 'history',
  base: process.env.VUE_APP_BASE_URL,
  routes,
})

router.beforeEach((to, from, next) => {
  if (process.env.VUE_APP_BACK_AUTH_BASE) {
    if (to.name !== 'login') {
      let token = sessionStorage.getItem('access_token')
      if (!token) {
        Vue.TmsRouterHistory.push(to.path)
        return next({ name: 'login' })
      }
    }
  }
  next()
})

router = Vue.TmsRouterHistory.watch(router)

export default router
