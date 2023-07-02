'use strict';
const path = require('path')
const {app, BrowserWindow, Menu, ipcMain} = require('electron')
/// const {autoUpdater} = require('electron-updater')
const {is} = require('electron-util')
const unhandled = require('electron-unhandled')
const debug = require('electron-debug')
const contextMenu = require('electron-context-menu')
const options = require('./options.js')
const menu = require('./menu.js')
const SMB2 = require('smb2')
const fs = require('fs')
const StringDecoder = require('string_decoder').StringDecoder

let config = {}
const readconfig = function () {
	const dc = './config/default_config.json'
	const cc = './config/config.json'
	if (fs.existsSync(cc)) {
		config = JSON.parse(fs.readFileSync(cc))
		console.log(config)
	} else {
		fs.copyFile(dc, cc, (err) => {
			if (err) throw err
			console.log(cc + ' created now!')
			readconfig()
		})
	}
}
readconfig()

unhandled()
debug()
contextMenu()

// Note: Must match `build.appId` in package.json
app.setAppUserModelId('com.company.AppName');

// Uncomment this before publishing your first version.
// It's commented out as it throws an error if there are no published versions.
// if (!is.development) {
// 	const FOUR_HOURS = 1000 * 60 * 60 * 4;
// 	setInterval(() => {
// 		autoUpdater.checkForUpdates();
// 	}, FOUR_HOURS);
//
// 	autoUpdater.checkForUpdates();
// }

// Prevent window from being garbage collected
let mainWindow;

const PORT = 8089

const createMainWindow = async () => {
	const window_ = new BrowserWindow({
		title: app.name,
		show: false,
		width: 1024,
		height: 768,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	})

	window_.on('ready-to-show', () => {
		window_.show()
		window_.maximize()
		let http = require("http")
		let server = http.createServer(async function (req, res) {
			console.log(req.url)
			const decoder = new StringDecoder('utf-8')
			let paramObject = {}
			let payload = ''
			req.on('data', (data) => {
				payload += decoder.write(data)
			})
			req.on('end', () => {
				payload += decoder.end()
				const params = new URLSearchParams(payload)
				paramObject = Object.fromEntries(params.entries())
				let problem = false
				const resFiles = []
				console.log(paramObject)
				switch (req.url) {
					case '/config':
						res.end(JSON.stringify(config))
						break
					case '/files':
						if (paramObject.open == undefined) {
							console.error('ERROR! There is no path!')
							break
						}
						resFiles.push({
							'name': '..',
							'path': path.join(paramObject.open, '..'),
							'isDir': true
						})
						fs.readdir(paramObject.open, async function (err, readFiles) {
							if (err) {
								problem = 'Unable to scan directory: ' + err
								console.log(problem)
							} else {
								readFiles.forEach(function (fileName) {
									const filePath = path.join(paramObject.open, fileName)
									resFiles.push({
										'name': fileName,
										'path': filePath,
										'isDir': fs.lstatSync(filePath)
									})
								})
							}
							res.end(JSON.stringify({
								'problem': problem,
								'files': resFiles
							}))
						})
						break
					case '/smb':
						const smb2Client = new SMB2({
							share: paramObject.open,
							domain: paramObject.domain,
							username: paramObject.username,
							password: paramObject.password,
							//debug: true,
							autoCloseTimeout: 0
						})
						const subdir = paramObject.subdir ? paramObject.subdir : ''
						smb2Client.readdir(subdir, function(err, data) {
							if (err) {
								console.log("Error (readdir):\n", err)
							} else {
								console.log("Connection made.")
								for (let i = 0; i < data.length; i++) {
									console.log(data[i])
									resFiles.push({
										'name': data[i],
										'path': '',
										'isDir': false
										// TODO: smb file isDir
									})
								}
								smb2Client.close()
							}
							res.end(JSON.stringify({
								'type': 'smb',
								'files': resFiles
							}))
						})
						break
					default:
						res.end(JSON.stringify({
							'addr': res.socket.remoteAddress,
							'port': res.socket.remotePort
						}))
						break
				}
			})
		})
		server.listen(PORT)
		console.log("http://localhost:" + PORT)
	})

	window_.on('closed', () => {
		// Dereference the window
		// For multiple windows store them in an array
		mainWindow = undefined
	});

	await window_.loadFile(path.join(__dirname, 'index.html'))

	return window_
};

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
	app.quit()
}

app.on('second-instance', () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore()
		}

		mainWindow.show()
	}
});

app.on('window-all-closed', () => {
	if (!is.macos) {
		app.quit()
	}
});

app.on('activate', async () => {
	if (!mainWindow) {
		mainWindow = await createMainWindow()
	}
});

(async () => {
	await app.whenReady()
	Menu.setApplicationMenu(menu)
	mainWindow = await createMainWindow()

	// const favoriteAnimal = options.get('favoriteAnimal')
	// mainWindow.webContents.executeJavaScript(`document.querySelector('header p').textContent = 'Your favorite animal is ${favoriteAnimal}'`);
})();
