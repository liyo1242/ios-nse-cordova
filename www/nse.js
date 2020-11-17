var exec = require('cordova/exec');

var PLUGIN_NAME = "nse"
var NSE_BADGE_COUNT_MINUS_ONE = "badgeCountMinusOne"
var NSE_GET_BADGE_COUNT = "getBadgeCount"
var NSE_BADGE_COUNT_CLEAR = "badgeCountClear"
var NSE_SET_BADGE_COUNT = "setBadgeCount"

var nse = function () {}

nse.badgeCountMinusOne = function (onResultOK, onResultError) {
	exec(onResultOK, onResultError, PLUGIN_NAME, NSE_BADGE_COUNT_MINUS_ONE);
}

nse.getBadgeCount = function (onResultOK, onResultError) {
	exec(onResultOK, onResultError, PLUGIN_NAME, NSE_GET_BADGE_COUNT);
}

nse.badgeCountClear = function (onResultOK, onResultError) {
		exec(onResultOK, onResultError, PLUGIN_NAME, NSE_BADGE_COUNT_CLEAR);
}

nse.setBadgeCount = function (onResultOK, onResultError, countFromApp) {
	var safeCountFromApp = countFromApp
	// 判斷型態
	if (Object.prototype.toString.call(countFromApp) !== "[object Number]") {
		if (Object.prototype.toString.call(countFromApp) === "[object String]") {
			if (Number.isNaN(+countFromApp)) {
				return new Error("[nse plugin error] The string resolution is NaN.")
			}
			safeCountFromApp = +countFromApp
		} else {
			return new Error("[nse plugin error] Wrong type of badge.")
		}
	}
	// 判斷負數
	if (safeCountFromApp < 0) {
		return new Error("[nse plugin error] Negative badge is not accepted.")
	}
	// 	判斷浮點數
	if (safeCountFromApp%1 !== 0) {
		return new Error("[nse plugin error] Floating point badge is not accepted.")
	}
	
	exec(onResultOK, onResultError, PLUGIN_NAME, NSE_SET_BADGE_COUNT, [safeCountFromApp]);
}

module.exports = nse