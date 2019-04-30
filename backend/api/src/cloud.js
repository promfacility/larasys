const { createClient } = require("webdav")
let yaml = require('js-yaml')
let fs   = require('fs')

let doc = undefined
let client = undefined

try {
  doc = yaml.safeLoad(fs.readFileSync(process.env.LARASYSCONF, 'utf8'));
} catch (e) {
  console.log(e);
}

function createCloudClient () {
	client = createClient (
	    doc.cloud.host, {
	        username: doc.cloud.user,
	        password: doc.cloud.password
	    }
	)
}

createCloudClient()

var self = module.exports = {
	ls: async function (dir, deep, callback) {
		try {
			const directoryItems = await client.getDirectoryContents(dir, { deep: deep }) 
			callback(directoryItems)
		} catch (err) {
			callback(err)
		}
	},

	stream: async function (file, res) {
		try {
			client.createReadStream(file).pipe(res);
		} catch (err) {
			console.log(err)
		}
	}
}