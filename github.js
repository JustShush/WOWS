const { githubToken } = require('./config.json');
const axios = require("axios");
const fs = require('fs').promises;

// what you want to be searched
const query = "https://discord.com/api/webhooks/+";

const filePath = "webhooks.json";

function isValidWebhook(url) {
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

// try to implement a way to fetch from other pages using &page=2
async function githubSearch() {
	const url = `https://api.github.com/search/code?q=${query}&per_page=100&sort=indexed&order=desc&page=2`;

	var whArray = [];

	try {
		// Perform the initial search
		const res = await axios.get(url, {
			headers: {
				Authorization: `token ${githubToken}`
			}
		});

		const items = res.data.items;

		// If no items are found, exit early
		if (!items || items.length === 0) {
			console.log("No results found.");
			return;
		}

		// Read and parse the JSON file
		const preJson = await fs.readFile(filePath, 'utf8');
		const webhooksJson = JSON.parse(preJson);

		let invalidCount = 1;
		let i = 1;
		// Iterate over each item to fetch file content
		for (const item of items) {
			const fileUrl = item.url; // URL to fetch the file content

			try {
				const fileRes = await axios.get(fileUrl, {
					headers: {
						Authorization: `token ${githubToken}`
					}
				});

				const fileContent = Buffer.from(fileRes.data.content, 'base64').toString('utf-8');
				const webhookRegex = /(?:https?:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+)/g;

				const matches = fileContent.match(webhookRegex);
				if (matches) {
					matches.forEach((webhook) => {
						if (!isValidWebhook(webhook)) return invalidCount++;
						// Skip the link if it's already tested
						if (webhooksJson.removed.includes(webhook) || webhooksJson.hooks.includes(webhook)) {
							console.log(`Already tested link: ${webhook}`);
							return;
						} else {
							console.log(`Found webhook in file: ${item.html_url}`);
							console.log(`[${i}] Webhook: ${webhook}`);
							whArray.push(`${webhook}`);
							i++;
						}
					})
				}
			} catch (fileErr) {
				console.error(`Error fetching file content for ${item.html_url}:`, fileErr.response?.data || fileErr.message);
			}
		}

		console.log(`Invalid links found: ${invalidCount}`);

		// Update the JSON structure
		webhooksJson.hooks = [...webhooksJson.hooks, ...whArray];
	
		// Write the updated JSON back to the file
		await fs.writeFile(filePath, JSON.stringify(webhooksJson, null, "\t"));

	} catch (err) {
		console.error('Error during GitHub search:', err.response?.data || err.message);
	}
}

githubSearch();
