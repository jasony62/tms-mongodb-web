import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

import HttpSendDoc from '@/views/HttpSendDoc.vue'

const BASE_URL = import.meta.env.VITE_BASE_URL
  ? import.meta.env.VITE_BASE_URL
  : '/plugin'

const routes: RouteRecordRaw[] = [
  {
    path: '/http-send-doc',
    name: 'httpSendDoc',
    component: HttpSendDoc,
  },
]

const router = createRouter({
  history: createWebHistory(BASE_URL),
  routes,
})

export default router
