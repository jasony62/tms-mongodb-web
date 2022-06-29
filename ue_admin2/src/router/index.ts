import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

import Login from '../views/Login.vue'
import Home from '../views/Home.vue'
import Bucket from '../views/Bucket.vue'
import Database from '../views/Database.vue'
import Collection from '../views/Collection.vue'
import Register from '../views/Register.vue'
import Smscode from '../views/Smscode.vue'
import Invite from '../views/Invite2.vue'

const VITE_BASE_URL =
  typeof import.meta.env.VITE_BASE_URL === 'string'
    ? import.meta.env.VITE_BASE_URL
    : '/'

const BucketPart = /yes|true/i.test(import.meta.env.VITE_TMW_REQUIRE_BUCKET)
  ? '/b/:bucketName'
  : ''

const routes: RouteRecordRaw[] = [
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
    path: '/invite',
    name: 'invite',
    component: Invite,
  },
  {
    path: `/smscode`,
    name: 'smscode',
    component: Smscode,
    props: true,
  },
  {
    path: `${BucketPart}/home`,
    name: 'home',
    component: Home,
    props: true,
  },
  {
    path: `/register`,
    name: 'register',
    component: Register,
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
    path: '/',
    redirect: { name: 'home' },
  },
]

const router = createRouter({
  history: createWebHistory(VITE_BASE_URL),
  routes,
})

export default router
