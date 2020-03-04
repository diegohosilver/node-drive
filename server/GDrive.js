// Google drive setup
const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/drive"];
const TOKEN_PATH = "token.json";

class GDrive {

	/**
	 * Asserts google drive access and then triggers the given callback
	 * @param {function} callback
	 */
	static assertAccess(callback) {
		
		// Load client secrets from a local file
		fs.readFile("credentials.json", (err, content) => {

			if (err)
				return console.log("Error loading client secret file:", err);

			// Authorize a client with credentials, then call the Google Drive API.
			GDrive.authorize(JSON.parse(content), callback);
		});
	}

	/**
	 * Create an OAuth2 client with the given credentials, and then execute the
	 * given callback function.
	 * @param {Object} credentials The authorization client credentials.
	 * @param {function} callback The callback to call with the authorized client.
	 */
	static authorize(credentials, callback) {

		const {
			client_secret,
			client_id,
			redirect_uris
		} = credentials.installed;

		const oAuth2Client = new google.auth.OAuth2(
			client_id,
			client_secret,
			redirect_uris[0]
		);

		// Check if we have previously stored a token.
		fs.readFile(TOKEN_PATH, (err, token) => {

			if (err) return GDrive.getAccessToken(oAuth2Client, callback);

			oAuth2Client.setCredentials(JSON.parse(token));

			callback(oAuth2Client);
		});
	}

	/**
	 * Get and store new token after prompting for user authorization, and then
	 * execute the given callback with the authorized OAuth2 client.
	 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
	 * @param {getEventsCallback} callback The callback for the authorized client.
	 */
	static getAccessToken(oAuth2Client, callback) {

		const authUrl = oAuth2Client.generateAuthUrl({
			access_type: "offline",
			scope: SCOPES
		});

		console.log("Authorize this app by visiting this url:", authUrl);

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		rl.question("Enter the code from that page here: ", code => {

			rl.close();

			oAuth2Client.getToken(code, (err, token) => {

				if (err)
					return console.error("Error retrieving access token", err);

				oAuth2Client.setCredentials(token);

				// Store the token to disk for later program executions
				fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {

					if (err) return console.error(err);

					console.log("Token stored to", TOKEN_PATH);
				});

				callback(oAuth2Client);
			});
		});
	}

	/**
	 * Lists the names and IDs of up to 10 files.
	 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
	 * @param {function} callback Callback of the operation.
	 */
	static listFiles(auth, callback) {

		const drive = google.drive({ version: "v3", auth });
		
		drive.files.list(
			{
				pageSize: 10,
				fields: "nextPageToken, files(id, name)"
			},
			callback
		);
	}

	/**
	 * Uploads a single file with size of less than 5MB
	 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
	 * @param {function} callback Callback of the operation.
	 */
	static simpleUpload(auth, file, callback) {

		let resource = {
			name: file.name,
		};

		let media = {
			mimeType: file.type,
			body: fs.createReadStream(file.path)
		};

		const drive = google.drive({ version: "v3", auth });

		drive.files.create({
			resource,
			media,
			fields: 'id'
		}, 
		callback);
	}
}

exports.GDrive = GDrive;
