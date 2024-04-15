import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

import Login from '../views/Login.vue'
import Logout from '../views/Logout.vue'
import Home from '../views/Home.vue'
import Bucket from '../views/Bucket.vue'
import Databases from '../views/Databases.vue'
import DocSchemas from '../views/DocSchemas.vue'
import Dir from '../views/Dir.vue'
import Acl from '../views/Acl.vue'
import DbSchemas from '../views/DbSchemas.vue'
import ClSchemas from '../views/ClSchemas.vue'
import Tag from '../views/Tag.vue'
import Files from '../views/Files.vue'
import Database from '../views/Database.vue'
import Collection from '../views/Collection.vue'
import Spreadsheet from '../views/Spreadsheet.vue'
import Register from '../views/Register.vue'
import Smscode from '../views/Smscode.vue'
import Invite from '../views/Invite.vue'
import DocEditor from '../views/editor/Document.vue'
import SchemaEditor from '../views/editor/Schema.vue'
import {
  EXTERNAL_LOGIN_URL,
  externalLogin,
  getLocalToken,
  removeLocalToken,
} from '../global'
import apiAuth from '@/apis/auth'

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
    path: '/logout',
    name: 'logout',
    component: Logout,
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
        path: `${BucketPart}/database/:dbName/dir`,
        name: 'databaseDir',
        component: Dir,
        props: true,
      },
      {
        path: `${BucketPart}/database/:dbName/acl`,
        name: 'databaseAcl',
        component: Acl,
        props: true,
      },
      {
        path: `${BucketPart}/collection/:dbName/:clName`,
        name: 'collection',
        component: Collection,
        props: true,
      },
      {
        path: `${BucketPart}/collection/:dbName/:clName/acl`,
        name: 'collectionAcl',
        component: Acl,
        props: true,
      },
      {
        path: `${BucketPart}/spreadsheet/:dbName/:clName?`,
        name: 'spreadsheet',
        component: Spreadsheet,
        props: true,
      },
      {
        path: `${BucketPart}/document/:dbName/:clName/:docId?`,
        name: 'docEditor',
        component: DocEditor,
        props: true,
      },
      {
        path: `${BucketPart}/document/:dbName/:clName/:docId/acl`,
        name: 'docAcl',
        component: Acl,
        props: true,
      },
      {
        path: `${BucketPart}/docSchemas/`,
        name: 'docSchemas',
        component: DocSchemas,
        props: true,
      },
      {
        path: `${BucketPart}/schema/:dbName?/:scope/:schemaId?`,
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
        path: `files`,
        name: 'files',
        component: Files,
        props: true,
      },
    ],
  },
  {
    path: `${BucketPart}/:catchAll(.*)`,
    redirect: `${BucketPart}/database/`,
  },
]

const router = createRouter({
  history: createWebHistory(BASE_URL),
  routes,
})

/**
 * 客户端登出
 */
async function logout() {
  const access_token = getLocalToken()
  if (access_token) {
    // 清除token
    removeLocalToken()
    // 通知服务端登出
    await apiAuth.fnLogout(access_token)
  }
}
/**
 * 进入路由前检查
 *
 * 1. 已经通过认证？
 */
router.beforeEach(async (to, from, next) => {
  // 进入页面前检查是否已经通过用户认证
  if ('logout' === to.name) {
    await logout()
    return next({ name: 'login' })
  }
  //@ts-ignore
  if (['login', 'register', 'smscode'].indexOf(to.name) === -1) {
    const token = getLocalToken()
    if (!token) {
      if (EXTERNAL_LOGIN_URL()) {
        return externalLogin()
      }
      //@ts-ignore
      const vueApp = window['_VueApp']
      if (vueApp) {
        const routerHistory = vueApp.config.globalProperties.$tmsRouterHistory
        if (routerHistory) {
          routerHistory.push(to.path)
        }
      }
      return next({ name: 'login' })
    } else {
      /**
       * 如果没有当前用户的信息，获取信息
       */
      const facStore = (await import('@/store')).default
      const store = facStore()
      if (!store.clientInfo.id) {
        apiAuth.fnClient(token).then((result: any) => {
          Object.assign(store.clientInfo, result)
        })
      }
    }
  } else if (EXTERNAL_LOGIN_URL()) {
    console.log('执行第三方登录')
    return externalLogin()
  }
  next()
})

export default router
