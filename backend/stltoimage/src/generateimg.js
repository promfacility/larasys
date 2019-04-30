const { createClient } = require("webdav")
var StlThumbnailer = require('node-stl-thumbnailer')
var fs = require('fs')
var path = require('path')
var randomstring = require("randomstring")
var crypto = require("crypto")
const md5File = require('md5-file')

var doc = undefined

const baseColor = 0xaaaaaa
const imageWidth = 640
const imageHeight = 480
const _THUMBNAILS_ = [
				        {
				            width: imageWidth,
				            height: imageHeight,
    						cameraAngle: [90,0,0],
    						baseOpacity: 1.0,
    						baseColor: baseColor
				        },
				        {
				            width: imageWidth,
				            height: imageHeight,
    						cameraAngle: [0,90,0],
    						baseOpacity: 1.0,
    						baseColor: baseColor         
				        },
				        {
				            width: imageWidth,
				            height: imageHeight,
    						cameraAngle: [0,0,90],
    						baseOpacity: 1.0,
    						baseColor: baseColor         
				        },
				        {
				            width: imageWidth,
				            height: imageHeight,
    						cameraAngle: [45,45,45],   
    						baseOpacity: 1.0, 
    						baseColor: baseColor    
				        },
				        {
				            width: imageWidth,
				            height: imageHeight,
    						cameraAngle: [45,0,45],
    						baseOpacity: 1.0,
    						baseColor: baseColor    
				        }
				    ] 	

var client = undefined

async function ls (dir) {
	return new Promise(async function(resolve, reject) {
		try {
			const directoryItems = await client.getDirectoryContents(dir, { deep: true }) 
			resolve(directoryItems)	
		} catch (err) {
			reject(err)
		}
	})
}

async function ls_simple (dir) {
	return new Promise(async function(resolve, reject) {
		try {
			const directoryItems = await client.getDirectoryContents(dir) 
			resolve(directoryItems)	
		} catch (err) {
			reject(err)
		}
	})
}

async function getFile (file) {
	return new Promise(async function(resolve, reject) {
		try {
			const buff = await client.getFileContents(file);
			resolve(buff)			
		} catch (err) {
			reject(err)
		}
	})
}

async function mkdir (dir) {
	return new Promise(async function(resolve, reject) {
		try {
			const response = await client.createDirectory(dir) 
			resolve(response)			
		} catch (err) {
			reject(err)
		}

	})
}

function removeLocalFolder () {
	var _folder = path.join(__dirname, '../models')
	fs.readdir(_folder, (err, files) => {
	  if (err) {
	  	console.log(err)
	  }
	  for (const file of files) {
	    fs.unlink(path.join(_folder, file), err => {
	      if (err) {
	      	console.log(err)
	      }
	    })
	  }
	})
}

async function generateFor (uploadpath, pathfile) {
	let file = await getFile(pathfile)
	let filename = pathfile.split('/')[pathfile.split('/').length - 1].split('.stl')[0]
	console.log('# Download file ', filename)
	var _folder = path.join(__dirname, '../models/')
	fs.writeFile(_folder + filename + ".stl", file,  "binary", function(err) {
	    if(err) {
	        console.log(err);
	    } else {
	    	const hash = md5File.sync(_folder + filename + ".stl")
			console.log('# Starting ', filename)
			var thumbnailer = new StlThumbnailer ({
			    filePath: _folder + filename + ".stl",
			    requestThumbnails: _THUMBNAILS_
			})
			.then(function(thumbnails) {
			    thumbnails.forEach(function (t, index) {
			    	t.toBuffer(async function(err, buf) {
			    		try {
			    			console.log('Creating folder ', uploadpath)
			    			let mk = await mkdir(uploadpath)     
			    			console.log('Created folder ', uploadpath) 	
			    		} catch (err) {
			    			console.log('Stl image mkdir err: ', err)
			    		}
			    	    console.log('# Ending ', filename, ' thumb: ', index)
			    	    await client.putFileContents(uploadpath + "th_" + hash + '_' + index + '.png', buf, { overwrite: true });
			    	})
			    })
			})
	    }
	})
}

var self = module.exports = {
	generateImgForFolder: async function (src, dst) {
		console.log('# Start processing')
		removeLocalFolder()
		let stlFileList = await ls (src)
		let stl = []
		stlFileList.forEach(function (file) {
			if (file.basename != undefined && file.basename.split('.stl').length == 2) {
				let newpath = dst + file.filename.split('/')[3] + '/'
				stl.push([newpath, file.filename])
			}
		})
		for (const item in stl) {
			try {
				await generateFor(stl[item][0], stl[item][1])
			} catch (err) {
				console.log('Err at', p, ' -> ', err)
			}
		}	
		console.log('# End processing')
	},

	generateImgForFile: async function (stlary, dst) {
		console.log('# Start processing')
		removeLocalFolder()
		let stl = []
		stlary.forEach(function (file) {
			let newpath = dst + file.split('/')[3] + '/'
			stl.push([newpath, file])
		})
		for (const item in stl) {
			try {
				await generateFor(stl[item][0], stl[item][1])
			} catch (err) {
				console.log('Err at', stl[item], ' -> ', err)
			}
		}	
		console.log('# End processing')
	},

	syncCheck: async function (src, dst) {
		console.log('# Start processing')
		removeLocalFolder()
		let buildList = await ls_simple (src)
		let computedList = await ls_simple (dst)
		let toCheck = []
		buildList.forEach(function (b) {
			if (!computedList.some(e => e.basename === b.basename)) {
				toCheck.push(b)
			} 
		})
		console.log(toCheck)
		for (var item in toCheck) {
			await self.generateImgForFolder(toCheck[item].filename, dst)	
		}
		
	},

	setConf: function (conf) {
		doc = conf
		client = createClient (
		    doc.cloud.host, {
		        username: doc.cloud.user,
		        password: doc.cloud.password
		    }
		)
		console.log("---->", doc.cloud.folders.dataset_builds, doc.cloud.folders.dataset_computed, client)
		self.syncCheck(doc.cloud.folders.dataset_builds, doc.cloud.folders.dataset_computed)
	}
}










