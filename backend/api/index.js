let http = require('http')
let path = require('path')
let express = require('express')
let session = require('express-session')
let bodyParser = require('body-parser')
let yaml = require('js-yaml')
let fs   = require('fs')
var amqp = require('./src/amqp')
var cloud = require('./src/cloud')

sessionOptions = {
    secret: '23123123sdsadf2eqwd1dassdf3dssds',
    name: 'prom.lara',
    logErrors: true,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    secure: true,
    unset: 'destroy'
}

let doc = undefined

try {
  doc = yaml.safeLoad(fs.readFileSync(process.env.LARASYSCONF, 'utf8'))
} catch (e) {
  console.log(e);
}

amqp.set(doc)


//   ____             __ _                      
//  / ___|___  _ __  / _(_) __ _ _   _ _ __ ___ 
// | |   / _ \| '_ \| |_| |/ _` | | | | '__/ _ \
// | |__| (_) | | | |  _| | (_| | |_| | | |  __/
//  \____\___/|_| |_|_| |_|\__, |\__,_|_|  \___|
//                         |___/   
// 
var server_port = parseInt(4000);
var access_control_allow_origin_server = "http://localhost:" + String(server_port);

var app = express();
app.enable('trust proxy');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dataexport')));
// Use body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Sessions
app.use(session(sessionOptions));
// Add headers
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

/**
*   Acquire and save a photo with a name
*/
app.post('/larasys/photo/acquire', function (req, res) {
    console.log('Start acquiring image')
    amqp.initImageState(req.body.image_name)
    amqp.pub("", 'larasys-acquireimg', new Buffer(JSON.stringify({image_name: req.body.image_name, build: req.body.build })))
    res.json({done: 'true'})
})

/**
*   Polling route in order to get the acq image state,
*   TODO: WS
*/
app.get('/larasys/photo/state', function (req, res) {
    res.json({state: amqp.imageState(req.query.image)})
})

/**
*   Returns system conf
*/
app.get('/larasysconf', function (req, res) {
    res.json(doc)
})

/**
*   Returns all the thumbs name for a build
*   e.g. req.query.basename = Build_1
*/
app.get('/larasys/build/thumbs', function (req, res) {
    cloud.ls(doc.cloud.folders.dataset_computed + req.query.basename, false, function (data) {
        let files = []
        let thumb = {}
        data.forEach(function (d) {
            files.push(d.basename)
            let name = d.basename.split('_')[1]
            if (thumb[name] == undefined) {
                thumb[name] = []
            }
            thumb[name].push(d.basename)
        })
        //thumb['build'] = req.query.basename
        res.json({thumb: thumb})
    })
})

/**
*   Return the image for a thumb id
*   e.g. req.query.build = Build_1 req.query.thumb = th_2fe16a66a3987acec89ea4213d70db59_0.png
*/
app.get('/larasys/thumb/stream', function (req, res) {
    cloud.stream(doc.cloud.folders.dataset_computed + req.query.build + '/' + req.query.thumb, res)
})

/**
*   Return the acquired image for  id
*   e.g. req.query.build = Build_1 req.query.image = th_2fe16a66a3987acec89ea4213d70db59_0.png
*/
app.get('/larasys/acq/stream', function (req, res) {
    console.log('####### ', doc.cloud.folders.dataset_acquired + req.query.build + '/' + req.query.image)
    cloud.stream(doc.cloud.folders.dataset_acquired + req.query.build + '/' + req.query.image, res)
})

/**
*   Returns all the acquirediamge for a build
*   e.g. req.query.basename = Build_1
*/
app.get('/larasys/build/acquired', function (req, res) {
    cloud.ls(doc.cloud.folders.dataset_acquired + req.query.basename, false, function (data) {
        let files = []
        let thumb = {}
        if (data.length != undefined) {
            data.forEach(function (d) {
                files.push(d.basename)
                let name = d.basename.split('_')[1]
                if (thumb[name] == undefined) {
                    thumb[name] = []
                }
                thumb[name].push(d.basename)
            })
        }
        res.json({thumb: thumb})
    })
})

/**
*   Returns all the builds 
*/
app.get('/larasys/builds', function (req, res) {
    cloud.ls(doc.cloud.folders.dataset_builds, false, function (data) {
        let builds = []
        data.forEach(function (d) {
            builds.push(d.basename)
        })
        res.json(builds)
    })
})

app.get('/larasys/builds/stats', function (req, res) {
    let data = {}
    cloud.ls(doc.cloud.folders.dataset_computed, true, function (data_computed) {
        cloud.ls(doc.cloud.folders.dataset_acquired, true, function (data_acq) {
            cloud.ls(doc.cloud.folders.dataset_builds, true, function (data_builds) {
                data_builds.forEach(function (dc) {
                    let dc_build = dc.filename.split('/')[3]
                    if (data[dc_build] == undefined) {
                        data[dc_build] = {builds: [], computed: [], acquired: [], lastmodcom: undefined, lastmodimg: undefined}
                    }
                    if (dc.size > 0) {
                        data[dc_build].builds.push(dc.basename)    
                    } 
                })
                data_computed.forEach(function (dc) {
                    let dc_build = dc.filename.split('/')[3]
                    if (dc.size > 0) {
                        data[dc_build].computed.push(dc.basename)    
                    } else {
                        data[dc_build].lastmodcom = dc.lastmod
                    }
                })
                data_acq.forEach(function (dc) {
                    let dc_build = dc.filename.split('/')[3]
                    if (dc.size > 0) {
                        data[dc_build].acquired.push(dc.basename)
                    } else {
                        data[dc_build].lastmodimg = dc.lastmod
                    }
                })
                res.json(data)
            })
        })
    })
})

//  ____                           
// / ___|  ___ _ ____   _____ _ __ 
// \___ \ / _ \ '__\ \ / / _ \ '__|
//  ___) |  __/ |   \ V /  __/ |   
// |____/ \___|_|    \_/ \___|_|   
//                                
try {
    var server = app.listen(server_port, function() {});
    console.log('Lara Web Server is UP')
} catch (err) {
    console.log("Main server error: ", err);
}