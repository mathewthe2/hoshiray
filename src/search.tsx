import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";

import { useEffect, useState } from "react";

import { loadDictionary, search, TermResult, getStyles } from "./hoshiray";

import { renderGlossaries } from "./glossary";
import { HTMLDetail } from "./HTMLDetail";

const DICTIONARY_PATH = "/Users/mathew/Downloads/test_hoshi/parsed_dicts/JMdict_english";

export default function Command() {
  const [results, setResults] = useState<TermResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [dictionaryStyles, setDictionaryStyles] = useState("");

  useEffect(() => {
    async function initialize() {
      try {
        await loadDictionary(DICTIONARY_PATH);

        const styles = await getStyles();

        setDictionaryStyles(styles);
      } catch (err) {
        console.error(err);

        setError(err instanceof Error ? err.message : String(err));

        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load dictionary",
          message: String(err),
        });
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  async function handleSearch(text: string) {
    if (!text.trim()) {
      setResults([]);
      return;
    }

    try {
      const data = await search(text);

      console.log("data", data);

      setResults(data);
    } catch (err) {
      console.error(err);
    }
  }

  if (error) {
    return (
      <List>
        <List.EmptyView title="Hoshiray failed to load" description={error} icon={Icon.ExclamationMark} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={handleSearch}
      searchBarPlaceholder="Search Japanese..."
      throttle
    >
      {results.map((result, index) => (
        <DictionaryItem
          key={`${result.expression}-${result.reading}-${index}`}
          result={result}
          dictionaryStyles={dictionaryStyles}
        />
      ))}
    </List>
  );
}

function DictionaryItem({ result, dictionaryStyles }: { result: TermResult; dictionaryStyles: string }) {
  const glossary = renderGlossaries(result.glossaries);

  const html = `
    <div class="entry">
      <header class="entry-header">
        <div class="expression">
          ${escapeHtml(result.expression)}
        </div>

        ${
          result.reading
            ? `
              <div class="reading">
                ${escapeHtml(result.reading)}
              </div>
            `
            : ""
        }
      </header>

      ${glossary.html}
    </div>
  `;

  const css = `
    ${dictionaryStyles}

    ${glossary.css}

    .entry {
      padding: 20px 24px 32px 24px;
      box-sizing: border-box;
    }

    .entry-header {
      margin-bottom: 24px;
    }

    .expression {
      font-size: 30px;
      line-height: 1.25;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .reading {
      margin-top: 4px;
      font-size: 16px;
      opacity: 0.65;
    }
  `;

  return (
    <List.Item
      icon={Icon.Book}
      title={result.expression}
      subtitle={result.reading}
      accessories={[
        {
          text: formatFrequency(result),
        },
      ]}
      detail={
        <HTMLDetail
          html={html}
          css={css}
          navigationTitle={`${result.expression}${result.reading ? ` ${result.reading}` : ""}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Expression"
                content={result.expression}
                shortcut={{
                  modifiers: ["cmd"],
                  key: "c",
                }}
              />

              {result.reading && (
                <Action.CopyToClipboard
                  title="Copy Reading"
                  content={result.reading}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              )}
            </ActionPanel>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Expression"
            content={result.expression}
            shortcut={{
              modifiers: ["cmd"],
              key: "c",
            }}
          />

          {result.reading && (
            <Action.CopyToClipboard
              title="Copy Reading"
              content={result.reading}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function formatFrequency(result: TermResult): string | undefined {
  const frequencies = result.frequencies.flatMap((entry) => entry.frequencies);

  if (frequencies.length === 0) {
    return undefined;
  }

  return frequencies.map((frequency) => frequency.displayValue).join(", ");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
