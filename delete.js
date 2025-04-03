const axios = require("axios");

// Array of webhook URLs to delete
const webhookUrls = [
	//"https://discord.com/api/webhooks/1326428751604613130/jp7zePMqBvElpjbw2Lp0gyQjSRy1w4RUZJ2ZSuDURSQ1ish0UxnQ17d6EEsi1uk84Hre?wait=1&thread_id=1321874667358781531"
	// Add more webhook URLs here
];

// Function to delete a webhook
const deleteWebhook = async (url) => {
	try {
		const response = await axios.delete(url);
		console.log(`Webhook deleted successfully: ${url}`);
	} catch (error) {
		if (error.status == 429) {
			console.log(`${error.response.data.message}`, error.response.data.retry_after);
			await new Promise((resolve) => setTimeout(resolve, (error.response.data.retry_after * 1_000) + 500));
			deleteWebhook(url);
			return;
		}
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
		await new Promise((resolve) => setTimeout(resolve, 1_000));
	}
};

// Start the process
deleteWebhooks()
	.then(() => console.log("All webhooks processed."))
	.catch((err) => console.error(`An error occurred: ${err.message}`));

module.exports = { deleteWebhook, deleteWebhooks };