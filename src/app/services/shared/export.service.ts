import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HistoryItem } from '../../models/history.model';

/**
 * =========================================================================================
 * DỊCH VỤ CHUYÊN TRÁCH: XUẤT DỮ LIỆU FILE CSV PHÍA TRÌNH DUYỆT (EXPORT SERVICE)
 * FILE: src/app/services/shared/export.service.ts
 * =========================================================================================
 *
 * 🎓 GIẢI TRÌNH HỌC THUẬT PHỤC VỤ BẢO VỆ ĐỒ ÁN TRƯỚC HỘI ĐỒNG:
 *
 * 1. NGUYÊN LÝ ĐƠN TRÁCH NHIỆM (SINGLE RESPONSIBILITY PRINCIPLE - SRP):
 *    - ExportService chỉ chuyên trách một việc: xuất dữ liệu lịch sử tính toán
 *      ra định dạng CSV tải về phía trình duyệt, không cần Backend.
 *
 * 2. KỸ THUẬT TẠO FILE TẢI VỀ TẠI TRÌNH DUYỆT (CLIENT-SIDE FILE DOWNLOAD):
 *    - Dùng `Blob` API để tạo đối tượng nhị phân trong bộ nhớ từ chuỗi CSV.
 *    - Dùng `URL.createObjectURL(blob)` để tạo URL tạm thời trỏ vào Blob.
 *    - Tạo thẻ <a> ảo, gán href và download attribute, rồi kích hoạt click() → file tải về.
 *    - Gọi `URL.revokeObjectURL()` ngay sau đó để giải phóng bộ nhớ, tránh memory leak.
 *
 * 3. XỬ LÝ TIẾNG VIỆT TRONG CSV (UTF-8 BOM):
 *    - Ký tự `\uFEFF` (Byte Order Mark) được chèn làm byte đầu tiên của file.
 *    - Đây là dấu hiệu để Microsoft Excel nhận biết encoding là UTF-8 khi mở file CSV,
 *      ngăn lỗi font hiển thị tiếng Việt (encoding mismatch).
 *    - Nếu thiếu BOM, Excel đọc file bằng encoding ANSI mặc định → vỡ dấu tiếng Việt.
 *
 * 4. BẢO VỆ DỮ LIỆU CSV (CSV INJECTION PREVENTION):
 *    - Các ô chứa dấu phẩy hoặc nháy kép được bọc trong dấu nháy kép.
 *    - Nháy kép bên trong chuỗi được escape bằng cách nhân đôi (`"` → `""`).
 * =========================================================================================
 */

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Xuất danh sách lịch sử tính toán ra file CSV, tự động kích hoạt tải về.
   * Hàm chỉ thực thi khi đang chạy trên trình duyệt (isPlatformBrowser),
   * vì SSR (Server-Side Rendering) không có API `Blob`, `URL`, hay `document`.
   *
   * @param historyItems - Mảng các mục lịch sử tính toán cần xuất.
   * @param filename     - Tên file tải về (mặc định: có timestamp ngày hiện tại).
   */
  public exportHistoryToJSON(
    historyItems: HistoryItem[],
    filename = `OmniCalc_History_${new Date().toISOString().slice(0, 10)}.json`
  ): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (historyItems.length === 0) return;

    const blob = new Blob([JSON.stringify(historyItems, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  public exportHistoryToCSV(
    historyItems: HistoryItem[],
    filename = `OmniCalc_History_${new Date().toISOString().slice(0, 10)}.csv`
  ): void {
    // Bảo vệ: không thực thi trong môi trường SSR
    if (!isPlatformBrowser(this.platformId)) return;

    // Bảo vệ: không tạo file rỗng nếu không có dữ liệu
    if (historyItems.length === 0) return;

    // --- BƯỚC 1: Tạo nội dung CSV ---
    // Header row với tên cột tiếng Việt (phục vụ báo cáo đồ án)
    const headers = 'STT,Chế độ,Biểu thức,Kết quả,Nhãn,Ghi chú,Thời gian thực hiện\n';
    const escapeCell = (value: string): string => `"${value.replace(/"/g, '""')}"`;

    const rows = historyItems
      .map((item, index) => {
        const timeStr = item.timestamp.toLocaleString('vi-VN');
        const modeStr = item.mode ? item.mode.toUpperCase() : 'STANDARD';
        return [
          index + 1,
          escapeCell(modeStr),
          escapeCell(item.expression),
          escapeCell(item.result),
          escapeCell((item.tags ?? []).join('; ')),
          escapeCell(item.note ?? ''),
          escapeCell(timeStr)
        ].join(',');
      })
      .join('\n');

    // --- BƯỚC 2: Tạo Blob với BOM UTF-8 ---
    // '\uFEFF' = BOM (Byte Order Mark) giúp Excel nhận biết encoding UTF-8
    const csvContent = '\uFEFF' + headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // --- BƯỚC 3: Tạo Object URL tạm thời và kích hoạt tải về ---
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();

    // --- BƯỚC 4: Giải phóng bộ nhớ ngay sau khi download bắt đầu ---
    // Nếu không revoke, URL object sẽ tồn tại đến khi tab đóng → memory leak
    URL.revokeObjectURL(url);
  }
}
