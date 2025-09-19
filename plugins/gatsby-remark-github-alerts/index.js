const toGatsbyRemarkPlugin = require('to-gatsby-remark-plugin');
const remarkGithubBlockquoteAlert = require('remark-github-blockquote-alert');

module.exports = toGatsbyRemarkPlugin(remarkGithubBlockquoteAlert);