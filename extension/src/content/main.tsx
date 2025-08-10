import DOMPurify from 'dompurify'
import type { 
  ExtensionMessage, 
  ExtractHtmlResponse, 
  ExtractTwitterThreadMessage,
  ExtractTwitterThreadResponse 
} from '@/types/messages'
import { collectTwitterThread, cancelExtraction } from './twitterThread'

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    console.log('[Content] Received message:', message.type);
    
    if (message.type === 'EXTRACT_HTML') {
      handleExtractHtml(sendResponse)
      return true
    }
    
    if (message.type === 'EXTRACT_TWITTER_THREAD') {
      console.log('[Content] Handling EXTRACT_TWITTER_THREAD');
      handleExtractTwitterThread(message as ExtractTwitterThreadMessage, sendResponse)
      return true
    }
    
    console.log('[Content] Unknown message type:', message.type);
    return false
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

function handleExtractTwitterThread(
  message: ExtractTwitterThreadMessage,
  sendResponse: (response: ExtractTwitterThreadResponse) => void
) {
  console.log('[Content] Starting Twitter thread extraction with config:', message.config)
  
  // Use setTimeout to make it asynchronous but still return true to keep port open
  setTimeout(async () => {
    try {
      const result = await collectTwitterThread(message.config)
      
      console.log('[Content] Thread extraction completed successfully:', result.stats)
      
      const response: ExtractTwitterThreadResponse = {
        type: 'EXTRACT_TWITTER_THREAD_RESPONSE',
        success: true,
        data: result.extract,
        stats: result.stats
      }
      
      sendResponse(response)
    } catch (error) {
      console.error('[Content] Thread extraction failed:', error)
      
      const response: ExtractTwitterThreadResponse = {
        type: 'EXTRACT_TWITTER_THREAD_RESPONSE',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract Twitter thread'
      }
      
      sendResponse(response)
    }
  }, 0)
}

window.addEventListener('beforeunload', () => {
  cancelExtraction()
})

