export type Media = {
  type: "photo" | "video" | "gif"
  url: string
  preview_url?: string
  alt?: string
  width?: number
  height?: number
}

export type Link = { 
  url: string
  title?: string 
}

export type Tweet = {
  tweet_id: string
  author_handle: string
  author_user_id?: string
  created_at?: string
  text: string
  html?: string
  links: Link[]
  media: Media[]
  quoted_status_url?: string
  is_retweet: boolean
  is_reply: boolean
}

export type ThreadExtract = {
  root_tweet_id: string
  author_handle: string
  author_user_id?: string
  tweets: Tweet[]
}

export interface TwitterAdapterConfig {
  include_retweets: boolean
  include_replies_by_author: boolean
  include_quotes: boolean
  expand_links: boolean
  collect_media: boolean
  max_scroll_passes: number
}

export interface TwitterParsingStats {
  tweets_found: number
  media_extracted: number
  links_extracted: number
  scroll_passes: number
  parsing_time_ms: number
}

export interface TwitterBackendPayload {
  url: string
  page_title: string
  extracted: ThreadExtract
  stats?: TwitterParsingStats
}