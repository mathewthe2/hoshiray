import path from "node:path";
import { environment } from "@raycast/api";
import createHoshiDicts from "./wasm/hoshidicts.cjs";

export interface Frequency {
  displayValue: string;
}

export interface FrequencyGroup {
  dictionary: string;
  frequencies: Frequency[];
}

export interface Glossary {
  dictionary: string;
  termTags?: string;
  definitionTags?: string;
  glossary: string;
}

export interface PitchEntry {
  pattern: string;
  position: number;
}

export interface Pitch {
  dictionary: string;
  pitches: PitchEntry[];
  transcriptions: string[];
}

export interface TermResult {
  expression: string;
  reading: string;

  frequencies: FrequencyGroup[];

  glossaries: Glossary[];

  pitches: Pitch[];

  rules?: string;
}

export interface LookupResult {
  expression: string;
  reading: string;

  frequencies: FrequencyGroup[];

  glossaries: Glossary[];

  pitches: Pitch[];

  rules?: string;
}

interface HoshiModule {
  HoshiWasm: new () => HoshiDictionary;
}

interface HoshiDictionary {
  addTermDict(path: string): void;
  addFreqDict(path: string): void;
  addPitchDict(path: string): void;
  addKanjiDict(path: string): void;

  query(expression: string): string;
  lookup(text: string, maxResults: number, scanLength: number): string;
  queryKanji(character: string): string;
  styles(): string;
}

let modulePromise: Promise<HoshiModule> | undefined;

type TinycastGlobal = typeof globalThis & {
  __hoshirayDictionary?: HoshiDictionary;
};

const runtimeGlobal = globalThis as TinycastGlobal;

async function loadHoshiModule(): Promise<HoshiModule> {
  const wasmPath = path.join(environment.assetsPath, "wasm", "hoshidicts.wasm");

  console.log("HoshiDicts WASM:", wasmPath);

  const Module = await createHoshiDicts({
    locateFile: (filename: string) => {
      if (filename === "hoshidicts.wasm") {
        return wasmPath;
      }

      return filename;
    },
  });

  return Module as HoshiModule;
}

export async function getModule(): Promise<HoshiModule> {
  if (!modulePromise) {
    modulePromise = loadHoshiModule();
  }

  return modulePromise;
}

export async function getDictionary(): Promise<HoshiDictionary> {
  const Module = await getModule();

  const dictionary = new Module.HoshiWasm();

  return dictionary;
}

export async function loadDictionary(dictionaryPath: string): Promise<void> {
  if (runtimeGlobal.__hoshirayDictionary != null) {
    console.log("Dictionary already loaded");
    return;
  }

  const dictionary = await getDictionary();

  console.log("Loading dictionary:", dictionaryPath);

  dictionary.addTermDict(dictionaryPath);

  runtimeGlobal.__hoshirayDictionary = dictionary;

  console.log("Dictionary loaded");
}

export async function search(text: string): Promise<TermResult[]> {
  const dictionary = runtimeGlobal.__hoshirayDictionary;

  if (dictionary == null) {
    return [];
  }

  // console.log("[HoshiDicts] searching:", text);

  const result = dictionary.query(text);

  // console.log("[HoshiDicts] raw results:", result);

  return JSON.parse(result) as TermResult[];
}

export async function getStyles(): Promise<string> {
  const dictionary = runtimeGlobal.__hoshirayDictionary;

  if (dictionary == null) {
    return "";
  }

  const result = JSON.parse(dictionary.styles()) as Array<{
    dictionary: string;
    styles: string;
  }>;

  return result.map((entry) => entry.styles).join("\n");
}

export async function lookup(text: string): Promise<LookupResult[]> {
  const dictionary = runtimeGlobal.__hoshirayDictionary;

  if (dictionary == null) {
    return [];
  }

  const result = dictionary.lookup(text, 20, 20);

  return JSON.parse(result) as LookupResult[];
}
