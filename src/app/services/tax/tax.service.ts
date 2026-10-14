import { Injectable } from '@angular/core';
import { TaxCalculationResult, TaxBracketDetail } from '../../models/tax.model';

/**
 * =========================================================================================
 * DỊCH VỤ CHUYÊN TRÁCH: ĐỘNG CƠ TÍNH THUẾ THU NHẬP CÁ NHÂN (TAX SERVICE)
 * FILE: src/app/services/tax/tax.service.ts
 * =========================================================================================
 *
 * 🎓 GIẢI TRÌNH HỌC THUẬT PHỤC VỤ BẢO VỆ ĐỒ ÁN TRƯỚC HỘI ĐỒNG:
 *
 * 1. NGUYÊN LÝ ĐƠN TRÁCH NHIỆM (SINGLE RESPONSIBILITY PRINCIPLE - SRP):
 *    - TaxService chỉ chịu trách nhiệm duy nhất: tính toán thuế thu nhập cá nhân (TNCN)
 *      theo quy định Luật Thuế Việt Nam hiện hành.
 *    - Không phụ thuộc vào Angular Signals hay bất kỳ trạng thái UI nào.
 *      Đây là một "Pure Computation Service" - chỉ nhận đầu vào, trả đầu ra xác định.
 *
 * 2. THUẬT TOÁN BIỂU LŨY TIẾN TỪNG PHẦN (PROGRESSIVE TAX BRACKET ALGORITHM):
 *    - Áp dụng phương pháp "Bracket Iteration" thay vì dùng công thức rút gọn bậc thang.
 *    - Lý do: Cách lặp qua từng bậc giúp trả về chi tiết từng bậc (TaxBracketDetail[]),
 *      giúp người dùng kiểm tra được mức thuế từng phần một cách minh bạch.
 *
 * 3. CĂN CỨ PHÁP LÝ:
 *    - Mức giảm trừ gia cảnh bản thân: 11.000.000 đ/tháng
 *      (Nghị quyết 954/2020/UBTVQH14).
 *    - Mức giảm trừ người phụ thuộc: 4.400.000 đ/người/tháng.
 *    - 7 bậc thuế lũy tiến: 5%, 10%, 15%, 20%, 25%, 30%, 35%.
 * =========================================================================================
 */

@Injectable({
  providedIn: 'root'
})
export class TaxService {
  /** Mức giảm trừ gia cảnh bản thân theo Nghị quyết 954/2020/UBTVQH14 (đơn vị: đồng/tháng). */
  private readonly SELF_DEDUCTION = 11_000_000;

  /** Mức giảm trừ người phụ thuộc (đơn vị: đồng/người/tháng). */
  private readonly DEPENDENT_DEDUCTION_PER_PERSON = 4_400_000;

  /**
   * Bảng định nghĩa 7 bậc thuế lũy tiến từng phần theo Điều 22 Luật Thuế TNCN.
   * Mỗi phần tử chứa: giới hạn trên của bậc (limit) và thuế suất (rate).
   * - Bậc 7 có limit = Infinity, nghĩa là áp dụng cho toàn bộ thu nhập còn lại.
   */
  private readonly TAX_BRACKETS = [
    { bracket: 1, limit: 5_000_000,  rate: 0.05 },
    { bracket: 2, limit: 10_000_000, rate: 0.10 },
    { bracket: 3, limit: 18_000_000, rate: 0.15 },
    { bracket: 4, limit: 32_000_000, rate: 0.20 },
    { bracket: 5, limit: 52_000_000, rate: 0.25 },
    { bracket: 6, limit: 80_000_000, rate: 0.30 },
    { bracket: 7, limit: Infinity,   rate: 0.35 }
  ] as const;

  /**
   * Tính toán thuế thu nhập cá nhân theo biểu lũy tiến từng phần.
   *
   * @param grossIncome        - Thu nhập gộp trước thuế (đồng/tháng).
   * @param dependents         - Số người phụ thuộc được đăng ký giảm trừ.
   * @param insuranceDeduction - Khoản bảo hiểm bắt buộc đã đóng (BHXH, BHYT, BHTN).
   * @returns TaxCalculationResult - Đối tượng kết quả đầy đủ gồm chi tiết từng bậc.
   */
  public calculatePersonalIncomeTax(
    grossIncome: number,
    dependents: number,
    insuranceDeduction: number
  ): TaxCalculationResult {
    // --- BƯỚC 1: Tính tổng các khoản giảm trừ ---
    const totalDependentDeduction = Math.max(0, dependents) * this.DEPENDENT_DEDUCTION_PER_PERSON;
    const totalDeductions = this.SELF_DEDUCTION + totalDependentDeduction + Math.max(0, insuranceDeduction);

    // --- BƯỚC 2: Thu nhập tính thuế (TNTT) = Thu nhập gộp - Tổng giảm trừ ---
    // Nếu kết quả âm (thu nhập thấp hơn mức giảm trừ) thì coi TNTT = 0, không hoàn thuế.
    const taxableIncome = Math.max(0, grossIncome - totalDeductions);

    // --- BƯỚC 3: Vòng lặp tính thuế theo từng bậc lũy tiến ---
    let remainingTaxable = taxableIncome;
    let prevLimit = 0;
    let totalTax = 0;
    const bracketsDetail: TaxBracketDetail[] = [];

    for (const b of this.TAX_BRACKETS) {
      // Khoảng chịu thuế của bậc hiện tại: từ prevLimit đến b.limit
      const bracketRange = b.limit === Infinity ? Infinity : b.limit - prevLimit;
      // Phần thu nhập thực sự rơi vào bậc này
      const amountInBracket = Math.min(Math.max(0, remainingTaxable), bracketRange);
      const taxInBracket = amountInBracket * b.rate;

      bracketsDetail.push({
        bracket: b.bracket,
        taxableAmount: amountInBracket,
        rate: b.rate * 100, // Chuyển về dạng % cho hiển thị
        tax: taxInBracket
      });

      totalTax += taxInBracket;
      remainingTaxable -= amountInBracket;
      prevLimit = b.limit === Infinity ? 0 : b.limit;

      // Tối ưu: dừng sớm khi không còn thu nhập chịu thuế
      if (remainingTaxable <= 0) break;
    }

    // --- BƯỚC 4: Thu nhập thực nhận (Net) ---
    // Net = Gross - Thuế TNCN - Bảo hiểm đã đóng
    const netIncome = grossIncome - totalTax - Math.max(0, insuranceDeduction);

    return {
      grossIncome,
      selfDeduction: this.SELF_DEDUCTION,
      dependentDeduction: totalDependentDeduction,
      insuranceDeduction,
      totalDeductions,
      taxableIncome,
      totalTax,
      netIncome,
      brackets: bracketsDetail
    };
  }
}
