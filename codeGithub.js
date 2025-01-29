const { githubToken } = require('./config.json');
const axios = require("axios");
const fs = require('fs').promises;

// make the search in code but with pagination

// what you want to be searched
const query = "https://discord.com/api/webhooks/ language:C#";

// to fetch for best match or recently updated
// false to recently updated | true for best match
const bestMatch = false;

const filePath = "gwebhooks.json";

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

const BASE = "https://discord.com/api/webhooks/";
const webhookRegex = /(?:https?:\/\/(?:discord\.com|discordapp\.com|canary\.discord\.com|canary\.discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+)(\?[^\s"'()]*)?/g;
const regex = /aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3Mv[A-Za-z0-9+/=]*/g;
const WH_BASE_REGEX = /aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3Mv/g;
const WH_LAST_PART_REGEX = /[A-Za-z0-9]{16,}\/[A-Za-z0-9_\-]{68}/g;
const gitUserRegex = /https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9+=\/%()_-]+(?<!\))/gm;

const PASTEBIN_REGEX = /https?:\/\/pastebin\.com\/[a-zA-Z0-9]+/g;
const PASTEBIN_RAW_REGEX = /https?:\/\/pastebin\.com\/raw\/[a-zA-Z0-9]+/g;
const GITHUB_USER_REGEX = /https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9+=\/%()_-]+(?<!\))/gm;
const TELEGRAM_TOKEN_REGEX = /^\d{9}:[A-Za-z0-9_-]{35}$/gm;

var whArray = [];
var visitedGitusercontentURLs = [];

/**
 * Checks if a Discord webhook is valid.
 * @param {string} webhookUrl - The Discord webhook URL to check.
 * @returns {Promise<boolean>} - Returns true if the webhook is valid, false otherwise.
 */
async function whChecker(webhookUrl, retries = 4) {
	try {
		const response = await axios.get(webhookUrl);
		await new Promise(resolve => setTimeout(resolve, 500));
		return response.status === 200;
	} catch (err) {
		if (retries > 0 && err.response?.status === 429) { // Too many requests
			console.log(`${color.red}WH Checker Rate limited. Retrying in ${(3 * 2) ** (5 - retries)} seconds...${color.reset}`);
			await new Promise((resolve) => setTimeout(resolve, (3 * 2) ** (5 - retries) * 1000));
			return whChecker(webhookUrl, retries - 1);
		}
		return false;
	}
}

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

function removeDuplicates(data) {
	// Create a Set to track unique webhooks
	const seenWebhooks = new Set();

	// Filter the array to include only unique webhooks
	return data.filter(item => {
		if (seenWebhooks.has(item.webhook)) {
			return false; // Exclude if the webhook is already seen
		} else {
			seenWebhooks.add(item.webhook); // Mark this webhook as seen
			return true; // Include the item
		}
	});
}

async function getLinksFromPastebin(url, item, whsJson, tokensJson) {
	try {
		const response = await axios.get(url);
		const content = response.data;
		// checks for base of webhook url encoded in base64
		const matchesBase64 = content.match(regex);
		if (matchesBase64) {
			for (base of matchesBase64) {
				const decoded = Buffer.from(base, 'base64').toString('utf-8');
				const matching = decoded.match(webhookRegex);
				if (matching) {
					matching.forEach((wh) => {
						if (!isValidWebhook(wh)) return invalidCount++;
						if (whsJson.removed.includes(wh) || whsJson.hooks.includes(wh)) {
							//console.log(`Already tested link: ${wh}`);
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
		const links = content.match(PASTEBIN_REGEX) || content.match(PASTEBIN_RAW_REGEX) || content.match(GITHUB_USER_REGEX) || [];
		// checks for possible discord bot tokens (almost impossible cuz github and discord notify the user first)
		const tokens = content.match(/[a-zA-Z0-9_\-]{24}\.[a-zA-Z0-9_\-]{6}\.[a-zA-Z0-9_\-]{27}/g);
		if (tokens) {
			console.log("ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss")
			tokens.forEach((t) => {
				if (tokensJson.invalid.includes(t) || tokensJson.valid.includes(t)) {
					console.log(`Already tested TOKEN or its already in the valid array: ${t}`);
					return;
				} else
					tokensJson.valid = [...tokensJson.valid, t];
			});
			await fs.writeFile('tokens.json', JSON.stringify(tokensJson, null, '\t'));
		}
		// normal check for webhooks after the link has been read
		const finds = content.match(webhookRegex);
		if (finds) {
			let i = 0;
			finds.forEach((wh) => {
				if (!isValidWebhook(wh)) return;
				if (whsJson.removed.includes(wh) || whsJson.hooks.includes(wh)) {
					console.log(`Already tested link: ${wh}`);
					return;
				} else {
					console.log(`${color.torquise}Found one from:${color.reset} ${url}`);
					console.log(`Found webhook in file: ${item.html_url}`);
					i++;
					console.log(`[${i}] Webhook: ${wh}`);
					whArray.push({
						path: item.path,
						name: item.name,
						html_url: item.html_url,
						webhook: wh,
						createdAt: item.created_at
					});
				}
			})
		}
		const lastPartMatches = content.match(WH_LAST_PART_REGEX);
		if (lastPartMatches) {
			lastPartMatches.forEach((lp) => {
				console.log(item.html_url, BASE + lp);
				if (!isValidWebhook(BASE + lp)) return invalidCount++;
				if (whArray.includes(BASE + lp)) return;
				if (whsJson.removed.includes(BASE + lp) || whsJson.hooks.includes(BASE + lp)) {
					//console.log(`Already tested link: ${wh}`);
					return;
				} else {
					console.log(`Found webhook in file: ${item.html_url}`);
					i++;
					console.log(`${color.green}[${i}] Webhook:${color.reset} ${BASE + lp}`);
					const data = {
						path: item.path,
						name: item.name,
						html_url: item.html_url,
						webhook: BASE + lp
					};
					whArray.push(data);
				}
			})
		}
		return { content, links };
	} catch (error) {
		if (error.status == 404 || error.status == 400) { }
		else console.error(`Failed to fetch URL: ${url}`, error.message);
		return { content: '', links: [] };
	}
}

async function readFileAndExtractLinks(links, item, whsJson, tokensJson) {
	try {
		const visited = new Set();
		const ignoreLinks = [
			"https://raw.githubusercontent.com/EdgeIY/infiniteyield/master/version",
			"https://raw.githubusercontent.com/shlexware/domainx/main/latest",
			"https://raw.githubusercontent.com/23Asmo/evolutionfixes/main/config",
			"https://raw.githubusercontent.com/Blank-c/Blank-Grabber/main/Blank%20Grabber/Extras/hash",
			"https://raw.githubusercontent.com/rodcordeiro/bot_beltis/master/version",
			"https://raw.githubusercontent.com/smashie420/Epic-Games-Today-Free-Day/master/version",
			"https://raw.githubusercontent.com/Birkegud/TerminatorAC/main/Source/version",
			"https://raw.githubusercontent.com/xariesnull/fivem-secured/main/version",
			"https://raw.githubusercontent.com/AardPlugins/Aardwolf-Nulan-Mobs/refs/heads/main/VERSION",
			"https://raw.githubusercontent.com/Yappering/api/main/v1/profiles-plus",
			"https://raw.githubusercontent.com/Mikasuru/InternalRaid/refs/heads/main/version", ,
			"https://raw.githubusercontent.com/Quenty/NevermoreEngine/version2/Modules/Shared/Events/Signal",
			"https://raw.githubusercontent.com/haritprince/revengex/main/ips-active-allinone",
			"https://raw.githubusercontent.com/HeyGyt/idiote/main/main",
			"https://raw.githubusercontent.com/dawid-scripts/Fluent/master/Addons/SaveManager",
			"https://raw.githubusercontent.com/evoincorp/lucideblox/master/src/modules/util/icons",
			"https://raw.githubusercontent.com/laagginq/Evolution/main/akali",
			"https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW",
			"https://raw.githubusercontent.com/Aidez/emojiscopy/master/main",
			"https://github.com/dafinffx/quantumxz/blob/5e9e1bc14877ed6398a48603b0aa8ba115123173/script.js",
			"https://github.com/joseminelli/Convite/blob/1e32c81085bd52a491869b236481b800f9ef3b33/script.js",
			"https://github.com/kamin9/Log-in-page/blob/36658fc25f97bb4c7eaf6e60ac98a7697ddf2f74/script.js",
			"https://github.com/catgirlshadows/lunarstore/blob/238d651a658ae197f6b3ee54c8d074e8249bd643/script.js",
			"https://raw.githubusercontent.com/EliasAtto1/BeamedWare/main/BeamedWare2",
			"https://raw.githubusercontent.com/NighterEpic/Faded-Grid/main/YesEpic",
			"https://raw.githubusercontent.com/ImagineProUser/vortexdahood/main/vortex",
			"https://raw.githubusercontent.com/1f0yt/community/main/Changer",
			"https://raw.githubusercontent.com/Historia00012/HISTORIAHUB/main/BSS%20FREE",
			"https://raw.githubusercontent.com/ProjectpopCat/ywxoscripts/main/EatBlocksSim70",
			"https://raw.githubusercontent.com/cool83birdcarfly02six/DrivingEmpireEvents/main/README",
			"https://raw.githubusercontent.com/JackCSTM/eclipsex/main/script",
			"https://raw.githubusercontent.com/OhhMyGehlee/CA2/main/Solara",
			"https://raw.githubusercontent.com/fuckmath/shit/main/main",
			"https://raw.githubusercontent.com/SlamminPig/rblxgames/main/Epic%20Minigames/EpicMinigamesGUI",
			"https://raw.githubusercontent.com/FFJ1/Roblox-Exploits/main/scripts/Loader",
			"https://raw.githubusercontent.com/bloodball/-back-ups-for-libs/main/wizard",
			"https://raw.githubusercontent.com/xQuartyx/DonateMe/main/OldBf",
			"https://raw.githubusercontent.com/EnterpriseExperience/MicUpSource/main/doMICUP",
			"https://raw.githubusercontent.com/EnterpriseExperience/MicUpSource/refs/heads/main/retrieve_branch_version.lua",
			"https://raw.githubusercontent.com/Mei2232/ZaqueHub/main/Zaque%20Hub",
			"https://raw.githubusercontent.com/IrishBaker/scripts/main/decaying%20winter/Passive%20Heal",
			"https://raw.githubusercontent.com/GamingScripter/scripts/main/TOH",
			"https://raw.githubusercontent.com/Iliankytb/Iliankytb/main/SpeedrunTimer",
			"https://raw.githubusercontent.com/acsun124/pluh-s-properties/main/v1-official",
			"https://raw.githubusercontent.com/xuewuhen999/mybox/main/sj2",
			"https://raw.githubusercontent.com/Ethanoj1/EclipseMM2/master/Script",
			"https://raw.githubusercontent.com/KINGHUB01/BlackKing-obf/main/TheSB",
			"https://raw.githubusercontent.com/AlznX/Roblox-Scripts/main/Psycho%20Hub",
			"https://raw.githubusercontent.com/3dsonsuce/acrylix/main/Acrylix",
			"https://raw.githubusercontent.com/Vortex194/main/main/oilwarfare",
			"https://raw.githubusercontent.com/LiverMods/xRawnder/main/HubMoblieName/MainV5",
			"https://raw.githubusercontent.com/FrozenScripts/frozenhubb/main/frozenhub1",
			"https://raw.githubusercontent.com/Aidez/decaying_winter/main/GOODWILL_COMMAND_SCRIPT",
			"https://raw.githubusercontent.com/XLinestX/GUI-Library/main/Venyx",
			"https://raw.githubusercontent.com/Jason376-alt/jason/refs/heads/main/supermanfly",
			"https://raw.githubusercontent.com/AEMDxLongHip/ScriptBloxFruit/main/GenshinHubKaitunV2",
			"https://raw.githubusercontent.com/HeyGyt/star/main/main",
			"https://raw.githubusercontent.com/HeyGyt/holidayfeels/main/main",
			"https://raw.githubusercontent.com/HeyGyt/classicanimations/main/main",
			"https://raw.githubusercontent.com/fieu/discord",
			"https://raw.githubusercontent.com/eltrul/Annie/main/JroIrokOro2jJnkP",
			"https://raw.githubusercontent.com/daucoghe2/daucoghe/main/Esp",
			"https://raw.githubusercontent.com/TerrHacks/Sb2Cheats/main/Code",
			"https://raw.githubusercontent.com/ImDigitalz/MoriScripts/main/MM2",
			"https://raw.githubusercontent.com/ThatSick/HighlightMM2/main/Main",
			"https://raw.githubusercontent.com/DExploitz/ExoticHub/main/SBBYGRG",
			"https://raw.githubusercontent.com/bloodball/-back-ups-for-libs/main/wall%20v3",
			"https://raw.githubusercontent.com/smartsosilly/rblxScripts/main/srcs/treasureQuest",
			"https://raw.githubusercontent.com/20Matrix77/dsfuwqu/main/zombie",
			"https://raw.githubusercontent.com/Crostide/cdhc/main/gui",
			"https://raw.githubusercontent.com/Psxvoidyx/Murdermysvoid2/main/Darkxyz23",
			"https://raw.githubusercontent.com/Nosssa/NossLock/main/IndexWinterMAIN",
			"https://raw.githubusercontent.com/Gokou300/Gokou300/main/KJ%20Character%20By%20Titan%20Camera%20Woman%20Real%20Source",
			"https://raw.githubusercontent.com/VEZ2/NEVAHUB/main/2",
			"https://raw.githubusercontent.com/samirayt/Whitelist/main/Whitelist%20Pago",
			"https://raw.githubusercontent.com/complexorganizations/bandwidth-waster/main/random-test-file",

			"https://pastebin.com/search",
			"https://pastebin.com/raw"
		];
		ignoreLinks.forEach((url) => visitedGitusercontentURLs.push(url));

		async function recursiveLinkChecker(linksToCheck, item, whsJson, tokensJson) {
			for (const link of linksToCheck) {
				if (visitedGitusercontentURLs.includes(link)) { console.log(`${color.torquise}Ignored:${color.reset} ${link}`); continue; }
				if (!visited.has(link)) {
					visited.add(link);
					visitedGitusercontentURLs.push(link);
					console.log(`${color.orange}Visiting:${color.reset} ${link}`);
					const { links: newLinks } = await getLinksFromPastebin(link, item, whsJson, tokensJson);
					await recursiveLinkChecker(newLinks, item, whsJson, tokensJson);
				}
			}
		}

		await recursiveLinkChecker(links, item, whsJson, tokensJson);
	} catch (error) {
		if (err.status == 404 || err.status == 400) { }
		else console.log(error.response?.data || error.message);
	}
}

async function githubSearch(QUERY) {

	let page = 1;
	while (true) {
		try {
			console.log(`Fetching page ${page}...`);
			let url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=100${bestMatch ? "" : "&sort=updated"}&order=desc${page >= 1 ? `&page=${page}` : ""}`;
			if (QUERY) url = `https://api.github.com/search/code?q=${encodeURIComponent(QUERY)}&per_page=100${bestMatch ? "" : "&sort=updated"}&order=desc${page >= 1 ? `&page=${page}` : ""}`;

			const res = await axios.get(url, {
				headers: {
					Authorization: `token ${githubToken}`
				}
			});

			const items = res.data.items;

			// If no items are found, exit early
			if (!items || items.length === 0) {
				console.log("No results found.", res.data);
				console.log(`${color.green}Searched for: |${QUERY ? QUERY : query}| with Best Match: ${bestMatch}${color.reset}`);
				return;
			}

			// Read and parse the JSON file
			const preJson = await fs.readFile(filePath, 'utf8');
			const webhooksJson = JSON.parse(preJson);

			// Read and parse the JSON file
			const whPreJson = await fs.readFile("webhooks.json", 'utf8');
			const whsJson = JSON.parse(whPreJson);

			let invalidCount = 0;
			let i = 0;
			// Iterate over each item to fetch file content
			for (const item of items) {
				const fileUrl = item.url; // URL to fetch the file content

				try {
					const fileRes = await axios.get(fileUrl, {
						headers: {
							Authorization: `token ${githubToken}`
						}
					});

					const tokensPreJson = await fs.readFile('tokens.json', 'utf8');
					const tokensJson = JSON.parse(tokensPreJson);

					const fileContent = Buffer.from(fileRes.data.content, 'base64').toString('utf-8');

					const gitUserMatches = fileContent.match(gitUserRegex);
					if (gitUserMatches) {
						readFileAndExtractLinks(gitUserMatches, item, whsJson, tokensJson);
					}

					const matchesBase64 = fileContent.match(regex);
					if (matchesBase64) {
						for (base of matchesBase64) {
							const decoded = Buffer.from(base, 'base64').toString('utf-8');
							const matching = decoded.match(webhookRegex);
							if (matching) {
								matching.forEach((wh) => {
									if (!isValidWebhook(wh)) return invalidCount++;
									if (whsJson.removed.includes(wh) || whsJson.hooks.includes(wh)) {
										//console.log(`Already tested link: ${wh}`);
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

					const tokens = fileContent.match(/[a-zA-Z0-9_\-]{24}\.[a-zA-Z0-9_\-]{6}\.[a-zA-Z0-9_\-]{27}/g);
					if (tokens) {
						tokens.forEach((t) => {
							if (tokensJson.invalid.includes(t) || tokensJson.valid.includes(t)) {
								//console.log(`Already tested TOKEN or its already in the valid array: ${t}`);
								return;
							} else {
								tokensJson.valid = [...tokensJson.valid, t];
								console.log(t);
							}
						});
						await fs.writeFile('tokens.json', JSON.stringify(tokensJson, null, '\t'));
					}

					const matches = fileContent.match(webhookRegex);
					if (matches) {
						matches.forEach((webhook) => {
							if (!isValidWebhook(webhook)) return invalidCount++;
							// Skip the link if it's already tested
							if (whsJson.removed.includes(webhook) || whsJson.hooks.includes(webhook)) {
								//console.log(`Already tested link: ${webhook}`);
								return;
							} else {
								console.log(`Found webhook in file: ${item.html_url}`);
								i++;
								console.log(`[${i}] Webhook: ${webhook}`);
								const data = {
									path: item.path,
									name: item.name,
									html_url: item.html_url,
									webhook: webhook
								};
								whArray.push(data);
							}
						})
					}

					// make it regex for just the base of the encoded link
					// and then using another regex for the "id/token" of the webhook and add them together if there are
					const lastPartMatches = fileContent.match(WH_LAST_PART_REGEX);
					if (lastPartMatches) {
						lastPartMatches.forEach((lp) => {
							if (!isValidWebhook(BASE + lp)) return invalidCount++;
							if (whArray.includes(BASE + lp)) return console.log(`Already checked: ${BASE + lp}`);
							if (whsJson.removed.includes(BASE + lp) || whsJson.hooks.includes(BASE + lp)) return;
							console.log(`Found webhook in file: ${item.html_url}`);
							i++;
							console.log(`[${i}] Webhook: ${BASE + lp}`);
							const data = {
								path: item.path,
								name: item.name,
								html_url: item.html_url,
								webhook: BASE + lp
							};
							whArray.push(data);
						})
					}

					await new Promise(resolve => setTimeout(resolve, 500)); // I think i can do 10 requests per minute
				} catch (fileErr) {
					if (fileErr.status == 403) {
						// forbidden, returns when im getting rate limited
						console.log(`Forbidden, rate limit reached`, fileErr);
						console.log(whArray);
						process.exit();
					} else
						console.error(`Error fetching file content for ${item.html_url}:`, fileErr.response?.data || fileErr.message);
				}
			};

			console.log(`Invalid links found: ${invalidCount}`);

			const invalidWebhooks = [];
			const validateWebhooks = async () => {
				const validWebhooks = [];
				for (const item of whArray) {
					//console.log(`Checking ${item.webhook}`);
					const isValid = await whChecker(item.webhook);
					if (!isValid) {
						//console.log(isValid, `${item.webhook}`);
						invalidWebhooks.push(item.webhook);
					} else {
						validWebhooks.push(item); // Keep the valid item
					}
					await new Promise(resolve => setImmediate(() => setTimeout(resolve, 300)));
				}
				return validWebhooks; // Return only valid webhooks
			};

			whArray = removeDuplicates(whArray);

			whArray = await validateWebhooks();

			// Update the JSON structure
			webhooksJson.gwh = [...webhooksJson.gwh, ...whArray];

			webhooksJson.gwh = removeDuplicates(webhooksJson.gwh);

			console.log(`${color.purple}Writing to |${filePath}|${color.reset}`);
			// Write the updated JSON back to the file
			await fs.writeFile(filePath, JSON.stringify(webhooksJson, null, "\t"));

			// save into webhooks.json
			whsJson.hooks = [...whsJson.hooks, ...webhooksJson.gwh.map(obj => obj.webhook)];

			// remove duplicates
			whsJson.hooks = [...new Set(whsJson.hooks)];

			whsJson.removed = [...whsJson.removed, ...new Set(invalidWebhooks)];

			whsJson.removed = [...new Set(whsJson.removed)];

			console.log(`${color.purple}Writing to |webhooks.json|${color.reset}`);
			// Write the updated JSON back to the file
			await fs.writeFile("webhooks.json", JSON.stringify(whsJson, null, "\t"));
			// Add delay between requests
			console.log(`Waiting 10 sec to fetch the next page: ${page + 1}`);
			await new Promise(resolve => setTimeout(resolve, 10_000));
			whArray = [];
			page++;
		} catch (err) {
			if (err.response.status == 422) {
				console.error(`ERROR: Cannot access beyond the first 1000 results, or the endpoint has been spammed. when trying to fetch page: ${page}`, err.response.statusText)
				console.log(`${color.green}Searched for: ${QUERY ? QUERY : query} | with Best Match: ${bestMatch}${color.reset}`);
			} else if (err.response)
				console.error(`Error ${err.response.status} on page ${page}: ${err.response.statusText}`);
			else
				console.error(`Error fetching page ${page}:`, err.message);
			break;
		}
	}
}

module.exports = { githubSearch };

//githubSearch().then(() => { console.timeEnd("RunTime"); });