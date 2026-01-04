// Worker that runs optimizeLine in background
importScripts('geometry.js', 'physics.js', 'racingLine.js');

self.onmessage = function(e) {
  const msg = e.data;
  if (!msg || !msg.action) return;

  if (msg.action === 'optimize') {
    const { initialLine, trackData, iterations } = msg;
    try {
      const optimized = optimizeLine(initialLine, trackData, iterations);
      self.postMessage({ success: true, optimized });
    } catch (err) {
      self.postMessage({ success: false, error: err.message });
    }
  }
};
