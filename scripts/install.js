#!/usr/bin/env node

var download = require('download')
    ,rimraf = require('rimraf')
    ,createBar = require('multimeter')(process)
    ,path = require('path')
    ,fs = require('fs')
    ,readline = require('readline')
    ,version = '0.9.2'
    ,url = false
    ,urlBase = 'http://dl.node-webkit.org/v'
    ;

process.stdin.resume = function() {};
process.stdin.pause = function() {};

var rl = readline.createInterface({ input: process.stdin,  output: process.stdout });

rl.write('Choose the OS you will be using:\n');
  rl.write('1 - Windows\n');
  rl.write('2 - MacOS\n');
  rl.write('3 - Linux 32bit\n');
  rl.write('4 - Linux 64bit\n');
  rl.question(
    'Enter the number corresponding to your OS: '
    , function(answer)
    {
      answer = answer.trim();
      switch(answer)
      {
        case '1' :
          url = urlBase + version + '/node-webkit-v' + version + '-win-ia32.zip';
          break;
        case '2' :
          url = urlBase + version + '/node-webkit-v' + version + '-osx-ia32.zip';
          break;
        case '3' :
          url = urlBase + version + '/node-webkit-v' + version + '-linux-ia32.tar.gz';
          break;
        case '4' :
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

      var dest = path.resolve(__dirname, '..', 'nodewebkit');
      rimraf.sync(dest);

      var bar = createBar({ before: url + ' [' })
          ,total = 0
          ,progress = 0
          ,d = download(url, dest, { extract: true, strip: 1 })
          , onLinkCreated = function() {
            // Symlink for app
            if (!fs.existsSync(path.join(dest, 'app'))) {
              fs.symlinkSync(path.resolve(process.cwd(), '../../app'), path.join(dest, 'app'));
            }
            // Symlink for package.json
            if (!fs.existsSync(path.join(dest, 'package.json'))) {
              fs.symlinkSync(path.resolve(process.cwd(), '../..', 'package.json'), path.join(dest, 'package.json'));
            }
            // If OSX, manually set file permissions (until adm-zip supports getting the file mode from zips)
            if (answer == '2') {
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
                if (fs.existsSync(filepath)) {
                  fs.chmodSync(filepath, '0755');
                }
              });
            }
            process.nextTick(function() {
              process.exit();
            });
          }
          ;

      d.on('response', function(res) {
        total = parseInt(res.headers['content-length']);
      });
      d.on('data', function(data) {
        progress += data.length;
        if (total > 0) {
          var percent = progress / total * 100;
          bar.percent(percent);
          if (percent >= 100) {
            console.log('');
            console.log('Extracting...');
          }
        }
      });
      d.on('error', error);
      d.on('close', function() {
        var linkSource = ''
          , linkDest = ''
          ;
        if (process.platform === 'darwin') {
          linkSource = path.join(dest, 'Contents', 'MacOS', 'node-webkit');
          linkDest = 'jasr';
          // Create link
          if (!fs.existsSync(path.resolve(process.cwd(), '../..', linkDest))) {
            fs.symlinkSync(linkSource, path.resolve(process.cwd(), '../..', linkDest));
          }
          onLinkCreated();
        } else if (process.platform === 'win32') {
          linkSource = path.join(dest, 'nw.exe');
          linkDest = 'jasr.lnk';
          // Create link
          if (!fs.existsSync(path.resolve(process.cwd(), '../..', linkDest))) {
            var ws = require('windows-shortcuts');
            ws.create(path.resolve(process.cwd(), '../..', linkDest), linkSource, function(err) {
              if (err) {
                console.log("Failed to create a shortcut");
              }
              else {
                console.log("Shortcut created: " + path.resolve(process.cwd(), '../..', linkDest));
              }
              onLinkCreated();
            });
          }
          else { onLinkCreated(); }
        } else {
          linkSource = path.join(dest, 'nw');
          linkDest = 'jasr';
          // Create link
          if (!fs.existsSync(path.resolve(process.cwd(), '../..', linkDest))) {
            fs.symlinkSync(linkSource, path.resolve(process.cwd(), '../..', linkDest));
          }
          onLinkCreated();
        }
    }
  );
});
