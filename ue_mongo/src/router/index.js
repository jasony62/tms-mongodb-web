import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue.js'
import Login from '../components/Login.vue.js'
import Bucket from '../views/Bucket.vue.js'
import Database from '../views/Database.vue.js'
import Collection from '../views/Collection.vue.js'
import { TmsRouterHistoryPlugin } from 'tms-vue'
import store from '../store.js'
import { getToken } from '../global.js'

const BucketPart = /yes|true/i.test(process.env.VUE_APP_TMW_REQUIRE_BUCKET)
  ? '/b/:bucketName'
  : ''

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
    path: `${BucketPart}/home`,
    name: 'home',
    component: Home,
    props: true,
  },
  {
    path: `${BucketPart}/database/:dbName`,
    name: 'database',
    component: Database,
    props: true,
  },
  {
    path: `${BucketPart}/collection/:dbName/:clName`,
    name: 'collection',
    component: Collection,
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
  /**自动跳转到登录页 */
  if (process.env.VUE_APP_BACK_AUTH_BASE) {
    if (to.name !== 'login') {
      let token = getToken()
      if (!token) {
        Vue.TmsRouterHistory.push(to.path)
        return next({ name: 'login' })
      }
    }
  }
  /**自动添加bucket参数 */
  if (/yes|true/i.test(process.env.VUE_APP_TMW_REQUIRE_BUCKET)) {
    // 多租户模式下，添加bucket参数
    if (!/bucket|login/.test(to.name)) {
      if (!to.params.bucketName) {
        if (store.state.buckets.length === 1) {
          const bucket = store.state.buckets[0]
          return next({ name: to.name, params: { bucketName: bucket.name } })
        } else {
          return next({ name: 'bucket' })
        }
      }
    }
  }
  next()
})

router = Vue.TmsRouterHistory.watch(router)

export default router
