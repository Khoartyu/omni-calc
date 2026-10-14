import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaxService } from '../../services/tax/tax.service';
import { CalculatorService } from '../../services/calculator/calculator.service';
import { HistorySidebarComponent } from '../../components/history-sidebar/history-sidebar.component';

/**
 * =========================================================================================
 * TRANG RIÊNG BIỆT: TÍNH THUẾ THU NHẬP CÁ NHÂN (VIETNAM TAX ENGINE PAGE)
 * ROUTE: /tax
 * =========================================================================================
 *
 * 🎓 GIẢI TRÌNH HỌC THUẬT:
 * - Component inject `TaxService` (nghiệp vụ tính thuế) và `CalculatorService` (quản lý mode).
 * - Dùng `computed()` Signal để tự động tính lại kết quả thuế mỗi khi input thay đổi,
 *   không cần gọi hàm thủ công hay dùng RxJS Observable.
 * - Đây là triển khai chuẩn MVVM: Component (View) chỉ bind dữ liệu,
 *   TaxService (ViewModel/Service) xử lý toàn bộ logic tính thuế.
 * =========================================================================================
 */

@Component({
  selector: 'app-tax-page',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, HistorySidebarComponent],
  templateUrl: './tax.component.html',
  styleUrl: './tax.component.scss'
})
export class TaxComponent {
  /** Inject TaxService để xử lý thuật toán tính thuế TNCN. */
  public readonly taxService  = inject(TaxService);
  /** Inject CalculatorService chỉ để set mode khi vào trang. */
  public readonly calcService = inject(CalculatorService);

  // Các Signal input từ form người dùng nhập vào
  public readonly taxGross            = signal<number>(25_000_000);
  public readonly taxDependentsCount  = signal<number>(1);
  public readonly taxInsuranceAmount  = signal<number>(2_625_000);

  /**
   * Computed Signal: Tự động tính lại kết quả thuế mỗi khi taxGross,
   * taxDependentsCount, hoặc taxInsuranceAmount thay đổi.
   * Không cần event handler hay subscription — đây chính là sức mạnh của Signals.
   */
  public readonly taxReport = computed(() =>
    this.taxService.calculatePersonalIncomeTax(
      this.taxGross()           || 0,
      this.taxDependentsCount() || 0,
      this.taxInsuranceAmount() || 0
    )
  );

  constructor() {
    // Set mode khi component khởi tạo (thay vì dùng OnInit để giảm boilerplate)
    this.calcService.activeMode.set('tax');
  }
}
