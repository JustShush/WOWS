const { githubToken } = require('./config.json');
const axios = require("axios");
const fs = require('fs').promises;
console.time("RunTime");

// what you want to be searched
const query = "https://discord.com/api/webhooks/";

// to fetch for best match or recently updated
// false to recently updated | true for best match
const bestMatch = false;

const filePath = "gReposWh.json";

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

async function repoSearch() {

	let page = 1;

	while (true) {
		try {
			console.log(`Fetching page ${page}...`);
			const url = `https://api.github.com/search/repositories?q=${query}&per_page=100${bestMatch ? "" : "&sort=updated"}&order=desc${page > 1 ? `&page=${page}` : ""}`;

			let whArray = [];

			// Read and parse the JSON file
			const preJson = await fs.readFile(filePath, 'utf8');
			const webhooksJson = JSON.parse(preJson);

			// Read and parse the JSON file
			const whPreJson = await fs.readFile("webhooks.json", 'utf8');
			const whsJson = JSON.parse(whPreJson);

			try {
				const res = await axios.get(url, {
					headers: {
						Authorization: `token ${githubToken}`
					}
				});

				if (res.data.items.length === 0) {
					console.log(`\nNo more results found after page ${page - 1}`);
					break;
				}

				let invalidCount = 0;
				let i = 0;
				for (const repo of res.data.items) {
					const webhookRegex = /(?:https?:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+)/g;
					const matches = repo.description.match(webhookRegex);
					if (matches) {
						matches.forEach((wh) => {
							//console.log(repo);
							if (!isValidWebhook(wh)) return invalidCount++;
							if (whsJson.removed.includes(wh)) {
								console.log(`Already tested link: ${wh}`);
								return;
							} else {
								console.log(`Found webhook in file: ${repo.html_url}`);
								i++;
								console.log(`[${i}] Webhook: ${wh}`);
								const data = {
									repoOwner: repo.owner.login,
									repoName: repo.name,
									repoUrl: repo.html_url,
									webhook: wh
								}
								whArray.push(data);
							}
						})
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

			// Add delay between requests
			await new Promise(resolve => setTimeout(resolve, 1000));
			page++;
		} catch (err) {
			if (err.response)
				console.error(`Error ${err.response.status} on page ${page}: ${err.response.statusText}`);
			else
				console.error(`Error fetching page ${page}:`, err.message);
			break;
		}
	}

}

repoSearch().then(() => { console.timeEnd("RunTime"); });