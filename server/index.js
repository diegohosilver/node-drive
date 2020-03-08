// Api setup
const express = require("express");
const app = express();
const formidable = require("formidable");
const url = require('url');
const bodyParser = require('body-parser');
const port = 3000;

// Google drive middleware
const { GDrive } = require('./GDrive.js');

// Allow node to serve static files from public directory
app.use(express.static("public"));
// Middleware to parse body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());

// Api endpoints
app.get("/list-files", (req, res) => {

	GDrive.assertAccess(oAuth2Client => {

		// Fetch 50 files from drive
		GDrive.listFiles(oAuth2Client, (err, gRes) => {

			if (err) {
				return res.status(400).send({code: 'Error', message: `The API returned an error: ${err}`});
			}

			let files = gRes.data.files;

			res.send(files);
		});
	});
});

app.get("/list-folders", (req, res) => {

	GDrive.assertAccess(oAuth2Client => {

		// Fetch 50 folders from drive
		GDrive.listFolders(oAuth2Client, (err, gRes) => {

			if (err) {
				return res.status(400).send({code: 'Error', message: `The API returned an error: ${err}`});
			}

			let files = gRes.data.files;

			res.send(files);
		});
	});
});

app.post("/upload-files", (req, res) => {

	new formidable.IncomingForm().parse(req, (err, fields, files) => {

		if (err) {

			console.error('Error file', err);
			return res.status(400).send({code: 'Error', message: 'An error ocurred when parsing file'});
		}

		GDrive.assertAccess(oAuth2Client => {

			for (const file of Object.entries(files)) {

				const queryObject = url.parse(req.url,true).query;

				if (queryObject.uploadType && queryObject.uploadType == 'resumable') {

					GDrive.resumableUpload(oAuth2Client, fields.folderId, file[1], (err, file) => {

						if (err) {
							return res.status(400).send({code: 'Error', message: `The API returned an error: ${err}`});
						}

						res.send({fileId: file.id});
					});
				}
				else {

					// The entry is an array of tuples 'key - value'
					GDrive.simpleUpload(oAuth2Client, fields.folderId, file[1], (err, file) => {

						if (err) {
							return res.status(400).send({code: 'Error', message: `The API returned an error: ${err}`});
						}

						res.send({fileId: file.id});
					});
				}
			}
		})
	});
});

app.post("/create-folder", (req, res) => {

	let body = req.body;

	GDrive.assertAccess(oAuth2Client => {

		GDrive.createFolder(oAuth2Client, body.name, (err, gRes) => {

			if (err) {
				return res.status(400).send({code: 'Error', message: `The API returned an error: ${err}`});
			}

			res.send(gRes.data);
		});
	});
});

app.listen(port, () => console.log(`Node drive listening on port ${port}!`));
