const React = require('react');

const PIXEL_URL = 'https://ai-pixel.bildit.co/pixel.gif';
const DEFAULT_ALT = 'BILDIT AI Pixel Tracker';

const SURFACE_KEYS = Object.freeze(['img', 'iframe', 'noscript', 'script']);

const MODE_MAP = {
  auto: SURFACE_KEYS,
  server: ['img', 'iframe', 'noscript', 'script'],
  image: ['img'],
  img: ['img'],
  iframe: ['iframe'],
  noscript: ['noscript'],
  script: ['script'],
};

function normalizePixelParams(params) {
  if (!params) return {};
  const sanitized = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    sanitized[key] = String(value);
  }
  return sanitized;
}

function buildQueryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    search.append(key, value);
  }
  return search.toString();
}

function buildPixelSrc(baseUrl, params) {
  const query = buildQueryString(params);
  if (!query) return baseUrl;
  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${query}`;
}

function getModes(mode) {
  if (Array.isArray(mode)) {
    const flattened = mode.flatMap(entry => {
      if (MODE_MAP[entry]) return MODE_MAP[entry];
      if (SURFACE_KEYS.includes(entry)) return [entry];
      return [];
    });
    return Array.from(new Set(flattened.length ? flattened : MODE_MAP.auto));
  }
  if (!mode) return MODE_MAP.auto;
  if (MODE_MAP[mode]) return MODE_MAP[mode];
  if (SURFACE_KEYS.includes(mode)) return [mode];
  return MODE_MAP.auto;
}

function buildPixelInlineScript(pixelUrl, baseParams, altText) {
  const payload = {
    pixelUrl,
    params: baseParams,
    alt: altText,
  };

  const serializedPayload = JSON.stringify(payload).replace(/<\/script/gi, '<\\/script');

  const scriptBody = `(function(){
    try {
      var cfg = ${serializedPayload};
      var baseParams = cfg.params || {};
      var pixelUrl = cfg.pixelUrl;
      var UA = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : 'unknown';

      function mergeParams(extra) {
        var params = new URLSearchParams();
        for (var key in baseParams) {
          if (Object.prototype.hasOwnProperty.call(baseParams, key) && baseParams[key] != null) {
            params.append(key, String(baseParams[key]));
          }
        }
        if (extra) {
          for (var extraKey in extra) {
            if (Object.prototype.hasOwnProperty.call(extra, extraKey) && extra[extraKey] != null) {
              params.set(extraKey, String(extra[extraKey]));
            }
          }
        }
        return params.toString();
      }

      function sendBeacon(extra, opts) {
        var qs = mergeParams(extra);
        var url = pixelUrl + (pixelUrl.indexOf('?') === -1 ? '?' : '&') + qs;
        if (opts && opts.method === 'fetch' && typeof fetch === 'function') {
          try {
            fetch(url, { method: 'GET', mode: 'no-cors', credentials: 'omit', keepalive: true }).catch(function(){});
            return;
          } catch (error) {}
        }
        try {
          var beaconImg = new Image(1, 1);
          beaconImg.src = url;
        } catch (error) {}
      }

      function appendPixel(extra) {
        var img = new Image(1, 1);
        img.alt = cfg.alt || '';
        img.decoding = 'async';
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer-when-downgrade';
        img.style.position = 'absolute';
        img.style.width = '1px';
        img.style.height = '1px';
        img.style.border = '0';
        img.style.clip = 'rect(0, 0, 0, 0)';
        img.style.overflow = 'hidden';
        img.width = 1;
        img.height = 1;
        var qs = mergeParams(extra);
        img.src = pixelUrl + (pixelUrl.indexOf('?') === -1 ? '?' : '&') + qs;
        var target = document.body || document.documentElement;
        if (target) {
          target.appendChild(img);
        }
      }

      sendBeacon({ mode: 'script', event: 'bootstrap', ua: UA, ts: Date.now() }, { method: 'fetch' });

      function initPixel() {
        appendPixel({ mode: 'js-img', event: 'render', ts: Date.now(), r: Math.random().toString(36).slice(2), ua: UA });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPixel, { once: true });
      } else {
        initPixel();
      }

      var mouseTracked = false;
      function handleMouseMove() {
        if (mouseTracked) return;
        mouseTracked = true;
        sendBeacon({ mode: 'script', event: 'mouse', mouse: '1', ua: UA, ts: Date.now() }, { method: 'fetch' });
        document.removeEventListener('mousemove', handleMouseMove, true);
      }
      document.addEventListener('mousemove', handleMouseMove, { once: true, capture: true, passive: true });
    } catch (error) {
      try {
        console.error('BILDITAIPixel inline script error:', error);
      } catch (err) {}
    }
  })();`;

  return scriptBody;
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function buildNoscriptHtml(src, altText) {
  const attributes = [
    `src="${escapeAttribute(src)}"`,
    `alt="${escapeAttribute(altText)}"`,
    'width="1"',
    'height="1"',
    'style="display:none;"',
    'loading="lazy"',
    'decoding="async"',
  ];

  return `<img ${attributes.join(' ')}>`;
}

/**
 * Renders the BILDIT AI tracking pixel with progressive fallbacks (img, iframe, noscript, inline script).
 */
const BILDITAIPixel = React.forwardRef(function BILDITAIPixel(componentProps = {}, ref) {
  const {
    alt = DEFAULT_ALT,
    pixelUrl = PIXEL_URL,
    params,
    mode = 'auto',
    iframeProps,
    scriptId,
    scriptNonce,
    ...imgRestProps
  } = componentProps;

  const normalizedParams = normalizePixelParams(params);
  if (!normalizedParams.component) {
    normalizedParams.component = 'react';
  }
  if (!normalizedParams.source) {
    normalizedParams.source = 'bildit-ai-pixel';
  }

  const modes = getModes(mode);

  const paramsKey = JSON.stringify(normalizedParams);

  const { style: imgStyleOverrides, ...imgProps } = imgRestProps;
  const iframeOverrides = iframeProps || {};
  const { style: iframeStyleOverrides, title: iframeTitle, ...iframeRest } = iframeOverrides;

  const imageSrc = React.useMemo(
    () => buildPixelSrc(pixelUrl, { ...normalizedParams, mode: 'img' }),
    [pixelUrl, paramsKey]
  );

  const iframeSrc = React.useMemo(
    () => buildPixelSrc(pixelUrl, { ...normalizedParams, mode: 'iframe' }),
    [pixelUrl, paramsKey]
  );

  const noscriptSrc = React.useMemo(
    () => buildPixelSrc(pixelUrl, { ...normalizedParams, mode: 'noscript' }),
    [pixelUrl, paramsKey]
  );

  const scriptContent = React.useMemo(
    () => buildPixelInlineScript(pixelUrl, { ...normalizedParams }, alt),
    [pixelUrl, paramsKey, alt]
  );

  const elements = [];

  if (modes.includes('img')) {
    const mergedImgStyle = {
      position: 'absolute',
      width: '1px',
      height: '1px',
      border: 0,
      clip: 'rect(0, 0, 0, 0)',
      overflow: 'hidden',
      ...imgStyleOverrides,
    };

    const defaultedImgProps = {
      width: imgProps.width ?? 1,
      height: imgProps.height ?? 1,
      decoding: imgProps.decoding ?? 'async',
      loading: imgProps.loading ?? 'lazy',
    };

    elements.push(
      React.createElement('img', {
        key: 'bildit-ai-pixel-img',
        ref,
        src: imageSrc,
        alt,
        ...defaultedImgProps,
        ...imgProps,
        style: mergedImgStyle,
      })
    );
  }

  if (modes.includes('iframe')) {
    const mergedIframeStyle = {
      border: '0',
      opacity: 0,
      position: 'absolute',
      width: '1px',
      height: '1px',
      ...iframeStyleOverrides,
    };

    const iframeDefaults = {
      width: iframeRest.width ?? '1',
      height: iframeRest.height ?? '1',
      loading: iframeRest.loading ?? 'lazy',
    };

    elements.push(
      React.createElement('iframe', {
        key: 'bildit-ai-pixel-iframe',
        src: iframeSrc,
        title: iframeTitle || 'BILDIT AI Pixel Frame',
        ...iframeDefaults,
        ...iframeRest,
        style: mergedIframeStyle,
      })
    );
  }

  if (modes.includes('noscript')) {
    elements.push(
      React.createElement('noscript', {
        key: 'bildit-ai-pixel-noscript',
        dangerouslySetInnerHTML: { __html: buildNoscriptHtml(noscriptSrc, alt) },
      })
    );
  }

  if (modes.includes('script')) {
    elements.push(
      React.createElement('script', {
        key: 'bildit-ai-pixel-script',
        id: scriptId,
        nonce: scriptNonce,
        suppressHydrationWarning: true,
        dangerouslySetInnerHTML: { __html: scriptContent },
      })
    );
  }

  if (elements.length === 1) {
    return elements[0];
  }

  return React.createElement(React.Fragment, null, elements);
});

module.exports = {
  BILDITAIPixel,
  PIXEL_URL,
  DEFAULT_ALT,
  buildPixelInlineScript,
  normalizePixelParams,
  SURFACE_KEYS,
};
module.exports.default = BILDITAIPixel;
