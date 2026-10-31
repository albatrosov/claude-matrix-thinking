// The words the rain falls from: the last ones of this turn's thinking,
// `seq` counting every word the turn has thought so far. `isRaining` holds
// from the turn's first thought to its end.
export type Rain = { words: string[]; seq: number; isRaining: boolean }

declare module 'claude-code' {
  interface PluginState {
    'matrix-thinking': { rain: Rain; prompt: string }
  }
}
