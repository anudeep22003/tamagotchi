export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:8080";

export const POSTHOG_URL =
  import.meta.env.VITE_POSTHOG_URL || "https://us.i.posthog.com";

export const POSTHOG_KEY =
  import.meta.env.VITE_POSTHOG_KEY ||
  "phc_QUvv9mvRZ8YuaOoTapatrc8BwnkJvqJm9fBqhVoUXQc";

console.log("BACKEND_URL", BACKEND_URL);
