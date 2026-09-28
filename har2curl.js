#!/usr/bin/env node
// har2curl.js — turn a BrowserStack App Live HAR export into curl commands.
//
//   node har2curl.js session.har --host leadsquared.com
//   node har2curl.js session.har --host mobileapi --method POST
//   node har2curl.js session.har --redact > calls.sh      # safe to paste in a ticket
//
// No dependencies. Reads the HAR locally; nothing leaves the machine.

const fs = require('fs');

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

const SECRET_PARAMS = /^(token|authtoken|access_token|apikey|api_key|password|sessionid)$/i;
const SECRET_HEADERS = /^(authorization|cookie|x-api-key|x-auth-token)$/i;

const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

const pathOf = (raw) => {
  try {
    return new URL(raw).pathname;
  } catch {
    return raw;
  }
};

const scrubUrl = (raw) => {
  if (!redact) return raw;
  try {
    const u = new URL(raw);
    for (const k of [...u.searchParams.keys()]) {
      if (SECRET_PARAMS.test(k)) u.searchParams.set(k, 'REDACTED');
    }
    return u.toString();
  } catch {
    return raw;
  }
};

const har = JSON.parse(fs.readFileSync(harPath, 'utf8'));
const entries = har?.log?.entries ?? [];

let converted = 0;
for (const entry of entries) {
  const req = entry.request;
  if (!req?.url) continue;
  if (hostFilter && !req.url.includes(hostFilter)) continue;
  if (methodFilter && req.method?.toUpperCase() !== methodFilter.toUpperCase()) continue;

  const method = (req.method ?? 'GET').toUpperCase();
  const url = shq(scrubUrl(req.url));
  const parts = [method === 'GET' ? `curl ${url}` : `curl -X ${method} ${url}`];

  for (const h of req.headers ?? []) {
    // HTTP/2 pseudo-headers and values curl recomputes itself.
    if (h.name.startsWith(':') || /^(host|content-length)$/i.test(h.name)) continue;
    const value = redact && SECRET_HEADERS.test(h.name) ? 'REDACTED' : h.value;
    parts.push(` -H ${shq(`${h.name}: ${value}`)}`);
  }

  if (req.postData?.text) parts.push(` --data-raw ${shq(req.postData.text)}`);

  console.log(`# [${entry.response?.status ?? '?'}] ${method} ${pathOf(req.url)}`);
  console.log(parts.join(' \\\n'));
  console.log();
  converted++;
}

const notes = [
  hostFilter && `host ~ ${hostFilter}`,
  methodFilter && `method = ${methodFilter.toUpperCase()}`,
  redact && 'secrets redacted',
]
  .filter(Boolean)
  .join(', ');
console.error(
  `${converted}/${entries.length} request(s) converted${notes ? ` (${notes})` : ''}`,
);
