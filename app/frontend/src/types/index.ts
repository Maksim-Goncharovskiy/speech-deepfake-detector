export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'finished' | 'error';


export type PredictionLabel = 'real' | 'fake';
export type PredictionConfidence = 'low' | 'medium' | 'high';


export interface Prediction {
  label: PredictionLabel;
  confidence: PredictionConfidence;
}


export interface ApiError {
  detail: string;
  status_code?: number;
}