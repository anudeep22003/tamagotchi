import { API_CONFIG } from "@/config/api";
import type {
  ExtensionMessage,
  ExtractHtmlMessage,
  SendHtmlMessage,
  SendHtmlResponse,
  ExtractTwitterThreadMessage,
  SendTwitterThreadMessage,
  SendTwitterThreadResponse,
} from "@/types/messages";
import type { BackendRequestData } from "@/types/api";
import type { TwitterBackendPayload } from "@/types/twitter";

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
    
    if (message.type === "EXTRACT_TWITTER_THREAD") {
      handleExtractTwitterThread(
        message as ExtractTwitterThreadMessage,
        sender,
        sendResponse
      );
      return true;
    }

    if (message.type === "SEND_TWITTER_THREAD") {
      handleSendTwitterThread(message as SendTwitterThreadMessage, sendResponse);
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

async function handleExtractTwitterThread(
  message: ExtractTwitterThreadMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void
) {
  console.log('[Background] Handling EXTRACT_TWITTER_THREAD with config:', message.config);
  
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    
    console.log('[Background] Active tab:', tab?.url);
    
    if (!tab?.id) {
      console.log('[Background] No active tab found');
      sendResponse({
        type: "EXTRACT_TWITTER_THREAD_RESPONSE",
        success: false,
        error: "No active tab found",
      });
      return;
    }

    console.log('[Background] Sending message to content script on tab:', tab.id);
    
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "EXTRACT_TWITTER_THREAD",
      config: message.config
    });
    
    console.log('[Background] Got response from content script:', response);
    sendResponse(response);
  } catch (error) {
    console.error('[Background] Error in handleExtractTwitterThread:', error);
    sendResponse({
      type: "EXTRACT_TWITTER_THREAD_RESPONSE",
      success: false,
      error: "Failed to extract Twitter thread from page",
    });
  }
}

async function handleSendTwitterThread(
  message: SendTwitterThreadMessage,
  sendResponse: (response: SendTwitterThreadResponse) => void
) {
  try {
    const payload: TwitterBackendPayload = {
      url: message.data.url,
      page_title: message.data.page_title,
      extracted: message.data.extracted,
      stats: message.data.stats
    };

    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.sendHtml}`, {
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
      type: "SEND_TWITTER_THREAD_RESPONSE",
      success: true,
      message: "Twitter thread sent successfully",
    });
  } catch (error) {
    sendResponse({
      type: "SEND_TWITTER_THREAD_RESPONSE",
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send Twitter thread",
    });
  }
}
