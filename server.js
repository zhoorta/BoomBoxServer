const express = require('express')
const app = express()
const port = process.env.PORT || 1973

const ContentController = require('./ContentController.js')
const AuthController = require('./AuthController.js')

var bodyParser = require('body-parser');
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))


const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const db = low(new FileSync('./db.json'))
var contentController = new ContentController(db)
var Auth = new AuthController(db)



function verifyToken(req, res, next) {
	var token = req.headers['x-access-token']
	if (!token) {
		var ret = {success: false,message: 'Auth token is not supplied'}
		console.log(ret)
		return res.json(ret)
	}
	let decoded = Auth.decodeToken(token)
	if(decoded.auth==='false') {
		var ret = {success: false, message: 'Token is not valid'}
		console.log(ret)
		return res.json(ret)
	}
	req.uid = decoded.uid
	next()
}

function sendJsonResponse(res,json) {
  	res.setHeader('Content-Type', 'application/json')
	res.send(JSON.stringify(json))
}

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, x-access-token');
    next();
})

app.post('/auth/', async (req, res) => {
	var result = await Auth.authenticate(req.body.secret)
	sendJsonResponse(res,result)
})


app.get('/users', verifyToken, async (req, res) => {
	sendJsonResponse(res,contentController.getUsers(req.uid))
})

app.get('/content', verifyToken, async (req, res) => {
	sendJsonResponse(res,contentController.getContent(req.uid))
})

app.get('/content/:uid', verifyToken, async (req, res) => {
	sendJsonResponse(res,contentController.getContent(req.params.uid))
})

app.get('/content/all', verifyToken, async (req, res) => {
	sendJsonResponse(res,contentController.getAllContent())
})

app.get('/content/sort/by/tag', verifyToken, async (req, res) => {
	sendJsonResponse(res,contentController.getContentByTag(req.uid))
})

app.get('/content/download/:id', async (req, res) => {
	res.setHeader('Content-Type', 'audio/ogg')
	res.download('./content/' + req.params.id + '.ogg')
})


app.post('/content/update', verifyToken, async (req, res) => {
	await contentController.updateContent(req.uid,req.body.content)
	sendJsonResponse(res,contentController.getContentByTag(req.uid))
})

app.get('/content/:id/delete', verifyToken, async (req, res) => {
	await contentController.deleteContent(req.uid,req.params.id)
	sendJsonResponse(res,contentController.getContentByTag(req.uid))
})

app.get('/tasks', verifyToken, async (req, res) => {
	sendJsonResponse(res,contentController.getTasks(req.uid))
})

app.post('/download', verifyToken, async (req, res) => {
	await contentController.createDownloadTask(req.uid,req.body.url)
	sendJsonResponse(res,contentController.getTasks(req.uid))
})


app.post('/download/info', verifyToken, async (req, res) => {
	const info = await contentController.getDownloadInfo(req.body.url)
	sendJsonResponse(res,info)
})


app.listen(port, () => console.log('BoomBox Server port: ' + port))