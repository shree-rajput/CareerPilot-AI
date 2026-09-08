/**
 * CareerPilot AI - Circuit Breaker Safety Shutdown Module
 * Detects runaway initializations, rapid mutation storms, or duplicate UI mountings and fails closed.
 * Uses sliding window burst detection to avoid false trips on SPAs like Gmail.
 */

(function () {
  const MAX_ACTIVATIONS_PER_WINDOW = 5;
  const ACTIVATION_WINDOW_MS = 10000; // 10 seconds

  const MAX_MUTATION_BURST = 150; // Max 150 mutations per 1 second sliding window
  const MUTATION_WINDOW_MS = 1000; // 1 second sliding window

  let activationTimestamps = [];
  let mutationTimestamps = [];
  let currentObservedUrl = window.location.href;
  let isTripped = false;

  function resetIfUrlChanged() {
    if (window.location.href !== currentObservedUrl) {
      currentObservedUrl = window.location.href;
      activationTimestamps = [];
      mutationTimestamps = [];
      isTripped = false;
    }
  }

  function recordActivation() {
    resetIfUrlChanged();
    if (isTripped) return false;

    const now = Date.now();
    activationTimestamps = activationTimestamps.filter((t) => now - t < ACTIVATION_WINDOW_MS);
    activationTimestamps.push(now);

    if (activationTimestamps.length > MAX_ACTIVATIONS_PER_WINDOW) {
      console.warn(`[CareerPilot CircuitBreaker] Tripped! Over ${MAX_ACTIVATIONS_PER_WINDOW} activations in 10s. Halting page operations.`);
      isTripped = true;
      return false;
    }

    return true;
  }

  function recordMutation() {
    resetIfUrlChanged();
    if (isTripped) return false;

    const now = Date.now();
    // Sliding 1-second window to detect infinite DOM mutation loops/storms
    mutationTimestamps = mutationTimestamps.filter((t) => now - t < MUTATION_WINDOW_MS);
    mutationTimestamps.push(now);

    if (mutationTimestamps.length > MAX_MUTATION_BURST) {
      console.warn(`[CareerPilot CircuitBreaker] Tripped! Mutation burst storm detected (${mutationTimestamps.length} mutations/sec). Halting observer.`);
      isTripped = true;
      return false;
    }

    return true;
  }

  function canProcess() {
    resetIfUrlChanged();
    return !isTripped;
  }

  function forceReset() {
    activationTimestamps = [];
    mutationTimestamps = [];
    isTripped = false;
  }

  window.__CAREERPILOT_CIRCUIT_BREAKER__ = {
    recordActivation,
    recordMutation,
    canProcess,
    forceReset,
  };
})();
