import Foundation
import NotificationCenter
import AVFoundation

// 包裝 swift 為 obj-c 格式
// 實作以下功能: ( 暴露層 )
// 1. 推播計數 －１
// 2. 取得推播計數
// 3. 清空推播計數
// 4. 設定計數

@objc(nse)
class nse : CDVPlugin {
    // 1. 推播計數 －１
    @objc(badgeCountMinusOne:) func badgeCountMinusOne (command: CDVInvokedUrlCommand) {
       NSLog("NSE#badgeCountMinusOne()")
        do {
            if let userDefaults = UserDefaults(suiteName: "YOUR_APPGROUP_INDENTIFY") {
                if let count: Int = userDefaults.integer(forKey: "count") {
                    var nextCount = count - 1
                    if (nextCount < 0) {
                        nextCount = 0
                    }
                    UIApplication.shared.applicationIconBadgeNumber = nextCount
                    try userDefaults.set(nextCount, forKey: "count")
                    userDefaults.synchronize()
                    self.commandDelegate!.send(CDVPluginResult (status: CDVCommandStatus_OK, messageAs: "Badge Count success minus one, great!"), callbackId: command.callbackId)
                } else {
                    try userDefaults.set(0, forKey: "count")
                    userDefaults.synchronize()
                    self.commandDelegate!.send(CDVPluginResult (status: CDVCommandStatus_OK, messageAs: "Badge Count Not Exist, so we make one for you"), callbackId: command.callbackId)
                }
            } else {
                self.commandDelegate!.send(CDVPluginResult (status: CDVCommandStatus_ERROR, messageAs: "Your group id does not match the settings of this plug-in. 'YOUR_APPGROUP_INDENTIFY' "), callbackId: command.callbackId)
            }
        } catch {
           self.commandDelegate!.send(CDVPluginResult (status: CDVCommandStatus_ERROR, messageAs: "Plugin #badgeCountMinusOne Failed"), callbackId: command.callbackId)
           fatalError(error.localizedDescription)
        }
    }
    // 2. 取得推播計數
    @objc(getBadgeCount:) func getBadgeCount (command: CDVInvokedUrlCommand) {
        // 日誌輸出
       NSLog("NSE#getBadgeCount()")

       do {
            if let userDefaults = UserDefaults(suiteName: "YOUR_APPGROUP_INDENTIFY") {
                if let count: Int = userDefaults.integer(forKey: "count") {
                    self.commandDelegate!.send(CDVPluginResult (status: CDVCommandStatus_OK, messageAs: count), callbackId: command.callbackId)
                } else {
                    try userDefaults.set(0, forKey: "count")
                    userDefaults.synchronize()
                    self.commandDelegate!.send(CDVPluginResult (status: CDVCommandStatus_OK, messageAs: 0), callbackId: command.callbackId)
                }
            } else {
                self.commandDelegate!.send(CDVPluginResult (status: CDVCommandStatus_ERROR, messageAs: "Your group id does not match the settings of this plug-in. 'YOUR_APPGROUP_INDENTIFY' "), callbackId: command.callbackId)
            }
        } catch {
           self.commandDelegate!.send(CDVPluginResult (status: CDVCommandStatus_ERROR, messageAs: "Plugin #getBadgeCount Failed"), callbackId: command.callbackId)
           fatalError(error.localizedDescription)
        }
    }
    // 3. 清空推播計數
    @objc(badgeCountClear:) func badgeCountClear (command: CDVInvokedUrlCommand) {
        NSLog("NSE#badgeCountClear()")
        do {
            if let userDefaults = UserDefaults(suiteName: "YOUR_APPGROUP_INDENTIFY") {
                if let count: Int = userDefaults.integer(forKey: "count") {
                    UIApplication.shared.applicationIconBadgeNumber = 0
                    try userDefaults.set(0, forKey: "count")
                    userDefaults.synchronize()
                    self.commandDelegate!.send(CDVPluginResult (status: CDVCommandStatus_OK, messageAs: "Badge Count success clear, great!"), callbackId: command.callbackId)
                } else {
                    try userDefaults.set(0, forKey: "count")
                    userDefaults.synchronize()
                    self.commandDelegate!.send(CDVPluginResult (status: CDVCommandStatus_OK, messageAs: "Badge Count Not Exist, so we make one for you"), callbackId: command.callbackId)
                }
            } else {
                self.commandDelegate!.send(CDVPluginResult (status: CDVCommandStatus_ERROR, messageAs: "Your group id does not match the settings of this plug-in. 'YOUR_APPGROUP_INDENTIFY' "), callbackId: command.callbackId)
            }
        } catch {
           self.commandDelegate!.send(CDVPluginResult (status: CDVCommandStatus_ERROR, messageAs: "Plugin #badgeCountClear Failed"), callbackId: command.callbackId)
           fatalError(error.localizedDescription)
        }
    }
    // 4. 設定計數
    @objc(setBadgeCount:) func setBadgeCount (command: CDVInvokedUrlCommand) {
       let countNumber = command.argument(at: 0) as! Int
       NSLog("NSE#setBadgeCount()")
        do {
            if let userDefaults = UserDefaults(suiteName: "YOUR_APPGROUP_INDENTIFY") {
                if let count: Int = userDefaults.integer(forKey: "count") {
                    UIApplication.shared.applicationIconBadgeNumber = countNumber
                    userDefaults.set(countNumber, forKey: "count")
                    userDefaults.synchronize()
                    self.commandDelegate!.send(CDVPluginResult (status: CDVCommandStatus_OK, messageAs: "Badge Count success set, great!"), callbackId: command.callbackId)
                } else {
                    userDefaults.set(countNumber, forKey: "count")
                    userDefaults.synchronize()
                    self.commandDelegate!.send(CDVPluginResult (status: CDVCommandStatus_OK, messageAs: "Badge Count Not Exist, so we make one for you"), callbackId: command.callbackId)
                }
            } else {
                self.commandDelegate!.send(CDVPluginResult (status: CDVCommandStatus_ERROR, messageAs: "Your group id does not match the settings of this plug-in. 'YOUR_APPGROUP_INDENTIFY' "), callbackId: command.callbackId)
            }
        } catch {
           self.commandDelegate!.send(CDVPluginResult (status: CDVCommandStatus_ERROR, messageAs: "Plugin #setBadgeCount Failed"), callbackId: command.callbackId)
           fatalError(error.localizedDescription)
        }
    }
}
