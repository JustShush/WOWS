const fs = require('fs').promises;
const axios = require('axios');

console.time("RunTime");

/**
 * Checks if a Discord webhook is valid.
 * @param {string} webhookUrl - The Discord webhook URL to check.
 * @returns {Promise<boolean>} - Returns true if the webhook is valid, false otherwise.
 */
async function isWebhookValid(webhookUrl, retries = 3) {
	try {
		const response = await axios.get(webhookUrl);
		return response.status === 200;
	} catch (err) {
		if (retries > 0 && err.response?.status === 429) { // Too many requests
			console.log(`Rate limited. Retrying in ${3 ** (4 - retries)} seconds...`);
			await new Promise((resolve) => setTimeout(resolve, 3 ** (4 - retries) * 1000));
			return isWebhookValid(webhookUrl, retries - 1);
		}
		return false;
	}
}

/**
 * Validates Discord webhooks from a custom JSON structure.
 * Separates valid and invalid webhooks and updates the file.
 * @param {string} filePath - Path to the JSON file containing the webhooks.
 */
async function validateAndUpdateWebhooks(filePath) {
	try {
		// Read and parse the JSON file
		const data = await fs.readFile(filePath, 'utf8');
		const webhooksJson = JSON.parse(data);

		// remove duplicates
		webhooksJson.hooks = [...new Set(webhooksJson.hooks)];

		const allWebhooks = [];

		// Combine all webhooks into a single array for processing
		if (Array.isArray(webhooksJson.hooks)) {
			allWebhooks.push(...webhooksJson.hooks);
		}

		const validWebhooks = [];
		const invalidWebhooks = [];

		// Validate all webhooks
		for (webhook of allWebhooks) {
			if (webhooksJson.removed.includes(webhook)) {
				console.log(`Already tested link: ${webhook}`);
				continue;
			} else {
				const isValid = await isWebhookValid(webhook);
				//console.log(`Checking: ${webhook}`);
				if (isValid) {
					validWebhooks.push(webhook);
				} else {
					console.log(`${webhook} invalid`);
					invalidWebhooks.push(webhook);
				}
				await new Promise(resolve => setTimeout(resolve, 500));
			}
		}

		// Append invalid webhooks to the existing removed array
		const existingRemoved = Array.isArray(webhooksJson.removed) ? webhooksJson.removed : [];
		console.log(invalidWebhooks);

		// Update the JSON structure
		webhooksJson.hooks = [...new Set(validWebhooks)]; // Remaining valid webhooks go to `hooks`
		webhooksJson.removed = [...new Set([...existingRemoved, ...invalidWebhooks])]; // Store all unique invalid webhooks in `removed`

		// Write the updated JSON back to the file
		await fs.writeFile(filePath, JSON.stringify(webhooksJson, null, "\t"));

		console.log('Webhooks validated and updated successfully.');
		console.log(`Valid webhooks:`, validWebhooks, `[${validWebhooks.length}]`);
		console.log(`Invalid webhooks:`, invalidWebhooks, `[${invalidWebhooks.length}]`);
	} catch (error) {
		console.error('Error validating and updating webhooks:', error.message);
	}
}

// Example usage
(async () => {
	const filePath = './webhooks.json'; // Path to your JSON file
	await validateAndUpdateWebhooks(filePath).then(() => { console.timeEnd("RunTime"); });
})();
