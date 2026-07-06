/**
 * The only global the validator touches beyond the ES library.
 *
 * TextDecoder exists in every supported runtime (all browsers, workers, Node >= 11).
 * It is declared here instead of pulling in the "DOM" lib or @types/node so that the
 * compiler keeps enforcing environment neutrality: this package must run unchanged
 * in the browser (Phase 0) and in Node (Phase 1 guarantee re-check).
 */
declare class TextDecoder {
  constructor(label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean });
  decode(input?: ArrayBuffer | ArrayBufferView): string;
}
