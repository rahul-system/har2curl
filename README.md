# har2curl

Turn a HAR export (for example from a BrowserStack App Live session) into curl commands you can re-run or paste into a ticket.

No dependencies. The HAR is read locally and nothing leaves your machine.

**Not comfortable with the terminal?** Use the web page instead: https://rahul-system.github.io/har2curl/. Drop your `.har` file on it, filter, and click **Copy**. The file is processed in your browser and never uploaded.

## Requirements

- Node.js 14 or newer (`node --version` to check)

## Usage

1. **Export the HAR.** In your BrowserStack App Live session, download the network logs as a `.har` file (e.g. `session.har`).

2. **Run har2curl on it.** No install needed:

   ```sh
   npx github:rahul-system/har2curl session.har
   ```

   Each request is printed as a curl command, preceded by a comment with its status and path:

   ```sh
   # [200] POST /v2/LeadManagement.svc/Lead.Capture
   curl -X POST 'https://api.leadsquared.com/v2/...' \
    -H 'Content-Type: application/json' \
    --data-raw '{...}'
   ```

3. **Narrow it down** (optional) to the calls you care about:

   ```sh
   # only requests whose URL contains "leadsquared.com"
   npx github:rahul-system/har2curl session.har --host leadsquared.com

   # only POST requests to hosts matching "mobileapi"
   npx github:rahul-system/har2curl session.har --host mobileapi --method POST
   ```

4. **Redact secrets before sharing.** Use `--redact` whenever the output goes into a ticket, chat, or doc:

   ```sh
   npx github:rahul-system/har2curl session.har --redact > calls.sh
   ```

   This replaces the values of `Authorization`, `Cookie`, and any header whose name contains `token`, `authkey`, `accesskey`, `secretkey` or `api-key` (e.g. `x-lsq-auth-token`, `x-lsq-mobile-authkey`). It also replaces these URL query parameters: `token`, `authtoken`, `access_token`, `accessKey`, `secretKey`, `apikey`, `api_key`, `password`, `sessionid`. Request bodies are **not** redacted, so check them before sharing.

5. **Run a command.** Copy any curl command from the output into your terminal, or run the saved file with `sh calls.sh`.

## Options

| Flag | Description |
| --- | --- |
| `--host <substr>` | Keep only requests whose URL contains `<substr>` |
| `--method <verb>` | Keep only requests with this HTTP method (case-insensitive) |
| `--redact` | Replace secret-looking headers and known secret query params with `REDACTED` |

A summary such as `12/340 request(s) converted (host ~ leadsquared.com)` is printed to stderr. It doesn't end up in the file when you redirect the output with `>`.

## Install globally (optional)

```sh
npm install -g github:rahul-system/har2curl
har2curl session.har --redact
```

## Notes

- HAR files contain live auth tokens and cookies. Don't commit or share raw `.har` files.
- HTTP/2 pseudo-headers and `Host` / `Content-Length` are dropped because curl sets them itself.
