import { Routes } from '@angular/router';

/**
 * =========================================================================================
 * CẤU HÌNH ĐIỀU HƯỚNG ROUTING (ANGULAR STANDALONE LAZY-LOADED ROUTES)
 * FILE: src/app/app.routes.ts
 * =========================================================================================
 * 
 * 🎓 GIẢI TRÌNH HỌC THUẬT PHỤC VỤ BẢO VỆ ĐỒ ÁN TRƯỚC HỘI ĐỒNG:
 * 
 * 1. TÁCH TRANG ĐỘC LẬP (PAGE-BASED ARCHITECTURE):
 *    - Mỗi chuyên ngành tính toán được tách thành một trang chuyên biệt với URL tĩnh riêng:
 *      + /standard: Máy tính số học tiêu chuẩn
 *      + /casio580: Máy tính khoa học chuẩn học sinh/sinh viên Casio fx-580VN X
 *      + /tax: Động cơ tính thuế Thu nhập Cá nhân (TNCN) biểu lũy tiến 7 bậc
 *      + /financial: Nghiệp vụ kế toán (Thuế VAT, Lãi kép tiết kiệm)
 *      + /graph: Vẽ đồ thị hàm số 2D trên hệ trục Oxy
 * 
 * 2. KỸ THUẬT LAZY LOADING QUA LOADCOMPONENT:
 *    - Áp dụng `loadComponent: () => import(...)` giúp chia nhỏ gói mã nguồn (Route-level Code Splitting).
 *    - Người dùng chỉ tải mã nguồn của trang khi thực sự truy cập vào trang đó, tối ưu hóa
 *      thời gian tải trang đầu tiên (First Contentful Paint - FCP) và tiết kiệm tài nguyên mạng.
 * =========================================================================================
 */

export const routes: Routes = [
  { 
    path: '', 
    redirectTo: 'standard', 
    pathMatch: 'full' 
  },
  { 
    path: 'standard', 
    loadComponent: () => import('./pages/standard/standard.component').then(m => m.StandardComponent),
    title: 'OmniCalc - Máy Tính Tiêu Chuẩn'
  },
  { 
    path: 'casio580', 
    loadComponent: () => import('./pages/casio580/casio580.component').then(m => m.Casio580Component),
    title: 'OmniCalc - Casio fx-580VN X'
  },
  { 
    path: 'tax', 
    loadComponent: () => import('./pages/tax/tax.component').then(m => m.TaxComponent),
    title: 'OmniCalc - Thuế Thu Nhập Cá Nhân'
  },
  { 
    path: 'financial', 
    loadComponent: () => import('./pages/financial/financial.component').then(m => m.FinancialComponent),
    title: 'OmniCalc - Kế Toán & Tài Chính'
  },
  { 
    path: 'graph', 
    loadComponent: () => import('./pages/graph/graph.component').then(m => m.GraphComponent),
    title: 'OmniCalc - Đồ Thị Hàm Số 2D'
  },
  { 
    path: '**', 
    redirectTo: 'standard' 
  }
];
