const express = require('express')
const options = require('./options.js')
const SMB2 = require('@marsaud/smb2')
const fs = require('fs')
const path = require('path')
const _ = require('underscore')

let app = express()
app.use(express.json())
app.use(express.urlencoded())
let server = app.listen(8089)

function strDiff(a, b) {
	let i = 0
	let j = 0
	let res = ''
	while (j < b.length) {
		if (a[i] != b[j] || i == a.length) {
			res += b[j]
		} else {
			i++
		}
		j++
	}
	return res
}

app.get('/', function(req, res) {

})

app.post('/save-col', function(req, res) {
	console.log('req.body', req.body)
	let cols = options.get('columns')
	if (cols == undefined) {
		cols = []
	}
	console.log('cols', cols)
	let num = 0
	if (req.body.col && req.body.col.num) {
		num = req.body.col.num
	} else {
		num = cols.length
	}
	cols[num] = req.body.col
	console.log('cols save', cols)
	options.set('columns', cols)
	res.send({
		'cols': cols
	})
})
app.post('/del-col', function(req, res) {
	console.log('req.body', req.body)
	let cols = options.get('columns')
	if (cols == undefined) {
		cols = []
	}
	console.log('cols', cols)
	if (req.body.col && req.body.col.num) {
		cols.splice(req.body.col.num * 1, 1)
	}
	console.log('col del', cols)
	options.set('columns', cols)
	res.send({
		'cols': cols
	})
})
app.post('/read-cols', function (req, res) {
	let cols = options.get('columns')
	if (cols == undefined) {
		cols = []
	}
	if (req.body.colNums && req.body.colNums.length) {
		cols = _.filter(cols, function (col) {
			return _.contains(req.body.colNums, col.num)
		})
	}
	res.send({
		'cols': cols
	})
})
app.post('/files', function (req, res) {
	let problem = false
	const resFiles = []
	if (req.body.open == undefined) {
		problem = 'ERROR! There is no path!'
		console.error(problem)
		res.send({
			'problem': problem,
			'files': resFiles
		})
	}
	resFiles.push({
		'name': '..',
		'path': path.join(req.body.open, '..'),
		'isJumper': true,
		'isDir': true
	})
	fs.readdir(req.body.open, async function (err, readFiles) {
		if (err) {
			problem = 'Unable to scan directory: ' + err
			console.log(problem)
		} else {
			readFiles.forEach(function (fileName) {
				const filePath = path.join(req.body.open, fileName)
				const stats = fs.lstatSync(filePath)
				resFiles.push({
					'name': fileName,
					'path': filePath,
					'isJumper': false,
					'isDir': stats.isDirectory()
				})
			})
		}
		res.send({
			'type': 'files',
			'files': resFiles,
			'problem': problem
		})
	})
})
app.post('/smb', function (req, res) {
	let problem = false
	const resFiles = []
	if (req.body.open == undefined) {
		problem = 'ERROR! There is no path!'
		console.error(problem)
		res.send({
			'problem': problem,
			'files': resFiles
		})
	}
	resFiles.push({
		'name': '..',
		'path': path.join(req.body.open, '..'),
		'isJumper': true,
		'isDir': true
	})
	const smb2Client = new SMB2({
		share: req.body.share,
		domain: req.body.domain,
		username: req.body.username,
		password: req.body.password,
		autoClose: true
	})
	let subdir = strDiff(req.body.share, req.body.open)
	if (subdir[0] == '\\' || subdir[0] == '/') {
		//Remove shashes if first character is "\" or "/"
		subdir = subdir.slice(1)
	}
	smb2Client.readdir(subdir, { stats: true }, function(err, data) {
		if (err) {
			problem = 'Unable to scan network: ' + err
			console.log("Error (readdir):\n", err)
		} else {
			console.log("Connection made.")
			for (let i = 0; i < data.length; i++) {
				//console.log(data[i])
				const filePath = path.join(req.body.open, data[i].name)
				resFiles.push({
					'name': data[i].name,
					'path': filePath,
					'isJumper': false,
					'isDir': data[i].isDirectory()
				})
			}
		}
		res.send({
			'type': 'smb',
			'files': resFiles,
			'problem': problem
		})
	})
})
