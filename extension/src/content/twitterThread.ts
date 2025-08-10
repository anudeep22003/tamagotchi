import type { 
  Tweet, 
  ThreadExtract, 
  Media, 
  Link, 
  TwitterAdapterConfig, 
  TwitterParsingStats 
} from '@/types/twitter'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

let isCancelled = false

export function cancelExtraction() {
  isCancelled = true
}

export async function autoScrollThread(maxPasses = 6): Promise<number> {
  const scroller = document.querySelector('[aria-label^="Timeline"]') || window
  let lastHeight = 0
  let passes = 0
  
  isCancelled = false
  
  for (let i = 0; i < maxPasses; i++) {
    if (isCancelled) {
      console.log('[Twitter] Extraction cancelled by user')
      break
    }
    
    ;(scroller as any).scrollBy?.(0, 2000)
    window.scrollBy(0, 2000)
    await sleep(400)
    
    const newHeight = document.body.scrollHeight
    passes = i + 1
    
    if (newHeight <= lastHeight) break
    lastHeight = newHeight
    
    console.log(`[Twitter] Scroll pass ${passes}, height: ${newHeight}`)
  }
  
  return passes
}


function getRootInfo(): { rootId: string; authorHandle: string } {
  const m = location.pathname.match(/\/([^/]+)\/status\/(\d+)/)
  return { 
    authorHandle: m?.[1] || "", 
    rootId: m?.[2] || "" 
  }
}

function pickText(el: Element): string {
  const textNode = el.querySelector('[data-testid="tweetText"]') || el
  return (textNode as HTMLElement).innerText?.trim() || ""
}

function extractLinks(el: Element): Link[] {
  const anchors = Array.from(el.querySelectorAll('a[role="link"]'))
  const links: Link[] = []
  
  for (const a of anchors) {
    const href = (a as HTMLAnchorElement).href
    if (!href) continue
    
    const isPermalink = /\/status\/\d+/.test(href)
    if (isPermalink) continue
    
    const title = (a as HTMLAnchorElement).innerText?.trim() || undefined
    const expanded = (a as HTMLElement).getAttribute("data-expanded-url") || href
    
    if (expanded.startsWith("http")) {
      links.push({ url: expanded, title })
    }
  }
  
  return dedupeBy(links, l => l.url)
}

function extractMedia(el: Element): Media[] {
  const out: Media[] = []
  
  el.querySelectorAll('img[src*="pbs.twimg.com/media"]').forEach(img => {
    const i = img as HTMLImageElement
    out.push({
      type: "photo",
      url: i.src,
      alt: i.alt || undefined,
      width: i.naturalWidth || undefined,
      height: i.naturalHeight || undefined
    })
  })
  
  el.querySelectorAll('video').forEach(v => {
    const src = (v.querySelector('source[src]') as HTMLSourceElement)?.src || 
                 (v as HTMLVideoElement).src
    if (src) {
      const isGif = /tweet_video/.test(src) || /gif/.test(src)
      out.push({ 
        type: isGif ? "gif" : "video", 
        url: src,
        preview_url: (v as HTMLVideoElement).poster || undefined
      })
    }
  })
  
  return out
}

function getTweetId(el: Element): string {
  const a = el.querySelector('a[href*="/status/"]') as HTMLAnchorElement | null
  const m = a?.href?.match(/status\/(\d+)/)
  return m?.[1] || ""
}

function getAuthorHandle(el: Element): string {
  const a = el.querySelector('a[href*="/status/"]') as HTMLAnchorElement | null
  if (a) {
    const m = a.href.match(/(twitter|x)\.com\/([^/]+)\/status/)
    if (m?.[2]) return m[2]
  }
  
  const user = el.querySelector('a[role="link"][href^="/"][href*="/status/"]') as HTMLAnchorElement | null
  if (user) {
    const m = user.href.match(/(twitter|x)\.com\/([^/]+)\/status/)
    if (m?.[2]) return m[2]
  }
  
  const nameLink = el.querySelector('a[role="link"][href^="/"]') as HTMLAnchorElement | null
  return nameLink?.getAttribute("href")?.split("/")?.[1] || ""
}

function getCreatedAt(el: Element): string | undefined {
  const t = el.querySelector("time") as HTMLTimeElement | null
  return t?.dateTime || undefined
}

function isRetweet(el: Element): boolean {
  return !!el.querySelector('[data-testid="socialContext"]')?.textContent?.toLowerCase().includes("retweeted")
}

function isReply(el: Element): boolean {
  return !!el.querySelector('[data-testid="reply"]')
}

function dedupeBy<T>(arr: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  
  for (const item of arr) {
    const k = key(item)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(item)
  }
  
  return out
}

export async function collectTwitterThread(
  config: TwitterAdapterConfig
): Promise<{ extract: ThreadExtract; stats: TwitterParsingStats }> {
  const startTime = Date.now()
  
  console.log('[Twitter] Starting thread collection with config:', config)
  
  const scrollPasses = await autoScrollThread(config.max_scroll_passes)
  
  if (isCancelled) {
    throw new Error('Extraction cancelled by user')
  }
  
  const { rootId, authorHandle } = getRootInfo()
  console.log(`[Twitter] Collecting thread for ${authorHandle}, root: ${rootId}`)
  
  const articles = Array.from(document.querySelectorAll('article[role="article"]'))
  console.log(`[Twitter] Found ${articles.length} articles`)
  
  const tweets: Tweet[] = []
  let mediaCount = 0
  let linkCount = 0
  
  for (const art of articles) {
    const tid = getTweetId(art)
    if (!tid) continue
    
    const handle = getAuthorHandle(art)
    
    if (handle.toLowerCase() !== authorHandle.toLowerCase()) {
      console.log(`[Twitter] Skipping tweet from ${handle} (not ${authorHandle})`)
      continue
    }
    
    const textEl = art.querySelector('[data-testid="tweetText"]') || art
    const text = pickText(textEl)
    if (!text.trim()) {
      console.log(`[Twitter] Skipping tweet ${tid} - no text content`)
      continue
    }
    
    const links = config.collect_media ? extractLinks(art) : []
    const media = config.collect_media ? extractMedia(art) : []
    const tweet_is_retweet = isRetweet(art)
    const tweet_is_reply = isReply(art)
    
    if (!config.include_retweets && tweet_is_retweet) {
      console.log(`[Twitter] Skipping retweet ${tid}`)
      continue
    }
    
    if (!config.include_replies_by_author && tweet_is_reply) {
      console.log(`[Twitter] Skipping reply ${tid}`)
      continue
    }
    
    mediaCount += media.length
    linkCount += links.length
    
    const quotedStatusLink = config.include_quotes 
      ? (art.querySelector('a[role="link"][href*="/status/"]') as HTMLAnchorElement)?.href
      : undefined
    
    tweets.push({
      tweet_id: tid,
      author_handle: handle,
      created_at: getCreatedAt(art),
      text,
      html: (textEl as HTMLElement).innerHTML,
      links,
      media,
      quoted_status_url: quotedStatusLink,
      is_retweet: tweet_is_retweet,
      is_reply: tweet_is_reply,
    })
    
    console.log(`[Twitter] Collected tweet ${tid}: ${text.substring(0, 50)}...`)
  }
  
  const uniq = dedupeBy(tweets, t => t.tweet_id).sort((a, b) =>
    (a.created_at || a.tweet_id).localeCompare(b.created_at || b.tweet_id)
  )
  
  const stats: TwitterParsingStats = {
    tweets_found: uniq.length,
    media_extracted: mediaCount,
    links_extracted: linkCount,
    scroll_passes: scrollPasses,
    parsing_time_ms: Date.now() - startTime
  }
  
  console.log('[Twitter] Collection complete:', stats)
  
  return {
    extract: {
      root_tweet_id: rootId,
      author_handle: authorHandle,
      tweets: uniq
    },
    stats
  }
}