import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalculatorService } from '../../services/calculator/calculator.service';
import { PersonalFormulaService } from '../../services/shared/personal-formula.service';
import { ToastService } from '../../services/shared/toast.service';
import { PersonalFormula } from '../../models/personal-formula.model';

@Component({
  selector: 'app-personal-formula-library',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './personal-formula-library.component.html',
  styleUrl: './personal-formula-library.component.scss'
})
export class PersonalFormulaLibraryComponent {
  public readonly formulaService = inject(PersonalFormulaService);
  private readonly calculatorService = inject(CalculatorService);
  private readonly toastService = inject(ToastService);

  public readonly isOpen = signal(false);
  public readonly selectedFormula = signal<PersonalFormula | null>(null);
  public readonly variableValues = signal<Record<string, string | number>>({});
  public readonly result = signal<string>('');
  public readonly errorMessage = signal('');

  public formulaName = '';
  public formulaExpression = '';
  public formulaVariables = '';

  public open(): void {
    this.isOpen.set(true);
  }

  public close(): void {
    this.isOpen.set(false);
  }

  public saveFormula(): void {
    try {
      const formula = this.formulaService.createFormula(
        this.formulaName,
        this.formulaExpression,
        this.formulaVariables
      );
      this.formulaName = '';
      this.formulaExpression = '';
      this.formulaVariables = '';
      this.selectFormula(formula);
      this.errorMessage.set('');
      this.toastService.show('Đã lưu công thức trên thiết bị này.');
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Không thể lưu công thức.');
    }
  }

  public selectFormula(formula: PersonalFormula): void {
    this.selectedFormula.set(formula);
    this.variableValues.set(Object.fromEntries(formula.variables.map((variable) => [variable, ''])));
    this.result.set('');
    this.errorMessage.set('');
  }

  public deleteFormula(event: Event, formulaId: string): void {
    event.stopPropagation();
    this.formulaService.deleteFormula(formulaId);
    if (this.selectedFormula()?.id === formulaId) {
      this.selectedFormula.set(null);
      this.result.set('');
    }
    this.toastService.show('Đã xóa công thức.');
  }

  public toggleFavorite(event: Event, formulaId: string): void {
    event.stopPropagation();
    this.formulaService.toggleFavorite(formulaId);
    const formula = this.formulaService.formulas().find((item) => item.id === formulaId);
    this.toastService.show(formula?.favorite ? 'Đã ghim công thức.' : 'Đã bỏ ghim công thức.');
  }

  public calculate(): void {
    const formula = this.selectedFormula();
    if (!formula) return;

    try {
      const rawValues = this.variableValues();
      for (const variable of formula.variables) {
        const rawValue = rawValues[variable];
        if (rawValue === undefined || String(rawValue).trim() === '') {
          throw new Error(`Vui lòng nhập giá trị cho biến ${variable}.`);
        }
      }
      const values = Object.fromEntries(
        formula.variables.map((variable) => [variable, Number(rawValues[variable])])
      );
      const value = this.formulaService.evaluateFormula(formula, values);
      const formatted = value.toString();
      const expression = `${formula.name} (${formula.variables.map((variable) => `${variable}=${values[variable]}`).join(', ')})`;

      this.result.set(formatted);
      this.errorMessage.set('');
      this.calculatorService.addToHistory({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        expression,
        result: formatted,
        timestamp: new Date(),
        mode: 'standard'
      });
      this.toastService.show('Đã tính và lưu kết quả vào lịch sử.');
    } catch (error) {
      this.result.set('');
      this.errorMessage.set(error instanceof Error ? error.message : 'Không thể tính công thức.');
    }
  }

  public applyResult(): void {
    const result = this.result();
    const formula = this.selectedFormula();
    if (!result || !formula) return;

    this.calculatorService.currentValue.set(result);
    this.calculatorService.expression.set(formula.name);
    this.calculatorService.hasCalculated.set(true);
    this.close();
  }
}