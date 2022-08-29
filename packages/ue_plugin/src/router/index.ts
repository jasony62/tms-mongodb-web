import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

import HttpSendDoc from '@/views/DocHttpSend.vue'

const BASE_URL = import.meta.env.VITE_BASE_URL
  ? import.meta.env.VITE_BASE_URL
  : '/plugin'

const routes: RouteRecordRaw[] = [
  {
    path: '/doc-http-send',
    name: 'docHttpSend',
    component: HttpSendDoc,
  },
]

const router = createRouter({
  history: createWebHistory(BASE_URL),
  routes,
})

export default router
