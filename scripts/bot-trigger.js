'use strict';

/**
 * Playwright automation that opens popular AI assistants in the browser and optionally
 * calls their public APIs to ask about bildit.co in order to trigger the BILDIT pixel
 * across multiple surfaces.
 *
 * Usage:
 *   node scripts/bot-trigger.js
 *
 * Environment variables:
 *   HEADLESS=false            # run browser with UI (default true)
 *   PIXEL_URL=...             # override pixel endpoint
 *   OPENAI_API_KEY=...        # enable ChatGPT API call
 *   PERPLEXITY_API_KEY=...    # enable Perplexity API call
 *   ANTHROPIC_API_KEY=...     # enable Claude API call
 *   GEMINI_API_KEY=...        # enable Google Gemini API call
 *   DEEPSEEK_API_KEY=...      # enable DeepSeek API call
 *   GROK_API_KEY=...          # enable Grok (xAI) API call
 *   MOONSHOT_API_KEY=...      # enable Kimi/Moonshot API call
 */

const { chromium } = require('playwright');
const { setTimeout: delay } = require('timers/promises');

const PIXEL_URL = process.env.PIXEL_URL || 'https://ai-pixel.bildit.co/pixel.gif';
const HEADLESS = process.env.HEADLESS !== 'false';
const WAIT_AFTER_NAV = parseInt(process.env.WAIT_AFTER_NAV || '4000', 10);
const PROMPT_TEXT = process.env.BOT_PROMPT || 'What can you tell me about https://bildit.co and its AI pixel?';

const PROMPT_URLS = Array.from(PROMPT_TEXT.matchAll(/https?:\/\/[^\s"'<>]+/g), match => match[0]);

function escapeForRegex(value) {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

const PROMPT_ALLOW_PATTERNS = PROMPT_URLS.map(url => new RegExp(escapeForRegex(url), 'i'));
const DEFAULT_LINK_DENY_PATTERNS = [/^javascript:/i, /^mailto:/i];

function logStep(message, meta = {}) {
  const timestamp = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ timestamp, message, ...meta }));
}

async function pingPixel(source, mode, extra = {}) {
  try {
    const url = new URL(PIXEL_URL);
    url.searchParams.set('source', source);
    url.searchParams.set('mode', mode);
    url.searchParams.set('ts', Date.now().toString());
    url.searchParams.set('nonce', Math.random().toString(36).slice(2));
    for (const [key, value] of Object.entries(extra)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': extra.userAgent || 'bot-trigger/1.0',
      },
    });

    logStep('pixel-ping', { source, mode, status: res.status, url: url.toString() });
  } catch (error) {
    logStep('pixel-ping-error', { source, mode, error: error.message });
  }
}

async function triggerPixelInPage(page, source, extra = {}) {
  try {
    await page.evaluate(
      ([pixelUrl, params]) => {
        const img = document.createElement('img');
        img.src = `${pixelUrl}?${params}`;
        img.alt = 'BILDIT AI Pixel';
        img.width = 1;
        img.height = 1;
        img.style.position = 'absolute';
        img.style.left = '-9999px';
        document.body.appendChild(img);
      },
      [
        PIXEL_URL,
        new URLSearchParams({
          source,
          mode: 'web',
          ts: Date.now().toString(),
          nonce: Math.random().toString(36).slice(2),
          ...extra,
        }).toString(),
      ]
    );
    logStep('page-pixel-triggered', { source });
  } catch (error) {
    logStep('page-pixel-error', { source, error: error.message });
  }
}

async function sendPromptIfPossible(page, selector, prompt) {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    const element = await page.$(selector);
    if (!element) throw new Error('Selector resolved to null');
    await element.click({ delay: 50 });
    await element.fill('');
    await element.type(prompt, { delay: 25 });
    await element.press('Enter');
    logStep('prompt-sent', { selector });
  } catch (error) {
    logStep('prompt-skip', { selector, error: error.message });
  }
}

function compilePatternList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map(pattern => {
      if (pattern instanceof RegExp) return pattern;
      if (typeof pattern === 'string') return new RegExp(pattern, 'i');
      return null;
    })
    .filter(Boolean);
}

async function clickAssistantLink(context, page, target) {
  if (!target.linkSelector) {
    logStep('link-skip', { target: target.name, reason: 'missing-selector' });
    return null;
  }

  const allowPatterns = compilePatternList(
    target.linkAllowPatterns && target.linkAllowPatterns.length
      ? target.linkAllowPatterns
      : PROMPT_ALLOW_PATTERNS
  );
  const denyPatterns = compilePatternList([...(target.linkDenyPatterns || []), ...DEFAULT_LINK_DENY_PATTERNS]);
  const timeoutMs = target.linkWaitTimeout ?? 45000;
  const pollInterval = target.linkPollInterval ?? 1000;
  const deadline = Date.now() + timeoutMs;

  const baseline = new Set(
    await page
      .$$eval(target.linkSelector, nodes => nodes.map(node => node.href).filter(Boolean))
      .catch(() => [])
  );

  while (Date.now() < deadline) {
    const candidates = await page
      .$$eval(target.linkSelector, nodes =>
        nodes
          .map(node => ({
            href: node.href,
            text: (node.textContent || '').trim(),
          }))
          .filter(item => Boolean(item.href))
      )
      .catch(() => []);

    const nextLink = candidates.find(link => {
      if (baseline.has(link.href)) return false;
      const allowed = allowPatterns.length === 0 || allowPatterns.some(pattern => pattern.test(link.href));
      if (!allowed) return false;
      const denied = denyPatterns.some(pattern => pattern.test(link.href));
      return !denied;
    });

    if (nextLink) {
      const marked = await page
        .evaluate(
          ({ selector, href }) => {
            const nodes = Array.from(document.querySelectorAll(selector));
            const targetNode = nodes.find(node => node.href === href);
            if (!targetNode) return false;
            targetNode.setAttribute('data-bot-link-target', 'true');
            targetNode.scrollIntoView({ block: 'center', behavior: 'instant' });
            return true;
          },
          { selector: target.linkSelector, href: nextLink.href }
        )
        .catch(() => false);

      if (!marked) {
        baseline.add(nextLink.href);
        await delay(pollInterval);
        continue;
      }

      const waitForPopup = context
        .waitForEvent('page', { timeout: target.linkPopupTimeout ?? 10000 })
        .catch(() => null);

      let clickError;
      try {
        await page.locator('[data-bot-link-target="true"]').first().click({ button: 'left', timeout: 5000 });
      } catch (error) {
        clickError = error;
      }

      const popup = await waitForPopup;

      await page
        .evaluate(() => {
          for (const node of document.querySelectorAll('[data-bot-link-target="true"]')) {
            node.removeAttribute('data-bot-link-target');
          }
        })
        .catch(() => undefined);

      if (clickError) {
        logStep('link-click-error', { target: target.name, href: nextLink.href, error: clickError.message });
        baseline.add(nextLink.href);
        await delay(pollInterval);
        continue;
      }

      const navigationPage = popup || page;
      try {
        await navigationPage.waitForLoadState('domcontentloaded', {
          timeout: target.linkNavigationTimeout ?? 20000,
        });
      } catch (error) {
        logStep('link-navigation-timeout', { target: target.name, href: nextLink.href, error: error.message });
      }

      logStep('link-clicked', {
        target: target.name,
        href: nextLink.href,
        popup: Boolean(popup),
      });

      return navigationPage;
    }

    await delay(pollInterval);
  }

  logStep('link-click-skip', { target: target.name, reason: 'timeout' });
  return null;
}

const WEB_TARGETS = [
  {
    name: 'ChatGPT',
    slug: 'chatgpt',
    url: 'https://chat.openai.com/',
    selector: 'textarea[data-testid="textbox"]',
    linkSelector: 'div[data-message-author-role="assistant"] a[href^="http"]',
    linkDenyPatterns: [/^https?:\/\/chat\.openai\.com/i],
    linkWaitTimeout: 60000,
  },
  {
    name: 'Perplexity',
    slug: 'perplexity',
    url: 'https://www.perplexity.ai/',
    selector: 'textarea[placeholder*="Ask anything"]',
    linkSelector: 'main a[href^="http"]',
    linkDenyPatterns: [/^https?:\/\/(?:www\.)?perplexity\.ai/i],
  },
  {
    name: 'Anthropic Claude',
    slug: 'anthropic-claude',
    url: 'https://claude.ai/new',
    selector: 'textarea[placeholder*="Message Claude"]',
    linkSelector: 'main a[href^="http"]',
    linkDenyPatterns: [/^https?:\/\/claude\.ai/i],
  },
  {
    name: 'Google Gemini',
    slug: 'google-gemini',
    url: 'https://gemini.google.com/app',
    selector: 'textarea[aria-label*="Enter a prompt"]',
    linkSelector: 'main a[href^="http"]',
    linkDenyPatterns: [/^https?:\/\/gemini\.google\.com/i, /^https?:\/\/(?:www\.)?google\.com/i],
  },
  {
    name: 'xAI Grok',
    slug: 'xai-grok',
    url: 'https://grok.com/chat',
    selector: 'textarea',
    linkSelector: 'main a[href^="http"]',
    linkDenyPatterns: [/^https?:\/\/grok\.com/i, /^https?:\/\/x\.com/i],
  },
  {
    name: 'Kimi Moonshot',
    slug: 'kimi-moonshot',
    url: 'https://kimi.moonshot.cn/',
    selector: 'textarea',
    linkSelector: 'main a[href^="http"]',
    linkDenyPatterns: [/^https?:\/\/kimi\.moonshot\.cn/i],
  },
  {
    name: 'DeepSeek',
    slug: 'deepseek',
    url: 'https://chat.deepseek.com/',
    selector: 'textarea',
    linkSelector: 'main a[href^="http"]',
    linkDenyPatterns: [/^https?:\/\/chat\.deepseek\.com/i],
  },
];

const API_TASKS = [
  {
    name: 'OpenAI Chat Completions',
    env: 'OPENAI_API_KEY',
    async run(key) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are researching websites.' },
            { role: 'user', content: PROMPT_TEXT },
          ],
        }),
      });
      logStep('api-call', { provider: 'openai', status: response.status });
      await pingPixel('openai-api', 'api', { status: response.status });
    },
  },
  {
    name: 'Perplexity API',
    env: 'PERPLEXITY_API_KEY',
    async run(key) {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: process.env.PERPLEXITY_MODEL || 'llama-3.1-sonar-small-128k-online',
          messages: [
            { role: 'system', content: 'You are a web researcher.' },
            { role: 'user', content: PROMPT_TEXT },
          ],
        }),
      });
      logStep('api-call', { provider: 'perplexity', status: response.status });
      await pingPixel('perplexity-api', 'api', { status: response.status });
    },
  },
  {
    name: 'Anthropic API',
    env: 'ANTHROPIC_API_KEY',
    async run(key) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
          max_tokens: 512,
          messages: [
            { role: 'user', content: PROMPT_TEXT },
          ],
        }),
      });
      logStep('api-call', { provider: 'anthropic', status: response.status });
      await pingPixel('anthropic-api', 'api', { status: response.status });
    },
  },
  {
    name: 'Google Gemini API',
    env: 'GEMINI_API_KEY',
    async run(key) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest'}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: PROMPT_TEXT }],
              },
            ],
          }),
        }
      );
      logStep('api-call', { provider: 'gemini', status: response.status });
      await pingPixel('gemini-api', 'api', { status: response.status });
    },
  },
  {
    name: 'DeepSeek API',
    env: 'DEEPSEEK_API_KEY',
    async run(key) {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
          messages: [
            { role: 'user', content: PROMPT_TEXT },
          ],
        }),
      });
      logStep('api-call', { provider: 'deepseek', status: response.status });
      await pingPixel('deepseek-api', 'api', { status: response.status });
    },
  },
  {
    name: 'xAI Grok API',
    env: 'GROK_API_KEY',
    async run(key) {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: process.env.GROK_MODEL || 'grok-beta',
          messages: [
            { role: 'user', content: PROMPT_TEXT },
          ],
        }),
      });
      logStep('api-call', { provider: 'grok', status: response.status });
      await pingPixel('grok-api', 'api', { status: response.status });
    },
  },
  {
    name: 'Moonshot Kimi API',
    env: 'MOONSHOT_API_KEY',
    async run(key) {
      const response = await fetch('https://api.moonshot.cn/v1/hook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: process.env.MOONSHOT_MODEL || 'moonshot-v1-8k',
          input: PROMPT_TEXT,
        }),
      });
      logStep('api-call', { provider: 'moonshot', status: response.status });
      await pingPixel('moonshot-api', 'api', { status: response.status });
    },
  },
];

async function driveBrowserTargets(browser) {
  const context = await browser.newContext({
    userAgent:
      process.env.PLAYWRIGHT_UA ||
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  });

  for (const target of WEB_TARGETS) {
    logStep('navigate-start', { target: target.name, url: target.url });
    const page = await context.newPage();
    try {
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(WAIT_AFTER_NAV);
      await sendPromptIfPossible(page, target.selector, PROMPT_TEXT);
      const slug = target.slug || target.name.toLowerCase().replace(/\s+/g, '-');
      await triggerPixelInPage(page, slug, { stage: 'post-prompt' });
      const followPage = await clickAssistantLink(context, page, target);

      if (followPage) {
        const waitMs = target.postClickWait ?? 3000;
        if (waitMs > 0) {
          await followPage.waitForTimeout(waitMs).catch(() => undefined);
        }
        await triggerPixelInPage(followPage, slug, {
          stage: followPage === page ? 'same-tab' : 'new-tab',
        });
        if (followPage !== page) {
          await followPage.waitForTimeout(1500).catch(() => undefined);
          await followPage.close().catch(() => undefined);
        }
      } else {
        await page.waitForTimeout(2000);
      }
    } catch (error) {
      logStep('navigate-error', { target: target.name, error: error.message });
    } finally {
      await page.close().catch(() => undefined);
    }
    await delay(500);
  }

  await context.close();
}

async function runApiTasks() {
  for (const task of API_TASKS) {
    const key = process.env[task.env];
    if (!key) {
      logStep('api-skip', { provider: task.name, reason: 'missing-key' });
      continue;
    }
    try {
      await task.run(key.trim());
    } catch (error) {
      logStep('api-error', { provider: task.name, error: error.message });
    }
  }
}

async function main() {
  logStep('script-start', { headless: HEADLESS, pixelUrl: PIXEL_URL });

  let browser;
  try {
    browser = await chromium.launch({ headless: HEADLESS });
  } catch (error) {
    logStep('browser-launch-error', { error: error.message });
  }

  if (browser) {
    try {
      await driveBrowserTargets(browser);
    } finally {
      await browser.close().catch(() => undefined);
    }
  }

  await runApiTasks();

  await pingPixel('bot-trigger', 'script', { result: 'complete' });
  logStep('script-complete');
}

if (require.main === module) {
  main().catch(error => {
    logStep('fatal-error', { error: error.message });
    process.exitCode = 1;
  });
}
