// URL Service for fetching and parsing web content
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

interface FetchedContent {
  url: string;
  title: string;
  content: string;
  description?: string;
  author?: string;
  publishedDate?: string;
  siteName?: string;
  wordCount: number;
  success: boolean;
  error?: string;
}

class UrlService {
  private readonly userAgent = 'Mozilla/5.0 (compatible; ParseBot/1.0; +https://parse.app)';
  private readonly maxContentLength = 50000; // Max characters to extract
  private readonly timeout = 15000; // 15 second timeout

  /**
   * Detect URLs in text
   */
  detectUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const matches = text.match(urlRegex) || [];
    // Clean up URLs (remove trailing punctuation)
    return matches.map(url => url.replace(/[.,;:!?)]+$/, ''));
  }

  /**
   * Check if text contains URLs
   */
  hasUrls(text: string): boolean {
    return this.detectUrls(text).length > 0;
  }

  /**
   * Fetch and parse content from a URL
   */
  async fetchUrl(url: string): Promise<FetchedContent> {
    try {
      // Validate URL
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          url,
          title: '',
          content: '',
          wordCount: 0,
          success: false,
          error: 'Invalid URL protocol. Only HTTP and HTTPS are supported.',
        };
      }

      // Fetch the page with timeout
      const response = await Promise.race([
        fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          redirect: 'follow',
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), this.timeout)
        ),
      ]);

      if (!response.ok) {
        return {
          url,
          title: '',
          content: '',
          wordCount: 0,
          success: false,
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';

      // Handle different content types
      if (contentType.includes('application/json')) {
        const json = await response.json();
        const jsonStr = JSON.stringify(json, null, 2);
        return {
          url,
          title: 'JSON Data',
          content: jsonStr.slice(0, this.maxContentLength),
          wordCount: jsonStr.split(/\s+/).length,
          success: true,
        };
      }

      if (contentType.includes('text/plain')) {
        const text = await response.text();
        return {
          url,
          title: 'Plain Text',
          content: text.slice(0, this.maxContentLength),
          wordCount: text.split(/\s+/).length,
          success: true,
        };
      }

      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        return {
          url,
          title: '',
          content: '',
          wordCount: 0,
          success: false,
          error: `Unsupported content type: ${contentType}. Only HTML, JSON, and plain text are supported.`,
        };
      }

      const html = await response.text();
      return this.parseHtml(url, html);

    } catch (error: any) {
      if (error.message === 'TIMEOUT') {
        return {
          url,
          title: '',
          content: '',
          wordCount: 0,
          success: false,
          error: 'Request timed out. The website took too long to respond.',
        };
      }

      return {
        url,
        title: '',
        content: '',
        wordCount: 0,
        success: false,
        error: `Failed to fetch URL: ${error.message}`,
      };
    }
  }

  /**
   * Parse HTML and extract content
   */
  private parseHtml(url: string, html: string): FetchedContent {
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .sidebar, .comments, .advertisement, .ads, [role="navigation"], [role="banner"], [role="complementary"]').remove();

    // Extract metadata
    const title = $('meta[property="og:title"]').attr('content') ||
                  $('meta[name="twitter:title"]').attr('content') ||
                  $('title').text().trim() ||
                  'Untitled';

    const description = $('meta[property="og:description"]').attr('content') ||
                       $('meta[name="description"]').attr('content') ||
                       $('meta[name="twitter:description"]').attr('content');

    const author = $('meta[name="author"]').attr('content') ||
                   $('meta[property="article:author"]').attr('content') ||
                   $('[rel="author"]').text().trim();

    const publishedDate = $('meta[property="article:published_time"]').attr('content') ||
                          $('time[datetime]').attr('datetime') ||
                          $('meta[name="date"]').attr('content');

    const siteName = $('meta[property="og:site_name"]').attr('content') ||
                     new URL(url).hostname;

    // Extract main content
    // Try common article selectors first
    let content = '';
    const articleSelectors = [
      'article',
      '[role="main"]',
      'main',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      '#content',
      '.post-body',
      '.story-body',
    ];

    for (const selector of articleSelectors) {
      const element = $(selector);
      if (element.length && element.text().trim().length > 200) {
        content = this.extractTextFromElement($, element);
        break;
      }
    }

    // Fallback to body if no article found
    if (!content || content.length < 200) {
      content = this.extractTextFromElement($, $('body'));
    }

    // Clean up content
    content = this.cleanText(content);
    content = content.slice(0, this.maxContentLength);

    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

    return {
      url,
      title: this.cleanText(title),
      content,
      description: description ? this.cleanText(description) : undefined,
      author: author ? this.cleanText(author) : undefined,
      publishedDate,
      siteName,
      wordCount,
      success: true,
    };
  }

  /**
   * Extract text from a cheerio element
   */
  private extractTextFromElement($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>): string {
    const parts: string[] = [];

    // Process headings and paragraphs
    element.find('h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, pre').each((_, el) => {
      const tagName = el.tagName?.toLowerCase();
      let text = $(el).text().trim();

      if (text) {
        // Add formatting based on tag
        if (tagName?.startsWith('h')) {
          text = `\n## ${text}\n`;
        } else if (tagName === 'li') {
          text = `• ${text}`;
        } else if (tagName === 'blockquote') {
          text = `> ${text}`;
        }
        parts.push(text);
      }
    });

    // If no structured content found, get all text
    if (parts.length === 0) {
      return element.text();
    }

    return parts.join('\n\n');
  }

  /**
   * Clean text by removing extra whitespace
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * Fetch multiple URLs
   */
  async fetchUrls(urls: string[]): Promise<FetchedContent[]> {
    const uniqueUrls = [...new Set(urls)];
    const results = await Promise.all(
      uniqueUrls.slice(0, 5).map(url => this.fetchUrl(url)) // Limit to 5 URLs
    );
    return results;
  }

  /**
   * Format fetched content for AI context
   */
  formatForContext(fetchedContents: FetchedContent[]): string {
    const successful = fetchedContents.filter(c => c.success);
    if (successful.length === 0) return '';

    let context = '\n\n--- FETCHED WEB CONTENT ---\n';

    successful.forEach((content, i) => {
      context += `\n[URL ${i + 1}: ${content.title}]\n`;
      context += `Source: ${content.url}\n`;
      if (content.siteName) context += `Site: ${content.siteName}\n`;
      if (content.author) context += `Author: ${content.author}\n`;
      if (content.publishedDate) context += `Published: ${content.publishedDate}\n`;
      context += `Word count: ~${content.wordCount.toLocaleString()}\n\n`;
      context += content.content;
      context += '\n---\n';
    });

    return context;
  }
}

export const urlService = new UrlService();
