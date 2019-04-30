import Vue from 'vue'
import 'semantic-ui-css/semantic.min.css'
import App from './App.vue'
import router from './router'

Vue.config.productionTip = false

Vue.prototype.$server = 'http://192.168.180.150:4000'

var $ = require('jquery')
window.jQuery = $
require('jquery/dist/jquery.min.js')
require('semantic-ui-css/semantic.js')

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
