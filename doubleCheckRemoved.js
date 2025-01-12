const { githubToken } = require('./config.json');
const axios = require("axios");
const fs = require('fs').promises;

console.time("RunTime");

const filePath = "webhooks.json"

/**
 * Checks if a Discord webhook is valid.
 * @param {string} webhookUrl - The Discord webhook URL to check.
 * @returns {Promise<boolean>} - Returns true if the webhook is valid, false otherwise.
 */
async function isWebhookValid(webhookUrl) {
	try {
		const response = await axios.get(webhookUrl);
		return response.status === 200; // Valid webhook
	} catch {
		return false; // Invalid webhook
	}
}

async function main() {
	try {
		// Read and parse the JSON file
		const data = await fs.readFile(filePath, 'utf8');
		const webhooksJson = JSON.parse(data);

		// remove duplicates
		webhooksJson.hooks = [...new Set(webhooksJson.hooks)];

		const allWebhooks = [];

		// Combine all webhooks into a single array for processing
		if (Array.isArray(webhooksJson.hooks)) {
			allWebhooks.push(...webhooksJson.removed);
		}

		const validWebhooks = [];
		const invalidWebhooks = [];

		// Validate all webhooks
		for (const webhook of allWebhooks) {
			const isValid = await isWebhookValid(webhook);
			if (isValid) {
				validWebhooks.push(webhook);
			} else {
				invalidWebhooks.push(webhook);
			}
			console.log(`Waiting 1 sec before checking the next webhook`);
			await new Promise(resolve => setTimeout(resolve, 1_000));
		}

		// Append invalid webhooks to the existing removed array
		const existingRemoved = Array.isArray(webhooksJson.removed) ? webhooksJson.removed : [];
		const uniqueRemoved = [...new Set([...existingRemoved, ...invalidWebhooks])];

		// Update the JSON structure
		webhooksJson.hooks = [...new Set(validWebhooks)]; // Remaining valid webhooks go to `hooks`
		webhooksJson.removed = uniqueRemoved; // Store all unique invalid webhooks in `removed`
		webhooksJson.checked = [...new Set(validWebhooks)]; // Remaining valid webhooks go to `hooks`

		// Write the updated JSON back to the file
		await fs.writeFile(filePath, JSON.stringify(webhooksJson, null, "\t"));

		console.log('Webhooks validated and updated successfully.');
		console.log(`Valid webhooks:`, validWebhooks, `[${validWebhooks.length}]`);
		console.log(`Invalid webhooks:`, invalidWebhooks, `[${invalidWebhooks.length}]`);
	} catch (error) {
		console.error('Error validating and updating webhooks:', error.message);
	}
}

main().then(() => { console.timeEnd("RunTime"); });