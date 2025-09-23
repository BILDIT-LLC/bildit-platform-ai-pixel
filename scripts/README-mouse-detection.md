# BILDIT Mouse Detection Script

A JavaScript library that detects mouse movements on web pages and sends requests to the BILDIT AI pixel to track user engagement.

## Features

- **Mouse Movement Detection**: Tracks mouse movements, clicks, and scroll events
- **Time-Limited Recording**: Only records for a few seconds to avoid excessive requests
- **Throttling**: Prevents overwhelming the server with too many requests
- **Performance Optimized**: Uses passive event listeners and efficient data structures
- **Configurable**: Customizable recording duration, throttle intervals, and pixel URLs
- **Debug Support**: Optional debug logging for development

## Quick Start

### 1. Include the Script

Add the mouse detection script to your HTML page:

```html
<script>
  // Optional configuration
  window.BILDIT_PIXEL_URL = 'https://ai-pixel.bildit.co/pixel.gif';
  window.BILDIT_RECORDING_DURATION = 5000; // 5 seconds
  window.BILDIT_THROTTLE_INTERVAL = 1000; // 1 second
  window.BILDIT_MAX_MOVEMENTS = 10;
  window.BILDIT_DEBUG = true; // Enable debug logging
</script>
<script src="mouse-detection.js"></script>
```

### 2. Automatic Initialization

The script automatically initializes when the DOM is ready and starts detecting mouse movements immediately.

### 3. View Results

Check your browser's Network tab to see pixel requests being sent, or enable debug mode to see console logs.

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `BILDIT_PIXEL_URL` | `https://ai-pixel.bildit.co/pixel.gif` | The BILDIT pixel endpoint URL |
| `BILDIT_RECORDING_DURATION` | `5000` | How long to record mouse movements (milliseconds) |
| `BILDIT_THROTTLE_INTERVAL` | `1000` | Minimum interval between pixel requests (milliseconds) |
| `BILDIT_MAX_MOVEMENTS` | `10` | Maximum number of movements to track |
| `BILDIT_DEBUG` | `false` | Enable debug logging to console |

## API Reference

### Global Configuration Object

```javascript
window.BILDIT_MOUSE_DETECTION_CONFIG = {
  setPixelUrl: (url) => { /* Change pixel URL */ },
  setRecordingDuration: (duration) => { /* Change recording duration */ },
  setThrottleInterval: (interval) => { /* Change throttle interval */ },
  setMaxMovements: (max) => { /* Change max movements */ },
  startRecording: () => { /* Start recording manually */ },
  stopRecording: () => { /* Stop recording manually */ },
  cleanup: () => { /* Remove event listeners */ }
};
```

### Manual Control

```javascript
// Start recording manually
window.BILDIT_MOUSE_DETECTION_CONFIG.startRecording();

// Stop recording manually
window.BILDIT_MOUSE_DETECTION_CONFIG.stopRecording();

// Cleanup (remove event listeners)
window.BILDIT_MOUSE_DETECTION_CLEANUP();
```

## Pixel Request Parameters

The script sends requests to the BILDIT pixel with the following parameters:

- `source`: Event source (e.g., 'mouse-detection', 'mouse-click', 'scroll')
- `mode`: Always 'mouse-movement'
- `ts`: Timestamp
- `nonce`: Random nonce for cache busting
- `movementCount`: Number of movements detected
- `recordingDuration`: How long recording has been active
- `x`, `y`: Mouse coordinates (for specific events)
- `movementsData`: JSON string of movement data (limited to first 5)

## Events Tracked

1. **Mouse Movement**: Continuous tracking of mouse position
2. **Mouse Clicks**: Click events with coordinates and button info
3. **Scroll Events**: Page scroll tracking
4. **Recording Start/End**: Beginning and end of recording sessions

## Performance Considerations

- Uses passive event listeners to avoid blocking the main thread
- Throttles requests to prevent server overload
- Limits stored movement data to prevent memory issues
- Automatically cleans up DOM elements after pixel requests

## Browser Compatibility

- Modern browsers with ES6 support
- Uses standard DOM APIs
- No external dependencies

## Demo

See `mouse-detection-demo.html` for a complete working example with:
- Interactive demo page
- Debug information display
- Manual controls
- Real-time status updates

## Integration with Existing BILDIT Pixel

This script integrates seamlessly with the existing BILDIT pixel infrastructure:

- Uses the same pixel URL format as `bot-trigger.js`
- Follows the same parameter structure
- Compatible with existing pixel endpoints
- Maintains consistent logging format

## Security & Privacy

- No personal data is collected
- Only mouse coordinates and timing information
- All data is sent to your configured pixel endpoint
- No third-party tracking beyond your pixel URL

## Troubleshooting

### Debug Mode

Enable debug logging to see what's happening:

```javascript
window.BILDIT_DEBUG = true;
```

### Check Network Tab

Look for requests to your pixel URL in the browser's Network tab.

### Manual Testing

Use the configuration object to manually control recording:

```javascript
// Force start recording
window.BILDIT_MOUSE_DETECTION_CONFIG.startRecording();

// Check if initialized
console.log(window.BILDIT_MOUSE_DETECTION_INITIALIZED);
```

## License

This script is part of the BILDIT platform and follows the same licensing terms.
