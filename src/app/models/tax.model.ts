/** Chi tiết một bậc trong biểu thuế lũy tiến từng phần. */
export interface TaxBracketDetail {
  bracket: number;
  taxableAmount: number;
  rate: number;
  tax: number;
}

/** Kết quả tính thuế Thu nhập Cá nhân chi tiết. */
export interface TaxCalculationResult {
  grossIncome: number;
  selfDeduction: number;
  dependentDeduction: number;
  insuranceDeduction: number;
  totalDeductions: number;
  taxableIncome: number;
  totalTax: number;
  netIncome: number;
  brackets: TaxBracketDetail[];
}