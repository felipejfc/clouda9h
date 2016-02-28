var http 	= require('http');
var uuid 	= require('node-uuid');
var ncp 	= require('ncp').ncp;
var fs 		= require('fs');
var crypto 	= require('crypto');

require('shelljs/global');

const PORT = 6000;
const ARM9LOADER_SOURCE_PATH = './arm9loaderhax';

var deleteFolderRecursive = function(path) {
	if(fs.existsSync(path)) {
		fs.readdirSync(path).forEach(function(file,index) {
			var curPath = path + "/" + file;
			if(fs.lstatSync(curPath).isDirectory())
				deleteFolderRecursive(curPath);
			else fs.unlinkSync(curPath);
		});
		fs.rmdirSync(path);
	}
}

var getShasums = function(path, installer, otp) {
	var algo = 'sha256';
	var shasum = crypto.createHash(algo);
	var installerSha = shasum.update(installer);
	shasum = crypto.createHash(algo);
	var otpSha = shasum.update(otp);
	return {
		installerSha: installerSha.digest('hex'),
		otpSha: otpSha.digest('hex')
	};
}

function handleRequest(req, res) {
	switch(req.url) {
		case '/':
			var exitWithErr = function(newPath) {
				res.writeHead(500);
				res.end("Something went wrong, come back later.");
				if(newPath)
					deleteFolderRecursive(newPath);
				return;
			}

			var exitWithNotValidOtp = function(newPath) {
				res.writeHead(422);
				res.end("You are trying to upload a file which isn't 256 bytes long, please check your otp.bin!");
				if(newPath)
					deleteFolderRecursive(newPath);
				return;
			}

			if(req.method == 'POST') {
				var newUuid = uuid.v4();
				var newPath = './'+newUuid;
				var totalSize = 0;
				var newPathCreated = false;
				try {
					ncp(ARM9LOADER_SOURCE_PATH, newPath, function(err) {
						if(err)
							return exitWithErr(null);
						else {
							newPathCreated = true;
							var f = fs.createWriteStream(newPath + '/data_input/otp.bin');
							req.on('data', function(chunk) {
								totalSize += chunk.length;
								if(totalSize > 256)
									return exitWithNotValidOtp(newPath);

								f.write(chunk);
							});

							req.on('end', function() {
								f.end();
								if(totalSize != 256)
									return exitWithNotValidOtp(newPath);
								
								f.on('close', function() {
									var oldDir = process.cwd();
									process.chdir(newPath);
									if(exec('make', { silent:true }).code !== 0) {
										process.chdir(oldDir);
										return exitWithErr(newPath);
									} else {
										process.chdir(oldDir);
										var installer = fs.readFileSync(newPath + '/data_output/arm9loaderhax.3dsx');
										var otp = fs.readFileSync(newPath + '/data_input/otp.bin');
										var shasums = getShasums(newPath, installer, otp);
										res.writeHead(200, "OK", {
											'Content-Type': 'binary',
											'Installer-Sha256': shasums.installerSha,
											'OTP-Sha256': shasums.otpSha,
											'Service-by': 'felipejfc'
										});
										res.end(installer);
										deleteFolderRecursive(newPath);
										return;
									}
								})
							})
						}
					})
				} catch(e) {
					return exitWithErr(newPathCreated ? newPath : null);
				}
			} else {
				res.writeHead(405, "Method not supported", {
					'Content-Type': 'text/plain'
				});
				res.end('Only POST requests are supported. Please refer to the instructions.');
				return;
			}
			break;
		default:
			res.writeHead(404);
			res.end('Not found.');
	}
}

var server = http.createServer(handleRequest);

server.listen(PORT, function() {
	console.log("Server listening on: http://127.0.0.1:%s", PORT);
});
