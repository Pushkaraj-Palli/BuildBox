"use client";

import { useMemo, useRef } from "react";

type Token = { type: string; text: string };

const JS_KEYWORDS = new Set("as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch throw try typeof var void while with yield interface type enum implements declare namespace public private protected readonly abstract satisfies keyof infer is asserts unknown never any string number boolean symbol object void null undefined".split(" "));

function classifyCodeToken(text: string, language: string): string {
  if (text.startsWith("//") || text.startsWith("/*")) return "comment";
  if (/^(?:\"|')/.test(text) || (language !== "json" && text.startsWith("`"))) return "string";
  if (/^\d/.test(text)) return "number";
  if (/^(?:true|false|null|undefined|NaN|Infinity)$/.test(text)) return "literal";
  if (/^#[\da-f]{3,8}$/i.test(text) && language === "css") return "number";
  if (language === "json") return "punctuation";
  if (JS_KEYWORDS.has(text)) return "keyword";
  if (/^[A-Za-z_$][\w$]*$/.test(text)) return "identifier";
  return "punctuation";
}

function tokenizeCode(value: string, language: string): Token[] {
  if (!value) return [];
  const isHtml = language === "html";
  const isCss = language === "css";
  const isJson = language === "json";
  const pattern = isHtml
    ? /(<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][\w:-]*|\/?>|\s+|[\w:-]+(?=\s*=)|=|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|&[\w#]+;|[\s\S])/g
    : isCss
      ? /(\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[\da-f]{3,8}\b|@[\w-]+|[\w-]+(?=\s*:)|\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%)?\b|[{}():;,]|[\s\S])/gi
      : isJson
        ? /(\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b|[{}\[\]:,]|[\s\S])/gi
        : /(\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?n?\b|\b[A-Za-z_$][\w$]*(?=\s*\()|\b[A-Za-z_$][\w$]*\b|<\/?[A-Za-z][\w.-]*\s*\/?>|(?:===?|!==?|=>|\.\.\.|\?\.|&&|\|\||\?\?|[{}()[\].,;:?])|[+\-*/%=!<>|&^~]+|[\s\S])/g;

  const tokens: Token[] = [];
  const append = (type: string, text: string) => {
    const previous = tokens.at(-1);
    if (previous?.type === type) previous.text += text;
    else tokens.push({ type, text });
  };
  for (const match of value.matchAll(pattern)) {
    const text = match[0];
    if (isHtml) {
      const type = text.startsWith("<!--") || text.startsWith("<!") ? "comment"
        : text.startsWith("<") || text === "/>" || text === ">" ? "tag"
          : text === "=" ? "operator"
            : text.startsWith("\"") || text.startsWith("'") ? "string"
              : /^[\w:-]+$/.test(text) && !/^\s+$/.test(text) ? "attribute" : "text";
      append(type, text);
      continue;
    }
    if (isCss) {
      const nextNonSpace = value.slice((match.index ?? 0) + text.length).match(/^\s*:/);
      const type = text.startsWith("/*") ? "comment"
        : text.startsWith("\"") || text.startsWith("'") ? "string"
          : text.startsWith("@") ? "keyword"
            : /^[\w-]+$/.test(text) && nextNonSpace ? "property"
              : /^#[\da-f]+$/i.test(text) || /^\d/.test(text) ? "number"
                : "punctuation";
      append(type, text);
      continue;
    }
    let type = classifyCodeToken(text, language);
    if (language === "tsx" && text.startsWith("<") && /^<\/?[A-Za-z]/.test(text)) type = "tag";
    if (type === "identifier" && /^[A-Za-z_$][\w$]*$/.test(text) && /^\s*\(/.test(value.slice((match.index ?? 0) + text.length))) type = "function";
    if (isJson && text.startsWith("\"")) {
      const nextNonSpace = value.slice((match.index ?? 0) + text.length).match(/^\s*:/);
      if (nextNonSpace) type = "property";
    }
    append(type, text);
  }
  return tokens;
}

function languageForPath(filePath: string): string {
  const extension = filePath.split(".").at(-1)?.toLowerCase();
  if (extension === "tsx" || extension === "jsx") return "tsx";
  if (extension === "ts" || extension === "js") return "typescript";
  if (extension === "css") return "css";
  if (extension === "json") return "json";
  if (extension === "html" || extension === "htm") return "html";
  return "text";
}

export function CodeEditor({
  filePath,
  value,
  onChange,
}: {
  filePath: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const language = languageForPath(filePath);
  const tokens = useMemo(() => tokenizeCode(value, language), [value, language]);

  const syncScroll = () => {
    const input = inputRef.current;
    const highlight = highlightRef.current;
    if (!input || !highlight) return;
    highlight.scrollTop = input.scrollTop;
    highlight.scrollLeft = input.scrollLeft;
  };

  return (
    <div className="code-editor-surface">
      <pre className="code-editor-highlight" aria-hidden="true" ref={highlightRef}>
        <code>{tokens.map((token, index) => <span className={`syntax-${token.type}`} key={index}>{token.text}</span>)}{value.endsWith("\n") ? "\u200b" : null}</code>
      </pre>
      <textarea
        ref={inputRef}
        className="code-editor-input"
        spellCheck={false}
        wrap="off"
        aria-label={`Edit ${filePath}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={syncScroll}
      />
    </div>
  );
}
