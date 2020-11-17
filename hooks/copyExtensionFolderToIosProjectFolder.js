var fs = require('fs');
var path = require('path');
var Q = require('q'); // 此為遠古時代 promise
var EXTENSION_LOG_ENABLE;

function log(logString, type) {
  var prefix;
  var postfix = '';
  var enable = EXTENSION_LOG_ENABLE || false;
  switch (type) {
    case 'error':
      prefix = '\x1b[1m' + '\x1b[31m' + '🙈 🙈 '; // bold, red
      throw new Error(prefix + logString + 'x1b[0m'); // reset
    case 'info':
      prefix =
        '\x1b[40m' +
        '\x1b[37m' +
        '\x1b[2m' +
        '☝️ [INFO] ' +
        '\x1b[0m\x1b[40m' +
        '\x1b[33m'; // fgWhite, dim, reset, bgBlack, fgYellow
      break;
    case 'start':
      prefix = '\x1b[40m' + '\x1b[36m'; // bgBlack, fgCyan
      postfix = ' 🙉 🙉 🙉';
      break;
    case 'success':
      prefix = '\x1b[40m' + '\x1b[32m' + '✔ '; // bgBlack, fgGreen
      postfix = ' 🐵 🐵 🐵';
      break;
  }

  if (type === 'success' || Boolean(enable)) {
    console.log(prefix + logString + postfix);
  }
}

console.log('\x1b[40m');
log(
  '[HOOK FILE] copyExtensionFolderToIosProject => 開始複製特定路徑資料夾至專案中 ...',
  'start'
);

// 遞迴複製機制 for file
var copyFileSync = function(source, target) {
  var targetFile = target;

  // If target is a directory a new file with the same name will be created
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isDirectory()) {
      targetFile = path.join(target, path.basename(source));
    }
  }

  fs.writeFileSync(targetFile, fs.readFileSync(source));
};
// 遞迴複製機制 for folder
var copyFolderRecursiveSync = function(source, target) {
  var files = [];

  // Check if folder needs to be created or integrated
  // path.basename 獲取檔名
  // 進來此方法 source 須保證為資料夾  isDirectory !!
  // 複製機制假設此 source 不在時, 便複製一份 ( folder ) 過去 target
  var targetFolder = path.join(target, path.basename(source));
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder);
  }

  // Copy
  if (fs.lstatSync(source).isDirectory()) {
    files = fs.readdirSync(source);
    files.forEach(function(file) {
      var curSource = path.join(source, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, targetFolder);
      } else {
        copyFileSync(curSource, targetFolder);
      }
    });
  }
};

function getPreferenceValue (config, name) {
  var value = config.match(new RegExp('name="' + name + '" value="(.*?)"', "i"));
  if(value && value[1]) {
    return value[1];
  } else {
    return null;
  }
}

function getCordovaParameter(variableName, contents) {
  var variable;
  if(process.argv.join("|").indexOf(variableName + "=") > -1) {
    var re = new RegExp(variableName + '=(.*?)(\||$))', 'g');
    variable = process.argv.join("|").match(re)[1];
  } else {
    variable = getPreferenceValue(contents, variableName);
  }
  return variable;
}

module.exports = function(context) {
  var deferral = new Q.defer();

  var contents = fs.readFileSync(
    path.join(context.opts.projectRoot, 'config.xml'),
    'utf-8'
  );
  EXTENSION_LOG_ENABLE = getCordovaParameter("EXTENSION_LOG_ENABLE", contents);
  var iosFolder = context.opts.cordova.project
    ? context.opts.cordova.project.root
    : path.join(context.opts.projectRoot, 'platforms/ios/');
  fs.readdir(iosFolder, function(err, data) {
    var projectFolder;
    var projectName;
    var srcFolder;
    // 目標平台資料夾 看到 .xcodeproj 代表你進到 platforms/ios 了
    if (data && data.length) {
      data.forEach(function(folder) {
        if (folder.match(/\.xcodeproj$/)) {
          projectFolder = path.join(iosFolder, folder);
          projectName = path.basename(folder, '.xcodeproj');
        }
      });
    }

    if (!projectFolder || !projectName) {
      log('在 ' + iosFolder + ' 沒有發現任何 .xcodeproj 檔案', 'error');
    }

    // Get the widget name and location from the parameters or the config file
    var EXTENSION_NAME = getCordovaParameter("EXTENSION_NAME", contents);
    var WIDGET_PATH = getCordovaParameter("EXTENSION_PATH", contents);
    var extensionName = EXTENSION_NAME || projectName + ' Widget';
    // 定義路徑, 如果有自定義的話從指定 PATH 找尋, 否則預設為 /www 
    if (WIDGET_PATH) {
        srcFolder = path.join(
          context.opts.projectRoot,
          WIDGET_PATH,
          extensionName + '/'
        );
    } else {
        srcFolder = path.join(
          context.opts.projectRoot,
          'www',
          extensionName + '/'
        );
    }
    // 重複檢查路徑存在
    if (!fs.existsSync(srcFolder)) {
      log(
        ' 🙈🙈🙈🙈 在指定路徑: ' + srcFolder + ' 找不到名為 ' + extensionName + ' 的資料夾' ,
        'error'
      );
    }

    // 複製指定路徑資料夾進專案 ( 遞迴複製 ) 
    copyFolderRecursiveSync(
      srcFolder,
      path.join(context.opts.projectRoot, 'platforms', 'ios')
    );
    log('成功複製指定路徑資料夾進專案', 'success');
    console.log('\x1b[0m'); // reset

    deferral.resolve();
  });

  return deferral.promise;
};
