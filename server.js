const express = require('express')
const app = express()
const port = process.env.PORT || 1973

//const cors = require('cors')

const uniqid = require('uniqid')
const fs = require('fs')
const ytdl = require('ytdl-core')

var bodyParser = require('body-parser');
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))


const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('./db.json')
const db = low(adapter)


db.defaults({ content: [] }).write()

var tasks = []


app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    //res.setHeader('Access-Control-Allow-Credentials', true);
    // Pass to next layer of middleware
    next();
})

function formatContentLength(total_seconds) {
  var hours   = Math.floor(total_seconds / 3600)
  var minutes = Math.floor((total_seconds - (hours * 3600)) / 60)
  var seconds = total_seconds - (hours * 3600) - (minutes * 60)

  // round seconds
  seconds = Math.round(seconds * 100) / 100

  var result = (hours < 10 ? "0" + hours : hours)
      result += ":" + (minutes < 10 ? "0" + minutes : minutes)
      result += ":" + (seconds  < 10 ? "0" + seconds : seconds)
  return result;
}

function formatBytes(bytes) {
    if(bytes < 1024) return bytes + " Bytes"
    else if(bytes < 1048576) return(bytes / 1024).toFixed(3) + " KB"
    else if(bytes < 1073741824) return(bytes / 1048576).toFixed(3) + " MB"
    else return(bytes / 1073741824).toFixed(3) + " GB"
};

//app.get('/info/:videoid', cors(corsOptions), async (req, res) => {
app.get('/info/:videoid', async (req, res) => {

	ytdl.getBasicInfo(req.params.videoid, 
		(err, info) => {

			res.setHeader('Content-Type', 'application/json');
			res.send(JSON.stringify({
				title: info.title,
				thumbnail_url: info.thumbnail_url,
				length_seconds: info.length_seconds
			}))
		})

})

app.get('/content', async (req, res) => {

  	res.setHeader('Content-Type', 'application/json')
	res.send(JSON.stringify(db.get('content')))

})

app.get('/content/:id', async (req, res) => {

	res.download('./content/' + req.params.id + '.ogg')

})


app.post('/content/update', async (req, res) => {

	await db.get('content')
		.find({ id: req.body.content.id })
		.set('title', req.body.content.title)
		.set('tag', req.body.content.tag)
		.write()

	res.setHeader('Content-Type', 'application/json')
	res.send(JSON.stringify(db.get('content')))

})

app.get('/content/:id/delete', async (req, res) => {

	var file='./content/' + req.params.id + '.ogg'

	fs.unlink(file, (err) => { console.log('File deleted : ' + file) })
	db.get('content').remove({ id: req.params.id }).write()

	res.setHeader('Content-Type', 'application/json')
	res.send(JSON.stringify(db.get('content')))

})

app.get('/tasks', async (req, res) => {

  	res.setHeader('Content-Type', 'application/json')
	res.send(JSON.stringify(tasks))

})

app.post('/download', async (req, res) => {

	if(!ytdl.validateURL(req.body.url)) {
		res.setHeader('Content-Type', 'application/json')
		res.send(JSON.stringify({err:'Invalid URL'}))
		console.log('ERR | Invalid URL')
		return
	}

	var videoid = ytdl.getURLVideoID(req.body.url)
	ytdl.getInfo(videoid, (err, info) => {
		
		if (err) {
			res.setHeader('Content-Type', 'application/json')
			res.send(JSON.stringify({err:'Video unavailable'}))
			console.log('ERR | Video unavailable')
			return
		}

		let format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
		if (format) {

			//TODO: validar se ja existe tarefa para esse videoid

			var task = {
				id: uniqid(),
				videoid: videoid,
				title: info.title,
				tag: '',
				thumbnail_url: info.thumbnail_url,
				length_seconds: info.length_seconds,
				length_hours: formatContentLength(info.length_seconds),
				status: 'downloading',
				totallength: 0,
				downloaded: 0,
				progress: 0
			}

			tasks.push(task)
			console.log('task | created')

		  	res.setHeader('Content-Type', 'application/json')
			res.send(JSON.stringify(tasks))

			ytdl.downloadFromInfo(info, { quality: 'highestaudio', filter: 'audioonly' })
				.on('progress', (length, downloaded, totallength) => {

					var task_idx = tasks.findIndex(task => task.videoid === videoid)
					

					var progress = 100 * downloaded / totallength
					tasks[task_idx].progress = Math.round(progress)
					tasks[task_idx].downloaded = formatBytes(downloaded)
					tasks[task_idx].totallength = formatBytes(totallength)

					console.log('task #' + task_idx + ' | progress update: ' + tasks[task_idx].progress)
					//console.log(tasks[task_idx])

					if(progress==100) {
						db.get('content').push(tasks[task_idx]).write() 
						tasks.splice(task_idx,1)

						console.log('task #' + task_idx + ' | finished')
						}			
	
		      	})
		  		.pipe(fs.createWriteStream('./content/' + task.id + '.ogg'))
		}

	})



})


app.listen(port, () => console.log('BoomBox Server port: ' + port))