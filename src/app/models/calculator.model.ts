/** Các chế độ hoạt động chuyên ngành của OmniCalc. */
export type CalculatorMode =
  | 'standard'
  | 'casio580'
  | 'financial'
  | 'tax'
  | 'graph';

/** Kiểu dữ liệu toán tử số học cơ bản. */
export type CalculatorOperator = '+' | '-' | '×' | '÷' | '*' | '/';