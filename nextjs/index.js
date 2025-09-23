'use strict';

const React = require('react');
const NextScript = require('next/script');
const {
  BILDITAIPixel,
  PIXEL_URL,
  DEFAULT_ALT,
  buildPixelInlineScript,
  normalizePixelParams,
  SURFACE_KEYS,
} = require('../react');

const DEFAULT_SCRIPT_ID = 'bildit-ai-pixel';
const DEFAULT_BOT_EVENT = 'next-bot';

const AI_BOT_SIGNATURES = Object.freeze([
  { slug: 'openai-gptbot', pattern: /gptbot/i },
  { slug: 'openai-chatgpt', pattern: /chatgpt|gpt-?crawler/i },
  { slug: 'anthropic-claudebot', pattern: /anthropic|claudebot/i },
  { slug: 'perplexity', pattern: /perplexity|pplx/i },
  { slug: 'google-gemini', pattern: /google.*(other|snippet|inspect)|google-extended|gemini|aiagent/i },
  { slug: 'bing-copilot', pattern: /bingbot|bingpreview|bing-ai|msnbot|cpt-ai/i },
  { slug: 'meta-ai', pattern: /facebookexternalhit|facebot|meta-ai/i },
  { slug: 'xai-grok', pattern: /grok|x-ai|xbot|xai-bot/i },
  { slug: 'baidu-ernie', pattern: /baidu|ernie/i },
  { slug: 'kimi-moonshot', pattern: /moonshot|kimi/i },
  { slug: 'deepseek', pattern: /deepseek|deepthinker/i },
  { slug: 'generic-ai', pattern: /ai(\s|-)agent|ai crawler|llm|large language/i },
]);

function withNextDefaults(params) {
  const merged = Object.assign({}, params || {});
  if (merged.component == null) merged.component = 'nextjs';
  if (merged.framework == null) merged.framework = 'nextjs';
  if (merged.source == null) merged.source = 'bildit-ai-pixel';
  return merged;
}

function toHeaderValue(headersLike, name) {
  if (!headersLike) return undefined;
  const target = name.toLowerCase();

  if (typeof headersLike.get === 'function') {
    const direct = headersLike.get(name);
    if (direct != null) return direct;
    const lower = headersLike.get(target);
    if (lower != null) return lower;
    return undefined;
  }

  if (Array.isArray(headersLike)) {
    for (const [key, value] of headersLike) {
      if (typeof key === 'string' && key.toLowerCase() === target) {
        return Array.isArray(value) ? value[0] : value;
      }
    }
    return undefined;
  }

  if (typeof headersLike === 'object') {
    for (const key of Object.keys(headersLike)) {
      if (key.toLowerCase() === target) {
        const value = headersLike[key];
        if (Array.isArray(value)) return value[0];
        return value;
      }
    }
  }

  return undefined;
}

function identifyAIBot(userAgent) {
  if (!userAgent) return null;
  const ua = userAgent.toString();
  for (const signature of AI_BOT_SIGNATURES) {
    if (signature.pattern.test(ua)) {
      return signature;
    }
  }
  return null;
}

function ensureSearchParam(url, key, value) {
  if (value == null) return;
  url.searchParams.set(key, String(value));
}

function buildPixelUrlWithParams(pixelUrl, params) {
  const url = new URL(pixelUrl);
  for (const [key, value] of Object.entries(params)) {
    ensureSearchParam(url, key, value);
  }
  // Ensure site param: prefer explicit param, then referer origin, then host
  if (!url.searchParams.has('site')) {
    try {
      if (typeof params.referer === 'string' && params.referer) {
        const ref = new URL(params.referer);
        ensureSearchParam(url, 'site', ref.origin);
      }
    } catch (_) {}
  }
  return url;
}

function resolveModeWithoutScript(mode) {
  if (!mode || (Array.isArray(mode) && mode.length === 0)) {
    return ['img', 'iframe', 'noscript'];
  }

  const entries = Array.isArray(mode) ? mode : [mode];
  const expanded = [];

  for (const entry of entries) {
    if (entry == null) continue;
    switch (entry) {
      case 'auto':
      case 'server':
        expanded.push('img', 'iframe', 'noscript');
        break;
      case 'image':
        expanded.push('img');
        break;
      default:
        expanded.push(entry);
        break;
    }
  }

  const filtered = expanded.filter(surface => surface !== 'script');
  if (!filtered.length) {
    return ['img', 'iframe', 'noscript'];
  }

  const unique = [];
  for (const surface of filtered) {
    if (!unique.includes(surface) && SURFACE_KEYS.includes(surface)) {
      unique.push(surface);
    }
  }

  if (!unique.length) {
    return ['img', 'iframe', 'noscript'];
  }

  return unique;
}

function createScriptAttributes({
  alt,
  pixelUrl,
  params,
  normalizedParams,
  scriptId,
  scriptNonce,
  scriptStrategy,
  extraProps,
}) {
  const baseParams = normalizedParams || normalizePixelParams(withNextDefaults(params));
  const scriptContent = buildPixelInlineScript(pixelUrl, baseParams, alt);

  const attributes = Object.assign({}, extraProps || {});
  delete attributes.children;
  delete attributes.dangerouslySetInnerHTML;

  attributes.id = scriptId ?? attributes.id ?? DEFAULT_SCRIPT_ID;
  attributes.nonce = scriptNonce ?? attributes.nonce;
  attributes.strategy = scriptStrategy ?? attributes.strategy ?? 'afterInteractive';
  attributes.dangerouslySetInnerHTML = { __html: scriptContent };

  return {
    attributes,
    normalizedParams: baseParams,
  };
}

async function trackAIBotRequestForPixel(request, options = {}) {
  const {
    pixelUrl = PIXEL_URL,
    params,
    requireBotMatch = true,
    force = false,
    userAgent: userAgentOverride,
    referer: refererOverride,
    headers: headersOverride,
    fetchOptions,
    debug = false,
  } = options;

  let headersLike = headersOverride;
  if (!headersLike && request && typeof request === 'object') {
    headersLike = request.headers;
  }

  const userAgent = userAgentOverride || toHeaderValue(headersLike, 'user-agent');
  const referer = refererOverride || toHeaderValue(headersLike, 'referer') || toHeaderValue(headersLike, 'referrer');

  const botSignature = identifyAIBot(userAgent);
  
  // Enhanced logging for debugging
  if (debug || process.env.BILDIT_DEBUG === 'true') {
    console.log('[BILDIT Middleware] Bot detection:', {
      userAgent: userAgent ? userAgent.substring(0, 100) + '...' : 'none',
      referer: referer || 'none',
      botSignature: botSignature ? botSignature.slug : 'none',
      force,
      requireBotMatch,
      pixelUrl
    });
  }

  if (!force && requireBotMatch && !botSignature) {
    if (debug || process.env.BILDIT_DEBUG === 'true') {
      console.log('[BILDIT Middleware] Skipping pixel request - no bot detected');
    }
    return {
      triggered: false,
      skipped: true,
      reason: 'non-bot-user-agent',
      userAgent,
      referer,
    };
  }

  const normalizedParams = normalizePixelParams(withNextDefaults(params));
  if (!normalizedParams.mode) normalizedParams.mode = 'server';
  if (!normalizedParams.event) normalizedParams.event = DEFAULT_BOT_EVENT;
  if (!normalizedParams.ts) normalizedParams.ts = Date.now().toString();
  if (!normalizedParams.nonce) normalizedParams.nonce = Math.random().toString(36).slice(2);
  if (userAgent && !normalizedParams.ua) normalizedParams.ua = userAgent;
  if (referer && !normalizedParams.referer) normalizedParams.referer = referer;
  if (botSignature && !normalizedParams.bot) normalizedParams.bot = botSignature.slug;

  // Ensure site param when referer is missing by deriving origin from request
  if (!normalizedParams.site) {
    try {
      // 1) Prefer origin of referer if present
      if (referer) {
        const ref = new URL(referer);
        normalizedParams.site = ref.origin;
      } else {
        // 2) Use the request URL origin if available (Edge/Next middleware has request.url)
        let originCandidate;
        try {
          if (request && typeof request.url === 'string') {
            originCandidate = new URL(request.url).origin;
          }
        } catch (_) {}

        // 3) Fall back to forwarded headers (common in proxies)
        if (!originCandidate) {
          const xfProto = toHeaderValue(headersLike, 'x-forwarded-proto') || 'https';
          const xfHost = toHeaderValue(headersLike, 'x-forwarded-host');
          if (xfHost) originCandidate = `${xfProto}://${xfHost}`;
        }

        // 4) As a last resort, use Host header
        if (!originCandidate) {
          const host = toHeaderValue(headersLike, 'host');
          if (host) originCandidate = `https://${host}`;
        }

        if (originCandidate) normalizedParams.site = originCandidate;
      }
    } catch (_) {}
  }

  const url = buildPixelUrlWithParams(pixelUrl, normalizedParams);

  if (typeof fetch !== 'function') {
    return {
      triggered: false,
      skipped: true,
      reason: 'fetch-unavailable',
      url: url.toString(),
      userAgent,
      referer,
      bot: botSignature ? botSignature.slug : undefined,
    };
  }

  try {
    const { headers: extraHeaders, ...restFetchOptions } = fetchOptions || {};

    const headerBag = {};

    if (extraHeaders) {
      if (typeof extraHeaders[Symbol.iterator] === 'function' && typeof extraHeaders !== 'function') {
        for (const pair of extraHeaders) {
          if (!pair) continue;
          const [key, value] = pair;
          if (key) headerBag[key] = Array.isArray(value) ? value.join(', ') : value;
        }
      } else if (typeof extraHeaders === 'object') {
        for (const key of Object.keys(extraHeaders)) {
          const value = extraHeaders[key];
          if (value == null) continue;
          headerBag[key] = Array.isArray(value) ? value.join(', ') : value;
        }
      }
    }

    if (userAgent) headerBag['User-Agent'] = userAgent;
    headerBag['X-BILDIT-Source'] = headerBag['X-BILDIT-Source'] || 'nextjs-server';

    // Enhanced logging for fetch request
    if (debug || process.env.BILDIT_DEBUG === 'true') {
      console.log('[BILDIT Middleware] Making pixel request:', {
        url: url.toString(),
        headers: headerBag,
        bot: botSignature ? botSignature.slug : undefined,
        params: normalizedParams
      });
    }

    const response = await fetch(url.toString(), {
      method: restFetchOptions.method || 'GET',
      redirect:
        restFetchOptions.redirect !== undefined ? restFetchOptions.redirect : 'follow',
      ...restFetchOptions,
      headers: headerBag,
    });

    // Log successful response
    if (debug || process.env.BILDIT_DEBUG === 'true') {
      console.log('[BILDIT Middleware] Pixel request successful:', {
        status: response.status,
        ok: response.ok,
        url: url.toString(),
        bot: botSignature ? botSignature.slug : undefined
      });
    }

    return {
      triggered: true,
      status: response.status,
      ok: response.ok,
      url: url.toString(),
      userAgent,
      referer,
      bot: botSignature ? botSignature.slug : undefined,
    };
  } catch (error) {
    // Enhanced error logging
    if (debug || process.env.BILDIT_DEBUG === 'true') {
      console.error('[BILDIT Middleware] Pixel request failed:', {
        error: error instanceof Error ? error.message : String(error),
        url: url.toString(),
        bot: botSignature ? botSignature.slug : undefined,
        userAgent: userAgent ? userAgent.substring(0, 100) + '...' : 'none'
      });
    }
    
    return {
      triggered: false,
      error: error instanceof Error ? error.message : String(error),
      url: url.toString(),
      userAgent,
      referer,
      bot: botSignature ? botSignature.slug : undefined,
    };
  }
}

function BILDITAIPixelScript(props = {}) {
  const {
    alt = DEFAULT_ALT,
    pixelUrl = PIXEL_URL,
    params,
    scriptId,
    scriptNonce,
    scriptStrategy,
    ...nextScriptProps
  } = props;

  const { attributes } = createScriptAttributes({
    alt,
    pixelUrl,
    params,
    scriptId,
    scriptNonce,
    scriptStrategy,
    extraProps: nextScriptProps,
  });

  return React.createElement(NextScript, attributes);
}

function NextBILDITAIPixel(props = {}) {
  const {
    alt = DEFAULT_ALT,
    pixelUrl = PIXEL_URL,
    params,
    mode,
    includeScript = true,
    scriptId,
    scriptNonce,
    scriptStrategy,
    scriptProps,
    ...pixelRest
  } = props;

  const normalizedParams = normalizePixelParams(withNextDefaults(params));

  const pixelElement = React.createElement(BILDITAIPixel, {
    ...pixelRest,
    alt,
    pixelUrl,
    params: normalizedParams,
    mode: resolveModeWithoutScript(mode),
  });

  if (!includeScript) {
    return pixelElement;
  }

  const { attributes } = createScriptAttributes({
    alt,
    pixelUrl,
    normalizedParams,
    scriptId,
    scriptNonce,
    scriptStrategy,
    extraProps: scriptProps,
  });

  const scriptElement = React.createElement(NextScript, attributes);

  return React.createElement(React.Fragment, null, scriptElement, pixelElement);
}

module.exports = {
  NextBILDITAIPixel,
  BILDITAIPixelScript,
  BILDITAIPixel,
  PIXEL_URL,
  DEFAULT_ALT,
  buildPixelInlineScript,
  normalizePixelParams,
  trackAIBotRequestForPixel,
  identifyAIBot,
  AI_BOT_SIGNATURES,
};
module.exports.default = NextBILDITAIPixel;
