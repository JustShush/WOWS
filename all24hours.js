const axios = require("axios");
const fs = require('fs').promises;
console.time("RunTime");

let i = 0;
const deleteWebhook = async (webhook) => {
	try {
		//console.log((Date.now() - webhook.timestamp) / (1000 * 60 * 60), (Date.now() - webhook.timestamp) / (1000 * 60 * 60) < 24)
		if ((Date.now() - webhook.timestamp) / (1000 * 60 * 60) < 24) {
			//console.log("24Hours have not passed.", webhook);
			return;
		}
		await axios.delete(webhook.webhook);
		console.log(`[${i++}] Webhook deleted successfully: ${webhook.webhook}`);
	} catch (error) {
		if (error.status == 429) {
			console.log(`${error.response.data.message}`, error.response.data.retry_after);
			await new Promise((resolve) => setTimeout(resolve, (error.response.data.retry_after * 1_000) + 500));
			deleteWebhook(webhook);
			return;
		}
		if (error.response) {
			console.error(`Failed to delete webhook: ${webhook.webhook}`, error.response.data);
			//console.error(`Status: ${error.response.status}`, error.response.data);
		} else {
			console.error(`Error: ${error.message}`);
		}
	}
};

const toDelete = [];
async function main() {
	const whJson = require('./gwebhooks.json');

	let toRm = [];
	let i = 0;
	for (const webhook of whJson.gwh) {
		const now = Date.now(); // Current Unix timestamp in seconds
		if (!webhook.timestamp) webhook.timestamp = now;
		//return console.log(Math.floor((now - webhook.timestamp) / (1000 * 60 * 60)));
		if ((now - webhook.timestamp) / (1000 * 60 * 60) <= 24) {
			console.log(`24Hours have not passed. ${((Math.floor(webhook.timestamp / 1000)) + (24 * 60 * 60))}`, webhook.html_url);
			//continue;
		} else toDelete.push(webhook);
		const argv = process.argv.slice(2);
		if (argv[0]) toDelete.push(webhook); // If i start the program with any argument it deletes all webhooks
		const payload = {
			username: "🚨 Webhook Leak Alert! 🚨",
			avatar_url: "https://github.com/JustShush/WOWS/blob/main/imgs/whSafety.jpg?raw=true",
			content: `@everyone\n# 🚨 **Your Discord webhook has been leaked!** 🚨\n## Our automated tool found your webhook URL \
			exposed online and it can be used by unauthorized individuals to spam or harm your server.\nAnyone can publicly view your webhook URL \
			and send messages through it. While this message may be nice, some people are sadly not as friendly and may spam the webhook.\n> As we want to keep your webhook safe, **we will be automatically deleting this webhook\
			<t:${Math.floor(webhook.timestamp / 1000)}:R>\n\n### If you have more questions, or don't want your webhook removed, you can join our server. \
			discord.gg/3jRJCApUHw`,
			embeds: [
				{
					title: "Webhook Leak Details",
					description: "Important details about the leak have been identified:",
					color: 0xff0000, // Red color
					fields: [],
					footer: {
						text: "Automated Alert System",
						icon_url: "https://github.com/JustShush/WOWS/blob/main/imgs/whSafety.jpg?raw=true"
					},
					timestamp: new Date().toISOString()
				}
			],
			tts: true
		};
		if (webhook.repoName) {
			payload.embeds[0].fields.push({ name: "Repository Owner", value: webhook.repoOwner, inline: true });
			payload.embeds[0].fields.push({ name: "Repository Name", value: webhook.repoName, inline: true });
			payload.embeds[0].fields.push({ name: "GitHub URL", value: `[Click here](${webhook.html_url})`, inline: false });
		} else if (webhook.name) {
			payload.embeds[0].fields.push({ name: "File Name", value: webhook.name, inline: true });
			payload.embeds[0].fields.push({ name: "File Path", value: webhook.path, inline: true });
			payload.embeds[0].fields.push({ name: "GitHub URL", value: `[Click here](${webhook.html_url})`, inline: false });
		}
		if (webhook.webhook.startsWith("https://media.guilded.gg/webhooks/")) { payload.username = "Webhook Leak Alert!"; payload.content.replaceAll("Discord", "Guilded")};
		try {
			const res = await axios.post(webhook.webhook, payload);
			if (res.message == "Unknown Webhook" || res.code == 10015) return console.log("in", webhook.webhook);
			i++;
			console.log(`[${i}] Webhook warning message sent successfully!`);
		} catch (err) {
			if (err.response.data.code == 220001)
				console.log(`This is a thread webhook, it must have a thread_name or thread_id | ${webhook.webhook}`);
			else {
				console.error('Error sending message:', err.response?.data || err.message, webhook.webhook);
				toRm.push(webhook.webhook);
			}
		}
	}
	whJson.gwh = whJson.gwh.filter(wh => !toRm.includes(wh.webhook));
	// Write the updated JSON back to the file
	await fs.writeFile('./gwebhooks.json', JSON.stringify(whJson, null, "\t"));
}

function allInOne() {
	main().then(async () => {
		for (const webhook of toDelete) {
			await deleteWebhook(webhook);
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}).then(() => console.timeEnd("RunTime"));
}
allInOne();