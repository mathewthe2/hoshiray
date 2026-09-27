export interface GlossaryNode {
  content?: GlossaryNode[] | GlossaryNode | string;
  tag?: string;
  lang?: string;
  style?: Record<string, string>;
  data?: Record<string, string>;
}

export interface GlossaryRenderResult {
  html: string;
  css: string;
}

/**
 * Hoshidicts stores glossary content as a JSON-encoded AST.
 *
 * Example:
 *
 * [
 *   {
 *     "content": [
 *       {
 *         "content": [
 *           { "content": "hey", "tag": "li" },
 *           { "content": "oi", "tag": "li" }
 *         ],
 *         "data": { "content": "glossary" },
 *         "lang": "en",
 *         "style": { "listStyleType": "circle" },
 *         "tag": "ul"
 *       }
 *     ]
 *   }
 * ]
 */
export function renderGlossaries(
  glossaries: Array<{
    dictionary: string;
    termTags?: string;
    definitionTags?: string;
    glossary: string;
  }>,
): GlossaryRenderResult {
  const sections = glossaries.map((entry) => {
    return `
      <section class="dictionary-section">
        <div class="dictionary-name">
          ${escapeHtml(entry.dictionary)}
        </div>

        ${entry.termTags ? `<div class="tags">${escapeHtml(entry.termTags)}</div>` : ""}

        ${entry.definitionTags ? `<div class="tags">${escapeHtml(entry.definitionTags)}</div>` : ""}

        <div class="glossary-content">
          ${renderGlossary(entry.glossary)}
        </div>
      </section>
    `;
  });

  return {
    html: sections.join(""),
    css: GLOSSARY_CSS,
  };
}

function renderGlossary(source: string): string {
  try {
    const parsed: unknown = JSON.parse(source);

    return renderNode(parsed);
  } catch (error) {
    console.error("[Hoshiray] Failed to parse glossary:", error);

    // This should only be reached for dictionary entries that aren't
    // using the structured Hoshidicts representation.
    return `<div class="fallback">${escapeHtml(source)}</div>`;
  }
}

function renderNode(node: unknown): string {
  if (node == null) {
    return "";
  }

  if (typeof node === "string") {
    return escapeHtml(node);
  }

  if (typeof node === "number" || typeof node === "boolean") {
    return escapeHtml(String(node));
  }

  if (Array.isArray(node)) {
    return node.map(renderNode).join("");
  }

  if (typeof node !== "object") {
    return "";
  }

  const value = node as GlossaryNode;

  const content = renderNode(value.content);

  /*
   * Hoshidicts uses semantic data on some nodes:
   *
   * data.content = "glossary"
   * data.content = "notes"
   *
   * We keep the semantic distinction as CSS classes.
   */
  const semanticClass =
    value.data?.content === "notes"
      ? " glossary-notes"
      : value.data?.content === "glossary"
        ? " glossary-definition"
        : "";

  const tag = normalizeTag(value.tag);

  const attributes: string[] = [];

  if (value.lang) {
    attributes.push(`lang="${escapeAttribute(value.lang)}"`);
  }

  const style = renderStyle(value.style);

  if (style) {
    attributes.push(`style="${escapeAttribute(style)}"`);
  }

  const className = `glossary-node${semanticClass}`;

  attributes.push(`class="${className}"`);

  return `<${tag} ${attributes.join(" ")}>${content}</${tag}>`;
}

/**
 * Only allow HTML elements that we actually expect from the dictionary AST.
 *
 * This also prevents an unexpected dictionary entry from injecting
 * arbitrary elements/scripts into the WKWebView.
 */
function normalizeTag(tag: string | undefined): string {
  switch (tag) {
    case "ul":
      return "ul";

    case "ol":
      return "ol";

    case "li":
      return "li";

    case "p":
      return "p";

    case "br":
      return "br";

    case "strong":
      return "strong";

    case "b":
      return "b";

    case "em":
      return "em";

    case "i":
      return "i";

    case "u":
      return "u";

    case "span":
      return "span";

    case "div":
      return "div";

    case "ruby":
      return "ruby";

    case "rt":
      return "rt";

    case "rp":
      return "rp";

    case "a":
      return "a";

    default:
      return "span";
  }
}

function renderStyle(styles: Record<string, string> | undefined): string {
  if (!styles) {
    return "";
  }

  return Object.entries(styles)
    .map(([property, value]) => {
      return `${camelToKebab(property)}: ${value}`;
    })
    .join("; ");
}

function camelToKebab(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

const GLOSSARY_CSS = `
  .dictionary-section {
    margin: 0 0 24px 0;
  }

  .dictionary-section:last-child {
    margin-bottom: 0;
  }

  .dictionary-name {
    font-size: 13px;
    font-weight: 600;
    opacity: 0.65;
    margin-bottom: 10px;
  }

  .tags {
    font-size: 12px;
    opacity: 0.6;
    margin-bottom: 6px;
  }

  .glossary-content {
    font-size: 16px;
    line-height: 1.55;
  }

  .glossary-content ul,
  .glossary-content ol {
    margin: 4px 0 12px 0;
    padding-left: 24px;
  }

  .glossary-content li {
    margin: 3px 0;
    padding-left: 2px;
  }

  .glossary-content p {
    margin: 0 0 10px 0;
  }

  .glossary-content strong,
  .glossary-content b {
    font-weight: 600;
  }

  .glossary-content em,
  .glossary-content i {
    font-style: italic;
  }

  .glossary-definition {
    margin-bottom: 8px;
  }

  .glossary-notes {
    margin-top: 10px;
    padding-left: 10px;
    border-left: 2px solid currentColor;
    opacity: 0.7;
    font-size: 14px;
  }

  .fallback {
    white-space: pre-wrap;
  }

  a {
    color: inherit;
  }
`;
