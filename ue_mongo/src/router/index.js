import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../components/Login.vue'
import Bucket from '../views/Bucket.vue'
import Database from '../views/Database.vue'
import Collection from '../views/Collection.vue'
import { TmsRouterHistoryPlugin } from 'tms-vue'
import store from '../store'

const VUE_APP_BASE_URL = process.env.VUE_APP_BASE_URL
  ? process.env.VUE_APP_BASE_URL
  : ''

const BucketPart = /yes|true/i.test(process.env.VUE_APP_TMW_REQUIRE_BUCKET)
  ? '/b/:bucketName'
  : ''

const routes = [
  {
    path: `${VUE_APP_BASE_URL}/login`,
    name: 'login',
    component: Login
  },
  {
    path: `${VUE_APP_BASE_URL}/bucket`,
    name: 'bucket',
    component: Bucket,
    props: true
  },
  {
    path: `${VUE_APP_BASE_URL}${BucketPart}/home`,
    name: 'home',
    component: Home,
    props: true
  },
  {
    path: `${VUE_APP_BASE_URL}${BucketPart}/database/:dbName`,
    name: 'database',
    component: Database,
    props: true
  },
  {
    path: `${VUE_APP_BASE_URL}${BucketPart}/collection/:dbName/:clName`,
    name: 'collection',
    component: Collection,
    props: true
  },
  {
    path: '*',
    redirect: { name: 'home' }
  }
]

Vue.use(VueRouter).use(TmsRouterHistoryPlugin)

let router = new VueRouter({
  mode: 'history',
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
    if (to.name !== 'bucket') {
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
