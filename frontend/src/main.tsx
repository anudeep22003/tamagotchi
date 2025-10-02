import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { AppProvider } from "@/context/AppContext";
import "./index.css";
import { router } from "./router";
import { PostHogProvider } from "posthog-js/react";
import { POSTHOG_KEY, POSTHOG_URL } from "./constants";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider
      apiKey={POSTHOG_KEY}
      options={{
        api_host: POSTHOG_URL,
        capture_exceptions: true,
        debug: import.meta.env.MODE === "development",
        capture_pageview: false,
        capture_pageleave: false,
        autocapture: true,
      }}
    >
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </PostHogProvider>
  </StrictMode>
);
