const { whLogs } = require('./config.json');
const axios = require("axios");
const { githubSearch } = require('./codeGithub.js');
let { finalLogs } = require("./codeGithub.js");

// my idea is to make a function that generates the urls, this way i can check/save urls that where good to search again
// the function would return like this: https://discord.com/api/webhooks/ language:Javascript grabber
// then change the base url to the next one
// when thats done go back to the beggining of BASES and go to the next lang LANGS
// and so on with the other

const QUERIES = [
	"https://discord.com/api/webhooks/ language:Javascript channel",
	"https://discord.com/api/webhooks/ language:Lua grabber",

	"https://discord.com/api/webhooks/",
	"https://discordapp.com/api/webhooks/",
	"https://ptb.discord.com/api/webhooks/",
	"https://canary.discord.com/api/webhooks/"
];

const NUMBER_OF_WEEKS = 0;

const BASES = [
	"discord.com/api/webhooks/",
	//"discordapp.com/api/webhooks/",
	//"canary.discord.com/api/webhooks/",
	//"ptb.discord.com/api/webhooks/",
	//"canary.discordapp.com/api/webhooks/",
	//"ptb.discordapp.com/api/webhooks/",
	//"https://discord.com/api/webhooks/",
	//"https://discordapp.com/api/webhooks/",
	//"https://raw.githubusercontent.com",
	//"https://canary.discord.com/api/webhooks/",
	//"https://canary.discordapp.com/api/webhooks/",
	//"https://ptb.discord.com/api/webhooks/",
	//"https://ptb.discordapp.com/api/webhooks/",
	//"aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3Mv",
	//"aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3M=",
	//"https://pastebin.com/raw/",
	//" "
];

const LANGS = [
	"language:Javascript",
	"language:Python",
	//"filename:app",
	"path:app",
	"path:webhook",
	//"filename:webhook",
	"filename:script",
	//"path:log",
	"path:index",
	"language:Lua",
	"language:HTML",
	//"language:C#",
	//"language:TypeScript",
	//"language:PHP",
	//"language:Go",
	//"extension:md",
	"extension:env",
	"extension:json",
	//"extension:yaml",
	//"extension:yml",
	//"extension:luau",
	//"extension:lua",
	//"extension:bat",
	//"extension:exe",
	//"extension:csv",
	//"filename:java",
	//"path:java",
	//"extension:cs",
	//"filename:discord",
	"path:discord",
	"path:api",
	"path:image",
	"filename:image.py",
	"filename:config.js",
	"api.ipify.org/",
	".ROBLOSECURITY",
	" "
];

const OTHER = [
	//"https://discord.com/api/webhooks/",
	//"trackers",
	//"popups",
	//"spoofing",
	//"discord spoofer",
	//"roblox executor",
	//"bypasser",
	//"bypass",
	//"grabber",
	//"stealer",
	//"gen",
	//"token",
	//"webhooks",
	//"channel",
	//"bot",
	//"roblox",
	//"bot",
	//"account",
	//"logger",
	//"solara",
	//"cookie",
	//"discord webhook",
	" "
];

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

function getGithubSearchQuery(weeks) {
	if (typeof weeks !== "number" || weeks < 0) {
		throw new Error("Input must be a non-negative number.");
	}

	const now = new Date();
	const startOfWeek = new Date();
	const endOfWeek = new Date();

	// Calculate start of the week (weeks from now)
	startOfWeek.setDate(now.getDate() - now.getDay() - (weeks * 7));
	startOfWeek.setHours(0, 0, 0, 0);

	// Calculate end of the week (1 week after the start of this week)
	endOfWeek.setDate(startOfWeek.getDate() + 6);
	endOfWeek.setHours(23, 59, 59, 999);

	// Format dates to YYYY-MM-DD
	const startDate = startOfWeek.toISOString().split("T")[0];
	const endDate = endOfWeek.toISOString().split("T")[0];

	// GitHub API query for repository creation dates
	return `created:${startDate}..${endDate}`;
}

async function getQuery(BasesI, LangsI, OtherI) {

	const BasesLen = BASES.length;
	const LangsLen = LANGS.length;
	const OtherLen = OTHER.length;

	console.log(BasesLen, LangsLen, OtherLen);

	while (BasesI < BasesLen) {
		while (LangsI < LangsLen) {
			while (OtherI < OtherLen) {
				console.log(`${color.blue}${BASES[BasesI]} ${LANGS[LangsI]} ${OTHER[OtherI]}${color.reset}`);
				await axios.post(whLogs, {username: "Search QUERY", content: `Searching with: \`${BASES[BasesI]} ${LANGS[LangsI]} ${OTHER[OtherI]}\``})
				await githubSearch(`${BASES[BasesI]} ${LANGS[LangsI]} ${OTHER[OtherI]}`);
				console.log(`${color.orange}10sec Wait until next query fetch${color.reset}`);
				await new Promise(resolve => setTimeout(resolve, 10_000));
				OtherI++;
			}
			LangsI++;
			OtherI = 0;
		}
		BasesI++;
		LangsI = 0;
		OtherI = 0;
	}
}

console.time("RunTime");
async function main() {
	await axios.post(whLogs, {content: `### Starting the search...`});
	getQuery(0, 0, 0).then(async () => { console.timeEnd("RunTime"); await axios.post(whLogs, {content: `# Search Ended.\n${finalLogs.total} Webhooks Found.`}); finalLogs = [];});
}

main();