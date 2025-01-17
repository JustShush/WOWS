const fs = require('fs').promises;


let removed = 0;
let valid = 0;
function removeDuplicates(data) {
	// Create a Set to track unique webhooks
	const seenWebhooks = new Set();

	// Filter the array to include only unique webhooks
	return data.filter(item => {
		if (seenWebhooks.has(item.webhook)) {
			removed++;
			valid++;
			return false; // Exclude if the webhook is already seen
		} else {
			seenWebhooks.add(item.webhook); // Mark this webhook as seen
			valid++;
			return true; // Include the item
		}
	});
}

async function main() {
	const filePath = "gwebhooks.json";
	// Read and parse the JSON file
	const preJson = await fs.readFile(filePath, 'utf8');
	const webhooksJson = JSON.parse(preJson);
	webhooksJson.gwh = removeDuplicates(webhooksJson.gwh);

	console.log(`WebHooks that are valid: ${valid - removed} | Removed: ${removed}`);
	await fs.writeFile(filePath, JSON.stringify(webhooksJson, null, "\t"));
}

main();