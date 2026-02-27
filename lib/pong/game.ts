import {
  Ball,
  BALL_SIZE,
  BALL_KE_INCREMENT,
  createBall,
  resetBall,
  drawBall,
  getSpeed,
  getWavepacketSigma,
  updateQuantumPosition,
} from "./ball";
import {
  Paddle,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_OFFSET,
  PADDLE_SPEED,
  createPaddle,
  updatePaddle,
  drawPaddle,
} from "./paddle";
import {
  Obstacle,
  generateObstacles,
  drawObstacle,
  collideBallWithObstacles,
  resetClearedObstacles,
} from "./obstacle";
import { HBAR } from "./quantumConstant";
import { type GameStateStore, type ObstacleChartState } from "./gameState";
import { GameAudio } from "./audio";

const WINNING_SCORE = 10;
const CHART_HEIGHT_RATIO = 0.7;
const COLLISION_LABEL_FRAMES = 60;

export class PongGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private _showCharts = false;

  set showCharts(value: boolean) {
    this._showCharts = value;
  }

  private get gameHeight() {
    return this.canvas.height;
  }
  private p1: Paddle;
  private p2: Paddle;
  private ball: Ball;
  private keys: Record<string, boolean> = {};
  private paused = false;
  private gameOver = false;
  private winner = "";
  private animationId = 0;
  private debug = false;
  private bounceCount = 0;
  private obstacles: Obstacle[] = [];

  private store: GameStateStore;
  private audio: GameAudio;
  private frameCount = 0;
  private obstacleHitT: number[] = [0, 0];
  private obstacleHitFrame: number[] = [-Infinity, -Infinity];
  private obstacleHitDirection: (1 | -1)[] = [1, 1];

  private resetObstacleCollisions() {
    this.obstacleHitT = [0, 0];
    this.obstacleHitFrame = [-Infinity, -Infinity];
    this.obstacleHitDirection = [1, 1];
  }

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    store: GameStateStore,
    audio: GameAudio,
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.store = store;
    this.audio = audio;

    this.resize();

    this.p1 = createPaddle(PADDLE_OFFSET, this.gameHeight);
    this.p2 = createPaddle(
      canvas.width - PADDLE_OFFSET - PADDLE_WIDTH,
      this.gameHeight,
    );
    this.ball = createBall(canvas.width, this.gameHeight);
    this.obstacles = generateObstacles(canvas.width, this.gameHeight);

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.loop = this.loop.bind(this);
  }

  start() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("resize", this.handleResize);
    this.animationId = requestAnimationFrame(this.loop);
  }

  stop() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("resize", this.handleResize);
  }

  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private handleResize() {
    this.resize();
    this.p2.x = this.canvas.width - PADDLE_OFFSET - PADDLE_WIDTH;
  }

  private handleKeyDown(e: KeyboardEvent) {
    this.keys[e.key] = true;

    if (e.ctrlKey && e.key === "d") {
      e.preventDefault();
      this.debug = !this.debug;
      return;
    }

    if (e.key === " " || e.key === "Escape") {
      if (this.gameOver) {
        this.p1.score = 0;
        this.p2.score = 0;
        this.gameOver = false;
        this.winner = "";
        this.paused = false;
        this.bounceCount = 0;
        resetBall(
          this.ball,
          this.canvas.width,
          this.gameHeight,
          Math.random() > 0.5 ? 1 : -1,
        );
        this.obstacles = generateObstacles(this.canvas.width, this.gameHeight);
        this.resetObstacleCollisions();
      } else {
        this.paused = !this.paused;
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys[e.key] = false;
  }

  private updatePaddles() {
    if (this.keys["w"] || this.keys["W"]) this.p1.dy = -PADDLE_SPEED;
    else if (this.keys["s"] || this.keys["S"]) this.p1.dy = PADDLE_SPEED;
    else this.p1.dy = 0;

    if (this.keys["ArrowUp"]) this.p2.dy = -PADDLE_SPEED;
    else if (this.keys["ArrowDown"]) this.p2.dy = PADDLE_SPEED;
    else this.p2.dy = 0;

    updatePaddle(this.p1, this.gameHeight);
    updatePaddle(this.p2, this.gameHeight);
  }

  private updateBall() {
    const ball = this.ball;
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Check for collapse
    ball.timeSinceCollapse++;
    if (ball.collapsed && ball.timeSinceCollapse > 3) {
      ball.collapsed = false;
      this.audio.playSuperposition();
    }
    updateQuantumPosition(ball);

    // Top/bottom wall bounce
    if (ball.y - BALL_SIZE / 2 <= 0) {
      ball.y = BALL_SIZE / 2;
      ball.dy = Math.abs(ball.dy);
    }
    if (ball.y + BALL_SIZE / 2 >= this.gameHeight) {
      ball.y = this.gameHeight - BALL_SIZE / 2;
      ball.dy = -Math.abs(ball.dy);
    }

    // P1 paddle collision
    if (
      ball.dx < 0 &&
      ball.realX - BALL_SIZE / 2 <= this.p1.x + PADDLE_WIDTH &&
      ball.realX + BALL_SIZE / 2 >= this.p1.x &&
      ball.realY >= this.p1.y &&
      ball.realY <= this.p1.y + PADDLE_HEIGHT
    ) {
      this.bounceBallOff(this.p1, 1);
    }

    // P2 paddle collision
    if (
      ball.dx > 0 &&
      ball.realX + BALL_SIZE / 2 >= this.p2.x &&
      ball.realX - BALL_SIZE / 2 <= this.p2.x + PADDLE_WIDTH &&
      ball.realY >= this.p2.y &&
      ball.realY <= this.p2.y + PADDLE_HEIGHT
    ) {
      this.bounceBallOff(this.p2, -1);
    }

    // Obstacle collision — detect which obstacle was hit (reflection OR transmission)
    const prevTransmitted = this.obstacles.map((o) => o.transmitted);
    const prevDx = ball.dx;
    const prevDy = ball.dy;
    collideBallWithObstacles(ball, this.obstacles);
    resetClearedObstacles(ball, this.obstacles);
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      const reflected = ball.dx !== prevDx || ball.dy !== prevDy;
      const transmitted = !prevTransmitted[i] && obs.transmitted;
      if (reflected || transmitted) {
        const n = obs.vertices.length;
        const cx = obs.vertices.reduce((s, v) => s + v.x, 0) / n;
        const cy = obs.vertices.reduce((s, v) => s + v.y, 0) / n;
        const d = Math.hypot(ball.x - cx, ball.y - cy);
        // Only record for the closest obstacle on reflection
        if (transmitted || d < 200) {
          this.obstacleHitT[i] = obs.transmission;
          this.obstacleHitFrame[i] = this.frameCount;
          // Record approach direction: prevDx > 0 means ball was moving right (from left)
          this.obstacleHitDirection[i] = prevDx > 0 ? 1 : -1;
          if (transmitted) {
            this.audio.playTransmit();
          } else {
            this.audio.playReflect();
          }
        }
      }
    }

    // Scoring
    if (ball.x < 0) {
      this.p2.score++;
      if (this.p2.score >= WINNING_SCORE) {
        this.gameOver = true;
        this.winner = "Player 2";
      } else {
        resetBall(ball, this.canvas.width, this.gameHeight, 1);
        this.obstacles = generateObstacles(this.canvas.width, this.gameHeight);
        this.resetObstacleCollisions();
      }
    }

    if (ball.x > this.canvas.width) {
      this.p1.score++;
      if (this.p1.score >= WINNING_SCORE) {
        this.gameOver = true;
        this.winner = "Player 1";
      } else {
        resetBall(ball, this.canvas.width, this.gameHeight, -1);
        this.obstacles = generateObstacles(this.canvas.width, this.gameHeight);
        this.resetObstacleCollisions();
      }
    }
  }

  private bounceBallOff(paddle: Paddle, directionX: number) {
    this.bounceCount++;
    this.audio.playCollapse();

    this.ball.collapsed = true;
    this.ball.timeSinceCollapse = 0;

    this.ball.x = this.ball.realX;
    this.ball.y = this.ball.realY;

    const hitPos = (this.ball.y - paddle.y) / PADDLE_HEIGHT - 0.5;
    this.ball.ke += BALL_KE_INCREMENT;
    const speed = getSpeed(this.ball);
    const angle = hitPos * (Math.PI / 3);

    this.ball.dx = Math.cos(angle) * speed * directionX;
    this.ball.dy = Math.sin(angle) * speed;

    this.ball.x =
      directionX === 1
        ? paddle.x + PADDLE_WIDTH + BALL_SIZE / 2
        : paddle.x - BALL_SIZE / 2;
  }

  private draw() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    // Uniform scaling when charts are shown to maintain aspect ratio
    const scale = this._showCharts ? CHART_HEIGHT_RATIO : 1;
    const offsetX = (w * (1 - scale)) / 2;
    ctx.save();
    ctx.translate(offsetX, 0);
    ctx.scale(scale, scale);

    // Center dashed line
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, this.gameHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    // Scores
    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(this.p1.score), w / 2 - 60, 60);
    ctx.fillText(String(this.p2.score), w / 2 + 60, 60);

    // Obstacles (color lerps from blue/red back to white after collision)
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      const framesSince = this.frameCount - this.obstacleHitFrame[i];
      let colorOverride: { r: number; g: number; b: number } | undefined;
      if (framesSince < COLLISION_LABEL_FRAMES) {
        const t = framesSince / COLLISION_LABEL_FRAMES; // 0→1 as it fades
        const transmitted = this.obstacleHitT[i] > 0.5;
        // Start color: cyan (0,200,255) for transmit, red (255,80,80) for reflect
        const sr = transmitted ? 0 : 255;
        const sg = transmitted ? 200 : 80;
        const sb = transmitted ? 255 : 80;
        // Lerp toward white (255, 255, 255)
        colorOverride = {
          r: Math.round(sr + (255 - sr) * t),
          g: Math.round(sg + (255 - sg) * t),
          b: Math.round(sb + (255 - sb) * t),
        };
      }
      drawObstacle(ctx, obs, colorOverride);
    }

    // Paddles & ball
    drawPaddle(ctx, this.p1);
    drawPaddle(ctx, this.p2);
    drawBall(ctx, this.ball);

    // Collision labels (TRANSMITTED / REFLECTED)
    this.drawCollisionLabels();

    // Debug overlay
    if (this.debug) this.drawDebug();

    // Paused overlay
    if (this.paused && !this.gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, w, this.gameHeight);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 72px monospace";
      ctx.textAlign = "center";
      ctx.fillText("QUANTUM", w / 2, 160);
      ctx.fillText("PONG", w / 2, 230);
      ctx.font = "bold 32px monospace";
      ctx.fillText("PAUSED", w / 2, this.gameHeight / 2);
      ctx.font = "20px monospace";
      ctx.fillText(
        "Press SPACE or ESC to resume",
        w / 2,
        this.gameHeight / 2 + 40,
      );
    }

    // Game over overlay
    if (this.gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, w, this.gameHeight);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 48px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${this.winner} Wins!`, w / 2, this.gameHeight / 2);
      ctx.font = "20px monospace";
      ctx.fillText(
        "Press SPACE to play again",
        w / 2,
        this.gameHeight / 2 + 40,
      );
    }

    // Restore transform back to physical coordinates
    ctx.restore();

    // Game area border (physical coordinates, only when charts shown)
    if (this._showCharts) {
      const scale = CHART_HEIGHT_RATIO;
      const offsetX = (w * (1 - scale)) / 2;
      const gameW = w * scale;
      const gameH = h * scale;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(offsetX, 0, gameW, gameH);
    }
  }

  private drawDebug() {
    const ctx = this.ctx;
    const speed = getSpeed(this.ball);
    const lines = [
      `Speed: ${speed.toFixed(2)} px/frame`,
      `KE: ${this.ball.ke.toExponential(3)}`,
      `Mass: ${this.ball.mass.toExponential(3)}`,
      `dx: ${this.ball.dx.toFixed(2)}`,
      `dy: ${this.ball.dy.toFixed(2)}`,
      `Bounces: ${this.bounceCount}`,
      `Collapsed: ${this.ball.collapsed}`,
      `Frames: ${this.ball.timeSinceCollapse}`,
      ``,
      ...this.obstacles.flatMap((obs, i) => [
        `--- Obstacle ${i + 1} ---`,
        `  g (strength): ${obs.barrierStrength.toExponential(3)}`,
        `  T (transmit): ${obs.transmission.toFixed(6)}`,
        `  R (reflect):  ${(1 - obs.transmission).toFixed(6)}`,
      ]),
    ];

    const padding = 12;
    const lineHeight = 20;
    const panelW = 260;
    const panelH = lines.length * lineHeight + padding * 2;

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(10, 80, panelW, panelH);

    ctx.fillStyle = "#0f0";
    ctx.font = "14px monospace";
    ctx.textAlign = "left";
    lines.forEach((line, i) => {
      ctx.fillText(line, 10 + padding, 80 + padding + 14 + i * lineHeight);
    });
  }

  private drawCollisionLabels() {
    const ctx = this.ctx;
    for (let i = 0; i < this.obstacles.length; i++) {
      const framesSince = this.frameCount - this.obstacleHitFrame[i];
      if (framesSince >= COLLISION_LABEL_FRAMES) continue;

      const alpha = 1 - framesSince / COLLISION_LABEL_FRAMES;
      const obs = this.obstacles[i];
      const n = obs.vertices.length;
      const cx = obs.vertices.reduce((s, v) => s + v.x, 0) / n;
      const cy = obs.vertices.reduce((s, v) => s + v.y, 0) / n;

      const transmitted = this.obstacleHitT[i] > 0.5;
      const label = transmitted ? "TRANSMITTED" : "REFLECTED";
      const color = transmitted
        ? `rgba(0, 200, 255, ${alpha})`
        : `rgba(255, 80, 80, ${alpha})`;

      ctx.fillStyle = color;
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, cx, cy - 30 - framesSince * 0.3);
    }
  }

  private emitChartState() {
    const k = Math.sqrt(2 * this.ball.mass * this.ball.ke) / HBAR;
    const sigma = getWavepacketSigma(this.ball);
    const obstacles = this.obstacles.map((obs, i): ObstacleChartState => {
      const n = obs.vertices.length;
      const cx = obs.vertices.reduce((s, v) => s + v.x, 0) / n;
      const cy = obs.vertices.reduce((s, v) => s + v.y, 0) / n;
      return {
        barrierStrength: obs.barrierStrength,
        transmissionCoeff: obs.transmission,
        reflectionCoeff: 1 - obs.transmission,
        obstacleX: cx,
        obstacleY: cy,
        ballX: this.ball.x,
        ballY: this.ball.y,
        ballDirectionX: this.ball.dx,
        ballKE: this.ball.ke,
        ballMass: this.ball.mass,
        waveNumber: k,
        ballSigma: sigma,
        collisionT: this.obstacleHitT[i],
        collisionDirection: this.obstacleHitDirection[i],
        framesSinceCollision: this.frameCount - this.obstacleHitFrame[i],
      };
    });
    this.store.emit({
      obstacles: obstacles as [ObstacleChartState, ObstacleChartState],
      canvasWidth: this.canvas.width,
      paused: this.paused,
      gameOver: this.gameOver,
    });
  }

  private loop() {
    if (!this.paused && !this.gameOver) {
      this.updatePaddles();
      this.updateBall();
    }
    this.draw();
    if (!this.paused && !this.gameOver) {
      this.frameCount++;
    }
    if (this.frameCount % 2 === 0) {
      this.emitChartState();
    }
    this.animationId = requestAnimationFrame(this.loop);
  }
}
