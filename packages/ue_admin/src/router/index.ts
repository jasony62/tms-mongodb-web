import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

import Login from '../views/Login.vue'
import Home from '../views/Home.vue'
import Bucket from '../views/Bucket.vue'
import Databases from '../views/Databases.vue'
import DocSchemas from '../views/DocSchemas.vue'
import DbSchemas from '../views/DbSchemas.vue'
import ClSchemas from '../views/ClSchemas.vue'
import Tag from '../views/Tag.vue'
import Replica from '../views/Replica.vue'
import Files from '../views/Files.vue'
import Database from '../views/Database.vue'
import Collection from '../views/Collection.vue'
import Register from '../views/Register.vue'
import Smscode from '../views/Smscode.vue'
import Invite from '../views/Invite.vue'
import DocEditor from '../views/editor/Document.vue'
import SchemaEditor from '../views/editor/Schema.vue'

import { TmsRouterHistory } from 'tms-vue3'
import { getLocalToken } from '../global'

const BASE_URL = import.meta.env.VITE_BASE_URL
  ? import.meta.env.VITE_BASE_URL
  : '/admin'

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
    path: `/register`,
    name: 'register',
    component: Register,
    props: true,
  },
  {
    path: `/smscode`,
    name: 'smscode',
    component: Smscode,
    props: true,
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
    path: `/`,
    name: 'home',
    component: Home,
    redirect: `${BucketPart}/database/`,
    props: true,
    children: [
      {
        path: `${BucketPart}/database/`,
        name: 'databases',
        component: Databases,
        props: true,
      },
      {
        path: `${BucketPart}/database/:dbName`,
        name: 'database',
        component: Database,
        props: true,
      },
      {
        path: `${BucketPart}/database/:dbName/docSchemas`,
        name: 'databaseDocSchemas',
        component: DocSchemas,
        props: true,
      },
      {
        path: `${BucketPart}/collection/:dbName/:clName`,
        name: 'collection',
        component: Collection,
        props: true,
      },
      {
        path: `${BucketPart}/document/:dbName/:clName/:docId?`,
        name: 'docEditor',
        component: DocEditor,
        props: true,
      },
      {
        path: `${BucketPart}/docSchemas/`,
        name: 'docSchemas',
        component: DocSchemas,
        props: true,
      },
      {
        path: `${BucketPart}/schema/:scope/:schemaId?`,
        name: 'schemaEditor',
        component: SchemaEditor,
        props: true,
      },
      {
        path: `${BucketPart}/dbSchemas/`,
        name: 'dbSchemas',
        component: DbSchemas,
        props: true,
      },
      {
        path: `${BucketPart}/clSchemas/`,
        name: 'clSchemas',
        component: ClSchemas,
        props: true,
      },
      {
        path: `${BucketPart}/tag/`,
        name: 'tag',
        component: Tag,
        props: true,
      },
      {
        path: `${BucketPart}/replica/`,
        name: 'replica',
        component: Replica,
        props: true,
      },
      {
        path: `files`,
        name: 'files',
        component: Files,
        props: true,
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(BASE_URL),
  routes,
})

router.beforeEach((to, from, next) => {
  // 进入页面前检查是否已经通过用户认证
  if (to.name !== 'login') {
    let token = getLocalToken()
    if (!token) {
      new TmsRouterHistory().push(to.path)
      return next({ name: 'login' })
    }
  }
  next()
})

export default router
