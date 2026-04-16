export type MotionPreference = 'full' | 'reduce' | 'none';

export const MOTION_KEY = 'motion';

// Inline <head> IIFE: reads localStorage → falls back to prefers-reduced-motion
// → sets data-motion on <html>. Runs synchronously before first paint.
export const motionScript = `(function(){var k="motion",v=localStorage.getItem(k);if(v!=="full"&&v!=="reduce"&&v!=="none"){v=matchMedia("(prefers-reduced-motion:reduce)").matches?"reduce":"full";localStorage.setItem(k,v)}document.documentElement.dataset.motion=v})()`;
