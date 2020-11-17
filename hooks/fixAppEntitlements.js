// @ts-check

var elementTree = require('elementtree');
var fs = require('fs');
var path = require('path');
var plist = require('plist');
var Q = require('q');
var xcode = require('xcode');
var EXTENSION_LOG_ENABLE;

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
// 🙈🐵🙉🙊
// 刪除後續空白行
function removeDuplicateSubsequentLines(string) {
  var lineArray = string.split('\n');
  return lineArray.filter((line, idx) => {
    return idx === 0 || ( line !== lineArray[idx - 1] )
  }).join('\n');
}
// 竄改 plist 內容 : 找 plist => 複製 plist => 改複製 => 複寫 plist
function replacePlaceholdersInPlist(plistPath, placeHolderValues) {
    var plistContents = fs.readFileSync(plistPath, 'utf8');
    for (var i = 0; i < placeHolderValues.length; i++) {
        var placeHolderValue = placeHolderValues[i],
            regexp = new RegExp(placeHolderValue.placeHolder, "g");
        plistContents = plistContents.replace(regexp, placeHolderValue.value);
        plistContents = removeDuplicateSubsequentLines(plistContents);
    }
    fs.writeFileSync(plistPath, plistContents);
}

console.log('\x1b[40m');
log(
  '[HOOK FILE] fixAppEntitlements, 目標: 修正 Container App Build Setting ',
  'start'
);

module.exports = function (context) {
  var deferral = new Q.defer();
  var contents = fs.readFileSync(
    path.join(context.opts.projectRoot, 'config.xml'),
    'utf-8'
  );
  EXTENSION_LOG_ENABLE = getCordovaParameter("EXTENSION_LOG_ENABLE", contents);

  if (context.opts.cordova.platforms.indexOf('ios') < 0) {
    log('錯過 after_platform_add 時機, 請先把舊的 platform 移除, 再 add platform 一次', 'error');
  }

  var contents = fs.readFileSync(
    path.join(context.opts.projectRoot, 'config.xml'),
    'utf-8'
  );

  if (contents) {
    contents = contents.substring(contents.indexOf('<'));
  }

  // Get the bundle-id from config.xml
  var etree = elementTree.parse(contents);
  // <widget id="YOUR_APP_INDENTIFY" 這個
  var bundleId = etree.getroot().get('id');

  var iosFolder = context.opts.cordova.project
    ? context.opts.cordova.project.root
    : path.join(context.opts.projectRoot, 'platforms/ios/');

  fs.readdir(iosFolder, function (err, data) {
    var projectFolder
    var projectName;
    var run = function () {
      // 修改 plist 中的 EX: $(APP_IDENTIFIER) => 增加 App Group 屬性
      var placeHolderValues = [
        {
          placeHolder: '__APP_IDENTIFIER__',
          value: bundleId
        }
      ];
      // 這裡有可能寫完了又被其他 plugin 幹掉
      // Update app entitlements
      ['Debug', 'Release'].forEach(config => {
        var entitlementsPath = path.join(iosFolder, projectName, 'Entitlements-' + config + '.plist');
        replacePlaceholdersInPlist(entitlementsPath, placeHolderValues);
      });
      log('成功填入 plist 中的所有 ${APP_IDENTIFIER} 欄位', 'success');

      console.log('\x1b[0m'); // reset

      deferral.resolve();
    };

    if (err) {
      log(err, 'error');
    }

    // Find the project folder by looking for *.xcodeproj
    if (data && data.length) {
      data.forEach(function (folder) {
        if (folder.match(/\.xcodeproj$/)) {
          projectFolder = path.join(iosFolder, folder);
          projectName = path.basename(folder, '.xcodeproj');
        }
      });
    }

    if (!projectFolder || !projectName) {
      log('Could not find an *.xcodeproj folder in: ' + iosFolder, 'error');
    }

    run();
  });

  return deferral.promise;
};
