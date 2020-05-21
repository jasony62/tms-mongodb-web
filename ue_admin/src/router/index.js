import Vue from 'vue'
import VueRouter from 'vue-router'
import Login from '../views/Login.vue'
import Home from '../views/Home.vue'
import Bucket from '../views/Bucket.vue'
import Database from '../views/Database.vue'
import Collection from '../views/Collection.vue'
import store from '../store'
import { TmsRouterHistoryPlugin } from 'tms-vue'

const BucketPart = /yes|true/i.test(process.env.VUE_APP_TMW_REQUIRE_BUCKET)
  ? '/b/:bucketName'
  : ''

const routes = [
  {
    path: '/login',
    name: 'login',
    component: Login
  },
  {
    path: '/bucket',
    name: 'bucket',
    component: Bucket
  },
  {
    path: `${BucketPart}/home`,
    name: 'home',
    component: Home,
    props: true
  },
  {
    path: `${BucketPart}/database/:dbName`,
    name: 'database',
    component: Database,
    props: true
  },
  {
    path: `${BucketPart}/collection/:dbName/:clName`,
    name: 'collection',
    component: Collection,
    props: true
  },
  {
    path: '*',
    redirect: { name: 'login' }
  }
]

Vue.use(VueRouter).use(TmsRouterHistoryPlugin)

let router = new VueRouter({
  mode: 'history',
  base: process.env.VUE_APP_BASE_URL,
  routes
})

router.beforeEach((to, from, next) => {
  if (to.name !== 'login') {
    let token = sessionStorage.getItem('access_token')
    if (!token) {
      Vue.TmsRouterHistory.push(to.path)
      return next({ name: 'login' })
    }
  }
  if (/yes|true/i.test(process.env.VUE_APP_TMW_REQUIRE_BUCKET)) {
    // 多租户模式下，添加bucket参数
    if (!/bucket|login/.test(to.name)) {
      console.log(to)
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
