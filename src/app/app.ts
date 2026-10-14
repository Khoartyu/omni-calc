import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from './services/shared/theme.service';
import { ToastService } from './services/shared/toast.service';

/**
 * =========================================================================================
 * DỰ ÁN: OMNICALC PRO SUITE - ĐA TRANG CHUYÊN NGÀNH (PAGE-BASED ROUTING)
 * FILE: src/app/app.ts
 * ROOT COMPONENT: KHUNG SHELL TÍCH HỢP ĐIỀU HƯỚNG ROUTING
 * =========================================================================================
 */

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  public readonly appTitle = 'OmniCalc - Máy tính cá nhân online';
  public readonly toastService = inject(ToastService);
  public readonly themeService = inject(ThemeService);

  /**
   * Tín hiệu quản lý trạng thái ẩn/hiện Modal Thông số Kỹ thuật & Báo cáo Đồ án.
   */
  public readonly isDocModalOpen = signal<boolean>(false);

  public openDocModal(): void {
    this.isDocModalOpen.set(true);
  }

  public closeDocModal(): void {
    this.isDocModalOpen.set(false);
  }

  public toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
