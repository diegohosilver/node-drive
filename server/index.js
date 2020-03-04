// Api setup
const express = require("express");
const app = express();
const port = 3000;

// Google drive middleware
const { GDrive } = require('./GDrive.js');

// Allow node to serve static files from public directory
app.use(express.static("public"));

app.get("/list-files", (req, res) => {

	GDrive.assertAccess(oAuth2Client => {

		// Fetch 10 files from drive
		GDrive.listFiles(oAuth2Client, (err, gRes) => {

			if (err) {
				return res.status(400).send({code: 'Error', message: `The API returned an error: ${err}`});
			}

			let files = gRes.data.files;

			res.send(files.map(x => {
				return {
					id: x.id,
					name: x.name
				}
			 }));
		});
	});
});

app.listen(port, () => console.log(`Node drive listening on port ${port}!`));
