const React = require('react');

const PIXEL_URL = 'https://ai-pixel.bildit.co/pixel.gif';

/**
 * Renders the BILDIT AI tracking pixel as an <img> tag.
 * Accepts all standard <img> props so you can customize className, style, etc.
 */
const BILDITAIPixel = React.forwardRef(function BILDITAIPixel(props = {}, ref) {
  const { alt = 'BILDIT AI Pixel', ...rest } = props;

  return React.createElement('img', {
    src: PIXEL_URL,
    alt,
    ref,
    ...rest,
  });
});

module.exports = {
  BILDITAIPixel,
  PIXEL_URL,
};
module.exports.default = BILDITAIPixel;
