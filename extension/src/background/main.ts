import { API_CONFIG } from "@/config/api";
import type {
  ExtensionMessage,
  ExtractHtmlMessage,
  SendHtmlMessage,
  SendHtmlResponse,
} from "@/types/messages";
import type { BackendRequestData } from "@/types/api";

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id! });
});

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    if (message.type === "EXTRACT_HTML") {
      handleExtractHtml(
        message as ExtractHtmlMessage,
        sender,
        sendResponse
      );
      return true;
    }

    if (message.type === "SEND_HTML") {
      handleSendHtml(message as SendHtmlMessage, sendResponse);
      return true;
    }
  }
);

async function handleExtractHtml(
  _message: ExtractHtmlMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void
) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) {
      sendResponse({
        type: "EXTRACT_HTML_RESPONSE",
        success: false,
        error: "No active tab found",
      });
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "EXTRACT_HTML",
    });
    sendResponse(response);
  } catch (error) {
    sendResponse({
      type: "EXTRACT_HTML_RESPONSE",
      success: false,
      error: "Failed to extract HTML from page",
    });
  }
}

async function handleSendHtml(
  message: SendHtmlMessage,
  sendResponse: (response: SendHtmlResponse) => void
) {
  try {
    const payload: BackendRequestData = {
      html: message.data.html,
      url: message.data.url,
      title: message.data.title,
      timestamp: new Date().toISOString(),
    };

    const backendUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.sendHtml}`;

    const response = await fetch(`${backendUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    await response.json();

    sendResponse({
      type: "SEND_HTML_RESPONSE",
      success: true,
      message: "HTML sent successfully",
    });
  } catch (error) {
    sendResponse({
      type: "SEND_HTML_RESPONSE",
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send HTML",
    });
  }
}
