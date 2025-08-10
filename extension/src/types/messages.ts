import type { ThreadExtract, TwitterAdapterConfig, TwitterParsingStats } from './twitter'

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

export interface ExtractTwitterThreadMessage {
  type: 'EXTRACT_TWITTER_THREAD'
  config: TwitterAdapterConfig
}

export interface ExtractTwitterThreadResponse {
  type: 'EXTRACT_TWITTER_THREAD_RESPONSE'
  success: boolean
  data?: ThreadExtract
  stats?: TwitterParsingStats
  error?: string
}

export interface SendTwitterThreadMessage {
  type: 'SEND_TWITTER_THREAD'
  data: {
    url: string
    page_title: string
    extracted: ThreadExtract
    stats?: TwitterParsingStats
  }
}

export interface SendTwitterThreadResponse {
  type: 'SEND_TWITTER_THREAD_RESPONSE'
  success: boolean
  message?: string
  error?: string
}

export type ExtensionMessage = 
  | ExtractHtmlMessage 
  | ExtractHtmlResponse 
  | SendHtmlMessage 
  | SendHtmlResponse
  | ExtractTwitterThreadMessage
  | ExtractTwitterThreadResponse
  | SendTwitterThreadMessage
  | SendTwitterThreadResponse