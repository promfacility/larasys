'use strict'

let yaml = require('js-yaml')
let fs = require('fs')
const { createClient } = require("webdav")
var amqp = require('./src/amqp.js')

let doc = undefined

try {
  doc = yaml.safeLoad(fs.readFileSync(process.env.LARASYSCONF, 'utf8'));
  console.log(doc);
} catch (e) {
  console.log(e);
}

amqp.set(doc)

const _CLOUD_CLIENT_ = doc.cloud.host
const _BUILDS_PATH_ = doc.cloud.folders.builds
const _DATASET_BUILDS_PATH_ = doc.cloud.folders.dataset_builds

const client = createClient (
    _CLOUD_CLIENT_, {
        username: doc.cloud.user,
        password: doc.cloud.password
    }
)

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

// [[src], [dst]]
async function syncFiles(files) {
	for (const item in files) {
		let resp = await client.copyFile(files[item][0], files[item][1])	
		console.log('Created ', files[item][1])
	}	
}

var self = module.exports = {

	syncBetween: async function (src, dst, callback) {
		try {
			let stlFileList = await ls (src)
			let datasetFileList = await ls (dst)
			let stl = {}
			let toSync = []
			let foldersToCreate = new Set()
			let folderToCreateQueue = []
			let folderCC = 0
			stlFileList.forEach(function (file) {
				if (file.basename != undefined && file.basename.split('.stl').length == 2) {
					stl[file.basename] = [file, {}]
				}
			})
			datasetFileList.forEach(function (file) {
				if (file.basename != undefined && file.basename.split('.stl').length == 2) {
					stl[file.basename][1] = file
				}
			})
			Object.entries(stl).forEach( ([key, value]) => {
				if (Object.entries(value[1]).length === 0 && value[1].constructor === Object) {
					let newpath = dst + value[0].filename.split(src)[1]
					toSync.push([value[0].filename, newpath])
					let splitPath = newpath.split('/')
					let path = ''
					for (var i = 0; i < splitPath.length - 1; i++) { path += splitPath[i] + '/' }
					foldersToCreate.add(path)
				} else if ((value[1].lastmod != undefined && value[0].lastmod > value[1].lastmod)) {
					toSync.push([value[0].filename, value[1].filename])
				}
			})
			console.log(toSync, foldersToCreate)
			if (toSync.length == 0) {
				callback({done: true, sync: toSync })
				return
			}
			if (foldersToCreate.size > 0) {
				foldersToCreate.forEach(async function(folder) {
					try {
						console.log('Path ', folder)
						let mk = await mkdir(folder)
						console.log('->', mk.status)
						folderCC += 1
						if (folderCC == foldersToCreate.size) {
							console.log('All folders created')
							await syncFiles(toSync)
							callback({done: true, sync: toSync })
						}
					} catch (err) {
						folderCC += 1
						if (folderCC == foldersToCreate.size) {
							console.log('All folders created')
							await syncFiles(toSync)
							callback({done: true, sync: toSync })
						}
					}
				})
			} else {
				await syncFiles(toSync)
				callback({done: true, sync: toSync })
			}
		} catch (err) {
			console.log(err)
			callback({done: true, sync: [] })
		} 
	}
}

let _RUNNING_ = false

function syncLoop () {
	console.log('#! Start cloud sync loop')
	if (_RUNNING_ === true) {
		console.log('#! Sync cloudloop already running, skip')
		return
	}
	_RUNNING_ = true
	self.syncBetween(doc.cloud.folders.builds, doc.cloud.folders.dataset_builds, function (data) {
		_RUNNING_ = false
		let tosync = []
		data.sync.forEach(function (d) {
			tosync.push(d[1])
		})
		amqp.pub("", 'larasys-generateimg', new Buffer(JSON.stringify({sync: tosync})))
		//amqp.pub("", 'larasys-acquireimg', new Buffer(JSON.stringify({image_name: 'test02.png' })))
		console.log('#! Stop cloud sync loop')
	})

}

syncLoop ()
setInterval(syncLoop, 60000)


// self.syncBetween(_BUILDS_PATH_, _DATASET_BUILDS_PATH_)