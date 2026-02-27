"use client";

import { useSyncExternalStore, useRef } from "react";
import { type GameStateStore } from "@/lib/pong/gameState";
import { ObstacleWaveChart } from "./ObstacleWaveChart";

interface Props {
  store: GameStateStore;
}

export function PotentialEnergyPanel({ store }: Props) {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const animFrameRef = useRef(0);
  if (!state.paused && !state.gameOver) {
    animFrameRef.current += 1;
  }

  return (
    <div className="h-full w-full flex gap-1.5 p-1.5">
      {state.obstacles.map((obs, i) => (
        <ObstacleWaveChart
          key={i}
          obstacle={obs}
          canvasWidth={state.canvasWidth}
          animFrame={animFrameRef.current}
          label={i === 0 ? "Left Barrier" : "Right Barrier"}
        />
      ))}
    </div>
  );
}
