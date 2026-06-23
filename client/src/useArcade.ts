import { useSyncExternalStore } from 'react';
import { arcade } from './arcade.ts';

/** Subscribe a component to the arcade connection state. */
export function useArcade() {
  const state = useSyncExternalStore(
    (cb) => arcade.subscribe(cb),
    () => arcade.getState(),
  );
  return { state, arcade };
}
