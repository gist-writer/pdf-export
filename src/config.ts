export const ALLOWED_ORIGIN = 'https://gist-writer.github.io';

export const CONTENT_WIDTH = 435;

export const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.org/?',
  'https://thingproxy.freeboard.io/fetch/',
];

export const STYLES = {
  page: { margins: [60, 60, 60, 60] as const },
  code: { fontSize: 9, bgColor: '#f6f8fa', padding: [6, 6, 6, 6] as const },
  blockquote: { borderColor: '#e0ddd8', textColor: '#555555', barWidth: 3 },
  hr: { lineWidth: 0.5, color: '#cccccc' },
  text: { color: '#1a1a1a' },
} as const;
