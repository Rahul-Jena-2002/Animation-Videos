// All CSS selectors for flow.google.com — update here if Flow UI changes
export const SEL = {
  promptInput:    'textarea[aria-label*="prompt"], textarea[placeholder*="Describe"]',
  generateButton: 'button[aria-label*="Generate"]',
  progressBar:    '[role="progressbar"]',
  downloadButton: 'button[aria-label*="Download"], a[download]',
  videoPlayer:    'video',
  loginCheck:     'a[href*="accounts.google.com"]',
} as const;
