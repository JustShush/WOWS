const { githubToken } = require('./config.json');
const axios = require("axios");
const fs = require('fs').promises;
console.time("RunTime");

// what you want to be searched
const query = "https://discord.com/api/webhooks/";

// where you want to search them
// possibilities: code | repositories
const where = "code";

// the page to search on github
// minimum is 1
const pageNumber = "1";

const filePath = "gwebhooks.json";

/**
 * Checks if a Discord webhook is valid.
 * @param {string} webhookUrl - The Discord webhook URL to check.
 * @returns {Promise<boolean>} - Returns true if the webhook is valid, false otherwise.
 */
async function whChecker(webhookUrl) {
	try {
		const response = await axios.get(webhookUrl);
		return response.status === 200; // Valid webhook
	} catch {
		return false; // Invalid webhook
	}
}

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

function removeDuplicates(array) {
	// Use a Map to store unique objects by their webhook
	const uniqueObjects = new Map();
	array.forEach((obj) => {
		if (!uniqueObjects.has(obj.webhook)) {
			uniqueObjects.set(obj.webhook, obj);
		}
	});
	return Array.from(uniqueObjects.values());
}

// try to implement a way to fetch from other pages using &page=2
async function githubSearch() {
	const url = `https://api.github.com/search/${where}?q=${query}&per_page=100&sort=updated&order=desc&page=${pageNumber}`;

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

		// Read and parse the JSON file
		const whPreJson = await fs.readFile("webhooks.json", 'utf8');
		const whsJson = JSON.parse(whPreJson);

		let invalidCount = 0;
		let i = 0;
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
						if (whsJson.removed.includes(webhook)) {
							console.log(`Already tested link: ${webhook}`);
							return;
						} else {
							console.log(`Found webhook in file: ${item.html_url}`);
							i++;
							console.log(`[${i}] Webhook: ${webhook}`);
							const data = {
								path: item.path,
								name: item.name,
								html_url: item.html_url,
								webhook: webhook
							};
							whArray.push(data);
						}
					})
				}
			} catch (fileErr) {
				console.error(`Error fetching file content for ${item.html_url}:`, fileErr.response?.data || fileErr.message);
			}
		}

		console.log(`Invalid links found: ${invalidCount}`);

		// Update the JSON structure
		webhooksJson.gwh = [...webhooksJson.gwh, ...whArray];

		webhooksJson.gwh = removeDuplicates(webhooksJson.gwh);

		webhooksJson.gwh = (await Promise.all(webhooksJson.gwh.map(async (item) => {
			const isValid = await whChecker(item.webhook);
			return isValid ? item : null; // If valid, keep the item; otherwise, discard it
		}))).filter(item => item !== null); // Filter out the `null` values

		// Write the updated JSON back to the file
		await fs.writeFile(filePath, JSON.stringify(webhooksJson, null, "\t"));

		// save into webhooks.json
		whsJson.hooks = [...whsJson.hooks, ...whArray.map(obj => obj.webhook)];

		// remove duplicates
		whsJson.hooks = [...new Set(whsJson.hooks)];

		// Write the updated JSON back to the file
		await fs.writeFile("webhooks.json", JSON.stringify(whsJson, null, "\t"));

	} catch (err) {
		console.error('Error during GitHub search:', err.response?.data || err.message);
	}
}

githubSearch().then(() => { console.timeEnd("RunTime"); });
