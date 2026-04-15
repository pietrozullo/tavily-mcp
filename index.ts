import { createMCPServer, text, error } from "mcp-use/server";
import { z } from "zod";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

const BASE_URLS = {
  search: "https://api.tavily.com/search",
  extract: "https://api.tavily.com/extract",
  crawl: "https://api.tavily.com/crawl",
  map: "https://api.tavily.com/map",
  research: "https://api.tavily.com/research",
} as const;

const DOCS_URLS: Record<keyof typeof BASE_URLS, string> = {
  search: "https://docs.tavily.com/documentation/api-reference/endpoint/search",
  extract:
    "https://docs.tavily.com/documentation/api-reference/endpoint/extract",
  crawl: "https://docs.tavily.com/documentation/api-reference/endpoint/crawl",
  map: "https://docs.tavily.com/documentation/api-reference/endpoint/map",
  research:
    "https://docs.tavily.com/documentation/api-reference/endpoint/research",
};

// -------- Tavily API response types --------

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
  raw_content?: string;
  favicon?: string;
}

interface TavilySearchResponse {
  query: string;
  follow_up_questions?: string[];
  answer?: string;
  images?: Array<string | { url: string; description?: string }>;
  results: TavilyResult[];
}

interface TavilyCrawlResponse {
  base_url: string;
  results: Array<{ url: string; raw_content: string; favicon?: string }>;
  response_time: number;
}

interface TavilyMapResponse {
  base_url: string;
  results: string[];
  response_time: number;
}

interface TavilyResearchResponse {
  request_id?: string;
  status?: string;
  content?: string;
  error?: string;
}

// -------- Helpers --------

function stripEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

async function tavilyPost<T>(
  endpoint: string,
  payload: Record<string, unknown>,
  docsUrl: string,
): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${TAVILY_API_KEY}`,
      "X-Client-Source": "MCP",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
    }
    if (res.status === 401) {
      throw new Error(`Invalid API key. Documentation: ${docsUrl}`);
    }
    if (res.status === 429) {
      throw new Error(`Usage limit exceeded. Documentation: ${docsUrl}`);
    }
    const msg =
      detail && typeof detail === "object"
        ? JSON.stringify(detail)
        : String(detail);
    throw new Error(`Tavily API error (${res.status}): ${msg}`);
  }

  return (await res.json()) as T;
}

async function tavilyGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${TAVILY_API_KEY}`,
      "X-Client-Source": "MCP",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tavily API error (${res.status}): ${body}`);
  }
  return (await res.json()) as T;
}

function requireApiKey(): string | null {
  if (!TAVILY_API_KEY) {
    return "TAVILY_API_KEY environment variable is required. Please set it before using this MCP server.";
  }
  return null;
}

// -------- Formatters --------

function formatSearchResults(response: TavilySearchResponse): string {
  const out: string[] = [];
  if (response.answer) out.push(`Answer: ${response.answer}`);
  out.push("Detailed Results:");
  for (const r of response.results) {
    out.push(`\nTitle: ${r.title}`);
    out.push(`URL: ${r.url}`);
    out.push(`Content: ${r.content}`);
    if (r.raw_content) out.push(`Raw Content: ${r.raw_content}`);
    if (r.favicon) out.push(`Favicon: ${r.favicon}`);
  }
  if (response.images && response.images.length > 0) {
    out.push("\nImages:");
    response.images.forEach((img, i) => {
      if (typeof img === "string") {
        out.push(`\n[${i + 1}] URL: ${img}`);
      } else {
        out.push(`\n[${i + 1}] URL: ${img.url}`);
        if (img.description) out.push(`   Description: ${img.description}`);
      }
    });
  }
  return out.join("\n");
}

function formatCrawlResults(response: TavilyCrawlResponse): string {
  const out: string[] = [];
  out.push("Crawl Results:");
  out.push(`Base URL: ${response.base_url}`);
  out.push("\nCrawled Pages:");
  response.results.forEach((page, i) => {
    out.push(`\n[${i + 1}] URL: ${page.url}`);
    if (page.raw_content) {
      const preview =
        page.raw_content.length > 200
          ? page.raw_content.slice(0, 200) + "..."
          : page.raw_content;
      out.push(`Content: ${preview}`);
    }
    if (page.favicon) out.push(`Favicon: ${page.favicon}`);
  });
  return out.join("\n");
}

function formatMapResults(response: TavilyMapResponse): string {
  const out: string[] = [];
  out.push("Site Map Results:");
  out.push(`Base URL: ${response.base_url}`);
  out.push("\nMapped Pages:");
  response.results.forEach((page, i) => {
    out.push(`\n[${i + 1}] URL: ${page}`);
  });
  return out.join("\n");
}

// -------- Server --------

const server = createMCPServer("tavily-mcp", {
  version: "1.0.0",
  description:
    "MCP server for Tavily: web search, extract, crawl, map, and research",
  baseUrl: process.env.MCP_URL,
});

// tavily_search
server.tool(
  {
    name: "tavily_search",
    description:
      "Search the web for current information on any topic. Use for news, facts, or data beyond your knowledge cutoff. Returns snippets and source URLs.",
    annotations: { readOnlyHint: true, openWorldHint: true },
    schema: z.object({
      query: z.string().describe("Search query"),
      search_depth: z
        .enum(["basic", "advanced", "fast", "ultra-fast"])
        .optional()
        .describe(
          "The depth of the search. 'basic' for generic results, 'advanced' for more thorough search, 'fast' for optimized low latency with high relevance, 'ultra-fast' for prioritizing latency above all else",
        ),
      topic: z
        .enum(["general"])
        .optional()
        .describe(
          "The category of the search. This will determine which of our agents will be used for the search",
        ),
      time_range: z
        .enum(["day", "week", "month", "year"])
        .optional()
        .describe(
          "The time range back from the current date to include in the search results",
        ),
      start_date: z
        .string()
        .optional()
        .describe(
          "Will return all results after the specified start date. Required to be written in the format YYYY-MM-DD.",
        ),
      end_date: z
        .string()
        .optional()
        .describe(
          "Will return all results before the specified end date. Required to be written in the format YYYY-MM-DD",
        ),
      max_results: z
        .number()
        .int()
        .min(5)
        .max(20)
        .optional()
        .describe("The maximum number of search results to return"),
      include_images: z
        .boolean()
        .optional()
        .describe("Include a list of query-related images in the response"),
      include_image_descriptions: z
        .boolean()
        .optional()
        .describe(
          "Include a list of query-related images and their descriptions in the response",
        ),
      include_raw_content: z
        .boolean()
        .optional()
        .describe(
          "Include the cleaned and parsed HTML content of each search result",
        ),
      include_domains: z
        .array(z.string())
        .optional()
        .describe(
          "A list of domains to specifically include in the search results, if the user asks to search on specific sites set this to the domain of the site",
        ),
      exclude_domains: z
        .array(z.string())
        .optional()
        .describe(
          "List of domains to specifically exclude, if the user asks to exclude a domain set this to the domain of the site",
        ),
      country: z
        .string()
        .optional()
        .describe(
          "Boost search results from a specific country. Must be a full country name (e.g., 'United States', 'Japan', 'Germany'). ISO country codes (e.g., 'us', 'jp') are not supported. Available only if topic is general.",
        ),
      include_favicon: z
        .boolean()
        .optional()
        .describe("Whether to include the favicon URL for each result"),
    }),
  },
  async (params) => {
    const keyErr = requireApiKey();
    if (keyErr) return error(keyErr);
    try {
      const topic = params.country ? "general" : params.topic;
      // If start_date or end_date is set, drop time_range (Tavily rejects both).
      const timeRange =
        params.start_date || params.end_date ? undefined : params.time_range;

      const payload = stripEmpty({
        query: params.query,
        search_depth: params.search_depth,
        topic,
        time_range: timeRange,
        start_date: params.start_date,
        end_date: params.end_date,
        max_results: params.max_results,
        include_images: params.include_images,
        include_image_descriptions: params.include_image_descriptions,
        include_raw_content: params.include_raw_content,
        include_domains: params.include_domains,
        exclude_domains: params.exclude_domains,
        country: params.country,
        include_favicon: params.include_favicon,
        api_key: TAVILY_API_KEY,
      });

      const data = await tavilyPost<TavilySearchResponse>(
        BASE_URLS.search,
        payload,
        DOCS_URLS.search,
      );
      return text(formatSearchResults(data));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return error(`Tavily search failed: ${msg}\nDocs: ${DOCS_URLS.search}`);
    }
  },
);

// tavily_extract
server.tool(
  {
    name: "tavily_extract",
    description:
      "Extract content from URLs. Returns raw page content in markdown or text format.",
    annotations: { readOnlyHint: true, openWorldHint: true },
    schema: z.object({
      urls: z.array(z.string()).describe("List of URLs to extract content from"),
      extract_depth: z
        .enum(["basic", "advanced"])
        .optional()
        .describe(
          "Use 'advanced' for LinkedIn, protected sites, or tables/embedded content",
        ),
      include_images: z
        .boolean()
        .optional()
        .describe("Include images from pages"),
      format: z
        .enum(["markdown", "text"])
        .optional()
        .describe("Output format"),
      include_favicon: z
        .boolean()
        .optional()
        .describe("Include favicon URLs"),
      query: z
        .string()
        .optional()
        .describe("Query to rerank content chunks by relevance"),
    }),
  },
  async (params) => {
    const keyErr = requireApiKey();
    if (keyErr) return error(keyErr);
    try {
      const payload = stripEmpty({
        urls: params.urls,
        extract_depth: params.extract_depth,
        include_images: params.include_images,
        format: params.format,
        include_favicon: params.include_favicon,
        query: params.query,
        api_key: TAVILY_API_KEY,
      });
      const data = await tavilyPost<TavilySearchResponse>(
        BASE_URLS.extract,
        payload,
        DOCS_URLS.extract,
      );
      return text(formatSearchResults(data));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return error(`Tavily extract failed: ${msg}\nDocs: ${DOCS_URLS.extract}`);
    }
  },
);

// tavily_crawl
server.tool(
  {
    name: "tavily_crawl",
    description:
      "Crawl a website starting from a URL. Extracts content from pages with configurable depth and breadth.",
    annotations: { readOnlyHint: true, openWorldHint: true },
    schema: z.object({
      url: z.string().describe("The root URL to begin the crawl"),
      max_depth: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          "Max depth of the crawl. Defines how far from the base URL the crawler can explore.",
        ),
      max_breadth: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          "Max number of links to follow per level of the tree (i.e., per page)",
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          "Total number of links the crawler will process before stopping",
        ),
      instructions: z
        .string()
        .optional()
        .describe(
          "Natural language instructions for the crawler. Instructions specify which types of pages the crawler should return.",
        ),
      select_paths: z
        .array(z.string())
        .optional()
        .describe(
          "Regex patterns to select only URLs with specific path patterns (e.g., /docs/.*, /api/v1.*)",
        ),
      select_domains: z
        .array(z.string())
        .optional()
        .describe(
          "Regex patterns to restrict crawling to specific domains or subdomains (e.g., ^docs\\.example\\.com$)",
        ),
      allow_external: z
        .boolean()
        .optional()
        .describe("Whether to return external links in the final response"),
      extract_depth: z
        .enum(["basic", "advanced"])
        .optional()
        .describe(
          "Advanced extraction retrieves more data, including tables and embedded content, with higher success but may increase latency",
        ),
      format: z
        .enum(["markdown", "text"])
        .optional()
        .describe(
          "The format of the extracted web page content. markdown returns content in markdown format. text returns plain text and may increase latency.",
        ),
      include_favicon: z
        .boolean()
        .optional()
        .describe("Whether to include the favicon URL for each result"),
    }),
  },
  async (params) => {
    const keyErr = requireApiKey();
    if (keyErr) return error(keyErr);
    try {
      const payload = stripEmpty({
        url: params.url,
        max_depth: params.max_depth,
        max_breadth: params.max_breadth,
        limit: params.limit,
        instructions: params.instructions,
        select_paths: params.select_paths,
        select_domains: params.select_domains,
        allow_external: params.allow_external,
        extract_depth: params.extract_depth,
        format: params.format,
        include_favicon: params.include_favicon,
        chunks_per_source: 3,
        api_key: TAVILY_API_KEY,
      });
      const data = await tavilyPost<TavilyCrawlResponse>(
        BASE_URLS.crawl,
        payload,
        DOCS_URLS.crawl,
      );
      return text(formatCrawlResults(data));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return error(`Tavily crawl failed: ${msg}\nDocs: ${DOCS_URLS.crawl}`);
    }
  },
);

// tavily_map
server.tool(
  {
    name: "tavily_map",
    description:
      "Map a website's structure. Returns a list of URLs found starting from the base URL.",
    annotations: { readOnlyHint: true, openWorldHint: true },
    schema: z.object({
      url: z.string().describe("The root URL to begin the mapping"),
      max_depth: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          "Max depth of the mapping. Defines how far from the base URL the crawler can explore",
        ),
      max_breadth: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          "Max number of links to follow per level of the tree (i.e., per page)",
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          "Total number of links the crawler will process before stopping",
        ),
      instructions: z
        .string()
        .optional()
        .describe("Natural language instructions for the crawler"),
      select_paths: z
        .array(z.string())
        .optional()
        .describe(
          "Regex patterns to select only URLs with specific path patterns (e.g., /docs/.*, /api/v1.*)",
        ),
      select_domains: z
        .array(z.string())
        .optional()
        .describe(
          "Regex patterns to restrict crawling to specific domains or subdomains (e.g., ^docs\\.example\\.com$)",
        ),
      allow_external: z
        .boolean()
        .optional()
        .describe("Whether to return external links in the final response"),
    }),
  },
  async (params) => {
    const keyErr = requireApiKey();
    if (keyErr) return error(keyErr);
    try {
      const payload = stripEmpty({
        url: params.url,
        max_depth: params.max_depth,
        max_breadth: params.max_breadth,
        limit: params.limit,
        instructions: params.instructions,
        select_paths: params.select_paths,
        select_domains: params.select_domains,
        allow_external: params.allow_external,
        api_key: TAVILY_API_KEY,
      });
      const data = await tavilyPost<TavilyMapResponse>(
        BASE_URLS.map,
        payload,
        DOCS_URLS.map,
      );
      return text(formatMapResults(data));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return error(`Tavily map failed: ${msg}\nDocs: ${DOCS_URLS.map}`);
    }
  },
);

// tavily_research
server.tool(
  {
    name: "tavily_research",
    description:
      "Perform comprehensive research on a given topic or question. Use this tool when you need to gather information from multiple sources to answer a question or complete a task. Returns a detailed response based on the research findings. Rate limit: 20 requests per minute.",
    annotations: { readOnlyHint: true, openWorldHint: true },
    schema: z.object({
      input: z
        .string()
        .describe("A comprehensive description of the research task"),
      model: z
        .enum(["mini", "pro", "auto"])
        .optional()
        .describe(
          "Defines the degree of depth of the research. 'mini' is good for narrow tasks with few subtopics. 'pro' is good for broad tasks with many subtopics. 'auto' automatically selects the best model.",
        ),
    }),
  },
  async (params) => {
    const keyErr = requireApiKey();
    if (keyErr) return error(keyErr);

    const INITIAL_POLL_INTERVAL = 2_000;
    const MAX_POLL_INTERVAL = 10_000;
    const POLL_BACKOFF_FACTOR = 1.5;
    const MAX_PRO_POLL_DURATION = 15 * 60 * 1000;
    const MAX_MINI_POLL_DURATION = 5 * 60 * 1000;

    try {
      const submit = await tavilyPost<TavilyResearchResponse>(
        BASE_URLS.research,
        {
          input: params.input,
          model: params.model ?? "auto",
          api_key: TAVILY_API_KEY,
        },
        DOCS_URLS.research,
      );

      const requestId = submit.request_id;
      if (!requestId) {
        return error(
          `No request_id returned from research endpoint. Documentation: ${DOCS_URLS.research}`,
        );
      }

      const maxPoll =
        params.model === "mini" ? MAX_MINI_POLL_DURATION : MAX_PRO_POLL_DURATION;

      let interval = INITIAL_POLL_INTERVAL;
      let elapsed = 0;

      while (elapsed < maxPoll) {
        await new Promise((r) => setTimeout(r, interval));
        elapsed += interval;

        try {
          const poll = await tavilyGet<TavilyResearchResponse>(
            `${BASE_URLS.research}/${requestId}`,
          );
          if (poll.status === "completed") {
            return text(poll.content || "No research results available");
          }
          if (poll.status === "failed") {
            return error(
              `Research task failed. Documentation: ${DOCS_URLS.research}`,
            );
          }
        } catch (pollErr) {
          const msg =
            pollErr instanceof Error ? pollErr.message : String(pollErr);
          if (msg.includes("404")) return error("Research task not found");
          throw pollErr;
        }

        interval = Math.min(interval * POLL_BACKOFF_FACTOR, MAX_POLL_INTERVAL);
      }

      return error(
        `Research task timed out. Documentation: ${DOCS_URLS.research}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return error(`Tavily research failed: ${msg}\nDocs: ${DOCS_URLS.research}`);
    }
  },
);

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
console.log(`tavily-mcp server running on port ${PORT}`);
server.listen(PORT);
