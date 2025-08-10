export interface ChoiceDelta {
  content?: string;
  role?: string;
}

export interface Choice {
  index: number;
  delta: ChoiceDelta;
  finishReason?: string;
}

export interface StreamingResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Choice[];
}

export interface SimpleResponse {
  id: string;
  type: "generative";
  content: string;
  timestamp: number;
}

// Additions for write-and-route
export interface GeneratedCode {
  code: string;
}
