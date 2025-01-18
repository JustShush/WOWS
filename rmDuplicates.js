const fs = require('fs').promises;


let added = 0;
let all = 0;
function removeDuplicates(data) {
	// Create a Set to track unique webhooks
	const seenWebhooks = new Set();

	// Filter the array to include only unique webhooks
	return data.filter(item => {
		if (seenWebhooks.has(item.webhook)) {
			all++;
			return false; // Exclude if the webhook is already seen
		} else {
			seenWebhooks.add(item.webhook); // Mark this webhook as seen
			added++;
			all++;
			return true; // Include the item
		}
	});
}

async function main() {
	const filePath = "webhooks.json";
	// Read and parse the JSON file
	const preJson = await fs.readFile(filePath, 'utf8');
	const webhooksJson = JSON.parse(preJson);
	webhooksJson.gwh = removeDuplicates(webhooksJson.gwh);

	console.log(`WebHooks that are valid: ${added} | Added: ${all - added}`);
	await fs.writeFile(filePath, JSON.stringify(webhooksJson, null, "\t"));
}

main();