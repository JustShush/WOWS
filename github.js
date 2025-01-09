const { githubToken } = require('./config.json');
const axios = require("axios");
const fs = require("fs");

async function githubSearch() {
	const query = "https://api.github.com/search/code?q=https://discord.com/api/webhooks/+&per_page=100";
	const res = await axios.get(query, {
		headers: {
			Authorization: `token ${githubToken}`
		}
	}).catch((err) => { console.error('Error:', err.response.data); });
	console.log(res.data);
}

githubSearch();