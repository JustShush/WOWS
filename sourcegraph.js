const axios = require('axios');
const fs = require('fs').promises;

const filePath = "webhooks.json";

async function fetchDiscordWebhooks() {
	const whArray = [];
	// Read and parse the JSON file
	const preJson = await fs.readFile(filePath, 'utf8');
	const webhooksJson = JSON.parse(preJson);
	try {
		// Send GET request to the API endpoint
		const response = await axios.get('https://sourcegraph.com/.api/search/stream?q=https://discord.com/api/webhooks/', {
			responseType: 'stream',
		});

		let buffer = '';

		response.data.on('data', (chunk) => {
			buffer += chunk.toString();

			// Process buffer for Discord webhook links
			const regex = /https:\/\/discord\.com\/api\/webhooks\/[\d]+\/[\w-]+/g;
			let match;
			while ((match = regex.exec(buffer)) !== null) {
				if (webhooksJson.removed.includes(match[0]) || webhooksJson.hooks.includes(match[0])) {
					console.log(`Already tested link: ${match[0]}`);
					return;
				} else {
					whArray.push(`${match[0]}`);
					console.log(match[0]); // Print each match to the console
				}
			}

			// Clear processed buffer
			buffer = buffer.slice(buffer.lastIndexOf('\n') + 1);
		});

		response.data.on('end', async () => {
			// Update the JSON structure
			webhooksJson.hooks = [...webhooksJson.hooks, ...whArray];

			// Write the updated JSON back to the file
			await fs.writeFile(filePath, JSON.stringify(webhooksJson, null, "\t"));
			console.log('Stream ended.');
		});
	} catch (error) {
		console.error('Error fetching webhooks:', error);
	}
}

fetchDiscordWebhooks();