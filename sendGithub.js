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
			content: `@everyone last warning!\n# 🚨 **Webhook Leak Alert!** 🚨\nImportant information about a leak has been detected. Please review the details below.\n\n### For more information join our support server discord.gg/xgYU5WDe`,
			embeds: [
				{
					title: "Webhook Leak Details",
					description: "Important details about the leak have been identified:",
					color: 0xff0000, // Red color
					fields: [
						{ name: "File Name", value: webhook.name, inline: true },
						{ name: "File Path", value: webhook.path, inline: true },
						{ name: "GitHub URL", value: `[Click here](${webhook.html_url})`, inline: false }
					],
					footer: {
						text: "Automated Alert System",
						icon_url: "https://github.com/JustShush/WOWS/blob/main/imgs/transparent.png?raw=true"
					},
					timestamp: new Date().toISOString()
				}
			],
			tts: true
		};
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
