import { Injectable } from '@angular/core';

/**
 * =========================================================================================
 * DỊCH VỤ CHUYÊN TRÁCH: NGHIỆP VỤ KẾ TOÁN & TÀI CHÍNH (FINANCIAL SERVICE)
 * FILE: src/app/services/financial/financial.service.ts
 * =========================================================================================
 *
 * 🎓 GIẢI TRÌNH HỌC THUẬT PHỤC VỤ BẢO VỆ ĐỒ ÁN TRƯỚC HỘI ĐỒNG:
 *
 * 1. NGUYÊN LÝ ĐƠN TRÁCH NHIỆM (SINGLE RESPONSIBILITY PRINCIPLE - SRP):
 *    - FinancialService chỉ chuyên trách hai nghiệp vụ tài chính cốt lõi:
 *      + Tính thuế Giá Trị Gia Tăng (VAT).
 *      + Tính lãi kép theo công thức lũy thừa toán học (Compound Interest).
 *    - Không phụ thuộc vào Angular UI hay trạng thái Signals nào.
 *      Đây là "Pure Computation Service" - hàm xác định (deterministic function).
 *
 * 2. KHẮC PHỤC SAI SỐ IEEE 754 (FLOATING POINT PRECISION FIX):
 *    - JavaScript lưu số thực theo chuẩn IEEE 754 Double Precision 64-bit.
 *    - Phép nhân số thực có thể sinh ra sai số tích lũy (ví dụ: 0.1 + 0.2 = 0.30000000000000004).
 *    - Giải pháp: Dùng `parseFloat(value.toPrecision(12))` để làm tròn về 12 chữ số
 *      có nghĩa, loại bỏ phần sai số rác cuối (epsilon noise) mà không làm tròn sai.
 *
 * 3. CÔNG THỨC LÃI KÉP (COMPOUND INTEREST FORMULA):
 *    - A = P × (1 + r/n)^(n×t)
 *    - Trong đó:
 *      + P (Principal): Vốn gốc ban đầu.
 *      + r (Rate): Lãi suất năm dạng thập phân (ví dụ: 6.5% → 0.065).
 *      + n (Frequency): Số kỳ tính lãi trong 1 năm (mặc định 12 = hàng tháng).
 *      + t (Time): Số năm gửi tiết kiệm.
 * =========================================================================================
 */

@Injectable({
  providedIn: 'root'
})
export class FinancialService {
  /**
   * Khắc phục sai số thực IEEE 754 bằng cách làm tròn về 12 chữ số có nghĩa.
   * Phương pháp này đủ chính xác cho tất cả nghiệp vụ tài chính thông thường.
   *
   * @param value - Giá trị số thực cần làm sạch sai số.
   * @returns Số thực đã được làm tròn về 12 chữ số có nghĩa.
   */
  private fixFloatPrecision(value: number): number {
    return parseFloat(value.toPrecision(12));
  }

  /**
   * Tính thuế Giá Trị Gia Tăng (VAT) từ giá chưa thuế.
   *
   * @param baseAmount     - Giá trị hàng hóa/dịch vụ chưa bao gồm VAT (đơn vị: đồng).
   * @param vatRatePercent - Thuế suất VAT dạng phần trăm (ví dụ: 10 → 10%).
   *                        Các mức phổ biến tại Việt Nam: 5%, 8%, 10%.
   * @returns Đối tượng gồm tiền thuế VAT và tổng tiền đã bao gồm VAT.
   */
  public calculateVat(
    baseAmount: number,
    vatRatePercent: number
  ): { vatAmount: number; totalWithVat: number } {
    const vatAmount    = this.fixFloatPrecision(baseAmount * (vatRatePercent / 100));
    const totalWithVat = this.fixFloatPrecision(baseAmount + vatAmount);
    return { vatAmount, totalWithVat };
  }

  /**
   * Tính lãi kép theo công thức A = P × (1 + r/n)^(n×t).
   *
   * @param principal        - Vốn gốc ban đầu P (đồng).
   * @param annualRatePercent - Lãi suất năm (%), ví dụ 6.5 cho mức 6.5%/năm.
   * @param years            - Thời gian gửi t (năm).
   * @param compoundFreq     - Số kỳ tính lãi trong 1 năm n (mặc định: 12 = hàng tháng).
   * @returns FinancialCalculationResult - Giá trị tương lai và tiền lãi tích lũy.
   */
  public calculateCompoundInterest(
    principal: number,
    annualRatePercent: number,
    years: number,
    compoundFreq = 12
  ): { futureValue: number; totalInterest: number } {
    const r = annualRatePercent / 100; // Chuyển % sang thập phân
    const n = compoundFreq;
    const t = years;

    // Áp dụng công thức lãi kép: A = P(1 + r/n)^(nt)
    const futureValue   = principal * Math.pow(1 + r / n, n * t);
    const totalInterest = futureValue - principal;

    return {
      // Làm tròn đến đơn vị đồng vì tiền không tính phần thập phân
      futureValue:   Math.round(futureValue),
      totalInterest: Math.round(totalInterest)
    };
  }
}
