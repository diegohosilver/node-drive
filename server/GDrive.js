// Google drive setup
const fs = require("fs");
const readline = require("readline");
const request = require("request");
const { google } = require("googleapis");
const { GResumableUpload } = require("./GDriveResumableUpload.js");
const SCOPES = ["https://www.googleapis.com/auth/drive"];
const TOKEN_PATH = "token.json";
const CREDENTIALS_PATH = "credentials.json";

class GDrive {

	/**
	 * Asserts google drive access and then triggers the given callback
	 * @param {function} callback
	 */
	static assertAccess(callback) {
		
		// Load client secrets from a local file
		fs.readFile(CREDENTIALS_PATH, (err, content) => {

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

			let parsedToken = JSON.parse(token);

			// Check if token is expired
			if (parsedToken.expiry_date < Math.floor(Date.now() / 1000)) {

				return GDrive.refreshToken(credentials.installed, parsedToken, (refreshedToken) => {

					oAuth2Client.setCredentials(refreshedToken);

					callback(oAuth2Client);
				});
			}

			oAuth2Client.setCredentials(parsedToken);

			callback(oAuth2Client);
		});
	}

	/**
	 * Manually get a new access_token, write it to local file and then return new oAuth2Client
	 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
	 * @param {Object} credentials 
	 * @param {Object} parsedToken 
	 * @param {function} callback 
	 */
	static refreshToken(credentials, parsedToken, callback) {

		let options = {
			url: 'https://oauth2.googleapis.com/token',
			body: JSON.stringify({
				client_id: credentials.client_id,
				client_secret: credentials.client_secret,
				grant_type: 'refresh_token',
				refresh_token: parsedToken.refresh_token
			})
		}

		// Get new access_token
		request.post(options, (err, res) => {

			if (err)
				return callback('Could not refresh token');
			
			let body = JSON.parse(res.body)

			parsedToken.access_token = body.access_token;

			let today = new Date();
			parsedToken.expiry_date = Math.round(today.setHours(today.getHours() + 1)/1000); // token expires in one hour

			// Update token on file
			fs.writeFile(TOKEN_PATH, JSON.stringify(parsedToken), err => {

				if (err) return console.error(err);

				console.log("Token stored to", TOKEN_PATH);
			});

			callback(parsedToken);
		});
	}

	/**
	 * Get and store new token after prompting for user authorization, and then
	 * execute the given callback with the authorized OAuth2 client.
	 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
	 * @param {function} callback The callback for the authorized client.
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
	 * Lists the names and IDs of up to 50 files.
	 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
	 * @param {function} callback Callback of the operation.
	 */
	static listFiles(auth, callback) {

		const drive = google.drive({ version: "v3", auth });
		
		GDrive.list(drive, `mimeType != 'application/vnd.google-apps.folder'`, callback);
	}

	/**
	 * Lists the names and IDs of up to 50 folders.
	 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
	 * @param {function} callback Callback of the operation.
	 */
	static listFolders(auth, callback) {
		
		const drive = google.drive({ version: "v3", auth });
		
		GDrive.list(drive, `mimeType = 'application/vnd.google-apps.folder'`, callback);
	}

	/**
	 * Performs list operation.
	 * @param {google.drive} drive Drive object.
	 * @param {function} callback Callback of the operation.
	 */
	static list(drive, q, callback) {

		drive.files.list(
			{
				q,
				pageSize: 50,
				fields: "nextPageToken, files(id, name)"
			},
			callback
		);
	}

	/**
	 * Uploads a single file with size of less than 5MB
	 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
	 * @param {File} file A file to be uploaded.
	 * @param {function} callback Callback of the operation.
	 */
	static simpleUpload(auth, parentId, file, callback) {

		let resource = {
			name: file.name
		};

		if (parentId) {
			resource['parents'] = [parentId];
		}

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

	/**
	 * Uploads a single file using a resumable session
	 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
	 * @param {File} file A file to be uploaded.
	 * @param {function} callback Callback of the operation.
	 */
	static resumableUpload(auth, parentId, file, callback) {

		let resumable = new GResumableUpload();
		
		resumable.tokens = auth.credentials;
		resumable.filepath = file.path;
		resumable.fileSize = file.size;
		resumable.mimeType = file.type;
		resumable.metadata = {
			name: file.name,
		};

		if (parentId) {
			resumable.metadata['parents'] = [parentId];
		}

		resumable.retry = 3;

		resumable.on('progress', function (progress) {
			console.log(progress);
		});
		resumable.on('success', function (success) {
			callback(null, success)
		});
		resumable.on('error', function (error) {
			console.log(error);
			callback(error)
		});

		resumable.upload();
	}

	/**
	 * Creates a folder within the drive
	 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
	 * @param {String} name Name of the folder 
	 * @param {function} callback Callback of the operation.
	 */
	static createFolder(auth, name, callback) {

		let metadata = {
			name,
			mimeType: 'application/vnd.google-apps.folder'
		};

		const drive = google.drive({ version: "v3", auth });

		drive.files.create({
			resource: metadata,
			fields: 'id'
		}, callback);
	}
}

exports.GDrive = GDrive;
