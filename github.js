console.time("RunTime");
async function main(args) {
	if (!args | args < 1) return console.log("Make sure to type 'code' or 'repo' to choose the type of search you want.")
	if (args[0] == "code")
		require('./codeGithub.js').githubSearch().then(() => { console.timeEnd("RunTime"); });
	else if (args[0] == "repo")
		require('./repoGithub.js').repoSearch().then(() => { console.timeEnd("RunTime"); });
}
main(process.argv.slice(2));