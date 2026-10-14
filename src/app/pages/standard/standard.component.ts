import { Component, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersonalFormulaLibraryComponent } from '../../components/personal-formula-library/personal-formula-library.component';
import { CalculatorService } from '../../services/calculator/calculator.service';
import { AudioService } from '../../services/shared/audio.service';
import { ToastService } from '../../services/shared/toast.service';
import { HistorySidebarComponent } from '../../components/history-sidebar/history-sidebar.component';

/**
 * =========================================================================================
 * TRANG RIÊNG BIỆT: MÁY TÍNH TIÊU CHUẨN (STANDARD CALCULATOR PAGE)
 * ROUTE: /standard
 * =========================================================================================
 */

@Component({
  selector: 'app-standard-page',
  standalone: true,
  imports: [CommonModule, HistorySidebarComponent, PersonalFormulaLibraryComponent],
  templateUrl: './standard.component.html',
  styleUrl: './standard.component.scss'
})
export class StandardComponent implements OnInit {
  public readonly calcService  = inject(CalculatorService);
  public readonly audioService = inject(AudioService);
  private readonly toastService = inject(ToastService);

  public ngOnInit(): void {
    this.calcService.activeMode.set('standard');
  }

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

  public async copyResult(): Promise<void> {
    try {
      const text = `OmniCalc: ${this.calcService.currentValue()}`;
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(text);
      this.toastService.show('Đã sao chép kết quả định dạng đẹp.');
    } catch {
      this.toastService.show('Không thể sao chép kết quả.', 'error');
    }
  }
}
