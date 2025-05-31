const { githubSearch } = require("./codeGithub.js");

console.time("RunTime");
githubSearch("BSGI webhooks").then(() => { console.timeEnd("RunTime"); });