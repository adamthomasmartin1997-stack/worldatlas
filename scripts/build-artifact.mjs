// Turns the hash-router build in dist-artifact/ into a page body for the Claude artifact viewer
// (which supplies its own <html>/<head>/<body>), plus the list of files to publish beside it.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-artifact/index.html', 'utf8');
const js = html.match(/src="\.\/(assets\/[^"]+\.js)"/)[1];
const css = html.match(/href="\.\/(assets\/[^"]+\.css)"/)[1];
writeFileSync('dist-artifact/page.html', `<title>Worldwise</title>
<meta name="description" content="An interactive world atlas: explore countries, then test yourself with map games.">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap">
<link rel="stylesheet" href="${css}">
<div id="root"></div>
<script type="module" src="${js}"></script>
`);
console.log(JSON.stringify({ js, css }));
