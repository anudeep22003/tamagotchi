import { useState } from 'react'
import type { ExtractHtmlResponse, SendHtmlResponse } from '@/types/messages'
import './App.css'

type Status = 'idle' | 'extracting' | 'sending' | 'success' | 'error'

export default function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string>('')

  const handleSendHtml = async () => {
    try {
      setStatus('extracting')
      setMessage('Extracting HTML from current page...')

      const extractResponse = await chrome.runtime.sendMessage({ 
        type: 'EXTRACT_HTML' 
      }) as ExtractHtmlResponse

      if (!extractResponse.success) {
        setStatus('error')
        setMessage(extractResponse.error || 'Failed to extract HTML')
        return
      }

      if (!extractResponse.data) {
        setStatus('error')
        setMessage('No data extracted from page')
        return
      }

      setStatus('sending')
      setMessage('Sending HTML to backend...')

      const sendResponse = await chrome.runtime.sendMessage({
        type: 'SEND_HTML',
        data: extractResponse.data
      }) as SendHtmlResponse

      if (sendResponse.success) {
        setStatus('success')
        setMessage('HTML sent successfully')
      } else {
        setStatus('error')
        setMessage(sendResponse.error || 'Failed to send HTML')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Unexpected error occurred')
    }
  }

  const isLoading = status === 'extracting' || status === 'sending'

  return (
    <div className="sidepanel-container">
      <div className="header">
        <h2>HTML Extractor</h2>
      </div>
      
      <div className="content">
        <button 
          onClick={handleSendHtml}
          disabled={isLoading}
          className={`send-button ${status}`}
        >
          {isLoading ? 'Processing...' : 'Send HTML'}
        </button>

        {message && (
          <div className={`message ${status}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
