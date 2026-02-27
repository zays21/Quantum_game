"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { PongGame } from "@/lib/pong/game";
import { createGameStateStore } from "@/lib/pong/gameState";
import { GameAudio } from "@/lib/pong/audio";
import { PotentialEnergyPanel } from "@/components/quantum/PotentialEnergyPanel";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const store = useMemo(() => createGameStateStore(), []);
  const [showCharts, setShowCharts] = useState(false);

  const gameRef = useRef<PongGame | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const audio = new GameAudio();
    const game = new PongGame(canvas, ctx, store, audio);
    gameRef.current = game;
    game.start();

    return () => {
      game.stop();
      gameRef.current = null;
    };
  }, [store]);

  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.showCharts = showCharts;
    }
  }, [showCharts]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "g") {
        e.preventDefault();
        setShowCharts((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 block bg-black" />
      {showCharts && (
        <div className="absolute bottom-0 left-0 right-0 h-[30vh] z-10">
          <PotentialEnergyPanel store={store} />
        </div>
      )}
    </div>
  );
}
