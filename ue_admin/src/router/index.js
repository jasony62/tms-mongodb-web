import Vue from 'vue'
import VueRouter from 'vue-router'
import User from '../views/User.vue'
import Home from '../views/Home.vue'
import Database from '../views/Database.vue'
import Collection from '../views/Collection.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/home',
    name: 'home',
    component: Home
  },
  {
    path: '/',
    name: 'user',
    component: User,
    props: true
  },
  {
    path: '/login',
    name: 'user',
    component: User,
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

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
