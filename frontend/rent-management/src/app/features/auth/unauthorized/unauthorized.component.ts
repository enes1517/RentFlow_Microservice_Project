import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="unauth-page">
      <div class="orb orb-red"></div>
      <div class="orb orb-purple"></div>
      <div class="grid-lines"></div>

      <div class="content animate-scaleIn">
        <div class="security-badge">
          <span class="badge-dot"></span>
          <span>403 • Yetki Kısıtlaması</span>
        </div>

        <div class="icon-wrap">
          <div class="icon-glow"></div>
          <span class="icon-symbol">🛡️</span>
        </div>

        <h1 class="unauth-title">Erişim Reddedildi</h1>
        <p class="unauth-desc">
          Bu sayfayı veya operasyonel paneli görüntülemek için gerekli rol veya güvenlik izinlerine sahip değilsiniz.
        </p>

        <div class="help-box">
          <div class="help-item">
            <span>🔹</span> <span>Farklı bir yetkili hesapla giriş yapmayı deneyin</span>
          </div>
          <div class="help-item">
            <span>🔹</span> <span>Sistem yöneticinizden rol ataması talep edin</span>
          </div>
        </div>

        <a routerLink="/auth/login" class="btn btn--primary btn--lg" id="back-to-login-btn">
          <span>🔑</span> Giriş Sayfasına Dön
        </a>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #07090e;
      color: #f1f5f9;
      font-family: var(--font-sans);
    }

    .unauth-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      position: relative;
      overflow: hidden;
      padding: 24px;
    }

    .grid-lines {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 48px 48px;
      pointer-events: none;
    }

    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(90px);
      pointer-events: none;
    }

    .orb-red {
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(239, 68, 68, 0.18) 0%, transparent 70%);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .orb-purple {
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%);
      bottom: 10%;
      right: 15%;
    }

    .content {
      position: relative;
      text-align: center;
      padding: 48px 40px;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(28px);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 24px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .security-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      margin-bottom: 24px;

      .badge-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #ef4444;
        box-shadow: 0 0 8px #ef4444;
      }
    }

    .icon-wrap {
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto 20px auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-glow {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, transparent 70%);
      filter: blur(14px);
    }

    .icon-symbol {
      position: relative;
      font-size: 3.5rem;
      z-index: 1;
    }

    .unauth-title {
      font-size: 1.875rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #ffffff;
      margin: 0 0 10px 0;
    }

    .unauth-desc {
      font-size: 0.9375rem;
      color: #94a3b8;
      line-height: 1.5;
      margin: 0 0 24px 0;
    }

    .help-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 14px 18px;
      margin-bottom: 28px;
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .help-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.8125rem;
      color: #cbd5e1;
    }

    #back-to-login-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 24px;
      font-size: 0.9375rem;
      font-weight: 700;
      border-radius: 12px;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 30px rgba(99, 102, 241, 0.55);
      }
    }

    @keyframes scaleIn {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .animate-scaleIn { animation: scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
  `]
})
export class UnauthorizedComponent {}
