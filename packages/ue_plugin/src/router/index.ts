import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

import DocImport from '@/views/DocImport.vue'
import DocHttpSend from '@/views/DocHttpSend.vue'
import DocAgenda from '@/views/DocAgenda.vue'
import DocCreateAccount from '@/views/DocCreateAccount.vue'
import DocManageAccount from '@/views/DocManageAccount.vue'
import DbAdmin from '@/views/DbAdmin.vue'

const BASE_URL = import.meta.env.VITE_BASE_URL
  ? import.meta.env.VITE_BASE_URL
  : '/plugin'

const routes: RouteRecordRaw[] = [
  {
    path: '/doc-import',
    name: 'docImport',
    component: DocImport,
  },
  {
    path: '/doc-http-send',
    name: 'docHttpSend',
    component: DocHttpSend,
  },
  {
    path: '/doc-agenda',
    name: 'docAgenda',
    component: DocAgenda,
  },
  {
    path: '/doc-create-account',
    name: 'docCreateAccount',
    component: DocCreateAccount,
  },
  {
    path: '/doc-manage-account',
    name: 'docManageAccount',
    component: DocManageAccount,
  },
  {
    path: '/db-admin',
    name: 'dbAdmin',
    component: DbAdmin,
  },
]

const router = createRouter({
  history: createWebHistory(BASE_URL),
  routes,
})

export default router
