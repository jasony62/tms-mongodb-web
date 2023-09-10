import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

import DocImport from '@/views/DocImport.vue'
import DocHttpSend from '@/views/DocHttpSend.vue'
import DocAgenda from '@/views/DocAgenda.vue'
import DocCreateAccount from '@/views/DocCreateAccount.vue'
import DocManageAccount from '@/views/DocManageAccount.vue'
import DbAdmin from '@/views/DbAdmin.vue'
import DocExport from '@/views/DocExport.vue'
import DocVersionRepos from '@/views/DocVersionRepos.vue'
import ClImport from '@/views/ClImport.vue'
import ClVecdb from '@/views/ClVecdb.vue'

const BASE_URL = import.meta.env.VITE_BASE_URL
  ? import.meta.env.VITE_BASE_URL
  : '/plugin'

const routes: RouteRecordRaw[] = [
  {
    path: '/db-admin',
    name: 'dbAdmin',
    component: DbAdmin,
  },
  {
    path: '/cl-import',
    name: 'clImport',
    component: ClImport,
  },
  {
    path: '/cl-vecdb',
    name: 'clVecdb',
    component: ClVecdb,
  },
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
    path: '/doc-export',
    name: 'docExport',
    component: DocExport,
  },
  {
    path: '/doc-version-repos',
    name: 'docVersionRepos',
    component: DocVersionRepos,
  },
]

const router = createRouter({
  history: createWebHistory(BASE_URL),
  routes,
})

export default router
