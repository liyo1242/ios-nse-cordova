# 🐵 iOS plugin for add extension and auto set xcode build phases and build setting 🙈🐵🙉🙊

- 此套件包含 2 個部分, hook 部分 ( node.js ) 及 native code ( swift ) 部分 
- 參考 : cordova 官方對 hook 的介紹 [[hook 部分參考](https://cordova.apache.org/docs/zh-tw/5.4.0/guide/appdev/hooks/index.html)]

- [hook 部分] 主要目的為在 `cordova platform add ios` 時, 進行資料包引入及生成該有的設定檔.
- [hook 部分] 引用 plugin : 為了生成新的 xcode pbx 設定檔, 會使用到 [cordova-node-xcode](https://github.com/apache/cordova-node-xcode)

- [Native 部分] 調用 iOS Darwin 監聽功能, 與透過 App Group 進行應用程式間資料共享的操作
- [Native 部分] 採用 swift 撰寫, 會使用到 [cordova-plugin-add-swift-support](https://github.com/akofman/cordova-plugin-add-swift-support)

## 🐵 Usage 

### 1. 以現有 cordova 專案生成新的 extension ( 支援其他 Extension 囉 ) , `File > New > Target... > 選 NSE`

- 生成後的小工具可以在最頂層看到 (`Project > TARGETS`)
- 修正小工具資料夾裡頭 info.plist 的設定 ( 也可以到頂層設定修改 `Project > TARGETS`, Display Name 或 Bundle Identifier ), Bundle Identifier 記得前綴要與主 APP bundleId 一樣, 再接後綴

- `.swift`, `.h`, `.m`, `.plist`, `.entitlements`, `.xcconfig` , `.storyboard` 檔案類型皆支援 ( `hooks/addTodayWidgetToProject.js` )
- 調整完小工具後, 複製整個工具資料夾到 platforms/ios 以外的地方, 並記錄**小工具資料夾所在地** ( hook 工具預設會去 `／www` 資料夾中找 )

[Native Code 部分]
- `App Groups` 的設定 : 到 `Targets > Select your widget > Capabilities` 新增 App Group 屬性 ( App 與小工具的設定要一樣 )

* xcode 10 以下可能會看到 `Base.lproj` 記得把裡面的東西都拿出來


* [Objective-C 支援] If you want to use an objective-c bridging header you can add it to the folder, just make sure it is named `Header.h` (`Bridging-Header.h` works too but the file won't be listed in XCode because the cordova bridging header has the same name and node-xcode thinks's it's the same file because it's checking the name and not the UUID)

### 2. Install the plugin
* `cordova plugin add <plugin 路徑或 plugin 名稱> --save`
* 所有的 hook 功能都會在 `after_platform_add` 期間執行
* 假設你在創建 platform 後才裝 pulgin , hook 部分功能將會失效 🙈 ( 直到下次 remove platform 又 add platform 前都不會執行 )
* plugin 提供的變數 for `config.xml`:

| Variable | Default | Description |
|-|-|-|
|EXTENSION_LOG_ENABLE|false|開啟時可以看到每個步驟的 LOG|
|EXTENSION_PATH| `/www` | 小工具資料夾所在地 |
|EXTENSION_NAME| `<Your MainApp Name>` + `nse` | 小工具資料夾的名稱, 與路徑抓取有關 |
|EXTENSION_BUNDLE_SUFFIX| `nse` | 小工具 bundleId 後綴名 |
|ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES| YES | You might have to turn this off (change to NO) if you use other swift based plugins (such as cordova-plugin-geofence) |

* 手動在 config 中設定與在 CLI 安裝 plugin 設定都是可以的, hook 會去抓 process.argv 

#### Example:

In the config.xml

```
    <plugin name="cordova-plugin-nse" spec="0.0.1">
        <variable name="EXTENSION_NAME" value="NSE" />
        <variable name="EXTENSION_PATH" value="extension" />
        <variable name="ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES" value="NO" />
    </plugin>

```

Directly through CLI:

```
cordova plugin add <plugin 路徑或 plugin 名稱> --variable EXTENSION_NAME="NowWidget" --variable ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES="NO"
```

### 3. 小工具裡 plist 或 entitlements 的參數 [for hook]:

- hook 會去讀取設定檔 ( `.plist` or `.entitlements` ) 並以 placeholder 的方式寫入 pbx 的設定, 沒寫就算了 🙉 [`addTodayWidgetToProject.js`]
| Variable | Example | Description |
|-|-|-|
|\_\_DISPLAY_NAME__| 智生活行動卡夾 | name |
|\_\_APP_IDENTIFIER__| YOUR_APP_INDENTIFY | Bundle ID of the main app |
|\_\_BUNDLE_SUFFIX__| widget | 小工具 Bundle ID 後綴 |
|\_\_BUNDLE_SHORT_VERSION_STRING__| 1.0.0 | The version of the main app in form MAJOR.MINOR.PATCH |
|\_\_BUNDLE_VERSION__| 1234 | The build number of the main app

#### Examples for usage:

`Widget-Info.plist`:
* Bundle display name: \_\_DISPLAY_NAME__
* Bundle identifier: \_\_APP\_IDENTIFIER__.\_\_BUNDLE\_SUFFIX__
* Bundle version string, short: \_\_BUNDLE_SHORT_VERSION_STRING__
* Bundle version: \_\_BUNDLE_VERSION__

`Widget.entitlements`:
* App Groups -> Item 0: group.\_\_APP_IDENTIFIER__

* 別忘了一起設定 App 的`config.xml`

```
    <config-file parent="com.apple.security.application-groups" target="*-Debug.plist">
        <array>
            <string>YOUR_APPGROUP_INDENTIFY</string>
        </array>
    </config-file>
    <config-file parent="com.apple.security.application-groups" target="*-Release.plist">
        <array>
            <string>YOUR_APPGROUP_INDENTIFY</string>
        </array>
    </config-file>

```

### 4. 在 App `/www` 主程式碼的使用 [for native code]:

1. 推播計數 －１: `cordova.plugins.nse.badgeCountMinusOne(_ onResultOK, _ onResultError)`
  
| Variable | Description |
|-|-|
|onResultOK| 成功 callback |
|onResultError| 失敗 callback |

2. 取得推播計數: `cordova.plugins.nse.getBadgeCount(_ onResultOK, _ onResultError)`

| Variable | Description |
|-|-|
|onResultOK| 成功 callback ( 會有 badge 值傳回 ) |
|onResultError| 失敗 callback |

#### Examples for usage:

```
cordova.plugins.WidgetFramework.updateAppGroupShareData(
    function(badgeCount){console.log("WidgetFramework ok", badgeCount)},
    function(){console.log("WidgetFramework fail")},
)
```

3. 清空推播計數: `cordova.plugins.nse.badgeCountClear(onResultOK, onResultError)`
  
| Variable | Description |
|-|-|
|onResultOK| 成功 callback |
|onResultError| 失敗 callback |

4. 設定推播計數: `cordova.plugins.nse.badgeCountClear(onResultOK, onResultError, count)`
  
| Variable | Description |
|-|-|
|onResultOK| 成功 callback |
|onResultError| 失敗 callback |
|count|想要設定的 badge 值 ( 浮點數, 負數不接受 )|

### 注意 🙊
* 假設有在 xcode 裡修改小工具部分的程式, 記得在每次修改完, 要從 `platforms/ios` 拿出後放到你原先設定的路徑 ( `add platform ios` 時 hook 會從這邊拉進去的地方 ), 否則下次 `add platform ios` 時, 會發現上次的更新都不見了 🙊

### app config
```
        <plugin name="cordova-plugin-nse" spec="0.0.1">
            <variable name="EXTENSION_NAME" value="NSE" />
            <variable name="EXTENSION_PATH" value="extension" />
            <variable name="ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES" value="NO" />
        </plugin>

```
```
<config-file parent="com.apple.security.application-groups" target="*-Debug.plist">
    <array>
        <string>YOUR_APPGROUP_INDENTIFY</string>
    </array>
</config-file>
<config-file parent="com.apple.security.application-groups" target="*-Release.plist">
    <array>
        <string>YOUR_APPGROUP_INDENTIFY</string>
    </array>
</config-file>
```
### index.vue
```
    testNSE() {
      let vm = this
      cordova.plugins.nse.getBadgeCount((v) => {
        console.log('成功獲取 NSE 資料', v)
        vm.nseCount = v
      }, () => console.log('失敗了'))
    },
    minusNSE() {
      cordova.plugins.nse.badgeCountMinusOne(() => console.log('badgeCountMinusOne成功獲取 NSE 資料'), () => console.log('badgeCountMinusOne失敗了'))
    },
    clearNSE() {
      cordova.plugins.nse.badgeCountClear(() => console.log('badgeCountClear成功獲取 NSE 資料'), () => console.log('badgeCountClear失敗了'))
    },

```
