import * as React from 'react';

export type PixelSurface = 'img' | 'iframe' | 'noscript' | 'script';

export type PixelMode = 'auto' | 'server' | 'image' | PixelSurface;

export type PixelModeInput = PixelMode | PixelMode[] | PixelSurface[];

export interface BILDITAIPixelProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  alt?: string;
  pixelUrl?: string;
  params?: Record<string, string | number | boolean | null | undefined>;
  mode?: PixelModeInput;
  iframeProps?: React.IframeHTMLAttributes<HTMLIFrameElement>;
  scriptId?: string;
  scriptNonce?: string;
}

export declare const PIXEL_URL = 'https://ai-pixel.bildit.co/pixel.gif';
export declare const DEFAULT_ALT = 'BILDIT AI Pixel Tracker';
export declare const SURFACE_KEYS: readonly PixelSurface[];

export declare function buildPixelInlineScript(
  pixelUrl: string,
  params?: Record<string, string | number | boolean | null | undefined>,
  altText?: string
): string;

export interface MouseDetectionOptions {
  duration?: number;
  throttle?: number;
  maxMovements?: number;
  params?: Record<string, string | number | boolean | null | undefined>;
}

export declare function buildMouseDetectionInlineScript(
  pixelUrl: string,
  options?: MouseDetectionOptions
): string;

export declare function normalizePixelParams(
  params?: Record<string, string | number | boolean | null | undefined>
): Record<string, string>;

export declare const BILDITAIPixel: React.ForwardRefExoticComponent<
  BILDITAIPixelProps & React.RefAttributes<HTMLImageElement>
>;

export interface BILDITMouseDetectionScriptProps
  extends Omit<React.ScriptHTMLAttributes<HTMLScriptElement>, 'dangerouslySetInnerHTML' | 'id' | 'nonce'> {
  pixelUrl?: string;
  options?: MouseDetectionOptions;
  scriptId?: string;
  scriptNonce?: string;
}

export declare const BILDITMouseDetectionScript: React.FC<BILDITMouseDetectionScriptProps>;

export default BILDITAIPixel;
