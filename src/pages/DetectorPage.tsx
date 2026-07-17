import { useEffect, useState } from "react";
import {
  ScanSearch, LogOut, Loader2, Link2, FileText, ShieldCheck, ShieldAlert,
  History, Trash2, ChevronRight, AlertCircle, Sparkles, TrendingUp,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import type { AnalysisResult, AnalysisRecord, AnalysisSignal } from "../lib/types";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze`;

export default function DetectorPage() {
  const { user, signOut } = useAuth();
  const [mode, setMode] = useState<"text" | "url">("text");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("analyses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) setHistory(data as AnalysisRecord[]);
    setHistoryLoading(false);
  }

  async function handleAnalyze() {
    setError(null);
    setResult(null);
    if (!input.trim()) {
      setError("Please enter some news text or a URL to analyze.");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ inputType: mode, content: input.trim() }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as AnalysisResult;
      if (!data.verdict || typeof data.confidence !== "number") {
        throw new Error("Received an unexpected response from the analyzer.");
      }
      setResult(data);
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteRecord(id: string) {
    const prev = history;
    setHistory(history.filter((h) => h.id !== id));
    const { error } = await supabase.from("analyses").delete().eq("id", id);
    if (error) setHistory(prev);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <ScanSearch className="w-5 h-5 text-slate-950" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">VeriTruth</h1>
              <p className="text-[11px] text-slate-500 -mt-0.5">Fake News Detector</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-slate-400 max-w-[200px] truncate">
              {user?.email}
            </span>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-lg px-3 py-1.5 transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-sky-300 bg-sky-500/10 border border-sky-500/20 rounded-full px-3 py-1 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Credibility Analysis
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Detect fake news in seconds
          </h2>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto text-sm sm:text-base">
            Paste a news article or enter a URL. Our AI analyzes language patterns, source cues, and
            formatting to assess credibility with a confidence score.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Input + Result */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6">
              {/* Mode toggle */}
              <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl mb-4 w-full sm:w-auto sm:max-w-xs">
                <button
                  onClick={() => setMode("text")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition ${
                    mode === "text"
                      ? "bg-slate-700 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  News Text
                </button>
                <button
                  onClick={() => setMode("url")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition ${
                    mode === "url"
                      ? "bg-slate-700 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Link2 className="w-4 h-4" />
                  News URL
                </button>
              </div>

              {mode === "text" ? (
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={7}
                  placeholder="Paste the full news article text here..."
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition resize-y"
                />
              ) : (
                <input
                  type="url"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="https://example.com/news-article"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition"
                />
              )}

              {error && (
                <div className="flex items-start gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2.5 text-sm mt-4">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-semibold text-sm shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <ScanSearch className="w-4 h-4" />
                    Analyze {mode === "text" ? "Text" : "URL"}
                  </>
                )}
              </button>
            </div>

            {/* Result */}
            {result && <ResultCard result={result} />}
          </div>

          {/* History */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-200">Analysis History</h3>
              </div>

              {historyLoading ? (
                <div className="flex items-center justify-center py-10 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  No analyses yet. Your results will appear here.
                </div>
              ) : (
                <ul className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {history.map((rec) => (
                    <HistoryItem key={rec.id} record={rec} onDelete={deleteRecord} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ResultCard({ result }: { result: AnalysisResult }) {
  const isFake = result.verdict === "fake";
  const Icon = isFake ? ShieldAlert : ShieldCheck;

  return (
    <div className={`bg-slate-900/60 border rounded-2xl p-5 sm:p-6 animate-[fadeIn_0.4s_ease] ${
      isFake ? "border-rose-500/40" : "border-emerald-500/40"
    }`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
          isFake ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"
        }`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-lg font-bold ${isFake ? "text-rose-400" : "text-emerald-400"}`}>
              {isFake ? "Likely Fake" : "Likely Real"}
            </span>
            <span className="text-slate-500 text-sm">
              {result.confidence.toFixed(1)}% confidence
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {isFake
              ? "This content shows multiple signals common to misinformation."
              : "This content shows markers of credible reporting."}
          </p>
        </div>
      </div>

      {/* Confidence meter */}
      <div className="mt-5">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>Credibility</span>
          <span>{(100 - result.fakeScore).toFixed(0)} / 100</span>
        </div>
        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isFake
                ? "bg-gradient-to-r from-rose-500 to-rose-400"
                : "bg-gradient-to-r from-emerald-500 to-emerald-400"
            }`}
            style={{ width: `${100 - result.fakeScore}%` }}
          />
        </div>
      </div>

      {/* Signals */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Detection Signals
          </h4>
        </div>
        <div className="space-y-2.5">
          {result.signals.map((sig) => (
            <SignalRow key={sig.name} signal={sig} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SignalRow({ signal }: { signal: AnalysisSignal }) {
  const intensity = Math.min(100, signal.score);
  const barColor =
    intensity > 60 ? "bg-rose-500/70"
    : intensity > 35 ? "bg-amber-500/70"
    : "bg-emerald-500/70";

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-200">{signal.name}</span>
        <span className="text-xs text-slate-400">{intensity}% risk</span>
      </div>
      <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${intensity}%` }} />
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{signal.detail}</p>
    </div>
  );
}

function HistoryItem({
  record,
  onDelete,
}: {
  record: AnalysisRecord;
  onDelete: (id: string) => void;
}) {
  const isFake = record.verdict === "fake";
  const preview = record.content.length > 80 ? record.content.slice(0, 80) + "..." : record.content;

  return (
    <li className="group bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 hover:border-slate-600 transition">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              isFake ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"
            }`}>
              {isFake ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
              {isFake ? "Fake" : "Real"}
            </span>
            <span className="text-xs text-slate-500">{record.confidence}% conf.</span>
            <span className="text-xs text-slate-600 flex items-center gap-0.5">
              <ChevronRight className="w-3 h-3" />
              {record.input_type}
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate">{preview}</p>
          <p className="text-[11px] text-slate-600 mt-1">
            {new Date(record.created_at).toLocaleString()}
          </p>
        </div>
        <button
          onClick={() => onDelete(record.id)}
          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition p-1"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </li>
  );
}
