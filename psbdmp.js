const axios = require('axios');
const fs = require('fs').promises;

// https://psbdmp.ws/api

// const url = "https://psbdmp.ws/api/v3/today";
//const url = "https://psbdmp.ws/api/v3/latest";
const url = "https://psbdmp.ws/api/v3/search/webhooks"
const filePath = "webhooks.json";

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

var whArray = [];
async function main() {

	// Read and parse the JSON file
	const preJson = await fs.readFile(filePath, 'utf8');
	const webhooksJson = JSON.parse(preJson);

	const webhookRegex = /(?:https?:\/\/(?:discord\.com|discordapp\.com|canary\.discord\.com|canary\.discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+)/g;
	const res = await axios.get(url).catch((err) => { console.error(err.message.data); });
	//console.log(res.data);
	//console.log(res.data.data[0].id);
	//console.log(res.data)
	let i = 0;
	for (data of res.data) {
		const response = await axios.get(`https://psbdmp.ws/api/v3/dump/${data.id}`).catch((err) => { console.error(err.message.data); });
		//console.log(response.data.content);
		const matches = response.data.content.match(webhookRegex);
		if (matches) {
			matches.forEach(webhook => {
				if (!isValidWebhook(webhook)) return;
				// Skip the link if it's already tested
				if (webhooksJson.removed.includes(webhook) || webhooksJson.hooks.includes(webhook)) {
					console.log(`Already tested link: ${webhook}`);
					return;
				} else {
					whArray.push(`${webhook}`);
					i++;
					console.log(`[${i}] Found one: ${webhook}`);
				}
			});
		}
	}

	// Update the JSON structure
	webhooksJson.hooks = [...webhooksJson.hooks, ...whArray];

	webhooksJson.hooks = [...new Set(webhooksJson.hooks)];

	// Write the updated JSON back to the file
	await fs.writeFile(filePath, JSON.stringify(webhooksJson, null, "\t"));
}

main();