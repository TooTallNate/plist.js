import { useState, useCallback, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { parse, build, buildBinary } from "plist";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Tabs } from "./components/ui/tabs";
import { Github, Upload, ArrowRight, ArrowLeft } from "lucide-react";

const INPUT_TABS = ["Editor", "File Upload"] as const;
const OUTPUT_TABS = ["JSON", "XML", "Binary (hex)"] as const;
const FORMATS = ["Auto-detect", "XML", "Binary", "OpenStep"] as const;
type Format = (typeof FORMATS)[number];

function replacer(_key: string, value: unknown) {
  if (value instanceof Uint8Array) {
    const b64 = btoa(String.fromCharCode(...value));
    return `<base64>${b64.length > 40 ? b64.slice(0, 40) + "…" : b64}`;
  }
  return value;
}

function hexDump(buf: Uint8Array): string {
  const lines: string[] = [];
  for (let i = 0; i < buf.length; i += 16) {
    const hex = Array.from(buf.slice(i, i + 16))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    const ascii = Array.from(buf.slice(i, i + 16))
      .map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "."))
      .join("");
    lines.push(
      `${i.toString(16).padStart(8, "0")}  ${hex.padEnd(48)}  |${ascii}|`
    );
  }
  return lines.join("\n");
}

const DEFAULT_SAMPLE = "sample-basic.plist";

export default function App() {
  const [inputTab, setInputTab] = useState<string>("Editor");
  const [outputTab, setOutputTab] = useState<string>("JSON");
  const [format, setFormat] = useState<Format>("Auto-detect");
  const [inputValue, setInputValue] = useState("");
  const [jsonOutput, setJsonOutput] = useState("");
  const [xmlOutput, setXmlOutput] = useState("");
  const [hexOutput, setHexOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/samples/${DEFAULT_SAMPLE}`)
      .then((r) => r.text())
      .then(setInputValue)
      .catch(() => {});
  }, []);

  const loadFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setInputValue(reader.result as string);
      setInputTab("Editor");
    };
    reader.readAsText(file);
  }, []);

  const handleParse = useCallback(() => {
    setError(null);
    try {
      const result = parse(inputValue);
      setJsonOutput(JSON.stringify(result, replacer, 2));
      try {
        setXmlOutput(build(result));
      } catch {
        setXmlOutput("// Could not build XML from parsed result");
      }
      try {
        const bin = buildBinary(result);
        setHexOutput(hexDump(bin));
      } catch {
        setHexOutput("// Could not build binary from parsed result");
      }
    } catch (e) {
      setError(`Parse error: ${(e as Error).message}`);
    }
  }, [inputValue]);

  const handleBuild = useCallback(() => {
    setError(null);
    try {
      const obj = JSON.parse(jsonOutput);
      const xml = build(obj);
      setInputValue(xml);
      setInputTab("Editor");
    } catch (e) {
      setError(`Build error: ${(e as Error).message}`);
    }
  }, [jsonOutput]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
        <h1 className="text-lg font-bold tracking-tight">
          plist.js Playground
        </h1>
        <div className="flex items-center gap-3">
          <a
            href="https://www.npmjs.com/package/plist"
            target="_blank"
            rel="noopener"
          >
            <img
              src="https://img.shields.io/npm/v/plist?style=flat-square&color=blue"
              alt="npm"
              className="h-5"
            />
          </a>
          <a
            href="https://github.com/TooTallNate/plist.js"
            target="_blank"
            rel="noopener"
            className="text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <Github size={20} />
          </a>
        </div>
      </header>

      {/* Error bar */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-2 text-red-400 text-sm font-mono shrink-0">
          {error}
        </div>
      )}

      {/* Main panels */}
      <div className="flex flex-1 min-h-0">
        {/* Left - Input */}
        <div className="flex flex-col flex-1 border-r border-zinc-800">
          <div className="px-4 pt-3">
            <Tabs
              tabs={[...INPUT_TABS]}
              active={inputTab}
              onTabChange={setInputTab}
            />
          </div>

          <div className="flex-1 min-h-0">
            {inputTab === "Editor" ? (
              <Editor
                height="100%"
                defaultLanguage="xml"
                theme="vs-dark"
                value={inputValue}
                onChange={(v) => setInputValue(v ?? "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                }}
              />
            ) : (
              <div
                className={`flex flex-col items-center justify-center h-full gap-4 p-8 transition-colors ${
                  dragOver
                    ? "bg-blue-500/10 border-2 border-dashed border-blue-500"
                    : "border-2 border-dashed border-zinc-700 m-4 rounded-lg"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) loadFile(file);
                }}
              >
                <Upload size={48} className="text-zinc-500" />
                <p className="text-zinc-400 text-sm">
                  Drag & drop a .plist file here, or
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".plist"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) loadFile(file);
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-4 py-3 border-t border-zinc-800 shrink-0">
            <span className="text-xs text-zinc-500 mr-1">Format:</span>
            {FORMATS.map((f) => (
              <Badge
                key={f}
                variant={format === f ? "default" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => setFormat(f)}
              >
                {f}
              </Badge>
            ))}
            <div className="flex-1" />
            <Button size="sm" onClick={handleParse}>
              Parse <ArrowRight size={14} />
            </Button>
          </div>
        </div>

        {/* Right - Output */}
        <div className="flex flex-col flex-1">
          <div className="px-4 pt-3">
            <Tabs
              tabs={[...OUTPUT_TABS]}
              active={outputTab}
              onTabChange={setOutputTab}
            />
          </div>

          <div className="flex-1 min-h-0">
            {outputTab === "JSON" ? (
              <Editor
                height="100%"
                defaultLanguage="json"
                theme="vs-dark"
                value={jsonOutput}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                }}
              />
            ) : outputTab === "XML" ? (
              <Editor
                height="100%"
                defaultLanguage="xml"
                theme="vs-dark"
                value={xmlOutput}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                }}
              />
            ) : (
              <Editor
                height="100%"
                defaultLanguage="plaintext"
                theme="vs-dark"
                value={hexOutput}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  wordWrap: "off",
                  fontFamily: "monospace",
                }}
              />
            )}
          </div>

          <div className="flex items-center px-4 py-3 border-t border-zinc-800 shrink-0">
            <Button variant="outline" size="sm" onClick={handleBuild}>
              <ArrowLeft size={14} /> Build
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-center gap-2 px-6 py-2 border-t border-zinc-800 text-xs text-zinc-500 shrink-0">
        Powered by{" "}
        <a
          href="https://github.com/TooTallNate/plist.js"
          className="underline hover:text-zinc-300"
        >
          plist.js
        </a>{" "}
        — parse and build Apple plist files in the browser
        <img
          src="https://img.shields.io/bundlephobia/minzip/plist?style=flat-square&label=size"
          alt="bundle size"
          className="h-4 ml-2"
        />
      </footer>
    </div>
  );
}
