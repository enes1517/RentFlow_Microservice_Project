import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OAuthService } from 'angular-oauth2-oidc';
import { AuthSessionService } from '../../../core/services/auth-session.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Arkaplan Işık & Grid Efektleri -->
    <div class="login-bg" aria-hidden="true">
      <div class="ambient-glow glow-1"></div>
      <div class="ambient-glow glow-2"></div>
      <div class="ambient-glow glow-3"></div>
      <div class="ambient-glow glow-4"></div>
      <div class="cyber-grid"></div>
      <div class="vignette-overlay"></div>
    </div>

    <!-- 1. Doğrulama / Yönlendirme Ekranı -->
    <div class="verifying-container" *ngIf="isVerifyingSession && !errorMessage; else loginLayout">
      <div class="verifying-card">
        <div class="brand__logo pulse-glow">
          <span class="brand__icon">🏠</span>
        </div>
        <div class="verifying-spinner"></div>
        <h2 class="verifying-title">Oturum Doğrulanıyor</h2>
        <p class="verifying-subtitle">Keycloak üzerinden güvenli kimlik doğrulaması yapılıyor, lütfen bekleyin...</p>
        <div class="security-chip mt-4">
          <span class="ping-dot"></span>
          <span>Keycloak OIDC Güvenli Oturum</span>
        </div>
      </div>
    </div>

    <!-- 2. Ana Giriş Arayüzü -->
    <ng-template #loginLayout>
      <div class="page-wrapper">
        <div class="login-container">

          <!-- SOL PANEL — Marka, İstatistikler & Mimari Vitrin -->
          <aside class="login-panel login-panel--brand">
            <!-- Üst Platform Rozeti -->
            <div class="brand-top-pill">
              <span class="ping-beacon">
                <span class="ping-beacon__ring"></span>
                <span class="ping-beacon__dot"></span>
              </span>
              <span>Enterprise Cloud Platform • v2.4</span>
              <span class="pill-divider">•</span>
              <span class="status-active">10/10 Servis Aktif</span>
            </div>

            <!-- Marka Başlığı -->
            <div class="brand-hero">
              <div class="brand-hero__top">
                <div class="brand__logo">
                  <span class="brand__icon">🏠</span>
                  <div class="logo-reflection"></div>
                </div>
                <div>
                  <h1 class="brand__name">RentFlow</h1>
                  <span class="brand__badge">PRO</span>
                </div>
              </div>
              <p class="brand__tagline">
                Yeni Nesil Dağıtık Akıllı Kira & Gayrimenkul Yönetim Ekosistemi
              </p>
            </div>

            <!-- Mimari İstatistik Sayacı -->
            <div class="stats-ribbon">
              <div class="stat-box">
                <span class="stat-box__val">10</span>
                <span class="stat-box__lbl">Mikroservis</span>
              </div>
              <div class="stat-box">
                <span class="stat-box__val">EDA</span>
                <span class="stat-box__lbl">Event-Driven</span>
              </div>
              <div class="stat-box">
                <span class="stat-box__val">&lt;5ms</span>
                <span class="stat-box__lbl">Redis Önbellek</span>
              </div>
              <div class="stat-box">
                <span class="stat-box__val">SAGA</span>
                <span class="stat-box__lbl">MassTransit</span>
              </div>
            </div>

            <!-- Temel Özellik Kartları -->
            <div class="features-list">
              <div
                class="feature-card"
                *ngFor="let f of features; let i = index"
                [style.animation-delay]="i * 80 + 'ms'">
                <div class="feature-card__icon-wrap">
                  <span class="feature-card__icon">{{ f.icon }}</span>
                </div>
                <div class="feature-card__content">
                  <div class="feature-card__header">
                    <h4>{{ f.title }}</h4>
                    <span class="feature-tag">{{ f.tag }}</span>
                  </div>
                  <p>{{ f.desc }}</p>
                </div>
              </div>
            </div>

            <!-- Mimari Bileşenler Rozetleri -->
            <div class="tech-stack-container">
              <div class="tech-stack-label">
                <span>MİMARİ TEKNOLOJİ YIĞINI</span>
                <span class="tech-stack-line"></span>
              </div>
              <div class="tech-stack-pills">
                <span class="tech-badge" *ngFor="let t of techStack">
                  <span class="tech-dot"></span>
                  {{ t }}
                </span>
              </div>
            </div>
          </aside>

          <!-- SAĞ PANEL — Giriş Kartı & Hızlı Demo Hesapları -->
          <main class="login-panel login-panel--form">
            <div class="form-wrapper">
              <div class="auth-card-halo"></div>

              <div class="auth-card">
                <!-- Üst Güvenlik Rozeti -->
                <div class="card-header-bar">
                  <div class="auth-badge">
                    <span class="badge-icon">⚡</span>
                    <span>MERKEZİ GİRİŞ PORTALI</span>
                  </div>
                  <div class="system-status">
                    <span class="status-pulse"></span>
                    <span>Çevrimiçi</span>
                  </div>
                </div>

                <!-- Form Başlığı -->
                <div class="form-header">
                  <h2>Hoş Geldiniz</h2>
                  <p>Kurumsal hesabınızla tek tıkla güvenli oturum başlatın</p>
                </div>

                <!-- Hata Mesajı -->
                <div class="alert alert--danger" *ngIf="errorMessage" role="alert" aria-live="assertive">
                  <span class="alert-icon">⚠️</span>
                  <div class="alert-text">
                    <strong>Bağlantı Hatası:</strong>
                    <span>{{ errorMessage }}</span>
                  </div>
                </div>

                <!-- Giriş Butonu -->
                <div class="sso-wrapper">
                  <button
                    type="button"
                    class="btn sso-btn"
                    id="keycloak-sso-btn"
                    (click)="onKeycloakLogin()"
                    [disabled]="isLoading">
                    <span class="sso-btn__glow"></span>
                    <span class="sso-icon">🔑</span>
                    <span class="sso-text">{{ isLoading ? 'Oturum hazırlanıyor...' : 'Güvenli Giriş İçin Devam Et' }}</span>
                    <span class="arrow-indicator">→</span>
                  </button>
                </div>

                <!-- Güvenlik Garantileri -->
                <div class="security-guarantees">
                  <div class="sec-item">
                    <span class="sec-icon">🛡️</span>
                    <span>Keycloak OIDC</span>
                  </div>
                  <div class="sec-item-divider"></div>
                  <div class="sec-item">
                    <span class="sec-icon">⚡</span>
                    <span>JWT & RBAC</span>
                  </div>
                  <div class="sec-item-divider"></div>
                  <div class="sec-item">
                    <span class="sec-icon">🔒</span>
                    <span>PKCE Korumalı</span>
                  </div>
                </div>

                <!-- Alt Güvenlik Açıklaması -->
                <p class="login-hint">
                  Tüm kimlik doğrulama süreçleri merkezi Keycloak Identity Provider altyapısı ile korunmaktadır.
                </p>
              </div>
            </div>
          </main>

        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      position: relative;
      overflow-x: hidden;
      background: #060810;
      color: #f1f5f9;
      font-family: var(--font-sans, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
    }

    /* ── Ambient Arkaplan Işık Efektleri ─────────────────────────────── */
    .login-bg {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }

    .ambient-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.65;
      animation: ambientFloat 14s ease-in-out infinite alternate;
    }

    .glow-1 {
      width: 700px;
      height: 700px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.28) 0%, rgba(79, 70, 229, 0.08) 60%, transparent 80%);
      top: -200px;
      left: -150px;
      animation-duration: 16s;
    }

    .glow-2 {
      width: 650px;
      height: 650px;
      background: radial-gradient(circle, rgba(147, 51, 234, 0.22) 0%, rgba(126, 34, 206, 0.06) 60%, transparent 80%);
      bottom: -180px;
      right: -100px;
      animation-duration: 18s;
      animation-delay: -4s;
    }

    .glow-3 {
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(6, 182, 212, 0.16) 0%, rgba(14, 165, 233, 0.04) 60%, transparent 80%);
      top: 30%;
      left: 35%;
      animation-duration: 20s;
      animation-delay: -8s;
    }

    .glow-4 {
      width: 450px;
      height: 450px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%);
      bottom: 10%;
      left: 10%;
      animation-duration: 22s;
    }

    .cyber-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
      background-size: 56px 56px;
      mask-image: radial-gradient(circle at 50% 50%, black 40%, transparent 90%);
      -webkit-mask-image: radial-gradient(circle at 50% 50%, black 40%, transparent 90%);
    }

    .vignette-overlay {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, transparent 30%, rgba(6, 8, 16, 0.8) 100%);
    }

    /* ── Kapsayıcı Düzen ─────────────────────────────────────────────── */
    .page-wrapper {
      position: relative;
      z-index: 1;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 24px;
    }

    .login-container {
      width: 100%;
      max-width: 1380px;
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 48px;
      align-items: center;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
        max-width: 600px;
        gap: 32px;
      }
    }

    /* ── Sol Panel: Marka & Mimari Vitrin ────────────────────────────── */
    .login-panel--brand {
      display: flex;
      flex-direction: column;
      gap: 28px;
      padding: 24px 16px;

      @media (max-width: 1024px) {
        display: none;
      }
    }

    .brand-top-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 7px 16px;
      border-radius: 9999px;
      background: rgba(99, 102, 241, 0.09);
      border: 1px solid rgba(99, 102, 241, 0.25);
      color: #cbd5e1;
      font-size: 0.8125rem;
      font-weight: 600;
      width: fit-content;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    }

    .ping-beacon {
      position: relative;
      width: 10px;
      height: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .ping-beacon__ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #10b981;
      opacity: 0.75;
      animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
    }

    .ping-beacon__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
    }

    .pill-divider {
      color: rgba(255, 255, 255, 0.2);
    }

    .status-active {
      color: #34d399;
      font-weight: 700;
    }

    /* Marka Başlığı */
    .brand-hero {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .brand-hero__top {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .brand__logo {
      position: relative;
      width: 76px;
      height: 76px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
      border-radius: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 16px 36px rgba(99, 102, 241, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.25);
      flex-shrink: 0;
    }

    .brand__icon {
      font-size: 2.4rem;
      filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.3));
    }

    .logo-reflection {
      position: absolute;
      top: 2px;
      left: 10%;
      width: 80%;
      height: 35%;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, transparent 100%);
      border-radius: 14px 14px 0 0;
      pointer-events: none;
    }

    .brand__name {
      font-size: 3.5rem;
      font-weight: 900;
      background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 40%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.04em;
      margin: 0;
      line-height: 1;
    }

    .brand__badge {
      display: inline-block;
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      padding: 2px 8px;
      border-radius: 6px;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      color: #ffffff;
      margin-top: 4px;
    }

    .brand__tagline {
      font-size: 1.15rem;
      color: #94a3b8;
      margin: 0;
      line-height: 1.6;
      max-width: 580px;
    }

    /* İstatistik Sayacı Şeridi */
    .stats-ribbon {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      padding: 16px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 18px;
      backdrop-filter: blur(16px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    }

    .stat-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 3px;
      border-right: 1px solid rgba(255, 255, 255, 0.06);

      &:last-child {
        border-right: none;
      }
    }

    .stat-box__val {
      font-size: 1.25rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .stat-box__lbl {
      font-size: 0.7rem;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Özellik Kartları */
    .features-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .feature-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 18px;
      background: rgba(15, 23, 42, 0.55);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 16px;
      backdrop-filter: blur(14px);
      transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 3px;
        height: 100%;
        background: linear-gradient(180deg, #6366f1, #06b6d4);
        opacity: 0;
        transition: opacity 0.25s ease;
      }

      &:hover {
        background: rgba(26, 35, 62, 0.7);
        border-color: rgba(99, 102, 241, 0.38);
        transform: translateX(6px);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);

        &::before {
          opacity: 1;
        }
      }
    }

    .feature-card__icon-wrap {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: 12px;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
    }

    .feature-card__icon {
      font-size: 1.35rem;
    }

    .feature-card__content {
      flex: 1;
      min-width: 0;

      p {
        font-size: 0.8125rem;
        color: #94a3b8;
        margin: 0;
        line-height: 1.4;
      }
    }

    .feature-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 2px;

      h4 {
        font-size: 0.9375rem;
        font-weight: 700;
        color: #f8fafc;
        margin: 0;
      }
    }

    .feature-tag {
      font-size: 0.65rem;
      font-weight: 700;
      color: #818cf8;
      background: rgba(99, 102, 241, 0.14);
      padding: 2px 7px;
      border-radius: 99px;
      border: 1px solid rgba(99, 102, 241, 0.25);
    }

    /* Teknoloji Yığını */
    .tech-stack-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .tech-stack-label {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.6875rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.08em;
    }

    .tech-stack-line {
      flex: 1;
      height: 1px;
      background: rgba(255, 255, 255, 0.06);
    }

    .tech-stack-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tech-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 99px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #94a3b8;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(99, 102, 241, 0.12);
        border-color: rgba(99, 102, 241, 0.3);
        color: #e2e8f0;
      }
    }

    .tech-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #818cf8;
    }

    /* ── Sağ Panel: Giriş Kartı & Demo Hesaplar ──────────────────────── */
    .login-panel--form {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .form-wrapper {
      position: relative;
      width: 100%;
      max-width: 500px;
    }

    .auth-card-halo {
      position: absolute;
      inset: -12px;
      background: radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.35) 0%, rgba(139, 92, 246, 0.15) 50%, transparent 75%);
      filter: blur(28px);
      border-radius: 36px;
      z-index: 0;
      pointer-events: none;
    }

    .auth-card {
      position: relative;
      z-index: 1;
      background: rgba(14, 18, 32, 0.88);
      backdrop-filter: blur(36px);
      -webkit-backdrop-filter: blur(36px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow:
        0 28px 70px rgba(0, 0, 0, 0.75),
        inset 0 1px 1px rgba(255, 255, 255, 0.15);
      border-radius: 28px;
      padding: 38px 34px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .card-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .auth-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      background: rgba(99, 102, 241, 0.14);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.3);
    }

    .system-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #34d399;
    }

    .status-pulse {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    .form-header {
      h2 {
        font-size: 2.15rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        margin: 0 0 6px 0;
        color: #ffffff;
      }

      p {
        color: #94a3b8;
        font-size: 0.9375rem;
        margin: 0;
        line-height: 1.5;
      }
    }

    /* Giriş Butonu */
    .sso-wrapper {
      position: relative;
    }

    .sso-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      padding: 17px 26px;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%) !important;
      border: 1px solid rgba(255, 255, 255, 0.25) !important;
      border-radius: 16px;
      color: #ffffff !important;
      font-size: 1.05rem;
      font-weight: 700;
      cursor: pointer;
      overflow: hidden;
      box-shadow:
        0 10px 28px rgba(99, 102, 241, 0.45),
        inset 0 1px 1px rgba(255, 255, 255, 0.3);
      transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow:
          0 16px 40px rgba(99, 102, 241, 0.65),
          inset 0 1px 1px rgba(255, 255, 255, 0.4);
        background: linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #4f46e5 100%) !important;

        .arrow-indicator {
          transform: translateX(5px);
        }
      }

      &:active:not(:disabled) {
        transform: translateY(0);
      }

      &:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      .sso-icon {
        font-size: 1.25rem;
      }

      .sso-text {
        letter-spacing: -0.01em;
      }

      .arrow-indicator {
        font-size: 1.3rem;
        transition: transform 0.2s ease;
      }
    }

    /* Güvenlik Rozetleri Şeridi */
    .security-guarantees {
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
    }

    .sec-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #94a3b8;

      .sec-icon {
        font-size: 0.9rem;
      }
    }

    .sec-item-divider {
      width: 1px;
      height: 14px;
      background: rgba(255, 255, 255, 0.1);
    }

    .login-hint {
      font-size: 0.75rem;
      color: #64748b;
      line-height: 1.5;
      text-align: center;
      margin: 8px 0 0 0;
    }

    /* ── Alert Durumu ─────────────────────────────────────────────────── */
    .alert {
      padding: 12px 16px;
      border-radius: 14px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: 0.8125rem;

      &--danger {
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(239, 68, 68, 0.35);
        color: #fca5a5;
        box-shadow: 0 0 20px rgba(239, 68, 68, 0.18);
      }

      .alert-icon {
        font-size: 1.1rem;
        flex-shrink: 0;
      }

      .alert-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        line-height: 1.4;

        strong {
          color: #f87171;
        }
      }
    }

    /* ── Verifying State (Oturum Açılırken) ───────────────────────────── */
    .verifying-container {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }

    .verifying-card {
      background: rgba(14, 18, 32, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(32px);
      border-radius: 28px;
      padding: 48px 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 28px 70px rgba(0, 0, 0, 0.7);
      animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .verifying-spinner {
      width: 48px;
      height: 48px;
      border: 3px solid rgba(99, 102, 241, 0.2);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 24px 0 16px 0;
    }

    .verifying-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 8px 0;
    }

    .verifying-subtitle {
      font-size: 0.9375rem;
      color: #94a3b8;
      line-height: 1.5;
      margin: 0;
    }

    .security-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 9999px;
      font-size: 0.75rem;
      color: #34d399;
      font-weight: 600;
    }

    .ping-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
    }

    .pulse-glow {
      animation: pulseGlow 2.4s ease-in-out infinite;
    }

    /* ── Animasyonlar ─────────────────────────────────────────────────── */
    @keyframes ambientFloat {
      0% { transform: translateY(0) scale(1); }
      100% { transform: translateY(-40px) scale(1.08); }
    }

    @keyframes ping {
      75%, 100% {
        transform: scale(2.2);
        opacity: 0;
      }
    }

    @keyframes popIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes pulseGlow {
      0%, 100% { transform: scale(1); box-shadow: 0 16px 36px rgba(99, 102, 241, 0.5); }
      50% { transform: scale(1.04); box-shadow: 0 20px 48px rgba(99, 102, 241, 0.75); }
    }
  `]
})
export class LoginComponent implements OnInit {
  private authSession = inject(AuthSessionService);
  private oauth = inject(OAuthService, { optional: true });

  isVerifyingSession = this.checkIsVerifying();
  isLoading = false;
  errorMessage = '';

  features = [
    { icon: '📊', title: 'Olay Tabanlı İş Akışları', tag: 'RabbitMQ', desc: 'Saga ile servisler arası asenkron süreç yönetimi ve telafi' },
    { icon: '🔒', title: 'Kimlik ve Erişim Yönetimi', tag: 'Keycloak', desc: 'OIDC, RS256 JWT ve rol tabanlı (RBAC) yetkilendirme' },
    { icon: '🏗️', title: 'Mikroservis Mimarisi', tag: 'YARP', desc: '10 bağımsız servis, CQRS ve API Gateway ile yüksek ölçeklenebilirlik' },
    { icon: '⚡', title: 'Omnichannel Deneyim', tag: 'Realtime', desc: 'Kiracı, mülk sahibi ve yönetici süreçleri için ortak platform' },
  ];

  techStack = [
    '.NET 10',
    'Angular 19',
    'RabbitMQ',
    'MassTransit',
    'PostgreSQL',
    'SQL Server',
    'MongoDB',
    'Redis',
    'Keycloak OIDC',
    'Docker'
  ];

  private checkIsVerifying(): boolean {
    if (typeof window === 'undefined') return false;
    const search = window.location.search;
    const hasAuthCallback = search.includes('code=') || search.includes('state=') || search.includes('session_state=');
    const hasToken = typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('access_token');
    return hasAuthCallback || hasToken;
  }

  async ngOnInit() {
    try {
      await this.authSession.initialize();
      if (!this.oauth?.hasValidAccessToken()) {
        this.isVerifyingSession = false;
      }
    } catch (error: unknown) {
      this.isVerifyingSession = false;
      this.showLoginError(error);
    }
  }

  async onKeycloakLogin() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';
    try {
      await this.authSession.beginLogin();
    } catch (error) {
      this.showLoginError(error);
    }
  }

  private showLoginError(error: unknown) {
    console.error('Kimlik doğrulama tamamlanamadı.', error);
    this.errorMessage = error instanceof Error
      ? error.message
      : 'Giriş servisine şu anda ulaşılamıyor. Servis başlatılıyorsa birkaç saniye sonra tekrar deneyin.';
    this.isLoading = false;
  }
}

