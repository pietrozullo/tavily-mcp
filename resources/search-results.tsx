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

function useColors() {
  const theme = useWidgetTheme();
  const dark = theme === "dark";

  return {
    bg: dark ? "#1a1a1a" : "#faf8f5",
    cardBg: dark ? "#242424" : "#ffffff",
    text: dark ? "#e8e6e3" : "#1a1614",
    textSecondary: dark ? "#a09b95" : "#6b6560",
    textMuted: dark ? "#706b65" : "#9e9892",
    border: dark ? "#333" : "#e8e2da",
    accent: dark ? "#c8b89a" : "#8b7355",
    scoreBg: dark ? "#2d2a26" : "#f0ece6",
    searchBg: dark ? "#2d2a26" : "#f5f0e8",
    searchBorder: dark ? "#444" : "#ddd5ca",
    hoverBg: dark ? "#2d2a26" : "#f5f2ed",
    answerBg: dark ? "#2a2824" : "#f9f5ef",
    answerBorder: dark ? "#3d3a34" : "#e0d8cd",
    link: dark ? "#8ab4f8" : "#1a5c97",
    dot: dark ? "#c8b89a" : "#8b7355",
  };
}

// ---------- Components ----------

function SearchBar({ query, colors }: { query: string; colors: ReturnType<typeof useColors> }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderRadius: 24,
        backgroundColor: colors.searchBg,
        border: `1px solid ${colors.searchBorder}`,
        marginBottom: 20,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.textMuted}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span
        style={{
          fontSize: 14,
          color: colors.text,
          fontStyle: "italic",
        }}
      >
        "{query}"
      </span>
    </div>
  );
}

function AnswerBox({ answer, colors }: { answer: string; colors: ReturnType<typeof useColors> }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 10,
        backgroundColor: colors.answerBg,
        border: `1px solid ${colors.answerBorder}`,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: 0.8,
          color: colors.accent,
          marginBottom: 8,
        }}
      >
        Answer
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: colors.text }}>
        {answer}
      </div>
    </div>
  );
}

function ScoreBadge({ score, colors }: { score: number; colors: ReturnType<typeof useColors> }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 6,
        backgroundColor: colors.scoreBg,
        fontSize: 12,
        fontFamily: "monospace",
        color: colors.accent,
        fontWeight: 500,
        whiteSpace: "nowrap" as const,
      }}
    >
      score: {score.toFixed(2)}
    </span>
  );
}

function ResultCard({
  result,
  colors,
}: {
  result: z.infer<typeof resultSchema>;
  colors: ReturnType<typeof useColors>;
}) {
  const [hovered, setHovered] = useState(false);
  const domain = (() => {
    try {
      return new URL(result.url).hostname;
    } catch {
      return result.url;
    }
  })();

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 10,
        backgroundColor: hovered ? colors.hoverBg : colors.cardBg,
        border: `1px solid ${colors.border}`,
        transition: "background-color 0.15s, box-shadow 0.15s",
        boxShadow: hovered ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        cursor: "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          {result.favicon && (
            <img
              src={result.favicon}
              alt=""
              width={16}
              height={16}
              style={{ borderRadius: 3, flexShrink: 0 }}
            />
          )}
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: colors.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap" as const,
            }}
          >
            {result.title}
          </span>
        </div>
        <ScoreBadge score={result.score} colors={colors} />
      </div>

      <div
        style={{
          fontSize: 12,
          color: colors.link,
          marginBottom: 8,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap" as const,
        }}
      >
        {domain}
        {result.url.replace(`https://${domain}`, "").replace(`http://${domain}`, "")}
      </div>

      <div
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          color: colors.textSecondary,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        }}
      >
        {result.content}
      </div>

      {result.published_date && (
        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
          {result.published_date}
        </div>
      )}
    </div>
  );
}

function ImageGrid({
  images,
  colors,
}: {
  images: z.infer<typeof imageSchema>[];
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: 0.8,
          color: colors.accent,
          marginBottom: 10,
        }}
      >
        Images
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto" as const,
          paddingBottom: 4,
        }}
      >
        {images.map((img, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: 120,
              height: 80,
              borderRadius: 8,
              overflow: "hidden",
              border: `1px solid ${colors.border}`,
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
  const colors = useColors();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div
          style={{
            padding: 40,
            textAlign: "center",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            backgroundColor: colors.bg,
            color: colors.textMuted,
            borderRadius: 12,
          }}
        >
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
          <div style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
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
          padding: 24,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: colors.bg,
          borderRadius: 12,
          maxWidth: 680,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>
            tavily
          </span>
          <span
            style={{
              fontSize: 12,
              color: colors.textMuted,
              fontWeight: 400,
            }}
          >
            /search
          </span>
        </div>

        <SearchBar query={props.query} colors={colors} />

        {props.answer && <AnswerBox answer={props.answer} colors={colors} />}

        {props.images && props.images.length > 0 && (
          <ImageGrid images={props.images} colors={colors} />
        )}

        {/* Results */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: 0.8,
            color: colors.accent,
            marginBottom: 10,
          }}
        >
          Results ({props.results.length})
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {props.results.map((r, i) => (
            <ResultCard key={i} result={r} colors={colors} />
          ))}
        </div>

        {props.results.length === 0 && (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: colors.textMuted,
            }}
          >
            No results found
          </div>
        )}
      </div>
    </McpUseProvider>
  );
}
