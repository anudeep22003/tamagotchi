import DOMPurify from 'dompurify'
import type { ExtensionMessage, ExtractHtmlResponse } from '@/types/messages'

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'EXTRACT_HTML') {
      handleExtractHtml(sendResponse)
      return true
    }
  }
)

function handleExtractHtml(sendResponse: (response: ExtractHtmlResponse) => void) {
  try {
    const bodyHtml = document.body.outerHTML
    
    const cleanHtml = DOMPurify.sanitize(bodyHtml, {
      FORBID_TAGS: ['script', 'style', 'noscript'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
      KEEP_CONTENT: false
    })

    if (!cleanHtml.trim()) {
      sendResponse({
        type: 'EXTRACT_HTML_RESPONSE',
        success: false,
        error: 'No extractable content found on this page'
      })
      return
    }

    sendResponse({
      type: 'EXTRACT_HTML_RESPONSE',
      success: true,
      data: {
        html: cleanHtml,
        url: window.location.href,
        title: document.title
      }
    })
  } catch (error) {
    sendResponse({
      type: 'EXTRACT_HTML_RESPONSE',
      success: false,
      error: 'Failed to extract HTML content'
    })
  }
}
