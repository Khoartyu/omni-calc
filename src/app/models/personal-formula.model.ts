export interface PersonalFormula {
  id: string;
  name: string;
  expression: string;
  variables: string[];
  favorite?: boolean;
  updatedAt: Date;
}