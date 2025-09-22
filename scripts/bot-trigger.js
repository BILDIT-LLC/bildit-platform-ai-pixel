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

const WEB_TARGETS = [
  {
    name: 'ChatGPT',
    url: 'https://chat.openai.com/',
    selector: 'textarea[data-testid="textbox"]',
  },
  {
    name: 'Perplexity',
    url: 'https://www.perplexity.ai/',
    selector: 'textarea[placeholder*="Ask anything"]',
  },
  {
    name: 'Anthropic Claude',
    url: 'https://claude.ai/new',
    selector: 'textarea[placeholder*="Message Claude"]',
  },
  {
    name: 'Google Gemini',
    url: 'https://gemini.google.com/app',
    selector: 'textarea[aria-label*="Enter a prompt"]',
  },
  {
    name: 'xAI Grok',
    url: 'https://grok.com/chat',
    selector: 'textarea',
  },
  {
    name: 'Kimi Moonshot',
    url: 'https://kimi.moonshot.cn/',
    selector: 'textarea',
  },
  {
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com/',
    selector: 'textarea',
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
      await triggerPixelInPage(page, target.name.toLowerCase().replace(/\s+/g, '-'));
      await page.waitForTimeout(2000);
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
