var elementTree = require('elementtree'); // XML parser
var fs = require('fs');
var path = require('path');
var plist = require('plist');
var Q = require('q');
var xcode = require('xcode');
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
// 🙈🐵🙉🙊

// 複寫 extension plist 屬性
function replacePlaceholdersInPlist(plistPath, placeHolderValues) {
  log(
    '[FUNCTION] replacePlaceholdersInPlist 準備覆寫 plist 屬性... ',
    'start'
  );
    var plistContents = fs.readFileSync(plistPath, 'utf8');
    for (var i = 0; i < placeHolderValues.length; i++) {
        var placeHolderValue = placeHolderValues[i],
            regexp = new RegExp(placeHolderValue.placeHolder, "g");
        plistContents = plistContents.replace(regexp, placeHolderValue.value);
    }
    fs.writeFileSync(plistPath, plistContents);
}
// 從 終端機全域屬性找尋指定參數
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

// 從 XML 找尋指定參數
function getPreferenceValue (config, name) {
  var value = config.match(new RegExp('name="' + name + '" value="(.*?)"', "i"));
  if(value && value[1]) {
    return value[1];
  } else {
    return null;
  }
}

console.log('\x1b[40m');
log(
  '[NSE HOOK FILE] addTargetToXcodeProject 開始進行專案掛鈎',
  'start'
);

module.exports = function (context) {
  var deferral = new Q.defer();
  // 檔案引入時機為 after_platform_add in plugin.xml, 不能在已有平台下才裝 plugin
  if (context.opts.cordova.platforms.indexOf('ios') < 0) {
    log('錯過 after_platform_add 時機, 請先把舊的 platform 移除, 再 add platform 一次', 'error');
  }

  var contents = fs.readFileSync(
    path.join(context.opts.projectRoot, 'config.xml'),
    'utf-8'
  );

  // Get the plugin variables from the parameters or the config file
  // plugin variables 有 2 種來源
  // 終端機在安裝 plugin 時引入 --variable EXTENSION_NAME="🙈🙈🙈🙈" ( 先找 )
  // config.xml <variable name="EXTENSION_NAME" value="🙈🙈🙈🙈" />

  // EXTENSION_BUNDLE_SUFFIX 會跟你 EXTENSION 的 bundle identifier 有關, 預設為 containerApp bundle identifier + 此後綴參數
  EXTENSION_LOG_ENABLE = getCordovaParameter("EXTENSION_LOG_ENABLE", contents);
  var EXTENSION_NAME = getCordovaParameter("EXTENSION_NAME", contents);
  var EXTENSION_BUNDLE_SUFFIX = getCordovaParameter("EXTENSION_BUNDLE_SUFFIX", contents);
  var ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES = getCordovaParameter("ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES", contents);
  // 保險從 XML TAG 開頭
  if (contents) {
    contents = contents.substring(contents.indexOf('<'));
  }

  // Get the bundle-id from config.xml
  var etree = elementTree.parse(contents);
  // <widget id="YOUR_APP_INDENTIFY" 這個
  var bundleId = etree.getroot().get('id');
  log('Bundle id of your host app: ' + bundleId, 'info');
  // 發現 cordova add platform 後產生的 ios root
  var iosFolder = context.opts.cordova.project
    ? context.opts.cordova.project.root
    : path.join(context.opts.projectRoot, 'platforms/ios/');
  log('ios Folder of your host app: ' + iosFolder, 'info');

  fs.readdir(iosFolder, function (err, data) {
    var projectFolder;
    var projectName;
    var run = function () {
      var pbxProject;
      var projectPath;
      projectPath = path.join(projectFolder, 'project.pbxproj');

      log(
        'Parsing existing project at location: ' + projectPath + ' ...',
        'info'
      );
      if (context.opts.cordova.project) {
        pbxProject = context.opts.cordova.project.parseProjectFile(
          context.opts.projectRoot
        ).xcode;
      } else {
        pbxProject = xcode.project(projectPath);
        pbxProject.parseSync();
      }

      var widgetName = EXTENSION_NAME || projectName + ' NSE';
      log('Your widget will be named: ' + widgetName, 'info');

      var widgetBundleId = EXTENSION_BUNDLE_SUFFIX || 'nse';
      log('Your widget bundle id will be: ' + bundleId + '.' + widgetBundleId, 'info');

      var widgetFolder = path.join(iosFolder, widgetName);
      var sourceFiles = [];
      var resourceFiles = [];
      var configFiles = [];
      var projectContainsSwiftFiles = false;
      var addBridgingHeader = false;
      var bridgingHeaderName;
      var addXcconfig = false;
      var xcconfigFileName;
      var xcconfigReference;
      var addEntitlementsFile = false;
      var entitlementsFileName;
      var projectPlistPath = path.join(iosFolder, projectName, projectName + '-Info.plist');
      var projectPlistJson = plist.parse(fs.readFileSync(projectPlistPath, 'utf8'));
      var placeHolderValues = [
        {
          placeHolder: '__DISPLAY_NAME__',
          value: projectPlistJson['CFBundleDisplayName']
        },
        {
          placeHolder: '__APP_IDENTIFIER__',
          value: projectPlistJson['CFBundleIdentifier']
        },
        {
          placeHolder: '__BUNDLE_SUFFIX__',
          value: widgetBundleId
        },
        {
          placeHolder: '__BUNDLE_SHORT_VERSION_STRING__',
          value: projectPlistJson['CFBundleShortVersionString']
        },
        {
          placeHolder: '__BUNDLE_VERSION__',
          value: projectPlistJson['CFBundleVersion']
        }
      ];

      // path.extname('.index.md'); return .md
      // 檢視檔案目錄中的所有類型
      fs.readdirSync(widgetFolder).forEach(file => {
        if (!/^\..*/.test(file)) {
          // Ignore junk files like .git
          var fileExtension = path.extname(file);
          switch (fileExtension) {
            case '.swift':
              projectContainsSwiftFiles = true; // for log
              sourceFiles.push(file);
              break;
            case '.h':
            case '.m':
              if (file === 'Bridging-Header.h' || file === 'Header.h') {
                addBridgingHeader = true; // for log
                bridgingHeaderName = file;
              }
              sourceFiles.push(file);
              break;
            // Configuration files
            case '.plist':
            case '.entitlements':
            case '.xcconfig':
              if (fileExtension === '.plist') {
                replacePlaceholdersInPlist(path.join(widgetFolder, file), placeHolderValues);
              }
              if (fileExtension === '.xcconfig') {
                addXcconfig = true; // for log
                xcconfigFileName = file;
              }
              if (fileExtension === '.entitlements') {
                replacePlaceholdersInPlist(path.join(widgetFolder, file), placeHolderValues);
                addEntitlementsFile = true; // for log
                entitlementsFileName = file;
              }
              configFiles.push(file);
              break;
            // Resources like storyboards, images, fonts, etc.
            default:
              resourceFiles.push(file);
              break;
          }
        }
      });
      // for check
      log('Found following files in your widget folder:', 'info');
      console.log('Source-files: ');
      sourceFiles.forEach(file => {
        console.log(' - ', file);
      });

      console.log('Config-files: ');
      configFiles.forEach(file => {
        console.log(' - ', file);
      });

      console.log('Resource-files: ');
      resourceFiles.forEach(file => {
        console.log(' - ', file);
      });

      // Add PBXNativeTarget to the project
      var target = pbxProject.addTarget(
        widgetName,
        'app_extension',
        widgetName
      );
      if (target) {
        log('Successfully added PBXNativeTarget!', 'info');
      }

      // Create a separate PBXGroup for the widgets files, name has to be unique and path must be in quotation marks
      var pbxGroupKey = pbxProject.pbxCreateGroup(
        'NSE',
        '"' + widgetName + '"'
      );
      if (pbxGroupKey) {
        log(
          '創建 xProject 中目標資料夾' +
          widgetName +
          ' with alias: NSE',
          'info'
        );
      }

      // Add the PbxGroup to cordovas "CustomTemplate"-group
      var customTemplateKey = pbxProject.findPBXGroupKey({
        name: 'CustomTemplate',
      });
      pbxProject.addToPbxGroup(pbxGroupKey, customTemplateKey);
      log(
        'Successfully added the nse PbxGroup to cordovas CustomTemplate!',
        'info'
      );

      // 增加資料夾中的 .plist .entitlement
      configFiles.forEach(configFile => {
        var file = pbxProject.addFile(configFile, pbxGroupKey);
        // We need the reference to add the xcconfig to the XCBuildConfiguration as baseConfigurationReference
        // path.extname 返回附檔名
        if (path.extname(configFile) == '.xcconfig') {
          xcconfigReference = file.fileRef;
        }
      });
      log(
        'Successfully added ' + configFiles.length + ' configuration files!',
        'info'
      );

      // Add a new PBXResourcesBuildPhase 包裝擴展資料夾中的 .swift, TARGETS / Build Phases / Compile Sources
      var sourcesBuildPhase = pbxProject.addBuildPhase(
        [],
        'PBXSourcesBuildPhase',
        'Sources',
        target.uuid
      );
      if (sourcesBuildPhase) {
        // log('Successfully added PBXSourcesBuildPhase!', 'info');
      }

      //  pbxGroupKey 一併加入檔案指向 ／Target Membership 
      sourceFiles.forEach(sourcefile => {
        pbxProject.addSourceFile(
          sourcefile,
          { target: target.uuid },
          pbxGroupKey
        );
      });

      log(
        'ADD ' +
        sourceFiles.length +
        ' files to TARGETS / Build Phases / Compile Sources',
        'info'
      );

      // Add a new PBXFrameworksBuildPhase for the Frameworks
      var frameworksBuildPhase = pbxProject.addBuildPhase(
        [],
        'PBXFrameworksBuildPhase',
        'Frameworks',
        target.uuid
      );
      if (frameworksBuildPhase) {
        // log('Successfully added PBXFrameworksBuildPhase!', 'info');
      }

      // 增加擴展所需 framework , TARGETS / Build Phases / Link Binary With Libraries , 和 TARGETS / General / Frameworks and Libraries
      var frameworkFile1 = pbxProject.addFramework(
        'NotificationCenter.framework',
        { target: target.uuid }
      );
      var frameworkFile2 = pbxProject.addFramework('libCordova.a', {
        target: target.uuid,
      }); // seems to work because the first target is built before the second one
      if (frameworkFile1 && frameworkFile2) {
        log('ADD extension framework to TARGETS / Build Phases / Link Binary With Libraries', 'info');
      }

      // Add a new PBXResourcesBuildPhase 包裝擴展資料夾中的 .storyboard or .xib , TARGETS / Build Phases / Copy Bundle Resources
      var resourcesBuildPhase = pbxProject.addBuildPhase(
        [],
        'PBXResourcesBuildPhase',
        'Resources',
        target.uuid
      );
      if (resourcesBuildPhase) {
        // log('Successfully added PBXResourcesBuildPhase!', 'info');
      }

      //  pbxGroupKey 一併加入檔案指向 ／Target Membership 
      resourceFiles.forEach(resourcefile => {
        pbxProject.addResourceFile(
          resourcefile,
          { target: target.uuid },
          pbxGroupKey
        );
      });

      log(
        'ADD ' + resourceFiles.length + ' files to TARGETS / Build Phases / Copy Bundle Resources',
        'info'
      );

      // Add build settings for Swift support, bridging header and xcconfig files
      var configurations = pbxProject.pbxXCBuildConfigurationSection();
      for (var key in configurations) {
        if (typeof configurations[key].buildSettings !== 'undefined') {
          var buildSettingsObj = configurations[key].buildSettings;
          if (typeof buildSettingsObj['PRODUCT_NAME'] !== 'undefined') {
            var productName = buildSettingsObj['PRODUCT_NAME'];
            if (productName.indexOf('Widget') >= 0) {
              if (addXcconfig) {
                configurations[key].baseConfigurationReference =
                  xcconfigReference + ' /* ' + xcconfigFileName + ' */';
                log('Added xcconfig file reference to build settings!', 'info');
              }
              if (addEntitlementsFile) {
                buildSettingsObj['CODE_SIGN_ENTITLEMENTS'] = '"' + widgetName + '/' + entitlementsFileName + '"';
                log('Added entitlements file reference to build settings!', 'info');
              }
              if (projectContainsSwiftFiles) {
                buildSettingsObj['SWIFT_VERSION'] = '4.0';
                buildSettingsObj['ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES'] = ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES || 'YES';
                log('Added build settings for swift support!', 'info');
              }
              if (addBridgingHeader) {
                buildSettingsObj['SWIFT_OBJC_BRIDGING_HEADER'] =
                  '"$(PROJECT_DIR)/' +
                  widgetName +
                  '/' +
                  bridgingHeaderName +
                  '"';
                log('Added bridging header reference to build settings!', 'info');
              }
            }
          }
        }
      }

      // Write the modified project back to disc
      log('改寫專案設定 info.plist ...', 'info');
      fs.writeFileSync(projectPath, pbxProject.writeSync());
      log(
        '成功新增 extension 到' + projectName,
        'success'
      );
      console.log('\x1b[0m'); // reset

      deferral.resolve();
    };

    if (err) {
      log(err, 'error');
    }

    // platform/ios find *.xcodeproj
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
