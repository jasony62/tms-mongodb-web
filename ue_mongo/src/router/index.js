import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../components/Login.vue'
import Database from '../views/Database.vue'
import Collection from '../views/Collection.vue'
import { TmsRouterHistoryPlugin } from 'tms-vue'

const VUE_APP_BASE_URL = process.env.VUE_APP_BASE_URL ? process.env.VUE_APP_BASE_URL : ''

const routes = [
  {
    path: `${VUE_APP_BASE_URL}`,
    redirect: `${VUE_APP_BASE_URL}/login`
  },
  {
    path: `${VUE_APP_BASE_URL}/login`,
    name: 'login',
    component: Login
  },
  {
    path: `${VUE_APP_BASE_URL}/home`,
    name: 'home',
    component: Home,
    props: true
  },
  {
    path: `${VUE_APP_BASE_URL}/database/:dbName`,
    name: 'database',
    component: Database,
    props: true
  },
  {
    path: `${VUE_APP_BASE_URL}/collection/:dbName/:clName`,
    name: 'collection',
    component: Collection,
    props: true
  }
]

Vue.use(VueRouter).use(TmsRouterHistoryPlugin)

let router = new VueRouter({
  mode: 'history',
  routes
})

router.beforeEach((to, from, next)=> {
  if (to.name!=='login') {
    let token = sessionStorage.getItem('access_token')
    if (!token) {
      Vue.TmsRouterHistory.push(to.path)
      return next({name: 'login'})
    }
  }
  next()
})

router = Vue.TmsRouterHistory.watch(router)

export default router
