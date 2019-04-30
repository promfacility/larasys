import Vue from 'vue'
import Router from 'vue-router'
import Builds from './views/Builds.vue'
import Build from './views/Build.vue'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'builds',
      component: Builds
    },
    {
      path: '/build',
      name: 'build',
      component: Build,
      props: true
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (about.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "about" */ './views/About.vue')
    }
  ]
})
