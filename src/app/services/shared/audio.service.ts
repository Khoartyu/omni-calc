import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * =========================================================================================
 * DỊCH VỤ CHUYÊN TRÁCH: BỘ TỔNG HỢP ÂM THANH (AUDIO SERVICE)
 * FILE: src/app/services/shared/audio.service.ts
 * =========================================================================================
 * 
 * 🎓 GIẢI TRÌNH HỌC THUẬT PHỤC VỤ BẢO VỆ ĐỒ ÁN TRƯỚC HỘI ĐỒNG:
 * 
 * 1. NGUYÊN LÝ ĐƠN TRÁCH NHIỆM (SINGLE RESPONSIBILITY PRINCIPLE - SRP):
 *    - Tách riêng toàn bộ logic điều khiển âm thanh ra khỏi CalculatorService.
 *    - AudioService chỉ chuyên trách khởi tạo, điều khiển và giải phóng các tài nguyên
 *      âm thanh tần số thấp của Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`).
 * 
 * 2. TỔNG HỢP ÂM THANH KHÔNG DÙNG FILE NGOÀI (ZERO ASSET DEPENDENCY):
 *    - Tạo sóng âm thanh trực tiếp từ mã nguồn trình duyệt, không cần tải file .mp3,
 *      triệt tiêu độ trễ mạng (0ms latency) và phù hợp hoàn hảo với kiến trúc Web tĩnh.
 * =========================================================================================
 */

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private readonly STORAGE_KEY = 'omnicalc_sound_setting';
  private readonly platformId = inject(PLATFORM_ID);

  private audioCtx: AudioContext | null = null;

  /**
   * Tín hiệu quản lý trạng thái bật/tắt âm thanh phím bấm.
   */
  public readonly isSoundEnabled = signal<boolean>(true);

  constructor() {
    this.loadSoundSetting();

    // Tự động lưu trạng thái âm thanh vào LocalStorage
    effect(() => {
      const soundState = this.isSoundEnabled();
      if (isPlatformBrowser(this.platformId)) {
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(soundState));
        } catch (e) {
          console.error('[AudioService] Lỗi lưu trạng thái âm thanh:', e);
        }
      }
    });
  }

  private loadSoundSetting(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored !== null) {
        this.isSoundEnabled.set(JSON.parse(stored));
      }
    } catch {
      this.isSoundEnabled.set(true);
    }
  }

  /**
   * Đảo trạng thái bật/tắt âm thanh.
   */
  public toggleSound(): void {
    this.isSoundEnabled.update((s) => !s);
    if (this.isSoundEnabled()) {
      this.playKeySound('equals');
    }
  }

  /**
   * Phát âm thanh tần số thấp qua Web Audio API.
   * 
   * @param type - Loại âm thanh: 'click' (phím số), 'operator' (toán tử), 'equals' (kết quả), 'error' (lỗi).
   */
  public playKeySound(type: 'click' | 'operator' | 'equals' | 'error' = 'click'): void {
    if (!this.isSoundEnabled() || !isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;

      if (type === 'click') {
        // Âm click cơ học nhẹ nhàng
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'operator') {
        // Âm phím toán tử trầm ấm
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'equals') {
        // Âm hoàn thành phép tính Casio cao độ
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1040, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'error') {
        // Âm báo lỗi
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch {
      // Bỏ qua nếu trình duyệt chặn audio policy
    }
  }
}
