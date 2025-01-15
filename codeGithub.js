const { githubToken } = require('./config.json');
const axios = require("axios");
const fs = require('fs').promises;

// make the search in code but with pagination

// what you want to be searched
const query = "https://discord.com/api/webhooks/";

// to fetch for best match or recently updated
// false to recently updated | true for best match
const bestMatch = false;

const filePath = "gwebhooks.json";

const color = {
	red: "\x1b[31m",
	orange: "\x1b[38;5;202m",
	yellow: "\x1b[33m",
	green: "\x1b[32m",
	blue: "\x1b[34m",
	pink: "\x1b[38;5;213m",
	torquise: "\x1b[38;5;45m",
	purple: "\x1b[38;5;57m",
	reset: "\x1b[0m",
};

/**
 * Checks if a Discord webhook is valid.
 * @param {string} webhookUrl - The Discord webhook URL to check.
 * @returns {Promise<boolean>} - Returns true if the webhook is valid, false otherwise.
 */
async function whChecker(webhookUrl, retries = 3) {
	try {
		const response = await axios.get(webhookUrl);
		return response.status === 200;
	} catch (err) {
		if (retries > 0 && err.response?.status === 429) { // Too many requests
			console.log(`${color.red}Rate limited. Retrying in ${(3 * 2) ** (4 - retries)} seconds...${color.reset}`);
			await new Promise((resolve) => setTimeout(resolve, (3 * 2) ** (4 - retries) * 1000));
			return whChecker(webhookUrl, retries - 1);
		}
		return false;
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

async function githubSearch() {

	let page = 1;
	while (true) {

		var whArray = [];
		try {
			console.log(`Fetching page ${page}...`);
			const url = `https://api.github.com/search/code?q=${query}&per_page=100${bestMatch ? "" : "&sort=updated"}&order=desc${page >= 1 ? `&page=${page}` : ""}`;

			const res = await axios.get(url, {
				headers: {
					Authorization: `token ${githubToken}`
				}
			});

			const items = res.data.items;

			// If no items are found, exit early
			if (!items || items.length === 0) {
				console.log("No results found.", res.data);
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

					const tokensPreJson = await fs.readFile('tokens.json', 'utf8');
					const tokensJson = JSON.parse(tokensPreJson);

					const fileContent = Buffer.from(fileRes.data.content, 'base64').toString('utf-8');
					const webhookRegex = /(?:https?:\/\/(?:discord\.com|discordapp\.com|canary\.discord\.com|canary\.discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+)/g;

					const regex = /aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3Mv[A-Za-z0-9+/=]*/g;

					const gitUserRegex = /https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9+=\/%()_-]+(?<!\))/gm;
					const gitUserMatches = fileContent.match(gitUserRegex);
					if (gitUserMatches) {
						for (link of gitUserMatches) {
							try {
								// makes the request to get the data from the link
								const res = await axios.get(link);
								// checks for base of webhook url encoded in base64
								const matchesBase64 = res.data.match(regex);
								if (matchesBase64) {
									for (base of matchesBase64) {
										const decoded = Buffer.from(base, 'base64').toString('utf-8');
										const matching = decoded.match(webhookRegex);
										if (matching) {
											matching.forEach((wh) => {
												if (!isValidWebhook(wh)) return invalidCount++;
												if (whsJson.removed.includes(wh) || whsJson.hooks.includes(wh)) {
													console.log(`Already tested link: ${wh}`);
													return;
												} else {
													console.log(`Found webhook in file: ${item.html_url}`);
													i++;
													console.log(`[${i}] Webhook: ${wh}`);
													const data = {
														path: item.path,
														name: item.name,
														html_url: item.html_url,
														webhook: wh
													};
													whArray.push(data);
												}
											})
										}
									}
								}
								// checks for possible discord bot tokens (almost impossible cuz github and discord notify the user first)
								const tokens = res.data.match(/[a-zA-Z0-9_\-]{24}\.[a-zA-Z0-9_\-]{6}\.[a-zA-Z0-9_\-]{27}/g);
								if (tokens) {
									tokens.forEach((t) => {
										if (tokensJson.invalid.includes(t) || tokensJson.valid.includes(t)) {
											console.log(`Already tested TOKEN or its already in the valid array: ${t}`);
											return;
										} else {
											tokensJson.valid = [...tokensJson.valid, t];
											console.log(t);
										}
									});
									await fs.writeFile('tokens.json', JSON.stringify(tokensJson, null, '\t'));
								}
								// normal check for webhooks after the link has been read
								const finds = res.data.match(webhookRegex);
								if (finds) {
									finds.forEach((wh) => {
										if (!isValidWebhook(wh)) return invalidCount++;
										if (whsJson.removed.includes(wh) || whsJson.hooks.includes(wh)) {
											console.log(`Already tested link: ${wh}`);
											return;
										} else {
											console.log(`Found webhook in file: ${item.html_url}`);
											i++;
											console.log(`[${i}] Webhook: ${wh}`);
											matches.push({
												path: item.path,
												name: item.name,
												html_url: item.html_url,
												webhook: wh,
												createdAt: item.created_at
											});
										}
									})
									console.log(`${color.green}[repoCount:${repoCount}/file:${fileCount}] Match found in file:${color.reset} ${filePath} | ${response.data.html_url}`);
									wasFound = true;
									console.log(`Invalid links found: ${invalidCount}`);
								}
								// idealy i would save the links that didnt find anything but ya, too much work <3
							} catch (err) {
								if (err.status == 404) {}
								else console.log(`Problem when trying to fetch: ${link}:`, err.response?.data || err.message);
								continue;
							}
						}
					}

					const matchesBase64 = fileContent.match(regex);
					if (matchesBase64) {
						for (base of matchesBase64) {
							const decoded = Buffer.from(base, 'base64').toString('utf-8');
							const matching = decoded.match(webhookRegex);
							if (matching) {
								matching.forEach((wh) => {
									if (!isValidWebhook(wh)) return invalidCount++;
									if (whsJson.removed.includes(wh) || whsJson.hooks.includes(wh)) {
										console.log(`Already tested link: ${wh}`);
										return;
									} else {
										console.log(`Found webhook in file: ${item.html_url}`);
										i++;
										console.log(`[${i}] Webhook: ${wh}`);
										const data = {
											path: item.path,
											name: item.name,
											html_url: item.html_url,
											webhook: wh
										};
										whArray.push(data);
									}
								})
							}
						}
					}

					const tokens = fileContent.match(/[a-zA-Z0-9_\-]{24}\.[a-zA-Z0-9_\-]{6}\.[a-zA-Z0-9_\-]{27}/g);
					if (tokens) {
						tokens.forEach((t) => {
							if (tokensJson.invalid.includes(t) || tokensJson.valid.includes(t)) {
								console.log(`Already tested TOKEN or its already in the valid array: ${t}`);
								return;
							} else {
								tokensJson.valid = [...tokensJson.valid, t];
								console.log(t);
							}
						});
						await fs.writeFile('tokens.json', JSON.stringify(tokensJson, null, '\t'));
					}

					const matches = fileContent.match(webhookRegex);
					if (matches) {
						matches.forEach((webhook) => {
							if (!isValidWebhook(webhook)) return invalidCount++;
							// Skip the link if it's already tested
							if (whsJson.removed.includes(webhook) || whsJson.hooks.includes(webhook)) {
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
			// Add delay between requests
			console.log(`Waiting 10 sec to fetch the next page: ${page + 1}`);
			await new Promise(resolve => setTimeout(resolve, 10_000));
			page++;
		} catch (err) {
			if (err.response.status == 422) {
				console.error(`ERROR: Cannot access beyond the first 1000 results, or the endpoint has been spammed. when trying to fetch page: ${page}`, err.response.statusText)
				console.log(`${color.green}Searched for: |${query}| with Best Match: ${bestMatch}${color.reset}`);
			}
			else if (err.response)
				console.error(`Error ${err.response.status} on page ${page}: ${err.response.statusText}`);
			else
				console.error(`Error fetching page ${page}:`, err.message);
			break;
		}
	}
}

module.exports = { githubSearch };

//githubSearch().then(() => { console.timeEnd("RunTime"); });