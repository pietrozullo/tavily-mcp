import { useState } from "react";
import {
  McpUseProvider,
  useWidget,
  useWidgetTheme,
  type WidgetMetadata,
} from "mcp-use/react";
import { z } from "zod";

// ---------- Schema ----------

const imageSchema = z.object({
  url: z.string(),
  description: z.string().optional(),
});

const resultSchema = z.object({
  title: z.string(),
  url: z.string(),
  content: z.string(),
  score: z.number(),
  published_date: z.string().optional(),
  raw_content: z.string().optional(),
  favicon: z.string().optional(),
});

const propsSchema = z.object({
  query: z.string(),
  answer: z.string().optional(),
  results: z.array(resultSchema),
  images: z.array(imageSchema).optional(),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Display Tavily web search results",
  props: propsSchema,
  exposeAsTool: false,
};

type Props = z.infer<typeof propsSchema>;

// ---------- Theme ----------

const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function useColors() {
  const theme = useWidgetTheme();
  const dark = theme === "dark";

  return {
    // Page
    bg: dark ? "#1c1c1c" : "#faf8f4",
    // Cards
    cardBg: dark ? "#262626" : "#ffffff",
    cardBorder: dark ? "#363636" : "#eae5dc",
    cardHover: dark ? "#2c2c2c" : "#fdfcfa",
    cardShadow: dark
      ? "0 1px 3px rgba(0,0,0,0.3)"
      : "0 1px 4px rgba(0,0,0,0.04)",
    cardShadowHover: dark
      ? "0 2px 8px rgba(0,0,0,0.4)"
      : "0 2px 10px rgba(0,0,0,0.07)",
    // Text
    title: dark ? "#ece9e4" : "#1b1916",
    body: dark ? "#b5b0a8" : "#4a4540",
    muted: dark ? "#7d7870" : "#9c968e",
    // URL — Tavily uses a muted teal/green
    url: dark ? "#6cbf9a" : "#2d8a6e",
    // Score badge
    scoreFg: dark ? "#c4b89e" : "#7a6c52",
    scoreBg: dark ? "#302d28" : "#f2eee5",
    // Section labels
    label: dark ? "#a09888" : "#6e6456",
    // Search bar
    searchBg: dark ? "#2a2826" : "#f2ede4",
    searchBorder: dark ? "#3d3a36" : "#ddd6ca",
    searchText: dark ? "#d4d0c8" : "#3a3530",
    searchIcon: dark ? "#7d7870" : "#a09888",
    // Answer box
    answerBg: dark ? "#28261f" : "#fdf9f0",
    answerBorder: dark ? "#3d3a30" : "#e8e0d0",
    // Header
    headerText: dark ? "#ece9e4" : "#1b1916",
    headerSub: dark ? "#7d7870" : "#a09888",
  };
}

type Colors = ReturnType<typeof useColors>;

// ---------- Components ----------

function SearchBar({ query, c }: { query: string; c: Colors }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 22px",
        borderRadius: 28,
        backgroundColor: c.searchBg,
        border: `1px solid ${c.searchBorder}`,
        marginBottom: 28,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={c.searchIcon}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span style={{ fontSize: 15, color: c.searchText }}>
        "{query}"
      </span>
    </div>
  );
}

function AnswerBox({ answer, c }: { answer: string; c: Colors }) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 14,
        backgroundColor: c.answerBg,
        border: `1px solid ${c.answerBorder}`,
        marginBottom: 28,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: 1.2,
          color: c.label,
          marginBottom: 10,
        }}
      >
        Answer
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: c.body }}>
        {answer}
      </div>
    </div>
  );
}

function ResultCard({ result, c }: { result: z.infer<typeof resultSchema>; c: Colors }) {
  const [hovered, setHovered] = useState(false);

  // Parse a clean display URL
  let displayUrl = result.url;
  try {
    const u = new URL(result.url);
    displayUrl = u.hostname.replace(/^www\./, "") + u.pathname;
    // Remove trailing slash if it's just the root
    if (displayUrl.endsWith("/") && u.pathname === "/") {
      displayUrl = displayUrl.slice(0, -1);
    }
  } catch {
    // leave as-is
  }

  return (
    <div
      style={{
        padding: "22px 24px",
        borderRadius: 14,
        backgroundColor: hovered ? c.cardHover : c.cardBg,
        border: `1px solid ${c.cardBorder}`,
        boxShadow: hovered ? c.cardShadowHover : c.cardShadow,
        transition: "background-color 0.15s, box-shadow 0.15s",
        cursor: "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Row 1: Title + Score */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 16,
          marginBottom: 4,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 700,
            color: c.title,
            lineHeight: 1.35,
            flex: 1,
            minWidth: 0,
          }}
        >
          {result.title}
        </h3>
        <span
          style={{
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: 8,
            backgroundColor: c.scoreBg,
            fontSize: 13,
            fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
            fontWeight: 500,
            color: c.scoreFg,
            whiteSpace: "nowrap" as const,
            flexShrink: 0,
            lineHeight: 1.3,
          }}
        >
          score: {result.score.toFixed(2)}
        </span>
      </div>

      {/* Row 2: URL */}
      <div
        style={{
          fontSize: 13,
          color: c.url,
          marginBottom: 10,
          lineHeight: 1.4,
        }}
      >
        {displayUrl}
      </div>

      {/* Row 3: Content snippet */}
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.65,
          color: c.body,
        }}
      >
        {result.content}
      </div>

      {result.published_date && (
        <div style={{ fontSize: 12, color: c.muted, marginTop: 10 }}>
          {result.published_date}
        </div>
      )}
    </div>
  );
}

function ImageGrid({ images, c }: { images: z.infer<typeof imageSchema>[]; c: Colors }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: 1.2,
          color: c.label,
          marginBottom: 12,
        }}
      >
        Images
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto" as const,
          paddingBottom: 4,
        }}
      >
        {images.map((img, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: 140,
              height: 96,
              borderRadius: 10,
              overflow: "hidden",
              border: `1px solid ${c.cardBorder}`,
            }}
          >
            <img
              src={img.url}
              alt={img.description || ""}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Main Widget ----------

export default function SearchResults() {
  const { props, isPending } = useWidget<Props>();
  const c = useColors();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div
          style={{
            padding: 48,
            textAlign: "center",
            fontFamily: FONT,
            backgroundColor: c.bg,
            color: c.muted,
          }}
        >
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          <div style={{ animation: "pulse 1.5s ease-in-out infinite", fontSize: 15 }}>
            Searching...
          </div>
        </div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          padding: 32,
          fontFamily: FONT,
          backgroundColor: c.bg,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 800, color: c.headerText }}>
            tavily
          </span>
          <span
            style={{
              fontSize: 14,
              color: c.headerSub,
              fontWeight: 400,
            }}
          >
            /search
          </span>
        </div>

        {/* Search pill */}
        <SearchBar query={props.query} c={c} />

        {/* Answer */}
        {props.answer && <AnswerBox answer={props.answer} c={c} />}

        {/* Images */}
        {props.images && props.images.length > 0 && (
          <ImageGrid images={props.images} c={c} />
        )}

        {/* Results label */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: 1.2,
            color: c.label,
            marginBottom: 14,
          }}
        >
          Results ({props.results.length})
        </div>

        {/* Result cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {props.results.map((r, i) => (
            <ResultCard key={i} result={r} c={c} />
          ))}
        </div>

        {props.results.length === 0 && (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              color: c.muted,
              fontSize: 15,
            }}
          >
            No results found
          </div>
        )}
      </div>
    </McpUseProvider>
  );
}
