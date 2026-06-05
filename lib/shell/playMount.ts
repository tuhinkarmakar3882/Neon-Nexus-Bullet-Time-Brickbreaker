/** Survives React Strict Mode remount — gates HUD poll and Phaser destroy. */
let playMountGeneration = 0;

export function bumpPlayMountGeneration(): number {
  playMountGeneration += 1;
  return playMountGeneration;
}

export function getPlayMountGeneration(): number {
  return playMountGeneration;
}

export function isCurrentPlayMount(generation: number): boolean {
  return generation === playMountGeneration;
}
