export type Envelope<T = unknown> = {
  // protocol
  v: "1";

  // identity & timing
  id: string; // message id (uuid)
  ts: number; // Unix timestamp in milliseconds

  // correlation
  requestId?: string; // request you're replying to
  streamId?: string; // server-minted for streams
  seq?: number; // per-stream sequence, starting at 1

  // control
  direction: "c2s" | "s2c";
  domain: "chat";
  action: "stream";
  modifier: "start" | "chunk" | "end";

  // payload
  data: T;

  // errors
  error?: {
    code: ErrorCode; // see taxonomy below
    message: string;
    details?: unknown;
  };
};

export type ErrorCode =
  | "E_INVALID"
  | "E_UNAUTHORIZED"
  | "E_FORBIDDEN"
  | "E_NOT_FOUND"
  | "E_CONFLICT"
  | "E_RATE_LIMITED"
  | "E_TIMEOUT"
  | "E_OVERFLOW"
  | "E_UNAVAILABLE"
  | "E_INTERNAL";
