<template>
	<div>
		<div class="ui grid" style="padding: 25px;">
			<div class="one wide column">
				<i class="sidebar icon" style="cursor: pointer" v-on:click="toggleSidebar()"></i>
			</div>
		</div>
    	<div class="ui sidebar inverted vertical menu">
    	  	<a class="item" v-on:click="goTo('builds')">
    	  	  Builds
    	  	</a>
    	  	<a class="item">
    	  	  2
    	  	</a>
    	  	<a class="item">
    	  	  3
    	  	</a>
    	</div>
	</div>
</template>
<script>
var $ = require('jquery')
window.jQuery = $

export default {
  name: 'navbar',
  data: function () {
	return {
		builds: []
	}
  },
  methods: {
  	toggleSidebar: function () {
		$('.ui.sidebar').sidebar('toggle')
  	},
  	goTo: function (name) {
  		this.$router.push({name: name})
  	}
  }
}

</script>