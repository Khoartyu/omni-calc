import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { CalculatorService } from '../../services/calculator/calculator.service';
import { ExportService } from '../../services/shared/export.service';
import { HistoryItem } from '../../models/history.model';

/**
 * =========================================================================================
 * COMPONENT TÁI SỬ DỤNG: HISTORY SIDEBAR (LỊCH SỬ TÍNH TOÁN)
 * FILE: src/app/components/history-sidebar/history-sidebar.component.ts
 * =========================================================================================
 *
 * 🎓 GIẢI TRÌNH HỌC THUẬT PHỤC VỤ BẢO VỆ ĐỒ ÁN TRƯỚC HỘI ĐỒNG:
 *
 * 1. NGUYÊN LÝ DRY & COMPONENT COMPOSITION:
 *    - HistorySidebar được tách thành Standalone Component độc lập, có thể nhúng
 *      vào bất kỳ trang nào (Standard, Casio 580, Tax, Financial, Graph).
 *    - Một Component duy nhất thay thế cho 5 đoạn code lặp lại → tuân thủ DRY.
 *
 * 2. SINGLETON SERVICE & SHARED STATE:
 *    - `CalculatorService` được khai báo `providedIn: 'root'` → Angular tạo đúng một
 *      instance duy nhất (Singleton) cho toàn ứng dụng.
 *    - Dữ liệu lịch sử được duy trì liền mạch ngay cả khi người dùng chuyển trang.
 *
 * 3. PHÂN CHIA TRÁCH NHIỆM:
 *    - CalculatorService: quản lý Signal `history`, xử lý `selectHistoryItem`, `clearHistory`.
 *    - ExportService: chịu trách nhiệm tạo file CSV và kích hoạt tải về.
 *    - Component này chỉ là cầu nối giữa UI và hai service trên.
 * =========================================================================================
 */

@Component({
  selector: 'app-history-sidebar',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './history-sidebar.component.html',
  styleUrl: './history-sidebar.component.scss'
})
export class HistorySidebarComponent {
  public readonly calcService   = inject(CalculatorService);
  private readonly exportService = inject(ExportService);
  public readonly isHistoryOpen = signal(false);
  public readonly searchQuery = signal('');
  public readonly visibleHistory = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    const history = this.calcService.history();
    if (!query) return history;

    return history.filter((item) => [
      item.expression,
      item.result,
      item.note ?? '',
      item.mode ?? 'standard',
      ...(item.tags ?? [])
    ].join(' ').toLocaleLowerCase().includes(query));
  });

  /** Toast message hiển thị thông báo phản hồi tạm thời sau các thao tác. */
  public readonly toastMessage = signal<string>('');

  public openHistory(): void {
    this.isHistoryOpen.set(true);
  }

  public closeHistory(): void {
    this.isHistoryOpen.set(false);
  }

  @HostListener('document:keydown', ['$event'])
  public onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.closeHistory();
  }

  /**
   * Xử lý khi người dùng click vào một mục lịch sử.
   * Nạp kết quả lên màn hình để người dùng có thể tiếp tục tính toán.
   *
   * @param item - Mục lịch sử được chọn.
   */
  public onSelectHistory(item: HistoryItem): void {
    this.calcService.selectHistoryItem(item);
    this.closeHistory();
    this.showToast(`Đã nạp lại kết quả: ${item.result}`);
  }

  /**
   * Xóa toàn bộ lịch sử tính toán (cả trong Signal và localStorage).
   */
  public onClearHistory(): void {
    this.calcService.clearHistory();
    this.showToast('Đã xóa sạch lịch sử tính toán.');
  }

  /**
   * Xuất lịch sử ra file CSV và kích hoạt tải về trình duyệt.
   * Ủy quyền hoàn toàn cho ExportService — Component không biết chi tiết kỹ thuật Blob/URL.
   */
  public onExportCSV(): void {
    this.exportService.exportHistoryToCSV(this.calcService.history());
    this.showToast('Đã xuất thành công file Excel CSV!');
  }

  public onExportJSON(): void {
    this.exportService.exportHistoryToJSON(this.calcService.history());
    this.showToast('Đã xuất thành công file JSON!');
  }

  public updateNote(item: HistoryItem, event: Event): void {
    const note = (event.target as HTMLInputElement).value.trim();
    this.calcService.updateHistoryItem(item.id, { note });
  }

  public addTag(item: HistoryItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const input = event.target as HTMLInputElement;
    const tag = input.value.trim();
    if (!tag) return;

    const exists = (item.tags ?? []).some((current) => current.toLocaleLowerCase() === tag.toLocaleLowerCase());
    if (!exists) {
      this.calcService.updateHistoryItem(item.id, { tags: [...(item.tags ?? []), tag] });
    }
    input.value = '';
  }

  public removeTag(item: HistoryItem, tagToRemove: string, event: Event): void {
    event.stopPropagation();
    this.calcService.updateHistoryItem(item.id, {
      tags: (item.tags ?? []).filter((tag) => tag !== tagToRemove)
    });
  }

  /**
   * Hiển thị thông báo toast trong 2.5 giây rồi tự ẩn.
   * Sử dụng setTimeout thay vì RxJS timer để giữ đúng ràng buộc "no RxJS".
   *
   * @param msg - Nội dung thông báo cần hiển thị.
   */
  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(''), 2500);
  }
}
