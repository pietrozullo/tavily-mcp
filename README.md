# tavily-mcp (mcp-use rewrite)

An HTTP-based MCP server that exposes the [Tavily](https://tavily.com) web search, extract, crawl, map, and research APIs, built on [mcp-use](https://github.com/mcp-use/mcp-use).

This is a rewrite of the original [tavily-ai/tavily-mcp](https://github.com/tavily-ai/tavily-mcp) stdio server — same tool surface, served over Streamable HTTP / SSE on port 3000 so it can be deployed directly to hosted MCP platforms (Manufact, etc.) without a stdio→HTTP bridge.

## Tools

| Name              | What it does                                                               |
| ----------------- | -------------------------------------------------------------------------- |
| `tavily_search`   | Real-time web search with depth, time-range, and domain filters            |
| `tavily_extract`  | Extract page content from URLs (markdown or plain text)                    |
| `tavily_crawl`    | Crawl a site from a root URL with configurable depth/breadth               |
| `tavily_map`      | Map a site's URL structure starting from a root URL                        |
| `tavily_research` | Multi-source research task (submits + polls the async research endpoint)   |

## Requirements

- Node 20+
- A Tavily API key — get one at [tavily.com](https://tavily.com)

## Setup

```bash
cp .env.example .env      # fill in TAVILY_API_KEY
npm install
```

## Run

```bash
# Development (HMR + inspector UI at /inspector)
npm run dev

# Production
npm run build
npm start
```

The server listens on `http://localhost:3000` by default:

- MCP endpoint: `http://localhost:3000/mcp`
- Inspector UI: `http://localhost:3000/inspector`

## Environment variables

| Variable         | Required | Description                                     |
| ---------------- | -------- | ----------------------------------------------- |
| `TAVILY_API_KEY` | yes      | Tavily API key                                  |
| `PORT`           | no       | Override listen port (default `3000`)           |
| `MCP_URL`        | no       | Full public base URL of the deployed server     |

## Deploying to Manufact

- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`
- **Port:** `3000` (or whatever Manufact injects via `PORT`)
- **Env:** set `TAVILY_API_KEY`

## License

MIT — see [LICENCE](./LICENCE).
