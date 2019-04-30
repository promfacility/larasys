'use strict'

const { createClient } = require("webdav")
let amqp = require('amqplib/callback_api')
let yaml = require('js-yaml')
let fs = require('fs')
let shell = require('shelljs')

let amqpConn = null
let pubChannel = null
let offlinePubQueue = []
let doc = undefined

try {
  doc = yaml.safeLoad(fs.readFileSync(process.env.LARASYSCONF, 'utf8'));
  start()
  console.log(doc);
} catch (e) {
  console.log(e);
}

const _CLOUD_CLIENT_ = doc.cloud.host
const _ACQ_BUILDS_PATH_ = doc.cloud.folders.dataset_acquired

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

function sm (build, image) {
	console.log('Acquiring image')
	publish("", 'larasys-acq-img', new Buffer(JSON.stringify({state: 'received', image: image})))
	shell.exec('python3 /home/pi/code/src/get_pic.py  --file ' + image)
	console.log('End acquiring image, start uploading')
	publish("", 'larasys-acq-img', new Buffer(JSON.stringify({state: 'acq', image: image})))
	fs.readFile('./' + image, async function(err, data) {
	  	if (err) {
	  		publish("", 'larasys-acq-img', new Buffer(JSON.stringify({state: 'error', image: image})))
	  		console.log(err)
	  		throw err; // Fail if the file can't be read.
	  	}
	  	try {
	  		let mk = await mkdir(_ACQ_BUILDS_PATH_ + build)
	  	} catch (err) {}
		await client.putFileContents(_ACQ_BUILDS_PATH_ + build + '/' + image, data, { overwrite: true })
		publish("", 'larasys-acq-img', new Buffer(JSON.stringify({state: 'uploaded', image: image})))
		console.log('End image upload')
	})
}

function sync(msg, cb) {
	try {
		var content = JSON.parse(msg.content)
		sm(content.build, content.image_name)
	} catch (e) {
		console.log("[ERR] ", e)
	}
	cb(true);
}

function closeOnErr(err) {
	if (!err) return false;
   	console.error("[AMQP] error", err);
	amqpConn.close();
	return true;
}

function startImageWorker() {
	amqpConn.createChannel(function(err, ch) {
		if (closeOnErr(err)) {
			return
		}
		ch.on("error", function(err) {
			console.error("[AMQP] channel error", err.message)
		})
		ch.on("close", function() {
			console.log("[AMQP] channel closed")
		});
		ch.prefetch(10);
		ch.assertQueue("larasys-acquireimg", { durable: true }, function(err, _ok) {
			if (closeOnErr(err)) return;
			ch.consume("larasys-acquireimg", processSync, { noAck: false })
			console.log("---> Worker is started")
		});
		function processSync(msg) {
			sync(msg, function(ok) {
				try {
					if (ok)
						ch.ack(msg)
					else
						ch.reject(msg, true)
				} catch (e) {
					closeOnErr(e)
				}
			});
		};
	});	
}

function start() {
  	amqp.connect(doc.amqp.host + "?heartbeat=60", function(err, conn) {
        if (err) {
			console.error("[AMQP]", err.message)
			return setTimeout(start, 1000)
		}
        conn.on("error", function(err) {
			if (err.message !== "Connection closing") {
				console.error("[AMQP] conn error", err.message)
			}
		})
		conn.on("close", function() {
			console.error("[AMQP] reconnecting")
			return setTimeout(start, 1000)
		})
		conn.on("close", function() {
			console.error("[AMQP] reconnecting")
			return setTimeout(start, 1000)
		})
		console.log("[AMQP] connected")
		amqpConn = conn
		console.log("LARA PHOTO CLIENT WORKER")
		startImageWorker()
		startPublisher()
	})
}

function startPublisher() {
   	amqpConn.createConfirmChannel(function(err, ch) {
		if (closeOnErr(err)) return;
 			ch.on("error", function(err) {
			console.error("[AMQP] channel error", err.message);
		});
		ch.on("close", function() {
			console.log("[AMQP] channel closed");
		});
		pubChannel = ch;
		while (true) {
			var m = offlinePubQueue.shift();
			if (!m) break;
			publish(m[0], m[1], m[2]);
		}
	});
}

function publish(exchange, routingKey, content) {
   	try {
		pubChannel.publish(exchange, routingKey, content, { persistent: true },
			function(err, ok) {
			if (err) {
				console.error("[AMQP] publish", err);
				offlinePubQueue.push([exchange, routingKey, content]);
				pubChannel.connection.close();
			}
		});
	} catch (e) {
		console.error("[AMQP] publish", e.message);
		offlinePubQueue.push([exchange, routingKey, content]);
	}
}

function closeOnErr(err) {
	if (!err) return false
   	console.error("[AMQP] error", err)
	amqpConn.close()
	return true
}



