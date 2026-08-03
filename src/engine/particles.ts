// 軽量パーティクル。タップ/クリア/破壊などで弾けさせ、全ゲームを一気に「ジューシー」に。
interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  gravity: number;
  spin: number;
  rot: number;
  shape: "circle" | "square";
}

const COLORS = ["#ffd63d", "#e94078", "#39d98a", "#4a90ff", "#ffffff"];

export class Particles {
  private ps: P[] = [];

  /** 弾ける小爆発 */
  burst(x: number, y: number, color?: string, count = 10): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 180;
      this.ps.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0.5 + Math.random() * 0.3,
        max: 0.8,
        size: 3 + Math.random() * 4,
        color: color ?? COLORS[(Math.random() * COLORS.length) | 0],
        gravity: 520,
        spin: 0,
        rot: 0,
        shape: "circle",
      });
    }
  }

  /** クリア時の紙吹雪（上から降る） */
  confetti(w: number, count = 60): void {
    for (let i = 0; i < count; i++) {
      this.ps.push({
        x: Math.random() * w,
        y: -20 - Math.random() * 120,
        vx: (Math.random() - 0.5) * 80,
        vy: 120 + Math.random() * 180,
        life: 1.4 + Math.random() * 0.6,
        max: 2,
        size: 5 + Math.random() * 5,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        gravity: 60,
        spin: (Math.random() - 0.5) * 12,
        rot: Math.random() * Math.PI,
        shape: "square",
      });
    }
  }

  update(dt: number): void {
    for (const p of this.ps) {
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      p.life -= dt;
    }
    this.ps = this.ps.filter((p) => p.life > 0);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.ps) {
      const a = Math.max(0, Math.min(1, p.life / (p.max * 0.5)));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.shape === "square") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.ps.length = 0;
  }
}
