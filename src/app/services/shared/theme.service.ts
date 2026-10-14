import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'omnicalc_theme_mode';

  public readonly isDarkMode = signal<boolean>(true);

  constructor() {
    if (isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined') {
      const savedMode = localStorage.getItem(this.storageKey);
      this.isDarkMode.set(savedMode ? savedMode === 'dark' : true);
    }

    effect(() => {
      if (!isPlatformBrowser(this.platformId) || typeof document === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }

      const isDark = this.isDarkMode();
      const root = document.body;
      root.classList.toggle('theme-dark', isDark);
      root.classList.toggle('theme-light', !isDark);
      localStorage.setItem(this.storageKey, isDark ? 'dark' : 'light');
    });
  }

  public toggleTheme(): void {
    this.isDarkMode.update((value) => !value);
  }
}
