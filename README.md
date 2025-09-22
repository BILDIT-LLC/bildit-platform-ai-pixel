# @bildit-platform/ai-pixel

A zero-dependency React helper that renders the public BILDIT AI pixel (`https://ai-pixel.bildit.co/pixel.gif`). Drop the `<BILDITAIPixel />` component into any React or Next.js project to start recording page views.

## Install

```bash
npm install @bildit-platform/ai-pixel
# or
yarn add @bildit-platform/ai-pixel
# or
pnpm add @bildit-platform/ai-pixel
```

> **Note**: `react` is a peer dependency. Make sure it is already installed in your project.

## Usage

Before adding the pixel, head to https://signup.bildit.co/aipixel and submit your site URL, site name, and contact email so we can provision the pixel.

```tsx
import { BILDITAIPixel } from '@bildit-platform/ai-pixel';

export function App() {
  return (
    <main>
      <h1>Welcome to BILDIT!</h1>
      <BILDITAIPixel />
    </main>
  );
}
```

The component forwards refs and accepts every standard `<img>` prop. For example, you can pass `className`, `style`, or `loading` attributes:

```tsx
<BILDITAIPixel className="hidden" loading="lazy" />
```

### Next.js

Because this package ships a plain `<img>` element, you can use it in both the pages and app routers without any special configuration. If you need to prevent server-side rendering, wrap the component in Next.js' built-in `dynamic` helper:

```tsx
import dynamic from 'next/dynamic';

const BILDITAIPixel = dynamic(
  () => import('@bildit-platform/ai-pixel').then(mod => mod.BILDITAIPixel),
  { ssr: false }
);
```

## API

- `BILDITAIPixel` – React component that renders the pixel image.
- `PIXEL_URL` – Exported constant with the raw pixel URL (`https://ai-pixel.bildit.co/pixel.gif`) for advanced use cases.

The component accepts all `React.ImgHTMLAttributes<HTMLImageElement>`. The `alt` text defaults to `"BILDIT AI Pixel"`.

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
