const { githubToken } = require('./config.json');
const axios = require("axios");
const fs = require('fs').promises;
const atob = require("atob"); // Decode Base64

// fetch all the repos created in the last 2 days i think, still need to check this last 2 days part

// GITHUB API rate limits:
// Unauthenticated requests: Limited to 60 requests per hour.
// Authencicated requests: Limited to 5_000 requests per hour per token.

const matches = []; // Array to store matching strings

const color = {
	red: "\x1b[31m",
	orange: "\x1b[38;5;202m",
	yellow: "\x1b[33m",
	green: "\x1b[32m",
	blue: "\x1b[34m",
	pink: "\x1b[38;5;213m",
	torquise: "\x1b[38;5;45m",
	purple: "\x1b[38;5;57m",
	reset: "\x1b[0m",
};

// Helper function for rate limit handling
async function handleRateLimit(headers) {
	const remaining = headers['x-ratelimit-remaining'];
	const resetTime = headers['x-ratelimit-reset'];
	if (remaining === '0') {
		const waitTime = resetTime * 1000 - Date.now();
		console.log(`${color.orange}Rate limit reached. Waiting ${waitTime / 1000} seconds...${color.reset}`);
		await new Promise(resolve => setTimeout(resolve, waitTime));
	}
}

// Helper function for retrying requests
async function retryRequest(requestFunc, retries = 3) {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			return await requestFunc();
		} catch (error) {
			if (attempt < retries) {
				console.log(`${color.purple}Retrying... (${attempt}/${retries})${color.reset}`);
				await new Promise(resolve => setTimeout(resolve, 10_000));
			} else {
				throw error;
			}
		}
	}
}

let fileCount = 1;
async function fetchContents(owner, repo, regex, path = '') {
	console.time("RunTime");
	const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
	try {
		const response = await retryRequest(() => axios.get(url, {
			headers: {
				Authorization: `token ${githubToken}`,
				Accept: 'application/vnd.github+json',
			},
		}));

		await handleRateLimit(response.headers);

		const files = response.data;

		const ignoreFiles = [
			"license",
			"contributors.md",
			"contributing.md",
			"changelog.md",
			"code_of_conduct.md",
			"issue_template.md",
			"pull_request_template.md",
			"arquitecture.md",
			"frame-progress.md",
			"frame.md",
			"codeowners",
			"package.json",
			"package-lock.json",
			".gitignore",
			".gitattributes",
			".dockerignore",
			"dockerfile"
		];

		for (const file of files) {
			if (ignoreFiles.includes(file.name.toLowerCase())) {
				console.log(`${color.pink}[fileCount:${fileCount++}] returning early, cuz its a file to ignore:${color.reset}`, file.name, file.html_url);
				await new Promise(resolve => setTimeout(resolve, 1_000)); // 1sec delay until next file fetch
				continue;
			} else if (file.type === 'file' && !file.name.match(/\.(png|jpg|jpeg|gif|bin|webp|vad|asm|xml|c|h|cpp|hpp|yaml|yml|bat|sh|template|example|sample|toml|css|zip)$/i)) { // Skip binary/image files
				await checkFile(owner, repo, file.path, regex);
			} else if (file.type === 'dir' && !file.name.match(/^(assets|node_modules|dist)$/i)) {
				await fetchContents(owner, repo, regex, file.path); // Recurse into directories
			}
			await new Promise(resolve => setTimeout(resolve, 1_000)); // 1sec delay until next file fetch
		}
	} catch (error) {
		console.log(error)
		if (error.response?.status == 403) {
			console.error(`${color.red}Got 403 Forbidden (rate limit)${color.reset}`, error.message);
			console.log('Early matches:', matches);
			process.exit();
		} else
			console.error(`Error fetching contents of ${path}:`, error.message);
	}
}

async function checkFile(owner, repo, filePath, regex) {
	const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
	try {
		const response = await retryRequest(() => axios.get(url, {
			headers: {
				Authorization: `token ${githubToken}`,
				Accept: 'application/vnd.github+json',
			},
		}));

		await handleRateLimit(response.headers);

		// Decode base64 file content
		const content = Buffer.from(response.data.content, 'base64').toString('utf-8');

		//console.log(response.data);

		console.log(`[file:${fileCount}] Checking file: ${response.data.name} in ${response.data.html_url}`);
		// Search for regex matches
		const found = content.match(regex);
		if (found) {
			matches.push(...found); // Push all matches into the array
			console.log(`${color.green}[file:${fileCount}] Match found in file:${color.reset} ${filePath} | ${response.data.html_url}`);
			wasFound = true;
		}
		fileCount++;
	} catch (error) {
		if (error.response?.status == 403) {
			console.error(`${color.red}Got 403 Forbidden (rate limit)${color.reset}`, error.message);
			console.log('Early matches:', matches);
			process.exit();
		} else if (error.response?.status == 404) {
			console.error(`${color.red}Got 404 Page Not Found${color.reset}`, error.message);
			return;
		} else
			console.error(`Error fetching file ${filePath}:`, error.message);
	}
}

process.on("SIGINT", () => {
	console.log(`SIGINT | MATCHES: `, matches);
	process.exit();
})

const regex = /(?:https?:\/\/(?:discord\.com|discordapp\.com|canary\.discord\.com|canary\.discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+)/g; // Replace with your regex
// Call the function
fetchContents("1nks", "1nks.github.io", regex).then(() => { console.timeEnd("RunTime"); });
