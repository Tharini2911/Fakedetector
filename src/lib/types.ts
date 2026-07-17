export interface AnalysisSignal {
  name: string;
  score: number;
  weight: number;
  detail: string;
}

export interface AnalysisResult {
  verdict: "real" | "fake";
  confidence: number;
  fakeScore: number;
  signals: AnalysisSignal[];
}

export interface AnalysisRecord {
  id: string;
  input_type: "text" | "url";
  content: string;
  verdict: "real" | "fake";
  confidence: number;
  signals: { signals: AnalysisSignal[]; fakeScore: number };
  created_at: string;
}
