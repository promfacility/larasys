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
    }
  ]
})
