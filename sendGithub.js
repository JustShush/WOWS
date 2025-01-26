const axios = require("axios");
const fs = require('fs').promises;
console.time("RunTime");

async function main() {
	const whJson = require('./gwebhooks.json');

	let toRm = [];
	let i = 0;
	for (webhook of whJson.gwh) {
		let later;
		if (!webhook.timestamp) {
			const now = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds
			later = now + 24 * 60 * 60;
			webhook.timestamp = later;
		}
		const payload = {
			username: "🚨 Webhook Leak Alert! 🚨",
			avatar_url: "https://github.com/JustShush/WOWS/blob/main/imgs/whSafety.jpg?raw=true",
			content: `@everyone\n# 🚨 **Your Discord webhook has been leaked!** 🚨\n## Your webhook was exposed online and can be used by unauthorized individuals to spam or harm your server.\n**If you don't delete the compromised webhook we will eventually delete it for you**.\n\nTo prevent this from happening again do not publish future webhook urls to publicly accessible locations.${later ? `\nYour webhook will be deleted <t:${later}:R>` : "\n"}\n\n### If you would like help protecting your webhook or have any questions join discord.gg/3jRJCApUHw`,
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

main().then(() => { console.timeEnd("RunTime"); });
