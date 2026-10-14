/** Kết quả tính toán nghiệp vụ Kế toán & Tài chính. */
export interface FinancialCalculationResult {
  vatBaseAmount: number;
  vatRate: number;
  vatAmount: number;
  vatTotalAmount: number;
  principal: number;
  annualRate: number;
  years: number;
  futureValue: number;
  totalInterest: number;
}