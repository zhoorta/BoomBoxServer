const ytdl = require('ytdl-core')

const uniqid = require('uniqid')
const sha256 = require('js-sha256')
const fs = require('fs')


module.exports = class ContentController {
	
	constructor(db) {
		this.db =  db
    	this.tasks = []
    	db.defaults({ content: [] }).write()
   	} 

   	getTasks(keyid) {
   		return this.tasks.filter(obj => obj.owner === keyid)
   	}

   	getContent(keyid) {
   		return this.db.get('content').filter({ owner: keyid }).value()
   	}

   	getOtherContent(keyid) {
   		return this.db.get('content').filter(obj => obj.owner !== keyid).value()
   	}

   	getAllContent() {
   		return this.db.get('content').value()
   	}


	getContentByTag(keyid) {

		var curr_tag = null
		var curr_idx = -1

		var ret = []
		var data = this.db.get('content').filter({ owner: keyid }).sortBy('tag').value()


		data.map((item) => {

			if(curr_tag!==item.tag) {
				ret.push({ tag: item.tag, content:[] })
				curr_idx = curr_idx + 1
				curr_tag = item.tag
			}
			ret[curr_idx].content.push(item)

		})

		ret = ret.map((item) => {  
			return {
				tag: item.tag,
				content: item.content.sort(this.comparetitle)
			}
		})

		return ret
	}

	async updateContent(keyid,content) {

		await this.db.get('content')
			.find({ id: content.id, owner: keyid })
			.set('title', content.title)
			.set('tag', content.tag)
			.write()

		console.log('content #' + content.id + ' | updated')

		return true

	}

	async deleteContent(keyid,id) {

		var file='./content/' + id + '.ogg'

		fs.unlink(file, (err) => { console.log('File deleted : ' + file) })
		await this.db.get('content').remove({ id: id, owner: keyid }).write()

		console.log('content #' + id + ' | deleted')

		return true

	}

	async createDownloadTask(keyid,url) {

		if(!ytdl.validateURL(url)) {
			console.log('ERR | Invalid URL')
			return false
		}

		console.log('task | getURLVideoID()')

		var videoid = await ytdl.getURLVideoID(url)

		console.log('task | getInfo()')

		ytdl.getInfo(videoid, (err, info) => {

			if (err) {
				console.log('ERR | getInfo()')
				return false
			}

			console.log('task | chooseFormat()')


			let format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' })
			if (format) {

				//TODO: validar se ja existe tarefa para esse videoid

				var task = {
					id: sha256(uniqid()),
					owner: keyid,
					videoid: videoid,
					title: info.title,
					tag: '',
					thumbnail_url: info.thumbnail_url,
					length_hours: this.formatContentLength(info.length_seconds),
					status: 'downloading',
					totallength: 0,
					downloaded: 0,
					progress: 0
				}

				this.tasks.push(task)
				console.log('task | created')
				console.log('tasks | ', this.tasks)

				this.startDownloadTask(info,task)

				return true

			}
			else return false
		})

	}

	async startDownloadTask(info,task) {
		
		console.log('task | startDownloadTask')


		ytdl.downloadFromInfo(info, { quality: 'highestaudio', filter: 'audioonly' })
			.on('progress', (length, downloaded, totallength) => {

				var task_idx = this.tasks.findIndex(item => item.videoid === task.videoid)
				

				var progress = 100 * downloaded / totallength
				this.tasks[task_idx].progress = Math.round(progress)
				this.tasks[task_idx].downloaded = this.formatBytes(downloaded)
				this.tasks[task_idx].totallength = this.formatBytes(totallength)


				if(progress==100) {
					this.db.get('content').push(this.tasks[task_idx]).write() 
					this.tasks.splice(task_idx,1)

					console.log('task #' + task_idx + ' | finished')
					}			

	      	})
	  		.pipe(fs.createWriteStream('./content/' + task.id + '.ogg'))		 
	}


	formatContentLength(total_seconds) {
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

	formatBytes(bytes) {
		if(bytes < 1024) return bytes + " Bytes"
		else if(bytes < 1048576) return(bytes / 1024).toFixed(3) + " KB"
		else if(bytes < 1073741824) return(bytes / 1048576).toFixed(3) + " MB"
		else return(bytes / 1073741824).toFixed(3) + " GB"
	}

	comparetitle(a, b) {
		const aa = a.title.toUpperCase();
		const bb = b.title.toUpperCase();
		let comparison = 0;
		if (aa > bb) comparison = 1;
		else if (aa < bb) comparison = -1;
		return comparison;
	}

}