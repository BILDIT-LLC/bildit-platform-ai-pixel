import * as React from 'react';
import type { ScriptProps } from 'next/script';
import {
  BILDITAIPixel,
  BILDITAIPixelProps,
  PixelModeInput,
  PIXEL_URL,
  DEFAULT_ALT,
  buildPixelInlineScript,
  buildMouseDetectionInlineScript,
  normalizePixelParams,
  BILDITMouseDetectionScript,
} from '../react';

export {
  BILDITAIPixel,
  PIXEL_URL,
  DEFAULT_ALT,
  buildPixelInlineScript,
  buildMouseDetectionInlineScript,
  normalizePixelParams,
  BILDITMouseDetectionScript,
};

export type HeadersLike =
  | { get(name: string): string | null | undefined }
  | Iterable<[string, string]>
  | Record<string, string | string[] | undefined>;

export interface TrackAIBotRequestOptions {
  pixelUrl?: string;
  params?: BILDITAIPixelProps['params'];
  requireBotMatch?: boolean;
  force?: boolean;
  userAgent?: string;
  referer?: string;
  headers?: HeadersLike;
  fetchOptions?: RequestInit;
}

export interface TrackAIBotResult {
  triggered: boolean;
  status?: number;
  ok?: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  url?: string;
  userAgent?: string;
  referer?: string;
  bot?: string;
}

export interface BotSignature {
  slug: string;
  pattern: RegExp;
}

export interface BILDITAIPixelScriptProps
  extends Omit<ScriptProps, 'id' | 'strategy' | 'nonce' | 'dangerouslySetInnerHTML'> {
  alt?: string;
  pixelUrl?: string;
  params?: BILDITAIPixelProps['params'];
  scriptId?: string;
  scriptNonce?: string;
  scriptStrategy?: ScriptProps['strategy'];
}

export interface NextBILDITAIPixelProps
  extends Omit<
    BILDITAIPixelProps,
    'params' | 'pixelUrl' | 'alt' | 'mode' | 'scriptId' | 'scriptNonce'
  > {
  alt?: string;
  pixelUrl?: string;
  params?: BILDITAIPixelProps['params'];
  mode?: PixelModeInput;
  includeScript?: boolean;
  scriptId?: string;
  scriptNonce?: string;
  scriptStrategy?: ScriptProps['strategy'];
  scriptProps?: BILDITAIPixelScriptProps;
}

export declare const BILDITAIPixelScript: React.FC<BILDITAIPixelScriptProps>;

export declare const NextBILDITAIPixel: React.FC<NextBILDITAIPixelProps>;

export declare const AI_BOT_SIGNATURES: ReadonlyArray<BotSignature>;

export declare function identifyAIBot(userAgent?: string | null): BotSignature | null;

export declare function trackAIBotRequestForPixel(
  request?: Request | { headers?: HeadersLike | undefined } | null,
  options?: TrackAIBotRequestOptions
): Promise<TrackAIBotResult>;

export default NextBILDITAIPixel;
