import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalculatorService } from '../../services/calculator/calculator.service';
import { ScientificService } from '../../services/casio580/scientific.service';
import { AudioService } from '../../services/shared/audio.service';
import { ToastService } from '../../services/shared/toast.service';
import { HistorySidebarComponent } from '../../components/history-sidebar/history-sidebar.component';

/**
 * =========================================================================================
 * TRANG RIÊNG BIỆT: MÁY TÍNH KHOA HỌC CASIO FX-580VN X (SCIENTIFIC CALCULATOR PAGE)
 * ROUTE: /casio580
 * =========================================================================================
 *
 * 🎓 GIẢI TRÌNH HỌC THUẬT:
 * - Component inject đồng thời 3 service chuyên trách:
 *   + CalculatorService: quản lý màn hình (currentValue, expression, history, memory).
 *   + ScientificService: xử lý hàm khoa học (sin, cos, log...) và trạng thái angleUnit.
 *   + AudioService:      phát âm thanh phím bấm.
 * - @HostListener bắt sự kiện bàn phím vật lý — tăng trải nghiệm người dùng chuyên nghiệp.
 * - Khi hàm khoa học trả về kết quả hợp lệ, Component gọi `calcService.addToHistory()`
 *   để lịch sử được lưu tập trung tại một nguồn duy nhất (Single Source of Truth).
 * =========================================================================================
 */

@Component({
  selector: 'app-casio580-page',
  standalone: true,
  imports: [CommonModule, HistorySidebarComponent],
  templateUrl: './casio580.component.html',
  styleUrl: './casio580.component.scss'
})
export class Casio580Component {
  public readonly calcService    = inject(CalculatorService);
  public readonly sciService     = inject(ScientificService);
  public readonly audioService   = inject(AudioService);
  private readonly toastService  = inject(ToastService);

  constructor() {
    this.calcService.activeMode.set('casio580');
  }

  /**
   * Bắt sự kiện bàn phím vật lý để hỗ trợ nhập liệu nhanh không cần chuột.
   * @param event - Đối tượng KeyboardEvent từ DOM.
   */
  @HostListener('window:keydown', ['$event'])
  public handleKeyboard(event: KeyboardEvent): void {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('input, textarea, select, [role="dialog"]')) return;

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

  /**
   * Thực thi hàm khoa học thông qua ScientificService, sau đó cập nhật màn hình
   * và lưu vào lịch sử chung qua CalculatorService.
   *
   * @param func - Tên hàm khoa học (ví dụ: 'sin', 'log10', 'factorial').
   */
  public onScientificFunction(func: string): void {
    const inputValue = parseFloat(this.calcService.currentValue());
    if (isNaN(inputValue)) return;

    const result = this.sciService.executeFunction(func, inputValue);

    // Nếu là hằng số (π, e), ghi thẳng lên màn hình, không qua history
    if (result.isConstant && result.value !== null) {
      this.audioService.playKeySound('click');
      this.calcService.currentValue.set(result.value.toString());
      this.calcService.hasCalculated.set(true);
      return;
    }

    // Kiểm tra kết quả hợp lệ
    if (result.value === null || isNaN(result.value) || !isFinite(result.value)) {
      this.audioService.playKeySound('error');
      this.calcService.currentValue.set('Lỗi toán học (Math ERROR)');
      this.calcService.expression.set('');
      this.calcService.hasCalculated.set(true);
      return;
    }

    // Kết quả hợp lệ → cập nhật màn hình và lưu lịch sử
    this.audioService.playKeySound('equals');
    const formatted = this.calcService.fixFloatPrecision(result.value).toString();
    this.calcService.expression.set(`${result.label} =`);
    this.calcService.currentValue.set(formatted);
    this.calcService.hasCalculated.set(true);

    // Lưu vào lịch sử tập trung qua CalculatorService
    const historyItem = this.sciService.buildHistoryItem(result.label, formatted);
    this.calcService.addToHistory(historyItem);
  }

  /**
   * Sao chép kết quả hiện tại trên màn hình vào clipboard của hệ điều hành.
   * Dùng Clipboard API bất đồng bộ (async) — chuẩn Web hiện đại.
   */
  public async copyResult(): Promise<void> {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(this.calcService.currentValue());
      this.toastService.show('Đã sao chép kết quả.');
    } catch {
      this.toastService.show('Không thể sao chép kết quả.', 'error');
    }
  }
}
