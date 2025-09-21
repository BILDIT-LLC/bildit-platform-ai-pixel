import * as React from 'react';

export interface BILDITAIPixelProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  alt?: string;
}

export declare const PIXEL_URL = 'https://ai-pixel.bildit.co/pixel.gif';

export declare const BILDITAIPixel: React.ForwardRefExoticComponent<
  BILDITAIPixelProps & React.RefAttributes<HTMLImageElement>
>;

export default BILDITAIPixel;
