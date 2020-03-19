import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../components/Login.vue'
import Database from '../views/Database.vue'
import Collection from '../views/Collection.vue'
import { TmsRouterHistoryPlugin } from 'tms-vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: Login
  },
  {
    path: '/home',
    name: 'home',
    component: Home,
    props: true
  },
  {
    path: '/database/:dbName',
    name: 'database',
    component: Database,
    props: true
  },
  {
    path: '/collection/:dbName/:clName',
    name: 'collection',
    component: Collection,
    props: true
  }
]

Vue.use(VueRouter).use(TmsRouterHistoryPlugin)

let router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

router.beforeEach((to, from, next)=> {
  if (to.name!=='login') {
    let token = sessionStorage.getItem('access_token')
    if (!token) {
      Vue.TmsRouterHistoryPlugin.push(to.path)
      return next('/login')
    }
  }
  next()
})

router = Vue.TmsRouterHistory.watch(router)

export default router
