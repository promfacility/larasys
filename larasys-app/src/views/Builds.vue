<template>
  <div class="ui container" style="padding-top: 50px;">
	<div class="ui stackable relaxed grid">
		<div class="four wide column" v-for='b in builds' v-bind:key='b'>
			<div class="ui segment" style="cursor: pointer; padding: 25px;" v-on:click="goToBuild(b)">
				<div class="ui top red attached label" v-if='buildsStats[b].computed.length > buildsStats[b].acquired.length'>{{b}}</div>
				<div class="ui top green attached label" v-else>{{b}}</div>
				<h1> {{b}} </h1>
				<p> Last stl: {{buildsStats[b].lastmodcom}} </p>
				<p> Last image: {{buildsStats[b].lastmodimg}} </p>
				<div class="ui tiny label"> Stl: {{buildsStats[b].builds.length}} </div>
				<div class="ui tiny label"> Render: {{buildsStats[b].computed.length}} </div>
				<div class="ui tiny label"> Images: {{buildsStats[b].acquired.length}} </div>
			</div>
		</div>
	</div>
  </div>
</template>

<script>
// @ is an alias to /src
// no-mixed-spaces-and-tabs
import router from '@/router'
var $ = require('jquery')
window.jQuery = $

export default {
  name: 'builds',
  data: function () {
	return {
		builds: [],
		buildsStats: {}
	}
  },
  components: {
	
  },
  methods: {
  	goToBuild: function (b) {
  		this.$router.push({ name: 'build', params: { basename: b } })
  	}
  },
  mounted: function () {

  },
  beforeMount: function () {
	$.getJSON(this.$server + '/larasys/builds', function (data) {
		this.builds = data.reverse()
	}.bind(this))
	$.getJSON(this.$server + '/larasys/builds/stats', function (data) {
		this.buildsStats = data
	}.bind(this))
  } 
}
</script>
