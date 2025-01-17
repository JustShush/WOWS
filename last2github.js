const { githubToken } = require('./config.json');
const axios = require("axios");
const fs = require('fs').promises;

// fetch all the repos created in the last 2 days i think, still need to check this last 2 days part

// GITHUB API rate limits:
// Unauthenticated requests: Limited to 60 requests per hour.
// Authencicated requests: Limited to 5_000 requests per hour per token.

// number of repos to fetch
const reposToFetch = 100;

// GitHub API endpoint for search
const GITHUB_SEARCH_URL = 'https://api.github.com/search/repositories';

const filePath = "ignoreRepos.json";

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

function isValidWebhook(url) {
	// Webhook URL validation constants
	const WEBHOOK_VALIDATION = {
		ID_LENGTH: 17,
		TOKEN_LENGTH: { MIN: 60, MAX: 80 }
	};
	try {
		const urlPath = new URL(url).pathname;
		const parts = urlPath.split('/');

		if (parts.length !== 5) return false;

		const [empty, api, webhooks, id, token] = parts;

		if (empty !== '' || api !== 'api' || webhooks !== 'webhooks') return false;

		if (!/^\d{17,19}$/.test(id)) return false;

		if (!/^[A-Za-z0-9_-]+$/.test(token)) return false;

		if (token.length < WEBHOOK_VALIDATION.TOKEN_LENGTH.MIN ||
			token.length > WEBHOOK_VALIDATION.TOKEN_LENGTH.MAX) return false;

		if (/^[X]+$/.test(token) ||
			/^[0-9]+$/.test(token) ||
			/^[a-zA-Z]+$/.test(token) ||
			/^[_-]+$/.test(token)) {
			return false;
		}

		return true;
	} catch (e) {
		return false;
	}
}

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
			if (error.status == 404 && error.message == 'This repository is empty.') {
				console.log(`${color.purple} ${error.response?.data || error.message}${color.reset}`);
				await new Promise(resolve => setTimeout(resolve, 2_000));
			} else if (attempt < retries) {
				console.log(`${color.purple}Retrying... (${attempt}/${retries})${color.reset}`);
			} else {
				await new Promise(resolve => setTimeout(resolve, 10_000));
				throw error;
			}
		}
	}
}

let wasFound = false;
let currentRepo = 1;
let repoCount = 1;
let fileCount = 1;
async function fetchContents(owner, repo, regex, path = '') {
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
			"license.md",
			"license-mit",
			"license-ofl",
			"contributors.md",
			"contributing.md",
			"changelog.md",
			"code_of_conduct.md",
			"issue_template.md",
			"pull_request_template.md",
			"feature_request.md",
			"bug_report.md",
			"arquitecture.md",
			"frame-progress.md",
			"frame.md",

			"codeowners",
			"gradlew",
			"ai_models",

			"tailwind.config.js",
			"eslint.config.js",
			".eslintrc.json",
			".eslintrc.js",
			"tsconfig.json",
			"tsconfig.node.json",
			"vite.config.ts",

			"postcss.config.mjs",

			"package.json",
			"package-lock.json",
			"yarn.lock",

			"requirements.txt",
			"sources.txt",
			"top_level.txt",
			"dependency_links.txt",

			".gitignore",
			".gitattributes",
			".gitkeep",
			".gitconfig",
			".dockerignore",
			".eslintignore",
			".eslintrc.cjs",
			".editorconfig",
			".npmrc",
			".prettierignore",
			".prettierrc",
			".graphqlrc.ts",
			".metadata",
			".swcrc",
			".helmignore",
			".stackblitzrc",
			".mcproject",

			"dockerfile",
			"Makefile",
			"CMakeLists.txt"
		];

		for (const file of files) {
			if (fileCount > 200) continue;
			if (ignoreFiles.includes(file.name.toLowerCase())) {
				console.log(`${color.pink}[fileCount:${fileCount++}] returning early, cuz its a file to ignore:${color.reset}`, file.name, file.html_url);
				await new Promise(resolve => setTimeout(resolve, 800)); // 1sec delay until next file fetch
				continue;
			} else if (file.type === 'file' && !file.name.match(/\.(png|jpg|jpeg|gif|ico|img|bin|webp|svg|avif|pdf|vad|asm|xml|pth|c|h|cpp|hpp|yaml|yml|bat|sh|template|example|sample|toml|css|zip|cmake|cuh|filters|dll|exe|cat|inf|rs|armbian|cfg|lockb|lock|ex|step|csproj|sln|prisma|sql|uf2|dart|xcconfig|xcscheme|xcsettings|plist|xcworkspacedata|entitlements|dm|icns|DS_Store|sum|iml|ignore|ini|vsidx|docx|xsd|resx|compressed|cache|nupkg|p7s|xcf|prop|props|targets|xdt|psm1|psd1|ps1|pdb|altconfig|transform|csv|vcxproj|rc|ipynb|seco|frag|vert|lib|inl|o|s|d|lisp|spec|ui|kts|properties|kt|jsx|pfx|gradle|pro|java|jar|map|php|gql|asset|http|bp|mk|patch|te|pyc|mod|storyboard|cc|swift|pbxproj|xib|manifest|flaxproj|class|cabal|htaccess|apk|typed|go|less|woff|eot|scss|mp4|mp3|pbix|xlsx|tpl|fix|crt|twbx|xaml|epro|crf|dep|sct|htm|lst|tex|sty|bak|prefs|jsp|mov|zig|zon|ld|graphqk|mjs|bank|pdc|fobj|br|editorconfig|rb|gemspec|sym|gz|ino|umap|uasset|wav|vtf|vmt|vpk|ttf|gguf|xpm|tlog|cna|conf|zram|cj|pdf_tex)$/i)) { // Skip binary/image files
				await checkFile(owner, repo, file.path, regex);
			} else if (file.type === 'dir' && !file.name.toLowerCase().match(/^(assets|node_modules|dist|images|img|imgs|art|__pycache__|cache|.cache|models|templates|.obsidian|.vscode|inc|lib|libs|libraries|routes|tests|api|pages|components|ui|docs|legacy|fonts|manager|controller|pkg|drivers|php|ios|android|macos|marketplces|metrics|.settings|bin|css|db)$/i)) {
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

		// Read and parse the JSON file
		const whPreJson = await fs.readFile("webhooks.json", 'utf8');
		const whsJson = JSON.parse(whPreJson);

		const tokensPreJson = await fs.readFile('tokens.json', 'utf8');
		const tokensJson = JSON.parse(tokensPreJson);

		console.log(`[repoCount:${repoCount}/file:${fileCount}] Checking file: ${response.data.name} in ${response.data.html_url}`);

		let invalidCount = 0;
		let i = 0;

		const PASTEBIN_REGEX = /https?:\/\/pastebin\.com\/[a-zA-Z0-9]+/g;
		const gitUserRegex = /https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9+=\/%()_-]+(?<!\))/gm;
		const gitUserMatches = content.match(gitUserRegex) || content.match(PASTEBIN_REGEX);
		if (gitUserMatches) {
			for (link of gitUserMatches) {
				try {
					const res = await axios.get(link);
					// checks for base of webhook url encoded in base64
					const matchesBase64 = res.data.match(regex);
					if (matchesBase64) {
						for (base of matchesBase64) {
							const decoded = Buffer.from(base, 'base64').toString('utf-8');
							const matching = decoded.match(webhookRegex);
							if (matching) {
								matching.forEach((wh) => {
									if (!isValidWebhook(wh)) return invalidCount++;
									if (whsJson.removed.includes(wh) || whsJson.hooks.includes(wh)) {
										console.log(`Already tested link: ${wh}`);
										return;
									} else {
										console.log(`Found webhook in file: ${item.html_url}`);
										i++;
										console.log(`[${i}] Webhook: ${wh}`);
										const data = {
											path: item.path,
											name: item.name,
											html_url: item.html_url,
											webhook: wh
										};
										whArray.push(data);
									}
								})
							}
						}
					}
					// checks for possible discord bot tokens (almost impossible cuz github and discord notify the user first)
					const tokens = res.data.match(/[a-zA-Z0-9_\-]{24}\.[a-zA-Z0-9_\-]{6}\.[a-zA-Z0-9_\-]{27}/g);
					if (tokens) {
						tokens.forEach((t) => {
							if (tokensJson.invalid.includes(t) || tokensJson.valid.includes(t)) {
								console.log(`Already tested TOKEN or its already in the valid array: ${t}`);
								return;
							} else {
								tokensJson.valid = [...tokensJson.valid, t];
								console.log(t);
							}
						});
						await fs.writeFile('tokens.json', JSON.stringify(tokensJson, null, '\t'));
					}
					// normal check for webhooks after the link has been read
					const finds = res.data.match(webhookRegex);
					if (finds) {
						finds.forEach((wh) => {
							if (!isValidWebhook(wh)) return invalidCount++;
							if (whsJson.removed.includes(wh) || whsJson.hooks.includes(wh)) {
								console.log(`Already tested link: ${wh}`);
								return;
							} else {
								console.log(`Found webhook in file: ${item.html_url}`);
								i++;
								console.log(`[${i}] Webhook: ${wh}`);
								matches.push({
									path: item.path,
									name: item.name,
									html_url: item.html_url,
									webhook: wh,
									createdAt: item.created_at
								});
							}
						})
						console.log(`${color.green}[repoCount:${repoCount}/file:${fileCount}] Match found in file:${color.reset} ${filePath} | ${response.data.html_url}`);
						wasFound = true;
						console.log(`Invalid links found: ${invalidCount}`);
					}
					// idealy i would save the links that didnt find anything but ya, too much work <3
				} catch (err) {
					if (err.status == 404 || err.status == 400) {}
					else console.log(`Problem when trying to fetch: ${link}:`, err.response?.data || err.message);
					continue;
				}
			}
		}

		const regexBase64 = /aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3Mv[A-Za-z0-9+/=]*/g;
		const matchesBase64 = content.match(regexBase64);
		if (matchesBase64) {
			for (base of matchesBase64) {
				const decoded = Buffer.from(base, 'base64').toString('utf-8');
				const matching = decoded.match(regex);
				if (matching) {
					matching.forEach((wh) => {
						if (!isValidWebhook(wh)) return invalidCount++;
						if (whsJson.removed.includes(wh) || whsJson.hooks.includes(wh)) {
							console.log(`Already tested link: ${wh}`);
							return;
						} else {
							console.log(`Found webhook in file: ${item.html_url}`);
							i++;
							console.log(`[${i}] Webhook: ${wh}`);
							matches.push({
								path: response.data.path,
								name: response.data.name,
								html_url: response.data.html_url,
								webhook: wh,
								createdAt: response.data.created_at
							});
						}
					})
					console.log(`${color.green}[repoCount:${repoCount}/file:${fileCount}] Match found in file:${color.reset} ${filePath} | ${response.data.html_url}`);
					wasFound = true;
					console.log(`Invalid links found: ${invalidCount}`);
				}
			}
		}

		const tokens = content.match(/[a-zA-Z0-9_\-]{24}\.[a-zA-Z0-9_\-]{6}\.[a-zA-Z0-9_\-]{27}/g);
		if (tokens) {
			tokens.forEach((t) => {
				if (tokensJson.invalid.includes(t) || tokensJson.valid.includes(t)) {
					console.log(`Already tested TOKEN or its already in the valid array: ${t}`);
					return;
				} else {
					tokensJson.valid = [...tokensJson.valid, t];
					console.log(t);
				}
			});
			await fs.writeFile('tokens.json', JSON.stringify(tokensJson, null, '\t'));
		}

		// Search for regex matches
		const whs = content.match(regex);
		if (whs) {
			//matches.push(...found); // Push all matches into the array
			whs.forEach((wh) => {
				if (!isValidWebhook(wh)) return invalidCount++;
				if (whsJson.removed.includes(wh)) {
					console.log(`${color.purple}Already tested link:${color.reset} ${wh}`);
					return;
				} else {
					console.log(`${color.green}Found webhook in file:${color.reset} ${response.data.html_url}`);
					i++;
					console.log(`[${i}] Webhook: ${wh}`);
					matches.push({
						path: response.data.path,
						name: response.data.name,
						html_url: response.data.html_url,
						webhook: wh,
						createdAt: response.data.created_at
					});
				}
			});
			console.log(`${color.green}[repoCount:${repoCount}/file:${fileCount}] Match found in file:${color.reset} ${filePath} | ${response.data.html_url}`);
			wasFound = true;
			console.log(`Invalid links found: ${invalidCount}`);
		}
		invalidCount = 0;
		i = 0;
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

// Generate ISO date for two days ago
function getTwoDaysAgoISODate() {
	const date = new Date();
	date.setDate(date.getDate() - 2);
	return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

// Fetch repositories created in the last two days
async function fetchRecentRepositories() {
	console.time("RunTime");
	const twoDaysAgo = getTwoDaysAgoISODate();
	const query = `created:>${twoDaysAgo}`; // Search query for repos created after two days ago

	let page = 1;
	while (true) {
		try {
			console.log(`Fetching page ${page}...`);
			const url = `${GITHUB_SEARCH_URL}?q=${query}&per_page=${reposToFetch}&sort=created&order=desc${page >= 1 ? `&page=${page}` : ""}`;

			const response = await axios.get(url, {
				headers: {
					'Accept': 'application/vnd.github+json',
					'Authorization': `token ${githubToken}`, // Replace with your token
				},
			});

			const repositories = response.data.items;

			// If no items are found, exit early
			if (!repositories || repositories.length === 0) {
				console.log("No results found.", res.data);
				return;
			}

			const regex = /(?:https?:\/\/(?:discord\.com|discordapp\.com|canary\.discord\.com|canary\.discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+)/g; // Replace with your regex

			// Read and parse the JSON file
			const preJson = await fs.readFile(filePath, 'utf8');
			const reposJSON = JSON.parse(preJson);

			// save already in lowerCase
			/* reposJSON.ignoreRepos = reposJSON.ignoreRepos.map(repo => ({
				name: repo.name.toLowerCase(),
				...repo
			})); */

			const lowercasedReposNames = reposJSON.ignoreRepos.map(repo => repo.repoName.toLowerCase());
			const lowercasedReposOwners = reposJSON.ignoreRepos.map(repo => repo.repoOwner.toLowerCase());
			for (repo of repositories) {
				if (lowercasedReposNames.includes(repo.name.toLowerCase()) && lowercasedReposOwners.includes(repo.owner.login.toLowerCase())) {
					console.log(`${color.blue} Skipped ${repo.html_url}, it was already checked before and had nothing.${color.reset}`)
					console.log(`${color.yellow}[repoCount:${repoCount}] Waiting 3sec until next repo fetch |SKIPPED|${color.reset}`);
					await new Promise(resolve => setTimeout(resolve, 3_000)); // 3sec delay until next fetchs
					currentRepo++;
					continue;
				}
				await fetchContents(repo.owner.login, repo.name, regex);
				const match = repo.html_url.match(/github\.com\/([^\/]+\/[^\/]+)/);
				if (wasFound) console.log(`${color.green}wasFound: ${wasFound} | match[1]: ${match[1]}${color.reset}`);
				else console.log(`wasFound: ${wasFound} | match[1]: ${match[1]}`);
				if (!wasFound && match && match[1]) {
					const [org, repoName] = match[1].split('/');
					reposJSON.ignoreRepos = [...reposJSON.ignoreRepos, { repoOwner: org, repoName: repoName, createdAt: repo.created_at }];
					await fs.writeFile(filePath, JSON.stringify(reposJSON, null, "\t"));
				}
				console.log(`${color.yellow}[page:${page}|repoCount:${repoCount}/${currentRepo}] Waiting 10sec until next repo fetch${color.reset}`);
				await new Promise(resolve => setTimeout(resolve, 10_000)); // 10sec delay until next fetchs
				repoCount++;
				currentRepo++;
				fileCount = 1;
				wasFound = false;
			}

			/* repositories.forEach(repo => {
				console.log(`Repo: ${repo.name}`);
				console.log(`Owner: ${repo.owner.login}`);
				console.log(`URL: ${repo.html_url}`);
				console.log(`Created At: ${repo.created_at}`);
				console.log('----------------------');
			}); */
			console.log(repositories.length);
			console.log('All matches:', matches);
			const gwebhooksPath = "gwebhooks.json";
			const gwebhooksPreJson = await fs.readFile(gwebhooksPath, 'utf-8');
			const gwebhooksJson = JSON.parse(gwebhooksPreJson);

			gwebhooksJson.gwh = [...gwebhooksJson.gwh, ...matches];

			await fs.writeFile(gwebhooksPath, JSON.stringify(gwebhooksJson, null, "\t"));
			wasFound = false;
			console.log(`Waiting 5sec to fetch the next page: ${page + 1}`);
			await new Promise(resolve => setTimeout(resolve, 5_000));
			page++;
		} catch (err) {
			if (err.response?.status == 403) {
				console.error(`${color.red}Got 403 Forbidden (rate limit)${color.reset}`, err.message);
				console.log('Early matches:', matches);
				process.exit();
			} else if (err.response?.status == 422) {
				console.error(`ERROR: Cannot access beyond the first 1000 results, or the endpoint has been spammed. when trying to fetch page: ${page}`, err.response.statusText)
				console.log('Matches:', matches);
				console.log(`${color.green}Searched for: |${query}|${color.reset}`);
			}
			else if (err.response)
				console.error(`Error ${err.response.status} on page ${page}: ${err.response.statusText}`);
			else {
				console.error(`Error fetching page ${page}:`, err.message, err);
				console.log('Early matches:', matches);
				process.exit();
			}
			break;
		}
	}
}

process.on("SIGINT", () => {
	console.log(`SIGINT | MATCHES: `, matches);
	console.timeEnd("RunTime");
	process.exit();
})

// Call the function
fetchRecentRepositories().then(() => { console.timeEnd("RunTime"); });
