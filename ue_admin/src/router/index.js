import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Database from '../views/Database.vue'
import Collection from '../views/Collection.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
  {
    path: '/database/:db',
    name: 'database',
    component: Database,
    props: true
  },
  {
    path: '/collection/:db/:collection',
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
