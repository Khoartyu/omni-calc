import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { all, create } from 'mathjs';
import type { FunctionNode, MathNode, OperatorNode, SymbolNode } from 'mathjs';
import { PersonalFormula } from '../../models/personal-formula.model';

const math = create(all);
const allowedFunctions = new Set(['abs', 'ceil', 'cos', 'exp', 'floor', 'log', 'log10', 'max', 'min', 'pow', 'round', 'sin', 'sqrt', 'tan']);
const allowedOperators = new Set(['+', '-', '*', '/', '^', '%']);
const reservedSymbols = new Set(['e', 'pi', ...allowedFunctions]);

@Injectable({ providedIn: 'root' })
export class PersonalFormulaService {
  private readonly storageKey = 'omnicalc_personal_formulas';
  private readonly platformId = inject(PLATFORM_ID);

  public readonly formulas = signal<PersonalFormula[]>([]);

  constructor() {
    this.loadFormulas();

    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.formulas()));
      } catch (error) {
        console.error('[OmniCalc] Không thể lưu công thức cá nhân:', error);
      }
    });
  }

  public createFormula(name: string, expression: string, variablesText: string): PersonalFormula {
    const cleanName = name.trim();
    const cleanExpression = expression.trim();
    const variables = variablesText.split(',').map((variable) => variable.trim()).filter(Boolean);

    if (!cleanName || !cleanExpression) {
      throw new Error('Vui lòng nhập tên và biểu thức công thức.');
    }
    if (variables.some((variable) => !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(variable) || reservedSymbols.has(variable))) {
      throw new Error('Tên biến phải bắt đầu bằng chữ và không trùng tên hàm/toán tử.');
    }
    if (new Set(variables).size !== variables.length) {
      throw new Error('Danh sách biến không được trùng nhau.');
    }

    this.parseAndValidate(cleanExpression, variables);

    const formula: PersonalFormula = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: cleanName,
      expression: cleanExpression,
      variables,
      favorite: false,
      updatedAt: new Date()
    };
    this.formulas.update((current) => [formula, ...current]);
    return formula;
  }

  public deleteFormula(id: string): void {
    this.formulas.update((current) => current.filter((formula) => formula.id !== id));
  }

  public toggleFavorite(formulaId: string): void {
    this.formulas.update((current) => current.map((formula) =>
      formula.id === formulaId ? { ...formula, favorite: !formula.favorite } : formula
    ));
  }

  public evaluateFormula(formula: PersonalFormula, values: Record<string, number>): number {
    for (const variable of formula.variables) {
      if (!Number.isFinite(values[variable])) {
        throw new Error(`Vui lòng nhập giá trị hợp lệ cho biến ${variable}.`);
      }
    }

    const expression = this.parseAndValidate(formula.expression, formula.variables);
    const result: unknown = expression.compile().evaluate(values);
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      throw new Error('Công thức không trả về một số hữu hạn.');
    }
    return Number(result.toPrecision(12));
  }

  private loadFormulas(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as PersonalFormula[];
      this.formulas.set(parsed.map((formula) => ({
        ...formula,
        updatedAt: new Date(formula.updatedAt)
      })));
    } catch (error) {
      console.error('[OmniCalc] Không thể nạp công thức cá nhân:', error);
      this.formulas.set([]);
    }
  }

  private parseAndValidate(expression: string, variables: string[]): MathNode {
    let root: MathNode;
    try {
      root = math.parse(expression);
    } catch {
      throw new Error('Biểu thức không hợp lệ.');
    }

    const allowedVariables = new Set(variables);
    this.validateNode(root, allowedVariables);
    return root;
  }

  private validateNode(node: MathNode, variables: Set<string>): void {
    if (node.type === 'ConstantNode') {
      const value = (node as MathNode & { value: unknown }).value;
      if (typeof value !== 'number') throw new Error('Chỉ hỗ trợ hằng số dạng số.');
      return;
    }

    if (node.type === 'SymbolNode') {
      const name = (node as SymbolNode).name;
      if (!variables.has(name) && name !== 'pi' && name !== 'e' && !allowedFunctions.has(name)) {
        throw new Error(`Biến "${name}" chưa được khai báo.`);
      }
      return;
    }

    if (node.type === 'OperatorNode') {
      const operatorNode = node as OperatorNode;
      if (!allowedOperators.has(operatorNode.op)) {
        throw new Error('Công thức chứa toán tử chưa được hỗ trợ.');
      }
      operatorNode.args.forEach((argument) => this.validateNode(argument, variables));
      return;
    }

    if (node.type === 'FunctionNode') {
      const functionNode = node as FunctionNode;
      if (functionNode.fn.type !== 'SymbolNode' || !allowedFunctions.has((functionNode.fn as SymbolNode).name)) {
        throw new Error('Hàm này chưa được hỗ trợ.');
      }
      functionNode.args.forEach((argument) => this.validateNode(argument, variables));
      return;
    }

    if (node.type === 'ParenthesisNode') {
      this.validateNode((node as MathNode & { content: MathNode }).content, variables);
      return;
    }

    throw new Error('Biểu thức chứa cú pháp chưa được hỗ trợ.');
  }
}