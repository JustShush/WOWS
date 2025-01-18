const fs = require('fs');
const axios = require('axios');

console.time("RunTime");

// REGEX to find discord webhooks: https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+

let data = {
	username: "!SAFETY!",
	content: "@everyone \n# **:warning: Warning: Your Discord webhook has been leaked!**\n\n## Your webhook was exposed online and can be used by unauthorized individuals to spam or harm your server.\nWe have found this webhook online that can be intercepted by anyone! Luckily we are white hats and we wont cause any harm. **If you don't delete the compromised webhook in the next minutes we will delete it for your safety**. Keep webhook URLs private and share them only with trusted individuals or systems. For more information, visit discord.gg/3jRJCApUHw",
	tts: true
}

// Function to combine data from two JSON variables and write to a file
const combineAndWriteJson = (json1, json2) => {
	const filePath = 'webhooks.json';
	// Step 1: Merge the data from both JSONs
	const combinedJson = {
		hooks: [...(json1.hooks || [])],
		removed: [...(json2.removed || [])]
	};

	// Step 2: Write the combined data to a file
	fs.writeFile(filePath, JSON.stringify(combinedJson, null, '\t'), 'utf8', (err) => {
		if (err) {
			console.error('Error writing to the file:', err);
		} else {
			console.log('File updated successfully with combined data.');
			console.timeEnd("RunTime");
		}
	});
};

// Function to add specific URLs to the "hooks" array
const updateJsonRemoved = (urlsToAdd) => {
	const filePath = 'webhooks.json';
	if (!Array.isArray(urlsToAdd)) {
		console.error('urlsToAdd must be an array of strings.');
		return;
	}

	// Step 1: Read the JSON file
	const data = fs.readFileSync(filePath, 'utf8');
	const json = JSON.parse(data);

	// remove any duplicates if somehow they got there.
	//json.removed = removeDuplicates(json.removed);
	// Step 2: Add URLs to the "removed" array if they are not already in it
	if (Array.isArray(json.removed)) {
		urlsToAdd.forEach(url => {
			if (!json.removed.includes(url)) {
				json.removed.push(url);
				//console.log(`Added: ${url}`);
			} else {
				console.log(`URL already checked INVALID!: ${url}`);
			}
		});
	} else {
		console.error('The "removed" key does not contain an array.');
	}

	// Return the updated JSON
	return json
};

// Function to remove specific URLs from the "hooks" array
const updateJsonHooks = (urlsToRemove) => {
	const filePath = "webhooks.json";
	if (!Array.isArray(urlsToRemove)) {
		console.error('urlsToRemove must be an array of strings.');
		return;
	}

	// Step 1: Read the JSON file
	const data = fs.readFileSync(filePath, 'utf8');
	const json = JSON.parse(data);

	json.hooks = removeDuplicates(json.hooks);
	// Step 2: Remove the URLs from the "hooks" array
	if (Array.isArray(json.hooks)) {
		json.hooks = json.hooks.filter(hook => !urlsToRemove.includes(hook));
	} else {
		console.error('The "hooks" key does not contain an array.');
	}

	// Return the updated JSON
	return json;
};

// removed all the duplicates from an array.
function removeDuplicates(webhookArray) {
	// Use a Set to filter out duplicates, as Sets only allow unique values
	return Array.from(new Set(webhookArray));
}

let i = 1;
async function sendToAllWebhoks(data) {
	const hooks = require('./webhooks.json');
	let toRm = [];
	for (const h of hooks.hooks) {
		if (hooks.removed.includes(h)) {
			toRm.push(h);
			continue;
		} else {
			hooks.hooks = removeDuplicates(hooks.hooks);
			try {
				await axios.post(h, data)
				console.log(`[${i++}] Message sent successfully!`);
			} catch (err) {
				console.error('Error sending message:', err.response?.data || err.message, h);
				toRm.push(h);
			}
		}
	}
	// Wait for both updateJsonRemoved and updateJsonHooks to finish
	const updatedRemoved = await updateJsonRemoved(toRm);
	const updatedHooks = await updateJsonHooks(toRm);
	combineAndWriteJson(updatedHooks, updatedRemoved);
}

sendToAllWebhoks(data);

// wehbook safety server discord.gg/xgYU5WDe