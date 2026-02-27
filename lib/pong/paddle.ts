export const PADDLE_WIDTH = 12;
export const PADDLE_HEIGHT = 100;
export const PADDLE_OFFSET = 30;
export const PADDLE_SPEED = 7;

export interface Paddle {
  x: number;
  y: number;
  dy: number;
  score: number;
}

export function createPaddle(x: number, canvasHeight: number): Paddle {
  return {
    x,
    y: canvasHeight / 2 - PADDLE_HEIGHT / 2,
    dy: 0,
    score: 0,
  };
}

export function updatePaddle(paddle: Paddle, canvasHeight: number) {
  paddle.y = Math.max(0, Math.min(canvasHeight - PADDLE_HEIGHT, paddle.y + paddle.dy));
}

export function drawPaddle(ctx: CanvasRenderingContext2D, paddle: Paddle) {
  ctx.fillStyle = "#fff";
  ctx.fillRect(paddle.x, paddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
}
