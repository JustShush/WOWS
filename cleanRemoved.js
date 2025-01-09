const fs = require('fs').promises;

function isValidWebhook(url) {
	// Webhook URL validation constants
	const WEBHOOK_VALIDATION = {
		ID_LENGTH: 17,
		TOKEN_LENGTH: { MIN: 60, MAX: 80 }
	};
	try {
		const urlPath = new URL(url).pathname;
		const parts = urlPath.split('/');

		if (parts.length !== 5) return false;

		const [empty, api, webhooks, id, token] = parts;

		if (empty !== '' || api !== 'api' || webhooks !== 'webhooks') return false;

		if (!/^\d{17,19}$/.test(id)) return false;

		if (!/^[A-Za-z0-9_-]+$/.test(token)) return false;

		if (token.length < WEBHOOK_VALIDATION.TOKEN_LENGTH.MIN ||
			token.length > WEBHOOK_VALIDATION.TOKEN_LENGTH.MAX) return false;

		if (/^[X]+$/.test(token) ||
			/^[0-9]+$/.test(token) ||
			/^[a-zA-Z]+$/.test(token) ||
			/^[_-]+$/.test(token)) {
			return false;
		}

		return true;
	} catch (e) {
		return false;
	}
}

const getValidUniqueWebhooks = (array) => {
	return [...new Set(array.filter((url) => isValidWebhook(url)))];
};


async function main() {
	const filePath = "webhooks.json";
	// Read and parse the JSON file
	const data = await fs.readFile(filePath, 'utf8');
	const webhooksJson = JSON.parse(data);

	const validUniqueWebhooks = getValidUniqueWebhooks(webhooksJson.removed);

	console.log(validUniqueWebhooks);
	// Update the JSON structure
	webhooksJson.removed = validUniqueWebhooks; // Store all unique invalid webhooks in `removed`

	// Write the updated JSON back to the file
	await fs.writeFile(filePath, JSON.stringify(webhooksJson, null, "\t"));
}
main();