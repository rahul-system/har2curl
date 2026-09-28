// Shared HAR → curl conversion, used by the CLI (har2curl.js) and the web page (index.html).
(function (root) {
  const SECRET_PARAMS = /^(token|authtoken|access_token|apikey|api_key|password|sessionid)$/i;
  const SECRET_HEADERS = /^(authorization|cookie)$|token|authkey|accesskey|secretkey|api-key/i;

  const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

  const pathOf = (raw) => {
    try {
      return new URL(raw).pathname;
    } catch {
      return raw;
    }
  };

  const scrubUrl = (raw) => {
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

  // Returns [{ status, method, url, path, curl }] for the entries that match the filters.
  function convert(har, { host, method: methodFilter, redact } = {}) {
    const out = [];
    for (const entry of har?.log?.entries ?? []) {
      const req = entry.request;
      if (!req?.url) continue;
      if (host && !req.url.includes(host)) continue;
      if (methodFilter && req.method?.toUpperCase() !== methodFilter.toUpperCase()) continue;

      const method = (req.method ?? 'GET').toUpperCase();
      const url = shq(redact ? scrubUrl(req.url) : req.url);
      const parts = [method === 'GET' ? `curl ${url}` : `curl -X ${method} ${url}`];

      for (const h of req.headers ?? []) {
        // HTTP/2 pseudo-headers and values curl recomputes itself.
        if (h.name.startsWith(':') || /^(host|content-length)$/i.test(h.name)) continue;
        const value = redact && SECRET_HEADERS.test(h.name) ? 'REDACTED' : h.value;
        parts.push(` -H ${shq(`${h.name}: ${value}`)}`);
      }

      if (req.postData?.text) parts.push(` --data-raw ${shq(req.postData.text)}`);

      out.push({
        status: entry.response?.status ?? '?',
        method,
        url: req.url,
        path: pathOf(req.url),
        curl: parts.join(' \\\n'),
      });
    }
    return out;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { convert };
  else root.har2curl = { convert };
})(this);
