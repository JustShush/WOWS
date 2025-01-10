const axios = require("axios");
const fs = require('fs').promises;
console.time("RunTime");

async function main() {
	const whJson = require('./gwebhooks.json');

	let toRm = [];
	let i = 0;
	for (webhook of whJson.gwh) {
		const payload = {
			username: "🚨 **Webhook Leak Alert!** 🚨",
			avatar_url: "https://github.com/JustShush/WOWS/blob/main/imgs/transparent.png?raw=true",
			content: `@everyone last warning!\n# 🚨 **Your Discord webhook has been leaked!** 🚨\n## Your webhook was exposed online and can be used by unauthorized individuals to spam or harm your server.\nWe have found this webhook online that can be intercepted by anyone! Luckily we are white hats and we wont cause any harm. **If you don't delete the compromised webhook in the next minutes we will delete it for your safety**. Keep webhook URLs private and share them only with trusted individuals or systems.\n\n### For more information join our support server discord.gg/xgYU5WDe`,
			embeds: [
				{
					title: "Webhook Leak Details",
					description: "Important details about the leak have been identified:",
					color: 0xff0000, // Red color
					fields: [],
					footer: {
						text: "Automated Alert System",
						icon_url: "https://github.com/JustShush/WOWS/blob/main/imgs/transparent.png?raw=true"
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
		try {
			await axios.post(webhook.webhook, payload);
			i++;
			console.log(`[${i}] Message sent successfully!`);
		} catch (err) {
			console.error('Error sending message:', err.response?.data || err.message, webhook.webhook);
			toRm.push(webhook.webhook);
		}
	}
	whJson.gwh = whJson.gwh.filter(wh => !toRm.includes(wh.webhook));
	// Write the updated JSON back to the file
	await fs.writeFile('./gwebhooks.json', JSON.stringify(whJson, null, "\t"));
}

main().then(() => { console.timeEnd("RunTime"); });
