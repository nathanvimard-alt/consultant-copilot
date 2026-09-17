import type { ConsultingAnalysis } from "./analysisSchema";

export interface RetrievedChunkInfo {
  sourceName: string;
  index: number;
  score: number;
}

export interface AnalyzeResponse {
  analysis: ConsultingAnalysis;
  retrieval: {
    totalChunks: number;
    retrievedChunks: RetrievedChunkInfo[];
  };
}
