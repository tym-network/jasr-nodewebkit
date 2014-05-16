#!/usr/bin/env node

var download		= require('download')
	,rimraf			= require('rimraf')
	,createBar		= require('multimeter')(process)
	,path			= require('path')
	,fs				= require('fs')
	,readline		= require('readline')
	,rl
	,version		= '0.9.2'
	,url			= false
	,urlBase		= 'http://dl.node-webkit.org/v'
	,exec			= require('child_process').exec
	,userPlatform	= ''
	;

// Required to avoid a bug
process.stdin.unpipe();
process.stdin.resume = function() {};
process.stdin.pause = function() {};
rl = readline.createInterface({ input: process.stdin,  output: process.stdout });


// Download a dependency only for windows
if (process.platform === 'win32') {
	exec('npm install windows-shortcuts@0.1.1',
		function (error, stdout, stderr) {
			console.log('stdout: ' + stdout);
			console.log('stderr: ' + stderr);
			if (error !== null) {
				console.log('exec error: ' + error);
			}
		}
	);
}

rl.write('Choose the OS you will be using:\n');
rl.write('1 - Windows\n');
rl.write('2 - MacOS\n');
rl.write('3 - Linux 32bit\n');
rl.write('4 - Linux 64bit\n');
rl.question(
	'Enter the number corresponding to your OS: '
	, function(answer)
	{
		var dest		= path.resolve(__dirname, '..', 'nodewebkit')
			, total		= 0
			, progress	= 0
			, d
			, bar
			, onLinkCreated = function() {
				// If OSX, manually set file permissions (until adm-zip supports getting the file mode from zips)
				if (answer === '2') {
					[
						'Contents/MacOS/node-webkit',
						'Contents/Frameworks/node-webkit Helper.app/Contents/Resources/crash_report_sender.app/Contents/MacOS/crash_report_sender',
						'Contents/Frameworks/node-webkit Helper.app/Contents/Resources/crash_report_sender',
						'Contents/Frameworks/node-webkit Helper.app/Contents/MacOS/node-webkit Helper',
						'Contents/Frameworks/node-webkit Helper.app/Contents/Libraries/libclang_rt.asan_osx_dynamic.dylib',
						'Contents/Frameworks/node-webkit Helper NP.app/Contents/Resources/crash_report_sender.app/Contents/MacOS/crash_report_sender',
						'Contents/Frameworks/node-webkit Helper NP.app/Contents/Resources/crash_inspector',
						'Contents/Frameworks/node-webkit Helper NP.app/Contents/MacOS/node-webkit Helper NP',
						'Contents/Frameworks/node-webkit Helper NP.app/Contents/Libraries/libclang_rt.asan_osx_dynamic.dylib',
						'Contents/Frameworks/node-webkit Helper EH.app/Contents/Resources/crash_report_sender.app/Contents/MacOS/crash_report_sender',
						'Contents/Frameworks/node-webkit Helper EH.app/Contents/Resources/crash_inspector',
						'Contents/Frameworks/node-webkit Helper EH.app/Contents/MacOS/node-webkit Helper EH',
						'Contents/Frameworks/node-webkit Helper EH.app/Contents/Libraries/libclang_rt.asan_osx_dynamic.dylib'
					].forEach(function(filepath) {
						filepath = path.resolve(dest, filepath);
						if (fs.existsSync(filepath))
						{
							fs.chmodSync(filepath, '0755');
						}
					});
				}
				process.nextTick(function() {
					process.exit();
				});
			}
			;

		answer = answer.trim();
		switch(answer)
		{
			case '1' :
				userPlatform = 'win32'
				url = urlBase + version + '/node-webkit-v' + version + '-win-ia32.zip';
				break;
			case '2' :
				userPlatform = 'darwin'
				url = urlBase + version + '/node-webkit-v' + version + '-osx-ia32.zip';
				break;
			case '3' :
				userPlatform = 'linux'
				url = urlBase + version + '/node-webkit-v' + version + '-linux-ia32.tar.gz';
				break;
			case '4' :
				userPlatform = 'linux'
				url = urlBase + version + '/node-webkit-v' + version + '-linux-x64.tar.gz';
				break;
			default :
				console.error('OS not in the list');
				process.exit(0);
		}
		rl.close();

		function error(e) {
			console.error((typeof e === 'string') ? e : e.message);
			process.exit(0);
		}

		if (!url) error('Could not find a compatible version of node-webkit to download for your platform.');

		// Solve a problem with MacOS by adding a level of directories.
		if (answer == '2')
		{
			dest += "/JASR";
		}

		rimraf.sync(dest);
		bar	= createBar({ before: url + ' [' });
		d = download(url, dest, { extract: true, strip: 1 });

		d.on('response', function(res) {
			total = parseInt(res.headers['content-length']);
		});

		d.on('data', function(data) {
			progress += data.length;
			if (total > 0)
			{
				var percent = progress / total * 100;
				bar.percent(percent);
				if (percent >= 100)
				{
					console.log('');
					console.log('Extracting...');
				}
			}
		});

		d.on('error', error);

		d.on('close', function() {
			var linkSource = ''
		  		, linkDest = ''
		  		, stats
		  		;
			if (userPlatform === 'win32' && process.platform !== userPlatform)
			{
				// When you install JASR for Windows from Linux or Mac, don't create a shortcut
				onLinkCreated();
			}
			else
			{
				if (process.platform === 'win32') {
					linkSource = path.join(dest, 'nw.exe');
					linkDest = 'JASR.lnk';
					// Create a shortcut
					if (!fs.existsSync(path.resolve(process.cwd(), '../..', linkDest)))
					{
						// Windows uses a special way to create shortcuts to applications
						var ws = require('windows-shortcuts');
						ws.create(path.resolve(process.cwd(), '../..', linkDest), linkSource, function(err) {
							if (err)
							{
								console.log("Failed to create a shortcut");
							}
							else
							{
								console.log("Shortcut created: " + path.resolve(process.cwd(), '../..', linkDest));
							}
							onLinkCreated();
						});
					}
					else
					{
						// The shortcut already exists
						onLinkCreated();
					}
				}
				else
				{
					if (process.platform === 'darwin')
					{
						linkSource = path.join(dest, 'Contents', 'MacOS', 'node-webkit');
						
					}
					else {
						linkSource = path.join(dest, 'nw');
					}
					linkDest = 'JASR';
					// Create link
					try
					{
						stats = fs.lstatSync(path.resolve(process.cwd(), '../..', linkDest));
					} catch(e) {}
					stats && fs.unlinkSync(path.resolve(process.cwd(), '../..', linkDest));
					if (!fs.existsSync(path.resolve(process.cwd(), '../..', linkDest)))
					{
						fs.symlinkSync(linkSource, path.resolve(process.cwd(), '../..', linkDest));
					}
					onLinkCreated();
				}
			}
		}
	);
});