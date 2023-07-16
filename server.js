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

function reverseString(str) {
    return str.split('').reverse().join('')
}
function strDiff(ai, bi, reverse) {
	/**
	 * The reverse argument should be true if expected difference present in the end of the strings!
	 * Example: ai = "foobar", bi = "foobar-old"
	 */
	let i = 0
	let j = 0
	let res = ''
	let a, b
	if (ai.length > bi.length) {
		b = ai
		a = bi
	} else {
		a = ai
		b = bi
	}
	if (reverse == true) {
		a = reverseString(a)
		b = reverseString(b)
	}
	while (j < b.length) {
		if (a[i] != b[j] || i == a.length) {
			res += b[j]
		} else {
			i++
		}
		j++
	}
	if (reverse == true) {
		res = reverseString(res)
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
	_.each(cols, function (col, key) {
		col.num = key
	})
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
const fnRemoveTrailingSlashes = function (str) {
	if (str[0] == '\\' || str[0] == '/') {
		// Remove trailing slashes if first character is "\" or "/"
		str = str.slice(1)
	}
	return str
}
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
	let subdir = fnRemoveTrailingSlashes(strDiff(req.body.share, req.body.open, true))
	smb2Client.readdir(subdir, { stats: true }, function (err, data) {
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
app.post('/rename-row', function (req, res) {
	let problem = false
	if (req.body.col.type == 'files') {
		const dir = strDiff(req.body.oldRow.path, req.body.oldRow.name, true)
		const newPath = dir + req.body.newRow.name
		console.log(dir, req.body.newRow.name, newPath)
		const newRow = _.extend({}, req.body.oldRow, {
			'name': req.body.newRow.name,
			'path': newPath
		})
		fs.rename(req.body.oldRow.path, newPath, function () {
			res.send({
				'row': newRow,
				'problem': problem
			})
		})
	} else if (req.body.col.type == 'smb') {
		const smb2Client = new SMB2({
			share: req.body.col.share,
			domain: req.body.col.domain,
			username: req.body.col.username,
			password: req.body.col.password,
			autoClose: true
		})
		// \\192.168.0.30\m\!- A_TUDASTAR_TEMP\E-BOOK (-) \\192.168.0.30\m (=) \!- A_TUDASTAR_TEMP\E-BOOK
		let dir1 = strDiff(req.body.oldRow.path, req.body.col.share, true)
		// \!- A_TUDASTAR_TEMP\E-BOOK (=) !- A_TUDASTAR_TEMP\E-BOOK
		dir1 = fnRemoveTrailingSlashes(dir1)
		// !- A_TUDASTAR_TEMP\E-BOOK (-) E-BOOK (=) !- A_TUDASTAR_TEMP\
		let dir2 = strDiff(dir1, req.body.oldRow.name, true)
		// !- A_TUDASTAR_TEMP\ (+) E-BOOK Archive (=) !- A_TUDASTAR_TEMP\E-BOOK Archive
		let dir3 = dir2 + req.body.newRow.name
		console.log('rename', dir1, dir2, dir3)
		smb2Client.rename(dir1, dir3, { replace: true }, function (err) {
			if (err) {
				problem = 'Unable to scan network: ' + err
				console.log("Error (rename):\n", err)
			}
			res.send({
				'problem': problem,
				'row': _.extend({}, req.body.oldRow, {
					'name': req.body.newRow.name,
					'path': req.body.col.share + '\\' + dir3
				})
			})
		})
	}
})
