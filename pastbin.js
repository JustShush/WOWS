const axios = require("axios");
const fs = require("fs");

// Function to generate a random 8-character Pastebin ID
function generateRandomPastebinID() {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let result = "";
	for (let i = 0; i < 8; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// Function to add a delay (in milliseconds)
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to safely load JSON files or return an empty array
function safeLoadJSON(filePath) {
	if (fs.existsSync(filePath)) {
		try {
			const data = fs.readFileSync(filePath, "utf8");
			return JSON.parse(data) || [];
		} catch (error) {
			console.error(`Error reading JSON from ${filePath}:`, error.message);
			return [];
		}
	}
	return [];
}

// Set to store tested and working links
const testedLinks = new Set(safeLoadJSON("tested_links.json"));
const workingLinks = new Set(safeLoadJSON("working_links.json"));

// Save tested links to a file
function saveTestedLinks() {
	fs.writeFileSync("tested_links.json", JSON.stringify([...testedLinks], null, '\t'), "utf8");
}

// Save working links to a file
function saveWorkingLinks() {
	fs.writeFileSync("working_links.json", JSON.stringify([...workingLinks], null, '\t'), "utf8");
}

const somethingWentWrong = [];
// Function to fetch a random Pastebin link
async function checkPastebinLink(requestNumber) {
	while (true) {
		const randomID = generateRandomPastebinID();
		const url = `https://pastebin.com/raw/${randomID}`;

		// Skip the link if it's already tested
		if (require('./tested_links.json').includes(url)) {
			console.log(`[${requestNumber}] Already tested link, generating a new one: ${url}`);
			continue; // Generate a new link
		}

		try {
			//console.log(`[${requestNumber}] Trying URL: ${url}`);
			await axios.get(url);

			// If the response is successful, we found a valid Pastebin link
			console.log(`[${requestNumber}] Found one: ${url}`);
			workingLinks.add(url);
			saveWorkingLinks(); // Save the updated set to the file
		} catch (error) {
			if (error.response?.status === 403) {
				console.log(`[${requestNumber}] Had to stop cuz of staus 403.`, error.message);
				process.exit();
			}
			if (error.response?.status === 404) {
				// Pastebin returned 404 - the link doesn't exist
				console.log(`[${requestNumber}] Skipped this link (404): ${url}`);
			} else {
				// Log any other errors
				console.error(`[${requestNumber}] Error with link ${url}:`, error.message);
				somethingWentWrong.push(`${url}`);
			}
		} finally {
			// Mark the link as tested
			testedLinks.add(url);
			saveTestedLinks(); // Save the updated set to the file
			break; // Exit the loop once a unique link has been tested
		}
	}
}

// Main function to search 10 random Pastebin links
async function searchPastebinLinks() {
	console.time("RunTime");
	for (let i = 1; i <= 1000; i++) {
		await checkPastebinLink(i);
		await sleep(1000); // Add a 2-second delay between requests
	}
	if (somethingWentWrong.length >= 1)
		console.log("something went wrong array:", somethingWentWrong);
}

searchPastebinLinks().then(() => {
	console.timeEnd("RunTime");
});
