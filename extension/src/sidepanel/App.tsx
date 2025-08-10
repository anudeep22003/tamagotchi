import { useState, useEffect } from "react";
import type {
  ExtractHtmlResponse,
  SendHtmlResponse,
  ExtractTwitterThreadResponse,
  SendTwitterThreadResponse,
} from "@/types/messages";
import type {
  TwitterAdapterConfig,
  ThreadExtract,
  TwitterParsingStats,
} from "@/types/twitter";
import { isTwitterUrl, TWITTER_CONFIG } from "@/config/twitter";
import "./App.css";

type Status =
  | "idle"
  | "extracting"
  | "sending"
  | "success"
  | "error"
  | "preview";
type ContentType = "html" | "twitter";

interface ExtractedContent {
  type: ContentType;
  html?: {
    html: string;
    url: string;
    title: string;
  };
  twitter?: {
    extract: ThreadExtract;
    stats: TwitterParsingStats;
    url: string;
    title: string;
  };
}

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [contentType, setContentType] = useState<ContentType>("html");
  const [extractedContent, setExtractedContent] =
    useState<ExtractedContent | null>(null);
  const [twitterConfig, setTwitterConfig] =
    useState<TwitterAdapterConfig>(TWITTER_CONFIG.defaultParsingConfig);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log("[Sidepanel] Tabs:", tabs);
      console.log("current url", tabs[0]?.url);
      const currentUrl = tabs[0]?.url || "";
      setContentType(isTwitterUrl(currentUrl) ? "twitter" : "html");
    });
  }, []);

  const handleExtract = async () => {
    console.log("handleExtract");
    try {
      setStatus("extracting");
      setExtractedContent(null);

      if (contentType === "twitter") {
        console.log("extracting twitter");
        setMessage("Auto-scrolling and extracting Twitter thread...");
        
        if (!await getUserConfirmation('This will scroll through the entire thread to collect all tweets. Continue?')) {
          setStatus('idle')
          setMessage('')
          return
        }

        const extractResponse = (await chrome.runtime.sendMessage({
          type: "EXTRACT_TWITTER_THREAD",
          config: twitterConfig,
        })) as ExtractTwitterThreadResponse;

        console.log(
          "[Sidepanel] Twitter extraction response:",
          extractResponse
        );

        if (!extractResponse || extractResponse.success === undefined) {
          setStatus("error");
          setMessage(
            "Twitter extraction timed out or failed. Try reducing scroll passes or try HTML fallback."
          );
          return;
        }

        if (!extractResponse.success) {
          setStatus("error");
          setMessage(
            extractResponse.error || "Failed to extract Twitter thread"
          );
          return;
        }

        if (
          !extractResponse.data ||
          extractResponse.data.tweets.length === 0
        ) {
          setStatus("error");
          setMessage(
            "No tweets found. Falling back to HTML extraction."
          );
          await fallbackToHtml();
          return;
        }

        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        setExtractedContent({
          type: "twitter",
          twitter: {
            extract: extractResponse.data,
            stats: extractResponse.stats!,
            url: tab?.url || "",
            title: tab?.title || "",
          },
        });

        setStatus("preview");
        setMessage(
          `Extracted ${extractResponse.data.tweets.length} tweets. Review and confirm to send.`
        );
      } else {
        setMessage("Extracting HTML from current page...");

        const extractResponse = (await chrome.runtime.sendMessage({
          type: "EXTRACT_HTML",
        })) as ExtractHtmlResponse;

        if (!extractResponse.success) {
          setStatus("error");
          setMessage(extractResponse.error || "Failed to extract HTML");
          return;
        }

        if (!extractResponse.data) {
          setStatus("error");
          setMessage("No data extracted from page");
          return;
        }

        setExtractedContent({
          type: "html",
          html: extractResponse.data,
        });

        setStatus("preview");
        setMessage("HTML extracted. Review and confirm to send.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Unexpected error occurred");
      console.error("Extract error:", error);
    }
  };

  const fallbackToHtml = async () => {
    try {
      setMessage("Extracting HTML as fallback...");

      const extractResponse = (await chrome.runtime.sendMessage({
        type: "EXTRACT_HTML",
      })) as ExtractHtmlResponse;

      if (!extractResponse.success) {
        setStatus("error");
        setMessage(
          extractResponse.error || "HTML fallback also failed"
        );
        return;
      }

      setExtractedContent({
        type: "html",
        html: extractResponse.data!,
      });

      setStatus("preview");
      setMessage(
        "HTML extracted as fallback. Review and confirm to send."
      );
    } catch (error) {
      setStatus("error");
      setMessage("HTML fallback failed");
    }
  };

  const getUserConfirmation = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolve(window.confirm(message))
    })
  }

  const handleSend = async () => {
    if (!extractedContent) return;

    try {
      setStatus("sending");
      setMessage("Sending to backend...");

      if (
        extractedContent.type === "twitter" &&
        extractedContent.twitter
      ) {
        const sendResponse = (await chrome.runtime.sendMessage({
          type: "SEND_TWITTER_THREAD",
          data: {
            url: extractedContent.twitter.url,
            page_title: extractedContent.twitter.title,
            extracted: extractedContent.twitter.extract,
            stats: extractedContent.twitter.stats,
          },
        })) as SendTwitterThreadResponse;

        if (sendResponse.success) {
          setStatus("success");
          setMessage("Twitter thread sent successfully");
        } else {
          setStatus("error");
          setMessage(
            sendResponse.error || "Failed to send Twitter thread"
          );
        }
      } else if (
        extractedContent.type === "html" &&
        extractedContent.html
      ) {
        const sendResponse = (await chrome.runtime.sendMessage({
          type: "SEND_HTML",
          data: extractedContent.html,
        })) as SendHtmlResponse;

        if (sendResponse.success) {
          setStatus("success");
          setMessage("HTML sent successfully");
        } else {
          setStatus("error");
          setMessage(sendResponse.error || "Failed to send HTML");
        }
      }
    } catch (error) {
      setStatus("error");
      setMessage("Unexpected error occurred");
    }
  };

  const handleCancel = () => {
    setExtractedContent(null);
    setStatus("idle");
    setMessage("");
  };

  const isLoading = status === "extracting" || status === "sending";
  const isPreview = status === "preview";

  return (
    <div className="sidepanel-container">
      <div className="header">
        <h2>Content Extractor</h2>
        <div className="content-type">
          {contentType === "twitter"
            ? "🐦 Twitter Thread"
            : "📄 HTML Content"}
        </div>
      </div>

      <div className="content">
        {!isPreview ? (
          <>
            {contentType === "twitter" && (
              <div className="config-section">
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="config-toggle"
                >
                  {showConfig ? "▼" : "▶"} Parsing Options
                </button>

                {showConfig && (
                  <div className="config-options">
                    <label>
                      <input
                        type="checkbox"
                        checked={twitterConfig.include_retweets}
                        onChange={(e) =>
                          setTwitterConfig({
                            ...twitterConfig,
                            include_retweets: e.target.checked,
                          })
                        }
                      />
                      Include Retweets
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={
                          twitterConfig.include_replies_by_author
                        }
                        onChange={(e) =>
                          setTwitterConfig({
                            ...twitterConfig,
                            include_replies_by_author: e.target.checked,
                          })
                        }
                      />
                      Include Thread Replies
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={twitterConfig.collect_media}
                        onChange={(e) =>
                          setTwitterConfig({
                            ...twitterConfig,
                            collect_media: e.target.checked,
                          })
                        }
                      />
                      Extract Media & Links
                    </label>
                    
                    <div className="scroll-config">
                      <label htmlFor="scroll-passes">
                        Max Scroll Passes: {twitterConfig.max_scroll_passes}
                      </label>
                      <input
                        id="scroll-passes"
                        type="range"
                        min="3"
                        max="20"
                        value={twitterConfig.max_scroll_passes}
                        onChange={(e) => setTwitterConfig({
                          ...twitterConfig,
                          max_scroll_passes: parseInt(e.target.value)
                        })}
                        className="scroll-slider"
                      />
                      <div className="scroll-hint">
                        Lower = faster, Higher = more complete
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleExtract}
              disabled={isLoading}
              className={`extract-button ${status}`}
            >
              {isLoading
                ? "Processing..."
                : `Extract ${
                    contentType === "twitter" ? "Thread" : "HTML"
                  }`}
            </button>
          </>
        ) : (
          <div className="preview-section">
            {extractedContent?.type === "twitter" &&
              extractedContent.twitter && (
                <div className="twitter-preview">
                  <h3>Twitter Thread Preview</h3>
                  <div className="thread-info">
                    <p>
                      <strong>Author:</strong> @
                      {extractedContent.twitter.extract.author_handle}
                    </p>
                    <p>
                      <strong>Tweets:</strong>{" "}
                      {extractedContent.twitter.extract.tweets.length}
                    </p>
                    <p>
                      <strong>Media:</strong>{" "}
                      {extractedContent.twitter.stats.media_extracted}{" "}
                      items
                    </p>
                    <p>
                      <strong>Links:</strong>{" "}
                      {extractedContent.twitter.stats.links_extracted}{" "}
                      links
                    </p>
                    <p>
                      <strong>Parsing time:</strong>{" "}
                      {extractedContent.twitter.stats.parsing_time_ms}ms
                    </p>
                  </div>

                  <div className="tweets-preview">
                    {extractedContent.twitter.extract.tweets
                      .slice(0, 3)
                      .map((tweet) => (
                        <div
                          key={tweet.tweet_id}
                          className="tweet-preview"
                        >
                          <div className="tweet-text">
                            {tweet.text.substring(0, 100)}...
                          </div>
                          {tweet.media.length > 0 && (
                            <div className="media-count">
                              📎 {tweet.media.length} media
                            </div>
                          )}
                        </div>
                      ))}
                    {extractedContent.twitter.extract.tweets.length >
                      3 && (
                      <div className="more-tweets">
                        +
                        {extractedContent.twitter.extract.tweets
                          .length - 3}{" "}
                        more tweets...
                      </div>
                    )}
                  </div>
                </div>
              )}

            {extractedContent?.type === "html" && (
              <div className="html-preview">
                <h3>HTML Content Preview</h3>
                <p>
                  <strong>URL:</strong> {extractedContent.html?.url}
                </p>
                <p>
                  <strong>Title:</strong> {extractedContent.html?.title}
                </p>
                <p>
                  <strong>Content Size:</strong>{" "}
                  {extractedContent.html?.html.length} characters
                </p>
              </div>
            )}

            <div className="preview-actions">
              <button onClick={handleSend} className="send-button">
                Send to Backend
              </button>
              <button onClick={handleCancel} className="cancel-button">
                Cancel
              </button>
            </div>
          </div>
        )}

        {message && (
          <div className={`message ${status}`}>{message}</div>
        )}
      </div>
    </div>
  );
}
