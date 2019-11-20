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
  },
  {
    path: '/about',
    name: 'about',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import(/* webpackChunkName: "about" */ '../views/About.vue')
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
