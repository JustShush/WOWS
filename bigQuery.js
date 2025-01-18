const { githubToken } = require('./config.json');
const axios = require("axios");
const fs = require('fs').promises;
const { githubSearch } = require('./codeGithub.js');

// my idea is to make a function that generates the urls, this way i can check/save urls that where good to search again
// the function would return like this: https://discord.com/api/webhooks/ language:Javascript grabber
// then change the base url to the next one
// when thats done go back to the beggining of BASES and go to the next lang LANGS
// and so on with the other

const QUERIES = [
	"https://discord.com/api/webhooks/ language:Javascript channel",
	"https://discord.com/api/webhooks/ language:Lua grabber",

	"https://discord.com/api/webhooks/"
];

const BASES = [
	"https://discord.com/api/webhooks/",
	"https://discordapp.com/api/webhooks/",
	//"https://canary.discord.com/api/webhooks/",
	//"https://canary.discordapp.com/api/webhooks/",
	//"https://ptb.discord.com/api/webhooks/",
	//"https://ptb.discordapp.com/api/webhooks/"
];

const LANGS = [
	"language:Javascript",
	"language:Lua",
	"language:Python",
	"language:HTML",
	"file:*.txt",
];

const OTHER = [
	"grabber",
	"stealer",
	"channel",
	"roblox",
	"bot",
	"account"
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

async function getQuery(BasesI, LangsI, OtherI) {

	const BasesLen = BASES.length;
	const LangsLen = LANGS.length;
	const OtherLen = OTHER.length;

	console.log(BasesLen, LangsLen, OtherLen);

	while (BasesI < BasesLen) {
		while (LangsI < LangsLen) {
			while (OtherI < OtherLen) {
				console.log(`${color.blue}${BASES[BasesI]} ${LANGS[LangsI]} ${OTHER[OtherI]}${color.reset}`);
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
	getQuery(0, 0, 0).then(() => { console.timeEnd("RunTime"); });
}

main();