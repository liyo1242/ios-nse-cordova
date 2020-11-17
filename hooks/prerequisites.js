var child_process = require('child_process');
var Q = require('q');

module.exports = function (context) {
	var deferral = Q.defer();
	// 創建子進程進行 fs 操作
	child_process.exec('npm install', {cwd:__dirname},
		function (error) {
			if (error !== null) {
			  console.log('exec error: ' + error);
			  deferral.reject('npm installation failed');
			}
			deferral.resolve();
	});

  return deferral.promise;
};
