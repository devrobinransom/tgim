"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSovereignMode = isSovereignMode;
/**
 * Returns true when India Sovereignty Mode is active.
 * Reads SOVEREIGNTY_MODE env var (browser-safe — uses globalThis check).
 */
function isSovereignMode() {
    const g = globalThis;
    if (g.process?.env?.SOVEREIGNTY_MODE === 'sovereign')
        return true;
    if (g.process?.env?.NEXT_PUBLIC_SOVEREIGNTY_MODE === 'sovereign')
        return true;
    return false;
}
