# @bildit-platform/ai-pixel

High-agency pixel helpers for React and Next.js that render the public BILDIT AI beacon (`https://ai-pixel.bildit.co/pixel.gif`). Import `@bildit-platform/ai-pixel/react` for the base component or `@bildit-platform/ai-pixel/nextjs` for wrappers that lean on `next/script`, iframe and `<noscript>` fallbacks, and progressive JavaScript beacons that report mouse movement and user-agent data.

## Install

```bash
npm install @bildit-platform/ai-pixel
# or
yarn add @bildit-platform/ai-pixel
# or
pnpm add @bildit-platform/ai-pixel
```

> **Note**: `react` is a peer dependency. The `nextjs` entry additionally expects `next` in your workspace (declared as an optional peer dependency).

## Usage

Before adding the pixel, head to https://signup.bildit.co/aipixel and submit your site URL, site name, and contact email so we can provision the pixel.

### React apps

```tsx
import { BILDITAIPixel } from '@bildit-platform/ai-pixel/react';

export function App() {
  return (
    <main>
      <h1>Welcome to BILDIT!</h1>
      <BILDITAIPixel params={{ site: 'marketing-site' }} />
    </main>
  );
}
```

The component forwards refs and accepts every standard `<img>` prop. For example, you can pass `className`, `style`, or `loading` attributes:

```tsx
<BILDITAIPixel className="hidden" loading="lazy" />
```

### Next.js (App or Pages router)

```tsx
// app/layout.tsx or pages/_app.tsx
import { NextBILDITAIPixel } from '@bildit-platform/ai-pixel/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <NextBILDITAIPixel params={{ site: 'marketing-site' }} />
      </body>
    </html>
  );
}
```

`NextBILDITAIPixel` renders the hidden `<img>`, iframe, and `<noscript>` fallbacks and injects the JavaScript beacon through `next/script`. Pass `includeScript={false}` if you only want the static surfaces, or supply script overrides with `scriptId`, `scriptStrategy`, `scriptNonce`, or `scriptProps`.

## API

### React entry (`@bildit-platform/ai-pixel/react`)

- `BILDITAIPixel` – React component that renders the pixel image plus optional iframe, `<noscript>`, and inline-script pings.
- `PIXEL_URL` – Constant for the raw pixel URL (`https://ai-pixel.bildit.co/pixel.gif`).
- `DEFAULT_ALT` – Default `alt` text (`"BILDIT AI Pixel Tracker"`).
- `buildPixelInlineScript(params)` – Produces the same inline JavaScript beacon string the component inlines.
- `normalizePixelParams(params)` – Utility that coalesces query params into a plain `{ [key: string]: string }` object.

The component accepts all `React.ImgHTMLAttributes<HTMLImageElement>`. Every render includes cache-busting JavaScript beacons that report the browser mouse movement (once) and user agent string, followed by hidden iframe + `<noscript>` layers to catch HTML-only or JS-disabled crawlers.

#### `<BILDITAIPixel />` props

- `pixelUrl` – Override the destination pixel (e.g. your own CF Worker endpoint).
- `params` – Extra query params merged into every request (`{ campaign: 'spring' }`).
- `mode` – Choose which surfaces render. Accepts a single option or an array of options (`auto`, `server`, `image`/`img`, `iframe`, `noscript`, `script`). Arrays let you combine surfaces directly (`['img', 'noscript']`).
- `iframeProps` – Pass-thru attributes for the hidden iframe (title, style overrides, etc.).
- `scriptId` / `scriptNonce` – Control inline `<script>` attributes for CSP compatibility.

#### Server rendering

Use `mode="server"` (or leave the default `auto`) to safely stream the pixel during SSR. The emitted markup avoids accessing `window`/`document` during React rendering, so it works in Node.js, Edge runtimes, and static export workflows.

```tsx
// Example: Remix or vanilla React SSR
import { BILDITAIPixel } from '@bildit-platform/ai-pixel/react';

export function Document() {
  return (
    <html lang="en">
      <body>
        <BILDITAIPixel params={{ site: 'marketing-site' }} />
      </body>
    </html>
  );
}
```

#### Client-only selections

Restrict rendering to specific surfaces when you do not need the entire stack:

```tsx
// Only inline script + JS beacons
<BILDITAIPixel mode="script" params={{ placement: 'spa' }} />

// Only the raw <img>
<BILDITAIPixel mode={['img']} style={{ position: 'static' }} />
```

### Next.js entry (`@bildit-platform/ai-pixel/nextjs`)

- `NextBILDITAIPixel` – Bundles the React component with a `next/script` inline beacon.
- `BILDITAIPixelScript` – Stand-alone helper that only injects the JavaScript beacon via `next/script` (useful if you want to position the `<img>` yourself).
- `trackAIBotRequestForPixel(request, options)` – Server-side helper that inspects a request’s referer + user-agent for AI crawler signatures and performs a pixel hit with that context.
- `identifyAIBot(userAgent)` / `AI_BOT_SIGNATURES` – Utilities that expose the signature matching used by the tracker.
- `BILDITAIPixel`, `PIXEL_URL`, `DEFAULT_ALT`, `buildPixelInlineScript`, `normalizePixelParams` – Re-exported from the React entry for convenience.

#### `<NextBILDITAIPixel />` props

- Inherits all non-script props from `<BILDITAIPixel />` (e.g. `params`, `iframeProps`, `className`).
- `mode` – Same as the React component, but the helper automatically strips the inline `<script>` surface and defaults to `['img', 'iframe', 'noscript']`.
- `includeScript` – Set to `false` to skip the JavaScript beacon and only emit the static surfaces.
- `scriptId`, `scriptNonce`, `scriptStrategy` – Passed through to `next/script` for CSP and loading control.
- `scriptProps` – Additional props merged into the underlying `next/script` element.

#### Server-side bot detection

`trackAIBotRequestForPixel` inspects incoming headers for AI crawler signatures (ChatGPT, Claude, Perplexity, Gemini, Grok, Kimi, DeepSeek, etc.) and, when matched, pings the pixel with referer/user-agent data.

```ts
// middleware.ts (Next.js 13+)
import { NextResponse } from 'next/server';
import { trackAIBotRequestForPixel } from '@bildit-platform/ai-pixel/nextjs';

export async function middleware(request: Request) {
  await trackAIBotRequestForPixel(request, {
    params: { edge: 'middleware' },
  });

  return NextResponse.next();
}
```

The helper accepts any object with a `headers` property (e.g. `GetServerSidePropsContext.req`). Override detection by passing `force: true` or supply custom `headers`, `userAgent`, and `referer` values. The matched bot slug is stored in the `bot` query param; hook into the exported `identifyAIBot`/`AI_BOT_SIGNATURES` for custom logging.

#### `<BILDITAIPixelScript />` props

- Accepts `pixelUrl`, `params`, `alt`, `scriptId`, `scriptNonce`, and `scriptStrategy` plus any extra `next/script` props. Emits only the inline JavaScript beacon.

## Integration recipes

Layer these techniques to cover a wide range of renderers (static HTML, CMS templates, JS-heavy apps, AI crawlers, etc.). Replace the example pixel URL with your provisioned endpoint if needed.

### Static HTML (Any Site)

**Option A: JavaScript embed**

```html
<script>
  const params = new URLSearchParams({
    t: Date.now().toString(),
    r: Math.random().toString(36).slice(2),
  });
  const img = new Image();
  img.src = `https://pixel-tracker.bildit-cloudflare.workers.dev/pixel.gif?${params}`;
  img.alt = '';
  img.width = 1;
  img.height = 1;
  img.style.display = 'none';
  document.body.appendChild(img);
</script>
```

**Option B: No JavaScript fallback**

```html
<img src="https://pixel-tracker.bildit-cloudflare.workers.dev/pixel.gif?cachebuster={{ new Date().getTime() }}"
     alt="" width="1" height="1" style="display:none;" loading="lazy">
```

Replace the `cachebuster` expression with any server-side template language you have available.

### HubSpot Pages

HubSpot exposes Liquid-like template variables you can use to bust caches:

```html
{% set now = local_dt|strftime('%s') %}
{% set rand = range(10000, 99999) | random %}
<img src="https://pixel-tracker.bildit-cloudflare.workers.dev/pixel.gif?t={{ now }}&r={{ rand }}&hubspot=true"
     alt="" width="1" height="1" style="display:none;">
```

If you prefer JavaScript, Option A from the static HTML section works in HubSpot as well.

### React (CSR)

Create a component that injects the pixel on mount:

```tsx
import { useEffect } from 'react';

export function PixelTracker() {
  useEffect(() => {
    const params = new URLSearchParams({
      t: Date.now().toString(),
      r: Math.random().toString(36).slice(2),
    });
    const img = new Image();
    img.src = `https://pixel-tracker.bildit-cloudflare.workers.dev/pixel.gif?${params}`;
    img.alt = '';
    img.width = 1;
    img.height = 1;
    img.style.display = 'none';
    document.body.appendChild(img);
    return () => {
      document.body.removeChild(img);
    };
  }, []);

  return null;
}
```

Render `<PixelTracker />` once near the root of your app.

### Next.js (App or Pages Router)

#### Using the packaged helper

```tsx
import { NextBILDITAIPixel } from '@bildit-platform/ai-pixel/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <NextBILDITAIPixel params={{ app: 'marketing-site' }} />
      </body>
    </html>
  );
}
```

For advanced placement, use the lower-level `BILDITAIPixelScript` alongside the React component to decide exactly where the `<script>` and `<img>` land.

#### Static `<img>` with cache busting

If you need a purely static image (for example in `next export`), add a query that changes during the build:

```jsx
<img
  src={`https://pixel-tracker.bildit-cloudflare.workers.dev/pixel.gif?build=${process.env.NEXT_PUBLIC_BUILD_ID}`}
  alt=""
  width={1}
  height={1}
  style={{ display: 'none' }}
  loading="lazy"
/>
```

✅ Ensure `NEXT_PUBLIC_BUILD_ID` is unique per deployment (Git SHA, timestamp, etc.).

### Alternative Embed Techniques

Sometimes you need to cover edge cases where automated agents (like ChatGPT link previews) primarily fetch the raw HTML and may or may not execute JavaScript. Consider layering one or more of the following approaches on top of the options above:

#### 1. Inline `<img>` in the HTML shell

Place a basic `<img>` tag high in the HTML so even simple HTML-only fetchers request the pixel:

```html
<img src="https://pixel-tracker.bildit-cloudflare.workers.dev/pixel.gif?seed=static"
     alt="" width="1" height="1" style="display:none;" loading="lazy" decoding="async">
```

Even if JavaScript doesn’t run, the page fetcher often retrieves referenced images. Pair this with a dynamic pixel elsewhere for real users to avoid caching.

#### 2. Hidden `<iframe>`

An iframe can force a secondary request in contexts where images are ignored but HTML is parsed:

```html
<iframe src="https://pixel-tracker.bildit-cloudflare.workers.dev/pixel.gif?iframe=true"
        title="analytics"
        loading="lazy"
        width="1"
        height="1"
        style="border:0; opacity:0; position:absolute; width:1px; height:1px;">
</iframe>
```

Browsers usually treat a GIF inside an iframe as a navigable resource, triggering the same worker logic.

#### 3. `<noscript>` fallback

Always provide a plain `<img>` for environments where JavaScript is disabled or stripped:

```html
<noscript>
  <img src="https://pixel-tracker.bildit-cloudflare.workers.dev/pixel.gif?fallback=noscript"
       alt="" width="1" height="1" style="display:none;">
</noscript>
```

This works for privacy-focused browsers and certain crawlers.

#### 4. CSS background pixel

Embed the pixel in a CSS rule so that layout engines fetching linked stylesheets make the request:

```html
<style>
  body::after {
    content: '';
    display: none;
    background-image: url('https://pixel-tracker.bildit-cloudflare.workers.dev/pixel.gif?css=true');
  }
</style>

```


## Bot trigger automation (experimental)

An optional Playwright helper lives at `scripts/bot-trigger.js`. It opens several AI chat surfaces (ChatGPT, Perplexity, Claude, Gemini, Grok, Kimi, DeepSeek, …) and asks about `bildit.co`, while also pinging the BILDIT pixel. If API credentials are available, the script calls the corresponding HTTP APIs to exercise server-side pixel hits as well.

1. Install Playwright if you have not already:
   ```bash
   npm install --save-dev playwright
   npx playwright install chromium
   ```
2. Ensure you are running on Node.js 18+ so that `fetch` is globally available.
3. Export any API keys you control, e.g.:
   ```bash
   export OPENAI_API_KEY=...
   export PERPLEXITY_API_KEY=...
   export ANTHROPIC_API_KEY=...
   export GEMINI_API_KEY=...
   export DEEPSEEK_API_KEY=...
   export GROK_API_KEY=...
   export MOONSHOT_API_KEY=...
   ```
4. Run the script:
   ```bash
   node scripts/bot-trigger.js
   ```

Many providers require an authenticated session before their chat UIs accept input. Sign in manually in the launched browser (set `HEADLESS=false` to observe execution) or provide persisted auth state before automation.

## Publishing (maintainers)

1. Log in with the scoped account: `npm login --scope=@bildit-platform`.
2. Make sure the version in `package.json` is unique.
3. Publish the package as public (only required the first time for this scope):
   ```bash
   npm publish --access public
   ```

The package will appear at <https://www.npmjs.com/package/@bildit-platform/ai-pixel> after publishing.

## License

MIT © BILDIT Platform
