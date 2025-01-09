const axios = require('axios');
const fs = require('fs').promises;

// https://psbdmp.ws/api

// const url = "https://psbdmp.ws/api/v3/today";
//const url = "https://psbdmp.ws/api/v3/latest";
const url = "https://psbdmp.ws/api/v3/search/webhooks"
const filePath = "webhooks.json";

var whArray = [];
async function main() {

	// Read and parse the JSON file
	const preJson = await fs.readFile(filePath, 'utf8');
	const webhooksJson = JSON.parse(preJson);

	const webhookRegex = /(?:https?:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+)/g;
	const res = await axios.get(url).catch((err) => { console.error(err.message.data); });
	//console.log(res.data);
	//console.log(res.data.data[0].id);
	//console.log(res.data)
	let i = 1;
	for (data of res.data) {
		const response = await axios.get(`https://psbdmp.ws/api/v3/dump/${data.id}`).catch((err) => { console.error(err.message.data); });
		//console.log(response.data.content);
		const matches = response.data.content.match(webhookRegex);
		if (matches) {
			matches.forEach(webhook => {
				// Skip the link if it's already tested
				if (webhooksJson.removed.includes(url) || webhooksJson.hooks.includes(url)) {
					console.log(`Already tested link: ${url}`);
					return;
				} else {
					whArray.push(`${webhook}`);
					console.log(`[${i}] Found one: ${webhook}`);
					i++;
				}
			});
		}
	}

	// Update the JSON structure
	webhooksJson.hooks = [...webhooksJson.hooks, ...whArray];

	// Write the updated JSON back to the file
	await fs.writeFile(filePath, JSON.stringify(webhooksJson, null, "\t"));
}

main();