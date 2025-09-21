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

```tsx
import { BILDITAIPixel } from '@bildit-platform/ai-pixel';

export function App() {
  return (
    <main>
      <h1>Welcome to Bildit</h1>
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
