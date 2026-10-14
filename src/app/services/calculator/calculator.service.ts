import { Injectable, signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CalculatorMode, CalculatorOperator } from '../../models/calculator.model';
import { HistoryItem } from '../../models/history.model';
import { AudioService } from '../shared/audio.service';

/**
 * =========================================================================================
 * DỊCH VỤ CỐT LÕI: BỘ MÁY TÍNH TOÁN CHÍNH (CALCULATOR SERVICE - CORE ENGINE)
 * FILE: src/app/services/calculator/calculator.service.ts
 * =========================================================================================
 *
 * 🎓 GIẢI TRÌNH HỌC THUẬT PHỤC VỤ BẢO VỆ ĐỒ ÁN TRƯỚC HỘI ĐỒNG:
 *
 * 1. VAI TRÒ TRONG MÔ HÌNH MVVM:
 *    - CalculatorService đóng vai trò "ViewModel" (VM) trong kiến trúc MVVM.
 *    - VM là cầu nối giữa Model (HistoryItem, CalculatorMode...) và View (Component HTML).
 *    - View CHỈ đọc Signal để hiển thị và gọi phương thức để thay đổi trạng thái,
 *      không bao giờ tự tính toán hay truy cập dữ liệu trực tiếp.
 *
 * 2. SAU KHI REFACTORING THEO SRP (SINGLE RESPONSIBILITY PRINCIPLE):
 *    - CalculatorService giờ chỉ giữ lại ĐÚNG TRÁCH NHIỆM CỐT LÕI:
 *      + Quản lý trạng thái màn hình (currentValue, expression, history, memory).
 *      + Xử lý luồng nhập liệu số và toán tử (appendDigit, setOperator).
 *      + Thực thi phép toán hai ngôi cơ bản (+, -, ×, ÷).
 *      + Quản lý bộ nhớ đệm (MC, MR, M+, M-).
 *      + Đồng bộ hóa lịch sử và cài đặt với localStorage qua Angular Effect.
 *    - Các nghiệp vụ đã được chuyển sang service chuyên trách:
 *      + AudioService     → âm thanh phím bấm.
 *      + ScientificService → hàm khoa học Casio 580.
 *      + TaxService        → thuế TNCN Việt Nam.
 *      + FinancialService  → VAT và lãi kép.
 *      + ExportService     → xuất CSV.
 *
 * 3. TẠI SAO DÙNG ANGULAR SIGNALS THAY VÌ RXJS:
 *    - Signals (Angular 17+) cho phép phản ứng tức thì (synchronous reactivity)
 *      mà không cần khai báo Observable, pipe, hay subscription/unsubscription.
 *    - `computed()` = derived state tự động tính lại khi dependency thay đổi.
 *    - `effect()` = side effect (lưu localStorage) tự động kích hoạt khi Signal thay đổi,
 *      thay thế hoàn toàn cho pattern `subscribe` của BehaviorSubject.
 *
 * 4. KHẮC PHỤC SAI SỐ IEEE 754:
 *    - JavaScript lưu số thực theo chuẩn IEEE 754 64-bit, gây ra lỗi nổi tiếng:
 *      0.1 + 0.2 = 0.30000000000000004
 *    - Giải pháp: `parseFloat(value.toPrecision(12))` — làm tròn về 12 chữ số có nghĩa,
 *      đủ chính xác cho mọi phép tính thực tế mà không làm tròn nhầm.
 * =========================================================================================
 */

@Injectable({
  providedIn: 'root'
})
export class CalculatorService {
  /** Key để lưu lịch sử tính toán trong localStorage. */
  private readonly STORAGE_KEY_HISTORY  = 'omnicalc_calculation_history';
  /** Key để lưu cài đặt người dùng (chế độ, đơn vị góc) trong localStorage. */
  private readonly STORAGE_KEY_SETTINGS = 'omnicalc_user_settings';

  private readonly platformId  = inject(PLATFORM_ID);
  /** Inject AudioService theo Dependency Injection — tuân thủ nguyên lý SRP và DIP. */
  private readonly audioService = inject(AudioService);

  // =======================================================================================
  // 1. TÍN HIỆU TRẠNG THÁI (ANGULAR SIGNALS)
  // =======================================================================================

  /** Chế độ máy tính hiện tại đang được kích hoạt (standard, casio580, tax, financial, graph). */
  public readonly activeMode = signal<CalculatorMode>('standard');

  /** Giá trị đang hiển thị trên màn hình chính (có thể là số hoặc thông báo lỗi). */
  public readonly currentValue = signal<string>('0');

  /** Biểu thức tích lũy hiển thị trên dòng phụ phía trên màn hình. */
  public readonly expression = signal<string>('');

  /** Mảng lịch sử các phép tính đã thực hiện. Tự động persist qua localStorage via Effect. */
  public readonly history = signal<HistoryItem[]>([]);

  /** Giá trị bộ nhớ đệm (M). Giữ nguyên khi chuyển trang, reset khi bấm MC. */
  public readonly memory = signal<number>(0);

  /** Cờ đánh dấu vừa bấm "=" xong — dùng để quyết định hành vi của lần nhập tiếp theo. */
  public readonly hasCalculated = signal<boolean>(false);

  /**
   * Computed Signal: Kiểm tra xem bộ nhớ M có đang chứa giá trị khác 0 không.
   * UI dùng để highlight nút MR/MC và hiển thị indicator "M".
   */
  public readonly isMemoryActive = computed<boolean>(() => this.memory() !== 0);

  // Biến lưu trữ toán hạng thứ nhất và toán tử đang chờ xử lý
  private pendingOperator: CalculatorOperator | null = null;
  private firstOperand: number | null = null;

  // =======================================================================================
  // 2. CONSTRUCTOR & QUẢN LÝ PERSISTENCE (LOCALSTORAGE QUA EFFECT)
  // =======================================================================================

  constructor() {
    // Nạp dữ liệu đã lưu từ phiên trước khi khởi tạo
    this.loadHistoryFromStorage();
    this.loadSettingsFromStorage();

    /**
     * Effect tự động lưu lịch sử vào localStorage mỗi khi Signal `history` thay đổi.
     * Angular Effect chạy ngay lần đầu, sau đó chạy lại khi dependency (history) thay đổi.
     * Đây là cách Angular Signals thay thế pattern `subscribe + ngOnDestroy` của RxJS.
     */
    effect(() => {
      const currentHistory = this.history();
      if (isPlatformBrowser(this.platformId)) {
        try {
          localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(currentHistory));
        } catch (error) {
          console.error('[OmniCalc] Lỗi lưu lịch sử:', error);
        }
      }
    });

    /**
     * Effect tự động lưu cài đặt (chế độ hiện tại) khi thay đổi.
     * Khi F5 (reload), loadSettingsFromStorage() sẽ khôi phục lại chế độ đã chọn.
     */
    effect(() => {
      const settings = { mode: this.activeMode() };
      if (isPlatformBrowser(this.platformId)) {
        try {
          localStorage.setItem(this.STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        } catch (error) {
          console.error('[OmniCalc] Lỗi lưu cài đặt:', error);
        }
      }
    });
  }

  /**
   * Khôi phục lịch sử từ localStorage khi ứng dụng khởi động lại.
   * Cần parse lại trường `timestamp` vì JSON.parse trả string, không phải Date.
   */
  public loadHistoryFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY_HISTORY);
      if (storedData) {
        const parsedList = JSON.parse(storedData) as Array<{
          id: string;
          expression: string;
          result: string;
          timestamp: string | Date;
          mode?: CalculatorMode;
          tags?: string[];
          note?: string;
        }>;

        const formattedHistory: HistoryItem[] = parsedList.map((item) => ({
          id: item.id,
          expression: item.expression,
          result: item.result,
          timestamp: new Date(item.timestamp), // Chuyển string ISO → Date object
          mode: item.mode ?? 'standard',
          tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string') : [],
          note: typeof item.note === 'string' ? item.note : ''
        }));

        this.history.set(formattedHistory);
      }
    } catch (error) {
      console.error('[OmniCalc] Không thể nạp lịch sử:', error);
      this.history.set([]);
    }
  }

  /**
   * Khôi phục cài đặt người dùng từ localStorage.
   */
  public loadSettingsFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const settingsData = localStorage.getItem(this.STORAGE_KEY_SETTINGS);
      if (settingsData) {
        const parsed = JSON.parse(settingsData) as { mode?: CalculatorMode };
        if (parsed.mode) this.activeMode.set(parsed.mode);
      }
    } catch (error) {
      console.error('[OmniCalc] Không thể nạp cài đặt:', error);
    }
  }

  // =======================================================================================
  // 3. ĐIỀU HƯỚNG CHẾ ĐỘ
  // =======================================================================================

  /**
   * Chuyển đổi giữa các chế độ máy tính (standard, casio580, tax, financial, graph).
   * Việc set Signal tại đây đảm bảo mọi Component đang lắng nghe đều phản ứng ngay.
   */
  public setMode(mode: CalculatorMode): void {
    this.audioService.playKeySound('operator');
    this.activeMode.set(mode);
  }

  // =======================================================================================
  // 4. LOGIC NHẬP LIỆU CƠ BẢN (INPUT CONTROLLER)
  // =======================================================================================

  /**
   * Thêm một chữ số hoặc dấu chấm thập phân vào giá trị hiện tại trên màn hình.
   * Xử lý các edge case:
   * - Sau khi bấm "=": bắt đầu nhập số mới.
   * - Không cho phép nhập nhiều hơn 18 ký tự để tránh overflow hiển thị.
   * - Ngăn nhập hai dấu chấm trong cùng một số.
   * - Nếu màn hình đang là "0", thay thế luôn thay vì append.
   *
   * @param digit - Ký tự nhập vào: '0'-'9' hoặc '.'.
   */
  public appendDigit(digit: string): void {
    this.audioService.playKeySound('click');

    if (this.currentValue().length >= 18 && !this.hasCalculated()) return;

    if (this.hasCalculated()) {
      this.currentValue.set(digit === '.' ? '0.' : digit);
      this.expression.set('');
      this.hasCalculated.set(false);
      return;
    }

    if (digit === '.') {
      // Ngăn nhập dấu chấm nếu số đã có dấu chấm
      if (this.currentValue().includes('.')) return;
      this.currentValue.update((val) => val + '.');
      return;
    }

    if (this.currentValue() === '0') {
      // Thay "0" bằng chữ số mới thay vì tạo ra "07", "08"...
      this.currentValue.set(digit);
      return;
    }

    this.currentValue.update((val) => val + digit);
  }

  /**
   * Thiết lập toán tử và chuẩn bị cho việc nhập toán hạng thứ hai.
   * Nếu đã có phép tính đang chờ, tự động tính kết quả trung gian trước.
   *
   * @param operator - Toán tử: '+', '-', '×', '÷' (hoặc '*', '/' dạng raw từ bàn phím).
   */
  public setOperator(operator: string): void {
    this.audioService.playKeySound('operator');
    const normalizedOperator = this.normalizeOperator(operator);
    const currentNum = parseFloat(this.currentValue());

    if (this.hasCalculated()) {
      // Sau khi vừa bấm "=", cho phép tiếp tục phép tính mới với kết quả cũ
      this.firstOperand = currentNum;
      this.pendingOperator = normalizedOperator;
      this.expression.set(`${this.formatNumber(currentNum)} ${normalizedOperator}`);
      this.hasCalculated.set(false);
      this.currentValue.set('0');
      return;
    }

    if (this.firstOperand === null) {
      // Chưa có toán hạng nào → lưu toán hạng đầu tiên
      this.firstOperand = currentNum;
      this.pendingOperator = normalizedOperator;
      this.expression.set(`${this.formatNumber(currentNum)} ${normalizedOperator}`);
      this.currentValue.set('0');
      return;
    }

    if (this.currentValue() === '0' && this.pendingOperator !== null) {
      // Chỉ thay đổi toán tử khi chưa nhập toán hạng thứ hai
      this.pendingOperator = normalizedOperator;
      this.expression.set(`${this.formatNumber(this.firstOperand)} ${normalizedOperator}`);
      return;
    }

    // Có đủ hai toán hạng → tính kết quả trung gian, dùng làm toán hạng mới
    if (this.pendingOperator !== null) {
      const intermediateResult = this.executeMath(this.firstOperand, currentNum, this.pendingOperator);
      if (intermediateResult === null) {
        this.handleCalculationError('Không thể chia cho 0');
        return;
      }
      this.firstOperand = intermediateResult;
      this.pendingOperator = normalizedOperator;
      this.expression.set(`${this.formatNumber(intermediateResult)} ${normalizedOperator}`);
      this.currentValue.set('0');
    }
  }

  /**
   * Xóa ký tự cuối cùng trên màn hình (tương đương phím Backspace).
   * Nếu vừa bấm "=", xóa tất cả (clearAll) thay vì chỉ xóa một ký tự.
   */
  public deleteLast(): void {
    this.audioService.playKeySound('click');

    if (this.hasCalculated()) {
      this.clearAll();
      return;
    }

    const current = this.currentValue();
    if (current.length <= 1 || current === 'Lỗi' || current.startsWith('Không')) {
      this.currentValue.set('0');
      return;
    }
    this.currentValue.set(current.slice(0, -1));
  }

  /** Xóa giá trị hiện tại trên màn hình (CE - Clear Entry), giữ nguyên toán tử và toán hạng đầu. */
  public clear(): void {
    this.audioService.playKeySound('click');
    this.currentValue.set('0');
  }

  /** Xóa toàn bộ trạng thái, đặt lại máy tính về trạng thái ban đầu (AC - All Clear). */
  public clearAll(): void {
    this.audioService.playKeySound('click');
    this.currentValue.set('0');
    this.expression.set('');
    this.firstOperand    = null;
    this.pendingOperator = null;
    this.hasCalculated.set(false);
  }

  /**
   * Đảo dấu số hiện tại: dương → âm, âm → dương.
   * Thực hiện bằng cách thêm/xóa tiền tố '-' thay vì nhân -1 (tránh sai số float).
   */
  public toggleSign(): void {
    this.audioService.playKeySound('click');
    const current = this.currentValue();
    if (current === '0' || current.includes('Lỗi')) return;
    this.currentValue.set(current.startsWith('-') ? current.substring(1) : '-' + current);
  }

  /**
   * Chuyển số hiện tại thành phần trăm (chia cho 100).
   * Ví dụ: 25 → 0.25, sau đó có thể dùng để tính 500 × 25% = 125.
   */
  public percentage(): void {
    this.audioService.playKeySound('operator');
    const currentNum = parseFloat(this.currentValue());
    if (isNaN(currentNum)) return;
    this.currentValue.set(this.fixFloatPrecision(currentNum / 100).toString());
  }

  // =======================================================================================
  // 5. TÍNH TOÁN CỐT LÕI (CALCULATE ENGINE)
  // =======================================================================================

  /**
   * Thực thi phép tính khi người dùng bấm "=" (hoặc Enter).
   * Kiểm tra chia cho 0 trước khi thực thi để tránh lỗi runtime.
   * Lưu kết quả vào Signal `history` — Effect sẽ tự động persist xuống localStorage.
   */
  public calculate(): void {
    if (this.firstOperand === null || this.pendingOperator === null) return;

    const secondOperand   = parseFloat(this.currentValue());
    const fullExprString  = `${this.formatNumber(this.firstOperand)} ${this.pendingOperator} ${this.formatNumber(secondOperand)}`;

    if ((this.pendingOperator === '÷' || this.pendingOperator === '/') && secondOperand === 0) {
      this.audioService.playKeySound('error');
      this.handleCalculationError('Không thể chia cho 0');
      return;
    }

    const mathResult = this.executeMath(this.firstOperand, secondOperand, this.pendingOperator);

    if (mathResult === null || isNaN(mathResult) || !isFinite(mathResult)) {
      this.audioService.playKeySound('error');
      this.handleCalculationError('Lỗi tính toán');
      return;
    }

    this.audioService.playKeySound('equals');
    const formattedResult = this.formatNumber(mathResult);

    this.expression.set(`${fullExprString} =`);
    this.currentValue.set(formattedResult);

    // Thêm mục mới vào đầu mảng lịch sử (unshift) để mục mới nhất hiển thị trên cùng
    const newHistoryItem: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      expression: fullExprString,
      result: formattedResult,
      timestamp: new Date(),
      mode: this.activeMode()
    };

    this.history.update((prev) => [newHistoryItem, ...prev]);

    this.firstOperand    = null;
    this.pendingOperator = null;
    this.hasCalculated.set(true);
  }

  /**
   * Tính toán phép toán hai ngôi.
   * Áp dụng `fixFloatPrecision` để khắc phục sai số IEEE 754.
   *
   * @param a  - Toán hạng thứ nhất.
   * @param b  - Toán hạng thứ hai.
   * @param op - Toán tử: '+', '-', '×', '÷'.
   * @returns Kết quả số, hoặc null nếu phép toán không hợp lệ (chia cho 0).
   */
  private executeMath(a: number, b: number, op: CalculatorOperator): number | null {
    let rawResult = 0;
    switch (op) {
      case '+':
        rawResult = a + b;
        break;
      case '-':
        rawResult = a - b;
        break;
      case '×':
      case '*':
        rawResult = a * b;
        break;
      case '÷':
      case '/':
        if (b === 0) return null;
        rawResult = a / b;
        break;
      default:
        return null;
    }
    return this.fixFloatPrecision(rawResult);
  }

  /**
   * Khắc phục sai số thực IEEE 754 bằng cách làm tròn về 12 chữ số có nghĩa.
   * Public vì ScientificService và các page cũng cần dùng để format kết quả.
   *
   * @param value - Số thực cần làm sạch epsilon error.
   * @returns Số thực đã được làm tròn.
   */
  public fixFloatPrecision(value: number): number {
    return parseFloat(value.toPrecision(12));
  }

  /**
   * Xử lý lỗi tính toán: hiển thị thông báo trên màn hình và reset trạng thái.
   */
  private handleCalculationError(message: string): void {
    this.currentValue.set(message);
    this.expression.set('');
    this.firstOperand    = null;
    this.pendingOperator = null;
    this.hasCalculated.set(true);
  }

  /**
   * Chuẩn hóa ký tự toán tử từ bàn phím vật lý sang dạng hiển thị thống nhất.
   * Ví dụ: '*' (từ bàn phím) → '×' (ký hiệu toán học).
   */
  private normalizeOperator(op: string): CalculatorOperator {
    if (op === '*') return '×';
    if (op === '/') return '÷';
    return op as CalculatorOperator;
  }

  /**
   * Định dạng số để hiển thị trên màn hình và trong biểu thức.
   * Áp dụng fixFloatPrecision để tránh hiển thị số thực "rác".
   */
  private formatNumber(num: number): string {
    return this.fixFloatPrecision(num).toString();
  }

  // =======================================================================================
  // 6. BỘ NHỚ ĐỆM (MEMORY: MC, MR, M+, M-)
  // =======================================================================================

  /** MC (Memory Clear): Xóa giá trị trong bộ nhớ M về 0. */
  public memoryClear(): void {
    this.audioService.playKeySound('click');
    this.memory.set(0);
  }

  /** MR (Memory Read): Đưa giá trị trong bộ nhớ M lên màn hình để dùng tiếp. */
  public memoryRead(): void {
    this.audioService.playKeySound('click');
    this.currentValue.set(this.memory().toString());
    this.hasCalculated.set(true);
  }

  /** M+ (Memory Add): Cộng giá trị màn hình hiện tại vào bộ nhớ M. */
  public memoryAdd(): void {
    this.audioService.playKeySound('click');
    const currentNum = parseFloat(this.currentValue());
    if (!isNaN(currentNum)) {
      this.memory.update((m) => this.fixFloatPrecision(m + currentNum));
      this.hasCalculated.set(true);
    }
  }

  /** M- (Memory Subtract): Trừ giá trị màn hình hiện tại từ bộ nhớ M. */
  public memorySub(): void {
    this.audioService.playKeySound('click');
    const currentNum = parseFloat(this.currentValue());
    if (!isNaN(currentNum)) {
      this.memory.update((m) => this.fixFloatPrecision(m - currentNum));
      this.hasCalculated.set(true);
    }
  }

  // =======================================================================================
  // 7. QUẢN LÝ LỊCH SỬ (HISTORY MANAGEMENT)
  // =======================================================================================

  /**
   * Nạp kết quả của một mục lịch sử lên màn hình để tính tiếp.
   * Được gọi khi người dùng click vào một dòng trong History Sidebar.
   *
   * @param item - Mục lịch sử được chọn.
   */
  public selectHistoryItem(item: HistoryItem): void {
    this.audioService.playKeySound('click');
    this.currentValue.set(item.result);
    this.expression.set(item.expression + ' =');
    this.firstOperand    = null;
    this.pendingOperator = null;
    this.hasCalculated.set(true);
  }

  /** Xóa toàn bộ lịch sử trong Signal và trong localStorage. */
  public clearHistory(): void {
    this.audioService.playKeySound('click');
    this.history.set([]);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.removeItem(this.STORAGE_KEY_HISTORY);
      } catch (error) {
        console.error('[OmniCalc] Không thể xóa lịch sử:', error);
      }
    }
  }

  /**
   * Thêm một HistoryItem vào đầu mảng lịch sử.
   * Được gọi bởi các component ngoài (Casio580, Graph...) sau khi tính toán xong.
   * Đảm bảo lịch sử được quản lý tập trung tại một nguồn duy nhất (Single Source of Truth).
   *
   * @param item - HistoryItem cần thêm vào lịch sử.
   */
  public addToHistory(item: HistoryItem): void {
    this.history.update((prev) => [item, ...prev]);
  }

  public updateHistoryItem(id: string, updates: Pick<HistoryItem, 'tags' | 'note'>): void {
    this.history.update((items) => items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    ));
  }
}
