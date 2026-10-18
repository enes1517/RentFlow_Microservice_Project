import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="not-found-page">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="grid-lines"></div>

      <div class="empty-state not-found-card animate-scaleIn">
        <div class="glitch-404">
          <span class="number-glow">404</span>
          <div class="empty-state__icon text-danger number-main">404</div>
        </div>

        <div class="status-tag">
          <span class="tag-dot"></span>
          <span>SAYFA BULUNAMADI</span>
        </div>

        <h3 class="not-found-title">Kayıp Koordinat</h3>
        <p class="not-found-desc">
          Talep ettiğiniz sayfa adresi mevcut değil, taşınmış veya erişim yetkisi kaldırılmış olabilir.
        </p>

        <a routerLink="/" class="btn btn--primary btn--lg mt-4 back-home-btn">
          <span>🏠</span>
          <span>Ana Sayfaya Dön</span>
          <span class="arrow">→</span>
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

    .not-found-page {
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

    .orb-1 {
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, transparent 70%);
      top: 30%;
      left: 20%;
    }

    .orb-2 {
      width: 450px;
      height: 450px;
      background: radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, transparent 70%);
      bottom: 20%;
      right: 25%;
    }

    .not-found-card {
      position: relative;
      text-align: center;
      padding: 56px 44px;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(28px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .glitch-404 {
      position: relative;
      display: inline-block;
      margin-bottom: 12px;
    }

    .number-glow {
      position: absolute;
      inset: 0;
      font-size: 6rem;
      font-weight: 900;
      color: rgba(99, 102, 241, 0.4);
      filter: blur(20px);
      user-select: none;
    }

    .number-main {
      position: relative;
      font-size: 6rem;
      font-weight: 900;
      line-height: 1;
      letter-spacing: -0.05em;
      background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #6366f1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .status-tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 14px;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #f87171;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      margin-bottom: 16px;

      .tag-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #ef4444;
        box-shadow: 0 0 8px #ef4444;
      }
    }

    .not-found-title {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #ffffff;
      margin: 0 0 10px 0;
    }

    .not-found-desc {
      font-size: 0.9375rem;
      color: #94a3b8;
      line-height: 1.55;
      margin: 0 0 24px 0;
    }

    .back-home-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
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
        box-shadow: 0 12px 30px rgba(99, 102, 241, 0.6);
        .arrow { transform: translateX(4px); }
      }

      .arrow { transition: transform 0.2s ease; }
    }

    @keyframes scaleIn {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .animate-scaleIn { animation: scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
  `]
})
export class NotFoundComponent {}
