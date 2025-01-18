const { githubToken } = require('./config.json');
const axios = require("axios");
const fs = require('fs').promises;

// make the search in code but with pagination

// what you want to be searched
const query = "https://discordapp.com/api/webhooks/ language:Lua channel";

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

const webhookRegex = /(?:https?:\/\/(?:discord\.com|discordapp\.com|canary\.discord\.com|canary\.discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+)/g;
const regex = /aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3Mv[A-Za-z0-9+/=]*/g;
const gitUserRegex = /https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9+=\/%()_-]+(?<!\))/gm;

const PASTEBIN_REGEX = /https?:\/\/pastebin\.com\/[a-zA-Z0-9]+/g;
const GITHUB_USER_REGEX = /https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9+=\/%()_-]+(?<!\))/gm;

var whArray = [];

/**
 * Checks if a Discord webhook is valid.
 * @param {string} webhookUrl - The Discord webhook URL to check.
 * @returns {Promise<boolean>} - Returns true if the webhook is valid, false otherwise.
 */
async function whChecker(webhookUrl, retries = 4) {
	try {
		const response = await axios.get(webhookUrl);
		await new Promise(resolve => setTimeout(resolve, 500));
		return response.status === 200;
	} catch (err) {
		if (retries > 0 && err.response?.status === 429) { // Too many requests
			console.log(`${color.red}WH Checker Rate limited. Retrying in ${(3 * 2) ** (5 - retries)} seconds...${color.reset}`);
			await new Promise((resolve) => setTimeout(resolve, (3 * 2) ** (5 - retries) * 1000));
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

function removeDuplicates(data) {
	// Create a Set to track unique webhooks
	const seenWebhooks = new Set();

	// Filter the array to include only unique webhooks
	return data.filter(item => {
		if (seenWebhooks.has(item.webhook)) {
			return false; // Exclude if the webhook is already seen
		} else {
			seenWebhooks.add(item.webhook); // Mark this webhook as seen
			return true; // Include the item
		}
	});
}

async function getLinksFromPastebin(url, item, whsJson, tokensJson) {
	try {
		const response = await axios.get(url);
		const content = response.data;
		// checks for base of webhook url encoded in base64
		const matchesBase64 = content.match(regex);
		if (matchesBase64) {
			for (base of matchesBase64) {
				const decoded = Buffer.from(base, 'base64').toString('utf-8');
				const matching = decoded.match(webhookRegex);
				if (matching) {
					matching.forEach((wh) => {
						if (!isValidWebhook(wh)) return invalidCount++;
						if (whsJson.removed.includes(wh) || whsJson.hooks.includes(wh)) {
							//console.log(`Already tested link: ${wh}`);
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
		const links = content.match(PASTEBIN_REGEX) || content.match(GITHUB_USER_REGEX) || [];
		// checks for possible discord bot tokens (almost impossible cuz github and discord notify the user first)
		const tokens = content.match(/[a-zA-Z0-9_\-]{24}\.[a-zA-Z0-9_\-]{6}\.[a-zA-Z0-9_\-]{27}/g);
		if (tokens) {
			console.log("ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss")
			tokens.forEach((t) => {
				if (tokensJson.invalid.includes(t) || tokensJson.valid.includes(t)) {
					console.log(`Already tested TOKEN or its already in the valid array: ${t}`);
					return;
				} else
					tokensJson.valid = [...tokensJson.valid, t];
			});
			await fs.writeFile('tokens.json', JSON.stringify(tokensJson, null, '\t'));
		}
		// normal check for webhooks after the link has been read
		const finds = content.match(webhookRegex);
		if (finds) {
			let i = 0;
			finds.forEach((wh) => {
				if (!isValidWebhook(wh)) return;
				if (whsJson.removed.includes(wh) || whsJson.hooks.includes(wh)) {
					console.log(`Already tested link: ${wh}`);
					return;
				} else {
					console.log(`${color.torquise}Found one from:${color.reset} ${url}`);
					console.log(`Found webhook in file: ${item.html_url}`);
					i++;
					console.log(`[${i}] Webhook: ${wh}`);
					whArray.push({
						path: item.path,
						name: item.name,
						html_url: item.html_url,
						webhook: wh,
						createdAt: item.created_at
					});
				}
			})
		}
		return { content, links };
	} catch (error) {
		if (error.status == 404 || error.status == 400) { }
		else console.error(`Failed to fetch URL: ${url}`, error.message);
		return { content: '', links: [] };
	}
}

async function readFileAndExtractLinks(links, item, whsJson, tokensJson) {
	try {
		const visited = new Set();

		async function recursiveLinkChecker(linksToCheck, item, whsJson, tokensJson) {
			for (const link of linksToCheck) {
				if (!visited.has(link)) {
					visited.add(link);
					const ignoreLinks = [
						"https://raw.githubusercontent.com/EdgeIY/infiniteyield/master/version",
						"https://raw.githubusercontent.com/shlexware/domainx/main/latest",
						"https://raw.githubusercontent.com/23Asmo/evolutionfixes/main/config",
						"https://raw.githubusercontent.com/Blank-c/Blank-Grabber/main/Blank%20Grabber/Extras/hash",
						"https://raw.githubusercontent.com/rodcordeiro/bot_beltis/master/version",
						"https://raw.githubusercontent.com/smashie420/Epic-Games-Today-Free-Day/master/version",
						"https://raw.githubusercontent.com/Birkegud/TerminatorAC/main/Source/version",
						"https://raw.githubusercontent.com/xariesnull/fivem-secured/main/version",
						"https://raw.githubusercontent.com/AardPlugins/Aardwolf-Nulan-Mobs/refs/heads/main/VERSION",
						"https://raw.githubusercontent.com/Yappering/api/main/v1/profiles-plus",
						
						"https://pastebin.com/search",
						"https://pastebin.com/raw"
					]
					if (ignoreLinks.includes(link)) continue;
					console.log(`Visiting: ${link}`);

					const { links: newLinks } = await getLinksFromPastebin(link, item, whsJson, tokensJson);
					await recursiveLinkChecker(newLinks, item, whsJson, tokensJson);
				}
			}
		}

		await recursiveLinkChecker(links, item, whsJson, tokensJson);
	} catch (error) {
		if (err.status == 404 || err.status == 400) { }
		else console.log(error.response?.data || error.message);
	}
}

async function githubSearch(QUERY) {

	let page = 1;
	while (true) {
		try {
			console.log(`Fetching page ${page}...`);
			let url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=100${bestMatch ? "" : "&sort=updated"}&order=desc${page >= 1 ? `&page=${page}` : ""}`;
			if (QUERY) url = `https://api.github.com/search/code?q=${encodeURIComponent(QUERY)}&per_page=100${bestMatch ? "" : "&sort=updated"}&order=desc${page >= 1 ? `&page=${page}` : ""}`;

			const res = await axios.get(url, {
				headers: {
					Authorization: `token ${githubToken}`
				}
			});

			const items = res.data.items;

			// If no items are found, exit early
			if (!items || items.length === 0) {
				console.log("No results found.", res.data);
				console.log(`${color.green}Searched for: |${query}| with Best Match: ${bestMatch}${color.reset}`);
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

					const gitUserMatches = fileContent.match(gitUserRegex);
					if (gitUserMatches) {
						readFileAndExtractLinks(gitUserMatches, item, whsJson, tokensJson);
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
										//console.log(`Already tested link: ${wh}`);
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
								//console.log(`Already tested TOKEN or its already in the valid array: ${t}`);
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
								//console.log(`Already tested link: ${webhook}`);
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

			const invalidWebhooks = [];
			const validateWebhooks = async () => {
				const validWebhooks = [];
				for (const item of whArray) {
					//console.log(`Checking ${item.webhook}`);
					const isValid = await whChecker(item.webhook);
					if (!isValid) {
						//console.log(isValid, `${item.webhook}`);
						invalidWebhooks.push(item.webhook);
					} else {
						validWebhooks.push(item); // Keep the valid item
					}
					await new Promise(resolve => setImmediate(() => setTimeout(resolve, 300)));
				}
				return validWebhooks; // Return only valid webhooks
			};

			whArray = removeDuplicates(whArray);

			whArray = await validateWebhooks();

			// Update the JSON structure
			webhooksJson.gwh = [...webhooksJson.gwh, ...whArray];

			webhooksJson.gwh = removeDuplicates(webhooksJson.gwh);

			// Write the updated JSON back to the file
			await fs.writeFile(filePath, JSON.stringify(webhooksJson, null, "\t"));

			// save into webhooks.json
			whsJson.hooks = [...whsJson.hooks, ...webhooksJson.gwh.map(obj => obj.webhook)];

			// remove duplicates
			whsJson.hooks = [...new Set(whsJson.hooks)];

			whsJson.removed = [...whsJson.removed, ...new Set(invalidWebhooks)];

			whsJson.removed = [...new Set(whsJson.removed)];

			// Write the updated JSON back to the file
			await fs.writeFile("webhooks.json", JSON.stringify(whsJson, null, "\t"));
			// Add delay between requests
			console.log(`Waiting 10 sec to fetch the next page: ${page + 1}`);
			await new Promise(resolve => setTimeout(resolve, 10_000));
			whArray = [];
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