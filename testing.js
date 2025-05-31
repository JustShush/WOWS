const { githubToken } = require('./config.json');
const axios = require('axios');
const fs = require('fs').promises;

const WH_BASE_REGEX = /aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3Mv/g;
const WH_LAST_PART_REGEX = /[A-Za-z0-9]{16,}\/[A-Za-z0-9_\-]{68}/g;

async function main(owner, repo, filePath) {
	const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
	const response = await axios.get(url, {
		headers: {
			Authorization: `token ${githubToken}`,
			Accept: 'application/vnd.github+json',
		},
	});

	// Decode base64 file content
	const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
	console.log(content);

	const regex = /https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9+=\/%()-_]+/gm;

	const matches = content.match(WH_LAST_PART_REGEX);
	console.log(matches);

/* 	if (matches) {
		for (link of matches) {
			const res = await axios.get(link);
			const whRegex = /(?:https?:\/\/(?:discord\.com|discordapp\.com|canary\.discord\.com|canary\.discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+)/g;

			const finds = res.data.match(whRegex);
			if (finds) {
				finds.forEach(wh => {
					console.log(wh);
				});
			}
		}
	} */

}

main("justshush", "WOWS", "ztesting.txt");