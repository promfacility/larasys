'use strict'

const { createClient } = require("webdav")
var StlThumbnailer = require('node-stl-thumbnailer')
var fs = require('fs')
var path = require('path')
let yaml = require('js-yaml')
var randomstring = require("randomstring")
var crypto = require("crypto")
const md5File = require('md5-file')

var syncworker = require('./src/syncworker.js')
var genimg = require('./src/generateimg')
var workers = [];

var amqp = require('amqplib/callback_api')

var amqpConn = null;

let doc = undefined

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
		console.log("LARA STL TO IMAGE LOAD WORKER")
		syncworker.enable(amqpConn, doc)
	})
}

try {
  doc = yaml.safeLoad(fs.readFileSync(process.env.LARASYSCONF, 'utf8'));
  start()
  console.log(doc);
} catch (e) {
  console.log(e);
}



