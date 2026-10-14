import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  public readonly message = signal('');
  public readonly type = signal<'success' | 'error'>('success');

  private timeoutId: ReturnType<typeof setTimeout> | undefined;

  public show(message: string, type: 'success' | 'error' = 'success'): void {
    if (this.timeoutId !== undefined) {
      clearTimeout(this.timeoutId);
    }

    this.message.set(message);
    this.type.set(type);
    this.timeoutId = setTimeout(() => {
      this.message.set('');
      this.timeoutId = undefined;
    }, 2500);
  }
}