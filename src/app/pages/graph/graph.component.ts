import { 
  Component, 
  inject, 
  signal, 
  viewChild, 
  ElementRef, 
  afterNextRender, 
  OnInit 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalculatorService } from '../../services/calculator/calculator.service';
import { HistorySidebarComponent } from '../../components/history-sidebar/history-sidebar.component';

/**
 * =========================================================================================
 * TRANG RIÊNG BIỆT: VẼ ĐỒ THỊ HÀM SỐ 2D TRÊN CANVAS (2D GRAPHING ENGINE PAGE)
 * ROUTE: /graph
 * =========================================================================================
 */

@Component({
  selector: 'app-graph-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HistorySidebarComponent],
  templateUrl: './graph.component.html',
  styleUrl: './graph.component.scss'
})
export class GraphComponent implements OnInit {
  public readonly calcService = inject(CalculatorService);

  private readonly graphCanvas = viewChild<ElementRef<HTMLCanvasElement>>('graphCanvas');
  public readonly graphExpression = signal<string>('x^2 - 4');

  constructor() {
    afterNextRender(() => {
      this.renderGraph();
    });
  }

  public ngOnInit(): void {
    this.calcService.activeMode.set('graph');
  }

  public selectPresetGraph(preset: string): void {
    this.graphExpression.set(preset);
    this.renderGraph();
  }

  public renderGraph(): void {
    const canvasRef = this.graphCanvas();
    if (!canvasRef) return;

    const canvas = canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const xMin = -8;
    const xMax = 8;
    const yMin = -6;
    const yMax = 6;

    const toScreenX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
    const toScreenY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

    // 1. Nền Canvas
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, width, height);

    // 2. Lưới toạ độ phụ
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;

    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
      const sx = toScreenX(x);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
      ctx.stroke();
    }

    for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
      const sy = toScreenY(y);
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
      ctx.stroke();
    }

    // 3. Trục toạ độ Oxy
    ctx.strokeStyle = '#4e5569';
    ctx.lineWidth = 2;

    const originX = toScreenX(0);
    const originY = toScreenY(0);

    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();

    // 4. Nhãn trục
    ctx.fillStyle = '#8b949e';
    ctx.font = '11px SF Mono, monospace';
    ctx.fillText('x', width - 15, originY - 8);
    ctx.fillText('y', originX + 8, 15);
    ctx.fillText('O', originX + 5, originY + 15);

    // 5. Vẽ đường cong hàm số
    ctx.strokeStyle = '#ff9f0a';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255, 159, 10, 0.4)';
    ctx.shadowBlur = 8;
    ctx.beginPath();

    let isFirstPoint = true;
    const step = 0.04;

    for (let x = xMin; x <= xMax; x += step) {
      const y = this.evaluateMathematicalFunction(x, this.graphExpression());

      if (isNaN(y) || !isFinite(y) || y < yMin - 10 || y > yMax + 10) {
        isFirstPoint = true;
        continue;
      }

      const sx = toScreenX(x);
      const sy = toScreenY(y);

      if (isFirstPoint) {
        ctx.moveTo(sx, sy);
        isFirstPoint = false;
      } else {
        ctx.lineTo(sx, sy);
      }
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private evaluateMathematicalFunction(x: number, expr: string): number {
    const cleanExpr = expr.trim().toLowerCase();
    try {
      if (cleanExpr === 'x^2 - 4' || cleanExpr === 'x^2-4') return x * x - 4;
      if (cleanExpr === 'x^2' || cleanExpr === 'x*x') return x * x;
      if (cleanExpr === 'sin(x)') return Math.sin(x);
      if (cleanExpr === '3*sin(x)' || cleanExpr === '3sin(x)') return 3 * Math.sin(x);
      if (cleanExpr === 'cos(x)') return Math.cos(x);
      if (cleanExpr === 'x^3 - 3*x' || cleanExpr === 'x^3-3x') return x * x * x - 3 * x;
      if (cleanExpr === '2*x + 1' || cleanExpr === '2x+1') return 2 * x + 1;
      if (cleanExpr === '1/x') return x === 0 ? NaN : 1 / x;
      if (cleanExpr === 'sqrt(x)') return x < 0 ? NaN : Math.sqrt(x);

      const sanitized = cleanExpr
        .replace(/\^/g, '**')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/abs\(/g, 'Math.abs(')
        .replace(/pi/g, 'Math.PI')
        .replace(/e/g, 'Math.E')
        .replace(/([0-9])x/g, '$1*x')
        .replace(/x/g, `(${x})`);

      if (/^[0-9+\-*/().Mathsincotepqrab\s*]+$/.test(sanitized)) {
        const fn = new Function(`return ${sanitized}`);
        return Number(fn());
      }
      return NaN;
    } catch {
      return NaN;
    }
  }
}
