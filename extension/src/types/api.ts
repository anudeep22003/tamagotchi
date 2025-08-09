export interface BackendRequestData {
  html: string
  url: string
  title: string
  timestamp: string
}

export interface BackendResponse {
  success: boolean
  message?: string
  data?: unknown
}

export interface ExtractedPageData {
  html: string
  url: string
  title: string
}