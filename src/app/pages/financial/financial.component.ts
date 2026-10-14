import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinancialService } from '../../services/financial/financial.service';
import { CalculatorService } from '../../services/calculator/calculator.service';
import { HistorySidebarComponent } from '../../components/history-sidebar/history-sidebar.component';

/**
 * =========================================================================================
 * TRANG RIÊNG BIỆT: KẾ TOÁN & TÀI CHÍNH DOANH NGHIỆP (ACCOUNTING & FINANCE PAGE)
 * ROUTE: /financial
 * =========================================================================================
 *
 * 🎓 GIẢI TRÌNH HỌC THUẬT:
 * - Component inject `FinancialService` (nghiệp vụ tính VAT và lãi kép).
 * - Hai tab: VAT và Compound Interest, mỗi tab dùng một nhóm Signal input riêng.
 * - `computed()` tự động cập nhật kết quả ngay khi người dùng thay đổi input,
 *   không cần debounce hay event binding thủ công.
 * =========================================================================================
 */

@Component({
  selector: 'app-financial-page',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, HistorySidebarComponent],
  templateUrl: './financial.component.html',
  styleUrl: './financial.component.scss'
})
export class FinancialComponent {
  /** Inject FinancialService để xử lý tính VAT và lãi kép. */
  public readonly financialService = inject(FinancialService);
  /** Inject CalculatorService chỉ để set mode khi vào trang. */
  public readonly calcService      = inject(CalculatorService);

  /** Tab đang active: 'vat' hoặc 'compound'. */
  public readonly financialTab = signal<'vat' | 'compound'>('vat');

  // ─── Input Signals: Tab VAT ─────────────────────────────────────────────────
  public readonly vatBaseAmount   = signal<number>(10_000_000);
  public readonly vatRatePercent  = signal<number>(10);

  /** Computed VAT Report: tự tính lại khi vatBaseAmount hoặc vatRatePercent thay đổi. */
  public readonly vatReport = computed(() =>
    this.financialService.calculateVat(
      this.vatBaseAmount()  || 0,
      this.vatRatePercent() || 0
    )
  );

  // ─── Input Signals: Tab Compound Interest ───────────────────────────────────
  public readonly compPrincipal = signal<number>(50_000_000);
  public readonly compRate      = signal<number>(6.5);
  public readonly compYears     = signal<number>(3);

  /** Computed Compound Interest Report: tự tính lại khi bất kỳ input nào thay đổi. */
  public readonly compoundReport = computed(() =>
    this.financialService.calculateCompoundInterest(
      this.compPrincipal() || 0,
      this.compRate()       || 0,
      this.compYears()      || 1,
      12 // Tính lãi hàng tháng (n = 12)
    )
  );

  constructor() {
    this.calcService.activeMode.set('financial');
  }
}
