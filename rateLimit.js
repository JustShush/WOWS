const { githubToken } = require('./config.json');
const axios = require('axios');

async function checkRateLimit() {
	try {
		const response = await axios.get('https://api.github.com/rate_limit', {
			headers: {
				Authorization: `token ${githubToken}`,
			},
		});
		console.log(response.data);
	} catch (error) {
		console.error('Error checking rate limit:', error.response?.data || error.message);
	}
}

checkRateLimit();