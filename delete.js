const axios = require('axios');

// Array of webhook URLs to delete
const webhookUrls = [
	"https://discord.com/api/webhooks/1234567890/your-webhook-token",
	// Add more webhook URLs here
];

// Function to delete a webhook
const deleteWebhook = async (url) => {
	try {
		const response = await axios.delete(url);
		console.log(`Webhook deleted successfully: ${url}`);
	} catch (error) {
		if (error.response) {
			console.error(`Failed to delete webhook: ${url}`);
			console.error(`Status: ${error.response.status}`);
			console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
		} else {
			console.error(`Error: ${error.message}`);
		}
	}
};

// Iterate through the array of webhook URLs and delete them
const deleteWebhooks = async () => {
	for (const url of webhookUrls) {
		await deleteWebhook(url);
	}
};

// Start the process
deleteWebhooks()
	.then(() => console.log("All webhooks processed."))
	.catch((err) => console.error(`An error occurred: ${err.message}`));