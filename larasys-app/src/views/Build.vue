<template>
  <div class="ui container" style="padding-top: 50px;">
  	<h1> Build: {{basename}} </h1>
  	<h2> Selected: {{selectedThumbs[0]}} </h2>
	<div class="ui stackable relaxed grid">
		<div class="four wide column" style="overflow-y: scroll; height: 85vh" >
			<div class="ui segment" style="cursor: pointer;" v-for='b in files.thumb' v-bind:key='b[0]'>
				<img :src='imageSrc(b[0])' width="100%" v-on:click="selectThumb(b)">
			</div>
		</div>
		<div class="twelve wide column" v-if="allThumbForStl == true">
			<div class="ui stackable relaxed grid">
				<div class="four wide column" style="overflow-y: scroll; height: 85vh">
					<div class="ui segment" v-for='b in selectedThumbs' v-bind:key='b'>
						<img :src='imageSrc(b)' width="100%">
					</div>
				</div>
				<div class="twelve wide column">
					<div class="ui blue button" v-on:click="takePicture" v-if="takingPhoto == false"> Take picture </div>
					<div class="ui label" v-else>
						{{acqState}}
					</div>
					<div class="ui red label" v-if="acqState == 'error'">
						{{acqState}}
					</div>
					<div v-if="showCapturedImage == true">
						<img :src='imageSrcAcq()' width="100%">
					</div>
				</div>
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
  name: 'build',
  props: ['basename'],
  data: function () {
	return {
		files: [],
		allThumbForStl: false,
		selectedThumbs: [],
		takingPhoto: false,
		acqInterval: undefined,
		acqState: undefined,
		showCapturedImage: false,
		lastImageName: undefined
	}
  },
  components: {},
  methods: {
  	imageSrc: function (thumb) {
  		return this.$server + '/larasys/thumb/stream?build=' + this.basename + '&thumb=' + thumb
  	},
  	imageSrcAcq: function () {
  		return this.$server + '/larasys/acq/stream?build=' + this.basename + '&image=' + this.lastImageName
  	},
  	selectThumb: function (b) {
  		this.allThumbForStl = true
  		this.selectedThumbs = b
  	},
  	takePicture: function () {
  		if (this.takingPhoto == true) {
  			alert('Already taking picture, wait')
  			return 
  		}
		$.getJSON(this.$server + '/larasys/build/acquired', {basename: this.basename}, function (data) {
			let code = this.selectedThumbs[0].split('_')[1]
			let length = data.thumb[code] == undefined ? 0 : data.thumb[code].length
  			let image_name = 'aq_' + code + '_' + length + '.png'
  			this.lastImageName = image_name
  			this.takingPhoto = true
  			this.showCapturedImage = false
			$.post(this.$server + '/larasys/photo/acquire', {image_name: image_name, build: this.basename}, function (data) {}.bind(this))
			this.acqInterval = setInterval(function () {
				$.getJSON(this.$server + '/larasys/photo/state', {image: image_name}, function (data) {
					this.acqState = data
					if (data.state.length != undefined && data.state.length > 0) {
						this.acqState = data.state[data.state.length - 1]
						if (this.acqState == 'uploaded' || this.acqState == 'error') {
							this.takingPhoto = false
							this.showCapturedImage = true
							clearInterval(this.acqInterval)
						}
					}
				}.bind(this))
			}.bind(this), 500)
		}.bind(this))
  	}
  },
  beforeMount: function () {
	$.getJSON(this.$server + '/larasys/build/thumbs', {basename: this.basename}, function (data) {
		this.files = data
	}.bind(this))
  } 
}
</script>
