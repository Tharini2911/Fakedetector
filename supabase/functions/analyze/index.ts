import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalysisSignal {
  name: string;
  score: number; // contribution to fake-ness (0-100 scale, weighted later)
  weight: number;
  detail: string;
}

// Curated lexicons for heuristic credibility scoring.
const SENSATIONAL_TERMS = [
  "shocking", "bombshell", "you won't believe", "mind-blowing", "exposed",
  "unbelievable", "jaw-dropping", "earth-shattering", "explosive", "outrageous",
  "scandal", "leaked", "cover-up", "they don't want you to know", "what happens next",
  "will shock you", "going viral", "breaking the internet", "must see", "must watch",
  "horrifying", "terrifying", "stunned", "blasts", "slams", "destroys", "wrecks",
  "melts down", "freaks out", "erupts", "explodes",
];

const HEDGING_TERMS = [
  "allegedly", "reportedly", "supposedly", "apparently", "claimed", "sources say",
  "some say", "many believe", "rumored", "it is said", "word is", "they say",
  "according to sources", "insiders say", "people are saying",
];

const CLICKBAIT_PATTERNS = [
  /\bwhat happened next\b/i,
  /\bthis .{0,20} reason why\b/i,
  /\bhere's why\b/i,
  /\bthis is (why|what|how)\b/i,
  /\b\d+ (things|reasons|signs|ways|facts)\b/i,
  /\b(only|just) .{0,15} (know|knew|realize|realized)\b/i,
  /\b(why|how) .{0,20} (should|must|need to)\b/i,
  /\bthis .{0,15} will (blow|change) your mind\b/i,
  /\b(he|she|they) (didn't|did not) expect .{0,20}/i,
];

const CREDIBLE_CUES = [
  "according to", "spokesperson", "statement", "press release", "study", "research",
  "published", "journal", "university", "researchers", "data shows", "statistics",
  "percent", "official", "department", "agency", "court", "ruling", "evidence",
  "findings", "report", "analysis", "documented", "confirmed by", "verified",
];

const ALL_CAPS_WORDS = /\b[A-Z]{4,}\b/g;
const EXCESSIVE_PUNCTUATION = /(!{2,}|\?{2,})/g;

function countMatches(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const term of terms) {
    if (lower.includes(term)) count += 1;
  }
  return count;
}

function countPatternMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) count += 1;
  }
  return count;
}

function analyzeText(rawText: string): { signals: AnalysisSignal[]; fakeScore: number } {
  const text = rawText.trim();
  const signals: AnalysisSignal[] = [];
  let weightedSum = 0;
  let weightTotal = 0;

  // Signal 1: Sensational language
  const sensationalHits = countMatches(text, SENSATIONAL_TERMS);
  const sensationalScore = Math.min(100, sensationalHits * 22);
  signals.push({
    name: "Sensational Language",
    score: sensationalScore,
    weight: 0.25,
    detail: sensationalHits > 0
      ? `${sensationalHits} sensational term(s) detected (e.g. "shocking", "bombshell").`
      : "No sensational or emotionally charged language detected.",
  });
  weightedSum += sensationalScore * 0.25;
  weightTotal += 0.25;

  // Signal 2: Clickbait patterns
  const clickbaitHits = countPatternMatches(text, CLICKBAIT_PATTERNS);
  const clickbaitScore = Math.min(100, clickbaitHits * 40);
  signals.push({
    name: "Clickbait Phrasing",
    score: clickbaitScore,
    weight: 0.2,
    detail: clickbaitHits > 0
      ? `${clickbaitHits} clickbait-style phrase pattern(s) matched.`
      : "No clickbait-style phrasing detected.",
  });
  weightedSum += clickbaitScore * 0.2;
  weightTotal += 0.2;

  // Signal 3: Hedging / unverifiable attribution
  const hedgingHits = countMatches(text, HEDGING_TERMS);
  const hedgingScore = Math.min(100, hedgingHits * 25);
  signals.push({
    name: "Vague Attribution",
    score: hedgingScore,
    weight: 0.15,
    detail: hedgingHits > 0
      ? `${hedgingHits} vague attribution(s) like "sources say" or "reportedly".`
      : "Claims are attributed to identifiable sources.",
  });
  weightedSum += hedgingScore * 0.15;
  weightTotal += 0.15;

  // Signal 4: Credibility cues (inverts score)
  const credibleHits = countMatches(text, CREDIBLE_CUES);
  const credibleScore = Math.max(0, 100 - credibleHits * 18);
  signals.push({
    name: "Source Credibility",
    score: credibleScore,
    weight: 0.2,
    detail: credibleHits > 0
      ? `${credibleHits} credibility cue(s) found (studies, officials, data).`
      : "Few or no credibility markers (studies, officials, data) found.",
  });
  weightedSum += credibleScore * 0.2;
  weightTotal += 0.2;

  // Signal 5: Excessive capitalization / punctuation
  const capsMatches = text.match(ALL_CAPS_WORDS) || [];
  const capsHits = capsMatches.length;
  const punctMatches = text.match(EXCESSIVE_PUNCTUATION) || [];
  const punctHits = punctMatches.length;
  const styleScore = Math.min(100, capsHits * 12 + punctHits * 30);
  signals.push({
    name: "Formatting Style",
    score: styleScore,
    weight: 0.1,
    detail: capsHits + punctHits > 0
      ? `${capsHits} all-caps word(s) and ${punctHits} excessive punctuation cluster(s).`
      : "Normal capitalization and punctuation.",
  });
  weightedSum += styleScore * 0.1;
  weightTotal += 0.1;

  // Signal 6: Length / substance
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const lengthScore = wordCount < 40 ? 70 : wordCount < 120 ? 35 : 10;
  signals.push({
    name: "Content Depth",
    score: lengthScore,
    weight: 0.1,
    detail: `${wordCount} words. ${wordCount < 40 ? "Very short content often signals low substance." : "Adequate length for substantive reporting."}`,
  });
  weightedSum += lengthScore * 0.1;
  weightTotal += 0.1;

  const fakeScore = weightTotal > 0 ? weightedSum / weightTotal : 0;
  return { signals, fakeScore: Math.round(fakeScore) };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const body = await req.json();
    const { inputType, content } = body as {
      inputType: "text" | "url";
      content: string;
    };

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Content is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let analysisText = content.trim();

    if (inputType === "url") {
      try {
        new URL(analysisText);
      } catch {
        return new Response(
          JSON.stringify({ error: "Please provide a valid URL." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      analysisText = analysisText.replace(/https?:\/\//i, "").replace(/www\./i, "");
    }

    const { signals, fakeScore } = analyzeText(analysisText);
    const verdict = fakeScore >= 50 ? "fake" : "real";
    const confidence = verdict === "fake" ? fakeScore : 100 - fakeScore;

    // Persist to analyses table if an auth token is present.
    if (authHeader.startsWith("Bearer ")) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false, autoRefreshToken: false } },
      );

      // Verify the user's token to resolve their id for ownership.
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );
      const { data: userData } = await userClient.auth.getUser();
      const userId = userData?.user?.id;

      if (userId) {
        await supabase.from("analyses").insert({
          user_id: userId,
          input_type: inputType,
          content: content.trim(),
          verdict,
          confidence: Number(confidence.toFixed(2)),
          signals: { signals, fakeScore },
        });
      }
    }

    return new Response(
      JSON.stringify({
        verdict,
        confidence: Number(confidence.toFixed(2)),
        fakeScore,
        signals,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Analysis failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
