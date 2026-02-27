export interface ObstacleChartState {
  barrierStrength: number;
  transmissionCoeff: number;
  reflectionCoeff: number;
  obstacleX: number;
  obstacleY: number;
  ballX: number;
  ballY: number;
  ballDirectionX: number;
  ballKE: number;
  ballMass: number;
  waveNumber: number;
  ballSigma: number;
  collisionT: number;
  collisionDirection: 1 | -1;
  framesSinceCollision: number;
}

export interface GameChartState {
  obstacles: [ObstacleChartState, ObstacleChartState];
  canvasWidth: number;
  paused: boolean;
  gameOver: boolean;
}

type Listener = () => void;

function defaultObstacleState(): ObstacleChartState {
  return {
    barrierStrength: 0,
    transmissionCoeff: 0,
    reflectionCoeff: 1,
    obstacleX: 0,
    obstacleY: 0,
    ballX: 0,
    ballY: 0,
    ballDirectionX: 0,
    ballKE: 0,
    ballMass: 0,
    waveNumber: 0,
    ballSigma: 0,
    collisionT: 0,
    collisionDirection: 1,
    framesSinceCollision: Infinity,
  };
}

export function createGameStateStore() {
  let state: GameChartState = {
    obstacles: [defaultObstacleState(), defaultObstacleState()],
    canvasWidth: 0,
    paused: false,
    gameOver: false,
  };
  const listeners = new Set<Listener>();

  return {
    getSnapshot: () => state,
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit: (next: GameChartState) => {
      state = next;
      listeners.forEach((l) => l());
    },
  };
}

export type GameStateStore = ReturnType<typeof createGameStateStore>;
