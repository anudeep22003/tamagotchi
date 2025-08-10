export const TWITTER_CONFIG = {
  urlPatterns: [
    // /^https?:\/\/(www\.)?(twitter|x)\.com\/[^/]+\/status\/\d+/i
    /^@?https?:\/\/(www\.)?(twitter|x)\.com\/[^/]+\/status\/\d+/i,
    // /^https?:\/\/x\.com\/mchale_in_flow\/status\/1953807174276460605$/i
  ],
  defaultParsingConfig: {
    include_retweets: false,
    include_replies_by_author: true,
    include_quotes: true,
    expand_links: false,
    collect_media: true,
    max_scroll_passes: 6,
  },
} as const;

export function isTwitterUrl(url: string): boolean {
  return TWITTER_CONFIG.urlPatterns.some((pattern) =>
    pattern.test(url)
  );
}
