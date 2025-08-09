export interface ExtractHtmlMessage {
  type: 'EXTRACT_HTML'
}

export interface ExtractHtmlResponse {
  type: 'EXTRACT_HTML_RESPONSE'
  success: boolean
  data?: {
    html: string
    url: string
    title: string
  }
  error?: string
}

export interface SendHtmlMessage {
  type: 'SEND_HTML'
  data: {
    html: string
    url: string
    title: string
  }
}

export interface SendHtmlResponse {
  type: 'SEND_HTML_RESPONSE'
  success: boolean
  message?: string
  error?: string
}

export type ExtensionMessage = 
  | ExtractHtmlMessage 
  | ExtractHtmlResponse 
  | SendHtmlMessage 
  | SendHtmlResponse