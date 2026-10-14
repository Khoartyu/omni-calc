import { 
  Component, 
  HostListener, 
  inject, 
  signal, 
  computed, 
  ElementRef, 
  viewChild, 
  afterNextRender 
} from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalculatorService } from '../../services/calculator/calculator.service';
import { TaxService } from '../../services/tax/tax.service';
import { FinancialService } from '../../services/financial/financial.service';
import { ScientificService } from '../../services/casio580/scientific.service';
import { AudioService } from '../../services/shared/audio.service';
import { ExportService } from '../../services/shared/export.service';
import { CalculatorMode } from '../../models/calculator.model';
import { HistoryItem } from '../../models/history.model';

/**
 * =========================================================================================
 * COMPONENT LEGACY: MÁY TÍNH ĐƠN (SINGLE-PAGE LEGACY CALCULATOR COMPONENT)
 * FILE: src/app/components/calculator/calculator.component.ts
 * =========================================================================================
 * 
 * ⚠️ LƯU Ý: Component này không được sử dụng trong routing hiện tại.
 * Ứng dụng đã được refactored sang kiến trúc đa trang (multi-page) tại src/app/pages/.
 * File này được giữ lại để tham khảo và tránh gây lỗi build.
 * 
 * 🎓 GIẢI TRÌNH HỌC THUẬT:
 * Sau khi refactoring, mỗi service chuyên trách được inject riêng biệt theo SRP:
 * - CalculatorService : core engine (signals, history, memory).
 * - TaxService        : thuật toán thuế TNCN biểu lũy tiến 7 bậc.
 * - FinancialService  : VAT và lãi kép.
 * - ScientificService : hàm khoa học Casio 580 và trạng thái angleUnit.
 * - AudioService      : tổng hợp âm thanh Web Audio API.
 * - ExportService     : xuất CSV Blob phía trình duyệt.
 * =========================================================================================
 */

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './calculator.component.html',
  styleUrl: './calculator.component.scss'
})
export class CalculatorComponent {
  public readonly calcService     = inject(CalculatorService);
  public readonly taxService      = inject(TaxService);
  public readonly financialService = inject(FinancialService);
  public readonly sciService      = inject(ScientificService);
  public readonly audioService    = inject(AudioService);
  private readonly exportService  = inject(ExportService);

  private readonly graphCanvas = viewChild<ElementRef<HTMLCanvasElement>>('graphCanvas');

  public readonly toastMessage = signal<string>('');
  public readonly financialTab = signal<'vat' | 'compound'>('vat');

  // ─── Tax Mode Signals ────────────────────────────────────────────────────────
  public readonly taxGross           = signal<number>(25_000_000);
  public readonly taxDependentsCount = signal<number>(1);
  public readonly taxInsuranceAmount = signal<number>(2_625_000);

  public readonly taxReport = computed(() =>
    this.taxService.calculatePersonalIncomeTax(
      this.taxGross()           || 0,
      this.taxDependentsCount() || 0,
      this.taxInsuranceAmount() || 0
    )
  );

  // ─── Financial Mode Signals ───────────────────────────────────────────────────
  public readonly vatBaseAmount  = signal<number>(10_000_000);
  public readonly vatRatePercent = signal<number>(10);
  public readonly vatReport = computed(() =>
    this.financialService.calculateVat(
      this.vatBaseAmount()  || 0,
      this.vatRatePercent() || 0
    )
  );

  public readonly compPrincipal = signal<number>(50_000_000);
  public readonly compRate      = signal<number>(6.5);
  public readonly compYears     = signal<number>(3);
  public readonly compoundReport = computed(() =>
    this.financialService.calculateCompoundInterest(
      this.compPrincipal() || 0,
      this.compRate()       || 0,
      this.compYears()      || 1,
      12
    )
  );

  // ─── Graph Mode Signals ───────────────────────────────────────────────────────
  public readonly graphExpression = signal<string>('x^2 - 4');

  constructor() {
    afterNextRender(() => {
      if (this.calcService.activeMode() === 'graph') {
        this.renderGraph();
      }
    });
  }

  @HostListener('window:keydown', ['$event'])
  public handleKeyboardInput(event: KeyboardEvent): void {
    const mode = this.calcService.activeMode();
    if (mode !== 'standard' && mode !== 'casio580') return;

    const key = event.key;
    if (/^[0-9]$/.test(key)) { this.calcService.appendDigit(key); return; }
    if (key === '.' || key === ',') { this.calcService.appendDigit('.'); return; }
    if (key === '+') { this.calcService.setOperator('+'); return; }
    if (key === '-') { this.calcService.setOperator('-'); return; }
    if (key === '*' || key.toLowerCase() === 'x') { this.calcService.setOperator('×'); return; }
    if (key === '/') { event.preventDefault(); this.calcService.setOperator('÷'); return; }
    if (key === 'Enter' || key === '=') { event.preventDefault(); this.calcService.calculate(); return; }
    if (key === 'Backspace') { event.preventDefault(); this.calcService.deleteLast(); return; }
    if (key === 'Escape' || key.toLowerCase() === 'c') { event.preventDefault(); this.calcService.clearAll(); return; }
    if (key === 'Delete') { event.preventDefault(); this.calcService.clear(); return; }
    if (key === '%') { this.calcService.percentage(); return; }
  }

  public onSwitchMode(mode: CalculatorMode): void {
    this.calcService.setMode(mode);
    if (mode === 'graph') {
      setTimeout(() => this.renderGraph(), 60);
    }
  }

  public onSelectHistory(item: HistoryItem): void {
    this.calcService.selectHistoryItem(item);
    this.showToast(`Đã nạp lại kết quả: ${item.result}`);
  }

  public onClearHistory(): void {
    this.calcService.clearHistory();
    this.showToast('Đã xóa sạch lịch sử tính toán.');
  }

  public onExportCSV(): void {
    this.exportService.exportHistoryToCSV(this.calcService.history());
    this.showToast('Đã xuất thành công file Excel CSV!');
  }

  public onScientificFunction(func: string): void {
    const inputValue = parseFloat(this.calcService.currentValue());
    if (isNaN(inputValue)) return;

    const result = this.sciService.executeFunction(func, inputValue);

    if (result.isConstant && result.value !== null) {
      this.audioService.playKeySound('click');
      this.calcService.currentValue.set(result.value.toString());
      this.calcService.hasCalculated.set(true);
      return;
    }

    if (result.value === null || isNaN(result.value) || !isFinite(result.value)) {
      this.audioService.playKeySound('error');
      this.calcService.currentValue.set('Lỗi toán học (Math ERROR)');
      this.calcService.expression.set('');
      this.calcService.hasCalculated.set(true);
      return;
    }

    this.audioService.playKeySound('equals');
    const formatted = this.calcService.fixFloatPrecision(result.value).toString();
    this.calcService.expression.set(`${result.label} =`);
    this.calcService.currentValue.set(formatted);
    this.calcService.hasCalculated.set(true);
    this.calcService.addToHistory(this.sciService.buildHistoryItem(result.label, formatted));
  }

  public copyToClipboard(text: string): void {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      this.audioService.playKeySound('equals');
      this.showToast(`Đã sao chép: "${text}" vào bộ nhớ tạm!`);
    }).catch(() => {
      this.showToast('Không thể truy cập Clipboard.');
    });
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(''), 2500);
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

    const width  = canvas.width;
    const height = canvas.height;
    const xMin = -8, xMax = 8, yMin = -6, yMax = 6;

    const toScreenX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
    const toScreenY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
      ctx.beginPath(); ctx.moveTo(toScreenX(x), 0); ctx.lineTo(toScreenX(x), height); ctx.stroke();
    }
    for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
      ctx.beginPath(); ctx.moveTo(0, toScreenY(y)); ctx.lineTo(width, toScreenY(y)); ctx.stroke();
    }

    ctx.strokeStyle = '#4e5569'; ctx.lineWidth = 2;
    const originX = toScreenX(0), originY = toScreenY(0);
    ctx.beginPath(); ctx.moveTo(0, originY); ctx.lineTo(width, originY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(originX, 0); ctx.lineTo(originX, height); ctx.stroke();

    ctx.fillStyle = '#8b949e'; ctx.font = '11px SF Mono, monospace';
    ctx.fillText('x', width - 15, originY - 8);
    ctx.fillText('y', originX + 8, 15);
    ctx.fillText('O', originX + 5, originY + 15);

    ctx.strokeStyle = '#ff9f0a'; ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255, 159, 10, 0.4)'; ctx.shadowBlur = 8;
    ctx.beginPath();
    let isFirstPoint = true;
    const step = 0.04;
    for (let x = xMin; x <= xMax; x += step) {
      const y = this.evaluateMathematicalFunction(x, this.graphExpression());
      if (isNaN(y) || !isFinite(y) || y < yMin - 10 || y > yMax + 10) { isFirstPoint = true; continue; }
      const sx = toScreenX(x), sy = toScreenY(y);
      if (isFirstPoint) { ctx.moveTo(sx, sy); isFirstPoint = false; } else { ctx.lineTo(sx, sy); }
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
