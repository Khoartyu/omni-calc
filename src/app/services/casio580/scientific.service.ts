import { Injectable, signal } from '@angular/core';
import { AngleUnit } from '../../models/scientific.model';
import { HistoryItem } from '../../models/history.model';

/**
 * =========================================================================================
 * DỊCH VỤ CHUYÊN TRÁCH: BỘ GIẢI TÍCH KHOA HỌC CASIO FX-580VN X (SCIENTIFIC SERVICE)
 * FILE: src/app/services/casio580/scientific.service.ts
 * =========================================================================================
 *
 * 🎓 GIẢI TRÌNH HỌC THUẬT PHỤC VỤ BẢO VỆ ĐỒ ÁN TRƯỚC HỘI ĐỒNG:
 *
 * 1. NGUYÊN LÝ ĐƠN TRÁCH NHIỆM (SINGLE RESPONSIBILITY PRINCIPLE - SRP):
 *    - ScientificService chuyên trách xử lý toàn bộ các hàm toán học khoa học đặc thù
 *      của máy tính CASIO fx-580VN X: lượng giác, nghịch lượng giác, logarit, lũy thừa,
 *      giai thừa, và các hằng số toán học.
 *    - Trạng thái duy nhất Service quản lý là `angleUnit` (Signal<AngleUnit>),
 *      vì đây là cài đặt toàn cục ảnh hưởng đến toàn bộ phép tính lượng giác.
 *
 * 2. XỬ LÝ ĐỔI ĐƠN VỊ GÓC (DEG → RAD CONVERSION):
 *    - JavaScript Math API chỉ làm việc với Radian nên cần chuyển đổi khi ở chế độ DEG:
 *      rad = deg × (π / 180)
 *    - Riêng tan(90°) và tan(270°) không xác định (đường thẳng đứng) → trả null → báo lỗi.
 *
 * 3. GIỚI HẠN GIAI THỪA (FACTORIAL LIMIT):
 *    - Chuẩn IEEE 754 Double Precision có thể biểu diễn tối đa đến 170! ≈ 7.26 × 10^306.
 *    - 171! = Infinity trong JavaScript → Service giới hạn n ≤ 170 và trả null cho n > 170.
 *    - Dùng vòng lặp (loop) thay đệ quy (recursion) để tránh stack overflow với n lớn.
 * =========================================================================================
 */

/**
 * Kiểu kết quả trả về từ một phép tính khoa học.
 * Chứa đủ thông tin để `CalculatorService` cập nhật màn hình và lịch sử.
 */
export interface ScientificResult {
  /** Nhãn biểu thức hiển thị (ví dụ: "sin(30)", "√(144)"). */
  label: string;
  /** Giá trị số kết quả. `null` = lỗi toán học. */
  value: number | null;
  /** Nếu true, đây là hằng số (pi, e) → ghi thẳng lên màn hình, không lưu lịch sử lại. */
  isConstant?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ScientificService {
  /**
   * Đơn vị đo góc hiện tại: 'DEG' (Độ) hoặc 'RAD' (Radian).
   * Là Signal để UI phản ứng tức thì khi người dùng chuyển đổi.
   */
  public readonly angleUnit = signal<AngleUnit>('DEG');

  /**
   * Đảo đơn vị đo góc qua lại giữa DEG và RAD.
   * Dùng `signal.update()` để đọc giá trị cũ và trả giá trị mới — cách idiomatic của Signals.
   */
  public toggleAngleUnit(): void {
    this.angleUnit.update((unit) => (unit === 'DEG' ? 'RAD' : 'DEG'));
  }

  /**
   * Chuyển đổi góc từ Độ sang Radian nếu cần.
   * Được dùng nội bộ bởi tất cả hàm lượng giác.
   *
   * @param deg - Giá trị góc nhập vào (có thể là độ hoặc radian tùy `angleUnit`).
   * @returns Giá trị radian tương ứng.
   */
  private toRad(deg: number): number {
    return this.angleUnit() === 'DEG' ? (deg * Math.PI) / 180 : deg;
  }

  /**
   * Chuyển đổi góc từ Radian sang Độ nếu cần.
   * Được dùng bởi các hàm lượng giác ngược (asin, acos, atan).
   *
   * @param rad - Giá trị radian tính được từ Math API.
   * @returns Giá trị góc theo đơn vị hiện tại (DEG hoặc RAD).
   */
  private fromRad(rad: number): number {
    return this.angleUnit() === 'DEG' ? (rad * 180) / Math.PI : rad;
  }

  /**
   * Tính giai thừa n! bằng vòng lặp (iterative).
   * Giới hạn n ≤ 170 để tránh tràn số (overflow) IEEE 754.
   *
   * @param n - Số nguyên không âm cần tính giai thừa (n ≥ 0, n ≤ 170).
   * @returns Giá trị n!.
   */
  private computeFactorial(n: number): number {
    let result = 1;
    // Bắt đầu từ 2 vì 0! = 1! = 1
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  /**
   * Thực thi hàm toán học khoa học theo tên hàm được truyền vào.
   * Đây là "Entry Point" duy nhất của Service — tránh lộ logic nội bộ ra ngoài.
   *
   * @param func - Tên hàm khoa học (ví dụ: 'sin', 'cos', 'log10', 'factorial').
   * @param inputValue - Giá trị số hiện tại trên màn hình.
   * @returns ScientificResult chứa label, value, và cờ isConstant.
   */
  public executeFunction(func: string, inputValue: number): ScientificResult {
    switch (func) {
      // ─── 1. LƯỢNG GIÁC CƠ BẢN ───────────────────────────────────────────────
      case 'sin':
        return { label: `sin(${inputValue})`, value: Math.sin(this.toRad(inputValue)) };

      case 'cos':
        return { label: `cos(${inputValue})`, value: Math.cos(this.toRad(inputValue)) };

      case 'tan': {
        // tan(90°) và tan(270°) → vô cực, không xác định về mặt toán học
        const isDeg = this.angleUnit() === 'DEG';
        const isUndefined = isDeg && Math.abs(inputValue % 180) === 90;
        return {
          label: `tan(${inputValue})`,
          value: isUndefined ? null : Math.tan(this.toRad(inputValue))
        };
      }

      // ─── 2. LƯỢNG GIÁC NGƯỢC (ARC) ──────────────────────────────────────────
      case 'asin':
        return {
          label: `sin⁻¹(${inputValue})`,
          // asin chỉ xác định với đối số trong [-1, 1]
          value: inputValue < -1 || inputValue > 1 ? null : this.fromRad(Math.asin(inputValue))
        };

      case 'acos':
        return {
          label: `cos⁻¹(${inputValue})`,
          // acos chỉ xác định với đối số trong [-1, 1]
          value: inputValue < -1 || inputValue > 1 ? null : this.fromRad(Math.acos(inputValue))
        };

      case 'atan':
        return { label: `tan⁻¹(${inputValue})`, value: this.fromRad(Math.atan(inputValue)) };

      // ─── 3. CĂN BẬC HAI & BA ────────────────────────────────────────────────
      case 'sqrt':
        return {
          label: `√(${inputValue})`,
          // Căn bậc hai chỉ xác định với số không âm trong tập số thực
          value: inputValue < 0 ? null : Math.sqrt(inputValue)
        };

      case 'cbrt':
        return { label: `∛(${inputValue})`, value: Math.cbrt(inputValue) };

      // ─── 4. LŨY THỪA & NGHỊCH ĐẢO ──────────────────────────────────────────
      case 'square':
        return { label: `sqr(${inputValue})`, value: inputValue * inputValue };

      case 'cube':
        return { label: `cube(${inputValue})`, value: inputValue * inputValue * inputValue };

      case 'reciprocal':
        return {
          label: `1/(${inputValue})`,
          // Nghịch đảo của 0 không tồn tại (chia cho 0)
          value: inputValue === 0 ? null : 1 / inputValue
        };

      // ─── 5. LOGARIT & MŨ ────────────────────────────────────────────────────
      case 'log10':
        return {
          label: `log(${inputValue})`,
          // log chỉ xác định với số dương
          value: inputValue <= 0 ? null : Math.log10(inputValue)
        };

      case 'ln':
        return {
          label: `ln(${inputValue})`,
          // ln chỉ xác định với số dương
          value: inputValue <= 0 ? null : Math.log(inputValue)
        };

      case 'pow10':
        return { label: `10^(${inputValue})`, value: Math.pow(10, inputValue) };

      case 'exp':
        return { label: `e^(${inputValue})`, value: Math.exp(inputValue) };

      // ─── 6. GIAI THỪA ───────────────────────────────────────────────────────
      case 'factorial':
        return {
          label: `${inputValue}!`,
          value:
            inputValue < 0 || !Number.isInteger(inputValue) || inputValue > 170
              ? null // Tràn số hoặc không hợp lệ
              : this.computeFactorial(inputValue)
        };

      // ─── 7. TRỊ TUYỆT ĐỐI ──────────────────────────────────────────────────
      case 'abs':
        return { label: `|${inputValue}|`, value: Math.abs(inputValue) };

      // ─── 8. HẰNG SỐ TOÁN HỌC ───────────────────────────────────────────────
      case 'pi':
        // π = 3.14159265358979...
        return { label: 'π', value: Math.PI, isConstant: true };

      case 'e':
        // e = 2.71828182845904...
        return { label: 'e', value: Math.E, isConstant: true };

      default:
        // Hàm không nhận dạng được → trả null để caller xử lý lỗi
        return { label: func, value: null };
    }
  }

  /**
   * Tạo một HistoryItem từ kết quả tính toán khoa học để lưu vào lịch sử chung.
   * Đặt tại đây vì ScientificService hiểu rõ nhất format của label khoa học.
   *
   * @param label     - Chuỗi biểu thức (ví dụ: "sin(30)").
   * @param result    - Chuỗi kết quả đã định dạng (ví dụ: "0.5").
   * @returns HistoryItem sẵn sàng để push vào mảng history Signal.
   */
  public buildHistoryItem(label: string, result: string): HistoryItem {
    return {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      expression: label,
      result,
      timestamp: new Date(),
      mode: 'casio580'
    };
  }
}
