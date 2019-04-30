var genimg = require('./generateimg')

var amqpConn = null;
var doc = undefined

function sm (ary) {
	genimg.generateImgForFile(ary, doc.cloud.folders.dataset_computed)
}

function sync(msg, cb) {
	try {
		var content = JSON.parse(msg.content)
		console.log("----->", content.sync)
		sm(content.sync)
	} catch (e) {
		console.log("[ERR] ", e)
	}
	cb(true);
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
		ch.assertQueue("larasys-generateimg", { durable: true }, function(err, _ok) {
			if (closeOnErr(err)) return;
			ch.consume("larasys-generateimg", processSync, { noAck: false })
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

function closeOnErr(err) {
	if (!err) return false;
   	console.error("[AMQP] error", err);
	amqpConn.close();
	return true;
}

var self = module.exports = {
	enable: function(conn, conf) {
		doc = conf
		genimg.setConf(conf)
		amqpConn = conn;
		startImageWorker();
	}
}