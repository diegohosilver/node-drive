const fs = require("fs");
const request = require("request");
const EventEmitter = require("events").EventEmitter;
const util = require("util");

class GResumableUpload {

	constructor() {
		this.byteCount = 0;
		this.tokens = {};
		this.filepath = "";
		this.mimeType = "";
		this.fileSize = 0;
		this.metadata = {};
		this.query = "";
		this.retry = -1;
		this.host = "www.googleapis.com";
		this.api = "/upload/drive/v3/files";
	}

	/**
	 * Init the upload by POSTing google for an upload URL (saved to self.location)
	 */
	upload() {

		let self = this;

		let options = {
			url: `https://${self.host}${self.api}?uploadType=resumable${self.query}`,
			headers: {
				'Host': self.host,
				'Authorization': `Bearer ${self.tokens.access_token}`,
				'Content-Length': Buffer.from(JSON.stringify(self.metadata)).length,
				'Content-Type': 'application/json; charset=UTF-8',
				'X-Upload-Content-Length': fs.statSync(self.filepath).size,
				'X-Upload-Content-Type': self.mimeType
			},
			body: JSON.stringify(self.metadata)
		};
	
		//Send request and start upload if success
		request.post(options, (err, res) => {
	
			if (err || !res.headers.location) {
	
				self.emit("error", new Error(err));
	
				self.emit("progress", "Retrying ...");
	
				if (self.retry > 0 || self.retry <= -1) {
	
					self.retry --;
	
					// Retry
					self.upload();
				} else {
	
					return;
				}
			}
	
			self.location = res.headers.location;

			console.log('Resumable upload session started');
	
			self.send();
		});
	}

	send() {

		let self = this;
		let options = {
			url: self.location, //self.location becomes the Google-provided URL to PUT to
			headers: {
				'Authorization': `Bearer ${self.tokens.access_token}`,
				'Content-Length': fs.statSync(self.filepath).size - self.byteCount,
				'Content-Type': self.mimeType
			}
		};
		let uploadPipe = null;

		try {
			//creates file stream, pipes it to self.location
			uploadPipe = fs.createReadStream(self.filepath, {
				start: self.byteCount,
				end: fs.statSync(self.filepath).size
			});
		} catch (e) {

			self.emit("error", new Error(e));

			return;
		}

		let health = setInterval(() => {

			self.getProgress((err, res, body) => {

				if (!err && typeof res.headers.range !== "undefined") {

					self.emit("progress", `${res.headers.range.substring(8)} range being processed`);
				}
			});
		}, 5000);

		uploadPipe.pipe(

			request.put(options, (error, response, body) => {

				clearInterval(health);

				if (!error) {
					self.emit("success", body);
					return;
				}

				self.emit("error", new Error(error));

				if (self.retry > 0 || self.retry <= -1) {

					self.retry--;

					self.getProgress((err, res, b) => {

						if (typeof res.headers.range !== "undefined") {

							self.byteCount = res.headers.range.substring(8); //parse response
						} else {

							self.byteCount = 0;
						}

						self.send();
					});
				}
			})
		);
	}

	/**
	 * Pipes uploadPipe to self.location (Google's Location header)
	 * @param {function} handler 
	 */
	getProgress(handler) {

		let self = this;

		let options = {
			url: self.location,
			headers: {
				Authorization: `Bearer ${self.tokens.access_token}`,
				"Content-Length": 0,
				"Content-Range": `bytes */${fs.statSync(self.filepath).size}`
			}
		};

		request.put(options, handler);
	}
}

util.inherits(GResumableUpload, EventEmitter);

exports.GResumableUpload = GResumableUpload;