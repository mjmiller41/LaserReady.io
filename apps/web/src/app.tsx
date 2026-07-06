/**
 * Phase 0b: the landing page (docs/phase0-landing-copy.md) wrapped around the working
 * checker. The M2 "minimal harness" shell grew into src/landing/Landing.tsx once 0a
 * was built, tested, and packaged for deploy — per the build order.
 */

import { Landing } from './landing/Landing';

export function App() {
  return <Landing />;
}
