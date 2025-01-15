const fs = require('fs').promises;
const { Client } = require('discord.js');

const tokensFile = './tokens.json'; // Replace with your JSON file path

let tokens = [];
// Function to check if a token is valid
const checkToken = async (token) => {
	const client = new Client({ intents: [] }); // No intents needed for a simple check

	try {
		await client.login(token);
		console.log(`Token is valid: ${token}`);
		client.destroy(); // Destroy the client after logging in
		return true;
	} catch (error) {
		console.error(`Invalid token: ${token}`);
		return false;
	}
};


// Main function to validate tokens and update the JSON file
async function main() {
	try {
		// Read and parse the JSON file
		const preJson = await fs.readFile(tokensFile, 'utf8');
		const tokensJson = JSON.parse(preJson);

		if (!Array.isArray(tokensJson.valid) || !Array.isArray(tokensJson.invalid)) {
			console.error('Tokens file must contain an array of tokens.');
			process.exit(1);
		}

		const validTokens = [];
		const invalidTokens = [];

		for (const token of tokensJson.valid) {
			const isValid = await checkToken(token);
			await new Promise(resolve => setTimeout(resolve, 500));
			if (isValid)
				validTokens.push(token);
			else
				invalidTokens.push(token);
		}

		console.log(`valid: ${validTokens}`, `invalid: ${invalidTokens}`)

		tokensJson.valid = [...new Set([...validTokens])];
		tokensJson.invalid = [...new Set([...tokensJson.invalid, ...invalidTokens])];

		console.log(tokensJson)
		// Write only valid tokens back to the JSON file
		try {
			await fs.writeFile(tokensFile, JSON.stringify(tokensJson, null, '\t'));
			console.log('Invalid tokens removed. Updated tokens file.');
		} catch (err) {
			console.error('Error writing to tokens file:', err);
		}
	} catch (err) {
		console.log(err);
	}
}

main();