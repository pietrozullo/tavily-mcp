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

const TAVILY_LOGO =
  "data:image/jpeg;base64,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";

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
          maxHeight: 600,
          overflowY: "auto" as const,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 24,
          }}
        >
          <img
            src={TAVILY_LOGO}
            alt="Tavily"
            width={28}
            height={28}
            style={{ borderRadius: 6 }}
          />
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
