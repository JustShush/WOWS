// gets all the well formatted discord webhooks on grep.app

const axios = require('axios');
const fs = require('fs');

console.time("RunTime");

// Webhook URL validation constants
const WEBHOOK_VALIDATION = {
	ID_LENGTH: 17,
	TOKEN_LENGTH: { MIN: 60, MAX: 80 }
};

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

async function searchGrepWebhooks() {
	const webhooks = new Set();
	// it can also be discordapp.com here ⬇️
	const regexQuery = 'https:\\/\\/discord\\.com\\/api\\/webhooks\\/\\d+\\/[A-Za-z0-9_-]+';

	const axiosInstance = axios.create({
		headers: {
			'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
			'sec-ch-ua': '"Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Linux"',
			'accept': '*/*',
			'accept-language': 'en-US,en;q=0.8',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-origin',
			'sec-gpc': '1'
		}
	});

	let invalidCount = 0;
	let validCount = 0;
	let page = 1;

	while (true) {
		try {
			console.log(`Fetching page ${page}...`);
			const url = `https://grep.app/api/search?q=${encodeURIComponent(regexQuery)}&regexp=true${page > 1 ? `&page=${page}` : ''}`;

			const response = await axiosInstance.get(url);
			const data = response.data;

			// Check if there are no hits
			if (!data.hits || !data.hits.hits || data.hits.hits.length === 0) {
				console.log(`\nNo more results found after page ${page - 1}`);
				break;
			}

			data.hits.hits.forEach(hit => {
				const snippet = hit.content.snippet;
				// /https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g;
				const webhookRegex = /(?:https?:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+)/g;
				const matches = snippet.match(webhookRegex);
				if (matches) {
					matches.forEach(webhook => {
						if (isValidWebhook(webhook)) {
							webhooks.add(webhook);
							validCount++;
						} else {
							invalidCount++;
							//console.log(`Invalid webhook found: ${webhook}`);
						}
					});
				}
			});

			console.log(`Page ${page} - Current total valid webhooks: ${webhooks.size}`);

			// Add delay between requests
			await new Promise(resolve => setTimeout(resolve, 1000));
			page++;

		} catch (error) {
			if (error.response) {
				console.error(`Error ${error.response.status} on page ${page}: ${error.response.statusText}`);
			} else {
				console.error(`Error fetching page ${page}:`, error.message);
			}
			break;
		}
	}

	const json = JSON.parse(fs.readFileSync("webhooks.json", 'utf8'));
	function checkValuesInArrays(A, B, C) {
		// Ensure C is an array
		if (!Array.isArray(C)) {
			throw new TypeError("C must be an array");
		}
		// Create a Set for quick lookup of elements in A and B
		const setA = new Set(A);
		const setB = new Set(B);
	
		// Filter out values from C that exist in A or B
		const filteredC = C.filter(value => {
			if (setA.has(value) || setB.has(value)) {
				//console.log(`Value ${value}: already exists`);
				return false; // Remove from C
			} else {
				//console.log(`Value ${value}: new one!`);
				return true; // Keep in C
			}
		});
	
		return filteredC;
	}
	//checkValuesInArrays(json.hooks, json.removed, webhooks);

	// Save results
	const webhooksArray = Array.from(checkValuesInArrays(json.hooks, json.removed, Array.from(webhooks)));
	const outputFile = `discord_webhooks_${new Date().toISOString().split('T')[0]}.json`;
	fs.writeFileSync(outputFile, JSON.stringify(webhooksArray, null, 2));

	// Print summary
	console.log('\nResults Summary:');
	console.log(`Total valid webhooks found: ${validCount}`);
	console.log(`Total invalid webhooks filtered out: ${invalidCount}`);
	console.log(`Unique valid webhooks saved: ${webhooksArray.length}`);
	console.log(`Saved to: ${outputFile}`);

	// Optional: Print all found webhooks
	//console.log('\nFound webhooks:');
	//webhooksArray.forEach(webhook => console.log(webhook));
	console.timeEnd("RunTime");
}

// Run the search
searchGrepWebhooks();