import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'
import GameOfLife from '../views/GameOfLife.vue'
import ThreeEngine from '../views/ThreeEngine.vue'
import RayTracing from '../views/RayTracing.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/game-of-life',
    name: 'GAME_OF_LIFE',
    component: GameOfLife,
  },
  {
    path: '/ray-tracing',
    name: 'RAY_TRACING',
    component: RayTracing,
  },
  {
    path: '/engine',
    name: 'Engine',
    component: ThreeEngine,
  },
  {
    path: '/about',
    name: 'About',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
