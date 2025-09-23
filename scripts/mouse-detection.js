/**
 * Mouse Movement Detection Script for BILDIT AI Pixel
 * 
 * This script detects mouse movements on a webpage and sends requests to the
 * BILDIT pixel when mouse activity is detected. It only records for a few seconds
 * to avoid excessive requests and maintain performance.
 * 
 * Usage:
 *   Include this script on your webpage to enable mouse movement tracking
 * 
 * Configuration:
 *   PIXEL_URL - The BILDIT pixel endpoint URL
 *   RECORDING_DURATION - How long to record mouse movements (in milliseconds)
 *   THROTTLE_INTERVAL - Minimum interval between pixel requests (in milliseconds)
 */

(function() {
  'use strict';

  // Configuration
  const PIXEL_URL = window.BILDIT_PIXEL_URL || 'https://ai-pixel.bildit.co/pixel.gif';
  const RECORDING_DURATION = window.BILDIT_RECORDING_DURATION || 5000; // 5 seconds
  const THROTTLE_INTERVAL = window.BILDIT_THROTTLE_INTERVAL || 1000; // 1 second
  const MAX_MOVEMENTS = window.BILDIT_MAX_MOVEMENTS || 10; // Maximum movements to track

  // State management
  let isRecording = false;
  let recordingStartTime = null;
  let lastPixelRequest = 0;
  let movementCount = 0;
  let mouseMovements = [];

  /**
   * Logs events for debugging (can be disabled in production)
   */
  function logEvent(message, data = {}) {
    if (window.BILDIT_DEBUG) {
      console.log(`[BILDIT Mouse Detection] ${message}`, data);
    }
  }

  /**
   * Sends a request to the BILDIT pixel
   */
  function sendPixelRequest(source = 'mouse-detection', extra = {}) {
    const now = Date.now();
    
    // Throttle requests to avoid overwhelming the server
    if (now - lastPixelRequest < THROTTLE_INTERVAL) {
      logEvent('Request throttled', { 
        timeSinceLastRequest: now - lastPixelRequest,
        throttleInterval: THROTTLE_INTERVAL 
      });
      return;
    }

    try {
      const url = new URL(PIXEL_URL);
      url.searchParams.set('source', source);
      url.searchParams.set('mode', 'mouse-movement');
      url.searchParams.set('ts', now.toString());
      url.searchParams.set('nonce', Math.random().toString(36).slice(2));
      
      // Add extra parameters
      for (const [key, value] of Object.entries(extra)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }

      // Create and send pixel request
      const img = document.createElement('img');
      img.src = url.toString();
      img.alt = 'BILDIT AI Pixel';
      img.width = 1;
      img.height = 1;
      img.style.position = 'absolute';
      img.style.left = '-9999px';
      img.style.top = '-9999px';
      img.style.opacity = '0';
      img.style.pointerEvents = 'none';
      
      document.body.appendChild(img);
      
      // Clean up after a short delay
      setTimeout(() => {
        if (img.parentNode) {
          img.parentNode.removeChild(img);
        }
      }, 100);

      lastPixelRequest = now;
      logEvent('Pixel request sent', { 
        source, 
        url: url.toString(),
        movementCount,
        recordingDuration: now - recordingStartTime 
      });

    } catch (error) {
      logEvent('Pixel request error', { error: error.message });
    }
  }

  /**
   * Starts recording mouse movements
   */
  function startRecording() {
    if (isRecording) return;
    
    isRecording = true;
    recordingStartTime = Date.now();
    movementCount = 0;
    mouseMovements = [];
    
    logEvent('Started recording mouse movements', { 
      duration: RECORDING_DURATION,
      maxMovements: MAX_MOVEMENTS 
    });

    // Send initial pixel request
    sendPixelRequest('mouse-detection-start', {
      recordingDuration: RECORDING_DURATION,
      maxMovements: MAX_MOVEMENTS
    });

    // Stop recording after the specified duration
    setTimeout(() => {
      stopRecording();
    }, RECORDING_DURATION);
  }

  /**
   * Stops recording mouse movements
   */
  function stopRecording() {
    if (!isRecording) return;
    
    isRecording = false;
    const recordingDuration = Date.now() - recordingStartTime;
    
    logEvent('Stopped recording mouse movements', { 
      duration: recordingDuration,
      movementCount,
      movements: mouseMovements.length 
    });

    // Send final pixel request with summary
    sendPixelRequest('mouse-detection-end', {
      recordingDuration,
      movementCount,
      movements: mouseMovements.length,
      movementsData: JSON.stringify(mouseMovements.slice(0, 5)) // Only send first 5 movements
    });
  }

  /**
   * Handles mouse movement events
   */
  function handleMouseMove(event) {
    if (!isRecording) {
      startRecording();
    }

    // Increment movement counter
    movementCount++;

    // Store movement data (limited to prevent memory issues)
    if (mouseMovements.length < MAX_MOVEMENTS) {
      mouseMovements.push({
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now() - recordingStartTime,
        pageX: event.pageX,
        pageY: event.pageY
      });
    }

    // Send periodic updates during recording
    if (movementCount % 5 === 0) {
      sendPixelRequest('mouse-movement-update', {
        movementCount,
        recordingDuration: Date.now() - recordingStartTime,
        currentX: event.clientX,
        currentY: event.clientY
      });
    }

    logEvent('Mouse movement detected', { 
      x: event.clientX, 
      y: event.clientY,
      movementCount,
      recordingDuration: Date.now() - recordingStartTime 
    });
  }

  /**
   * Handles mouse click events
   */
  function handleMouseClick(event) {
    if (!isRecording) {
      startRecording();
    }

    sendPixelRequest('mouse-click', {
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      movementCount,
      recordingDuration: Date.now() - recordingStartTime
    });

    logEvent('Mouse click detected', { 
      x: event.clientX, 
      y: event.clientY,
      button: event.button 
    });
  }

  /**
   * Handles scroll events
   */
  function handleScroll(event) {
    if (!isRecording) {
      startRecording();
    }

    sendPixelRequest('scroll', {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      movementCount,
      recordingDuration: Date.now() - recordingStartTime
    });

    logEvent('Scroll detected', { 
      scrollX: window.scrollX, 
      scrollY: window.scrollY 
    });
  }

  /**
   * Initializes the mouse detection system
   */
  function initialize() {
    // Check if already initialized
    if (window.BILDIT_MOUSE_DETECTION_INITIALIZED) {
      logEvent('Already initialized, skipping');
      return;
    }

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('click', handleMouseClick, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Mark as initialized
    window.BILDIT_MOUSE_DETECTION_INITIALIZED = true;

    logEvent('Mouse detection initialized', {
      pixelUrl: PIXEL_URL,
      recordingDuration: RECORDING_DURATION,
      throttleInterval: THROTTLE_INTERVAL,
      maxMovements: MAX_MOVEMENTS
    });

    // Send initialization pixel request
    sendPixelRequest('mouse-detection-init', {
      userAgent: navigator.userAgent,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      screenWidth: screen.width,
      screenHeight: screen.height
    });
  }

  /**
   * Cleanup function to remove event listeners
   */
  function cleanup() {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleMouseClick);
    window.removeEventListener('scroll', handleScroll);
    
    window.BILDIT_MOUSE_DETECTION_INITIALIZED = false;
    
    logEvent('Mouse detection cleaned up');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Expose cleanup function globally for manual cleanup if needed
  window.BILDIT_MOUSE_DETECTION_CLEANUP = cleanup;

  // Expose configuration for runtime changes
  window.BILDIT_MOUSE_DETECTION_CONFIG = {
    setPixelUrl: (url) => { PIXEL_URL = url; },
    setRecordingDuration: (duration) => { RECORDING_DURATION = duration; },
    setThrottleInterval: (interval) => { THROTTLE_INTERVAL = interval; },
    setMaxMovements: (max) => { MAX_MOVEMENTS = max; },
    startRecording: startRecording,
    stopRecording: stopRecording,
    cleanup: cleanup
  };

})();
