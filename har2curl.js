#!/usr/bin/env node
// har2curl.js — turn a BrowserStack App Live HAR export into curl commands.
//
//   node har2curl.js session.har --host leadsquared.com
//   node har2curl.js session.har --host mobileapi --method POST
//   node har2curl.js session.har --redact > calls.sh      # safe to paste in a ticket
//
// No dependencies. Reads the HAR locally; nothing leaves the machine.

const fs = require('fs');
const { convert } = require('./lib');

const [, , harPath, ...rest] = process.argv;
if (!harPath) {
  console.error(
    'usage: node har2curl.js <file.har> [--host <substr>] [--method <verb>] [--redact]',
  );
  process.exit(1);
}

const flagValue = (flag) => {
  const i = rest.indexOf(flag);
  return i === -1 ? undefined : rest[i + 1];
};
const hostFilter = flagValue('--host');
const methodFilter = flagValue('--method');
const redact = rest.includes('--redact');

const har = JSON.parse(fs.readFileSync(harPath, 'utf8'));
const entries = har?.log?.entries ?? [];

const results = convert(har, { host: hostFilter, method: methodFilter, redact });
for (const r of results) {
  console.log(`# [${r.status}] ${r.method} ${r.path}`);
  console.log(r.curl);
  console.log();
}

const notes = [
  hostFilter && `host ~ ${hostFilter}`,
  methodFilter && `method = ${methodFilter.toUpperCase()}`,
  redact && 'secrets redacted',
]
  .filter(Boolean)
  .join(', ');
console.error(
  `${results.length}/${entries.length} request(s) converted${notes ? ` (${notes})` : ''}`,
);
