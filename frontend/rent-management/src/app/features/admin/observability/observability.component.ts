import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface ObservabilityTool {
  id: string;
  name: string;
  category: 'Metrics' | 'Tracing' | 'Logging' | 'Service Discovery' | 'Messaging' | 'Storage' | 'Database' | 'Auth' | 'Mail';
  categoryLabel: string;
  categoryColor: string;
  port: number;
  url: string;
  icon: string;
  description: string;
  credentials?: { user: string; pass: string };
  canEmbed: boolean;
  securityReason?: string;
  architectureDetails?: {
    containerName: string;
    role: string;
    dependencies: string;
    techStack: string;
  };
}

@Component({
  selector: 'app-observability',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page animate-slideUp" [class.page--fullscreen]="isFullscreen">

      <!-- Toast Bildirimi -->
      <div *ngIf="toastMessage" class="toast-notification animate-slideDown">
        <span>📋</span> {{ toastMessage }}
      </div>

      <!-- Sayfa Başlığı -->
      <div class="page__header flex justify-between items-center mb-6">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="page-title">Gözlemlenebilirlik & DevOps Konsolu</h1>
            <span class="badge badge--pulse-emerald">11 Araç Çevrimiçi</span>
          </div>
          <p class="text-sm text-muted mt-1">
            Seq logları, Zipkin dağıtık izleme, Grafana metrikleri, Consul servis keşfi ve altyapı yönetim panelleri tek ekranda.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn--secondary" (click)="openActiveInNewTab()">
            <span>↗</span> Yeni Sekmede Aç
          </button>
          <button class="btn btn--primary" (click)="toggleFullscreen()">
            <span>{{ isFullscreen ? '🗗 Küçült' : '🗖 Tam Ekran' }}</span>
          </button>
        </div>
      </div>

      <!-- Hızlı Seçici Sekmeler (Tool Selector Tabs) -->
      <div class="tool-tabs-bar mb-6">
        <div class="tabs-scroll flex gap-2">
          <button
            *ngFor="let tool of tools"
            class="tab-tool-btn"
            [class.tab-tool-btn--active]="selectedTool.id === tool.id"
            (click)="selectTool(tool)"
          >
            <span class="tab-icon">{{ tool.icon }}</span>
            <span class="tab-name">{{ tool.name }}</span>
            <span class="tab-mode-chip" [class.tab-mode-chip--live]="tool.canEmbed">
              {{ tool.canEmbed ? 'Canlı' : 'Konsol ↗' }}
            </span>
          </button>
        </div>
      </div>

      <!-- Ana Konsol Alanı (Viewer Window) -->
      <div class="viewer-window mb-8" [class.viewer-window--fullscreen]="isFullscreen">
        
        <!-- Viewer Üst Çubuğu (Window Toolbar) -->
        <div class="viewer-toolbar flex justify-between items-center">
          <div class="flex items-center gap-4">
            <!-- macOS Pencere Noktaları -->
            <div class="window-controls flex items-center gap-1">
              <span class="window-dot window-dot--red"></span>
              <span class="window-dot window-dot--yellow"></span>
              <span class="window-dot window-dot--green"></span>
            </div>

            <div class="flex items-center gap-3">
              <span class="viewer-icon">{{ selectedTool.icon }}</span>
              <div>
                <div class="flex items-center gap-2">
                  <span class="viewer-title">{{ selectedTool.name }}</span>
                  <span class="badge" [style.background]="selectedTool.categoryColor + '20'" [style.color]="selectedTool.categoryColor">
                    {{ selectedTool.categoryLabel }}
                  </span>
                  <span class="badge badge--soft-primary">Port: {{ selectedTool.port }}</span>
                </div>
                <div class="viewer-desc text-xs text-muted">{{ selectedTool.description }}</div>
              </div>
            </div>
          </div>

          <!-- Aksiyonlar ve Adres Çubuğu -->
          <div class="flex items-center gap-3">
            <!-- Kimlik Bilgisi Rozeti -->
            <div *ngIf="selectedTool.credentials" class="creds-pill" (click)="copyCredentials(selectedTool)" title="Tıklayarak kopyalayın">
              <span class="text-xs text-muted">Giriş:</span>
              <code>{{ selectedTool.credentials.user }} / {{ selectedTool.credentials.pass }}</code>
              <span class="copy-icon">📋</span>
            </div>
            <div *ngIf="!selectedTool.credentials" class="creds-pill creds-pill--open">
              <span class="text-xs text-muted">Erişim:</span>
              <span class="text-xs">Şifresiz / Açık Konsol</span>
            </div>

            <!-- URL Kutusu -->
            <div class="url-box flex items-center gap-1">
              <span class="lock-icon">🔒</span>
              <span class="url-text">{{ selectedTool.url }}</span>
              <button class="btn-icon" (click)="copyUrl(selectedTool.url)" title="URL'yi Kopyala">📋</button>
            </div>

            <button *ngIf="selectedTool.canEmbed" class="btn-icon" (click)="reloadIframe()" title="Yeniden Yükle">🔄</button>
            <button class="btn-icon" (click)="openAsPopup(selectedTool.url)" title="Ayrı Popout Pencerede Aç">🗖</button>
            <button class="btn-icon" (click)="openActiveInNewTab()" title="Harici Sekmede Aç">↗</button>
            <button class="btn-icon" (click)="toggleFullscreen()" [title]="isFullscreen ? 'Küçült' : 'Tam Ekran'">
              {{ isFullscreen ? '🗗' : '🗖' }}
            </button>
          </div>
        </div>

        <!-- Viewer Gövdesi -->
        <div class="viewer-content">
          
          <!-- 1. Canlı Entegre Ekran (Destekleyen Araçlar İçin: Grafana, Zipkin, Consul, RabbitMQ, Prometheus, MailHog) -->
          <iframe
            *ngIf="selectedTool.canEmbed && iframeSrc"
            [src]="iframeSrc"
            class="embedded-iframe"
            title="{{ selectedTool.name }}"
            allow="fullscreen; clipboard-read; clipboard-write"
          ></iframe>

          <!-- 2. Güvenlik İzolasyonlu Araçlar İçin Lüks Görev Kontrol Konsolu (MinIO, Redis, pgAdmin, Seq, Keycloak) -->
          <div *ngIf="!selectedTool.canEmbed" class="mission-control-panel flex flex-col items-center justify-center p-8">
            
            <div class="radar-container mb-4">
              <div class="radar-ring"></div>
              <div class="radar-ring radar-ring--outer"></div>
              <div class="radar-core">{{ selectedTool.icon }}</div>
            </div>

            <h2 class="mission-title">{{ selectedTool.name }} Yönetim Konsolu</h2>
            <div class="connection-badge mb-4">
              <span class="beacon-dot"></span>
              <span>Çevrimiçi • Port {{ selectedTool.port }} Aktif Dinleniyor</span>
            </div>

            <p class="mission-subtitle text-muted max-w-xl text-center mb-6">
              {{ selectedTool.securityReason || 'Bu servis, yüksek güvenlik politikası (X-Frame-Options / SameOrigin) gereği tarayıcı içi gömülme yerine doğrudan güvenli oturumla çalıştırılmaktadır.' }}
            </p>

            <!-- Hızlı Başlatma Butonları -->
            <div class="flex gap-3 mb-8">
              <button class="btn btn--primary btn--lg launch-btn" (click)="openActiveInNewTab()">
                <span>🚀</span> Yeni Sekmede Konsolu Aç
              </button>
              <button class="btn btn--secondary btn--lg" (click)="openAsPopup(selectedTool.url)">
                <span>🗖</span> Bağımsız Pencerede Başlat
              </button>
              <button class="btn btn--secondary btn--lg" (click)="copyUrl(selectedTool.url)">
                <span>📋</span> URL Kopyala
              </button>
            </div>

            <!-- Mimari & Giriş Detayları Kartları -->
            <div class="grid grid--3 info-cards-grid max-w-3xl w-full">
              
              <div class="info-card">
                <div class="info-card__label">Konteyner & Servis</div>
                <div class="info-card__value">{{ selectedTool.architectureDetails?.containerName || selectedTool.id }}</div>
                <div class="info-card__desc text-xs text-muted">{{ selectedTool.architectureDetails?.techStack }}</div>
              </div>

              <div class="info-card">
                <div class="info-card__label">Varsayılan Giriş Bilgileri</div>
                <div class="info-card__value text-amber" *ngIf="selectedTool.credentials">
                  {{ selectedTool.credentials.user }} / {{ selectedTool.credentials.pass }}
                </div>
                <div class="info-card__value text-emerald" *ngIf="!selectedTool.credentials">
                  Açık / Şifresiz Erişim
                </div>
                <div class="info-card__desc text-xs text-muted">
                  {{ selectedTool.credentials ? 'Tek tıkla giriş için hazır' : 'Doğrudan erişilebilir' }}
                </div>
              </div>

              <div class="info-card">
                <div class="info-card__label">Mimari Rolü</div>
                <div class="info-card__value">{{ selectedTool.categoryLabel }}</div>
                <div class="info-card__desc text-xs text-muted">{{ selectedTool.architectureDetails?.role }}</div>
              </div>

            </div>

          </div>

        </div>
      </div>

      <!-- Tüm DevOps Araçları Matrisi (Observability Grid) -->
      <div class="matrix-section" *ngIf="!isFullscreen">
        <div class="flex justify-between items-center mb-5">
          <div>
            <h3 class="section-title">Tüm Altyapı & Gözlemlenebilirlik Konsolları</h3>
            <p class="text-xs text-muted mt-1">Konteyner mimarisindeki tüm operasyonel portlar ve kontrol merkezleri</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge badge--soft-emerald">6 Canlı Entegre</span>
            <span class="badge badge--soft-primary">5 Güvenlikli Konsol</span>
          </div>
        </div>

        <div class="grid grid--3">
          <div
            *ngFor="let tool of tools"
            class="tool-card"
            [class.tool-card--active]="selectedTool.id === tool.id"
          >
            <div class="tool-card__header flex justify-between items-center">
              <div class="flex items-center gap-3">
                <div class="tool-card__icon-box">{{ tool.icon }}</div>
                <div>
                  <h4 class="tool-card__title">{{ tool.name }}</h4>
                  <span class="badge" [style.background]="tool.categoryColor + '20'" [style.color]="tool.categoryColor">
                    {{ tool.categoryLabel }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="status-pulse"></span>
                <span class="badge badge--soft-primary">:{{ tool.port }}</span>
              </div>
            </div>

            <p class="tool-card__desc text-xs text-muted mt-3">
              {{ tool.description }}
            </p>

            <div class="tool-card__footer flex justify-between items-center mt-4 pt-3">
              <div class="creds-hint text-xs">
                <span *ngIf="tool.credentials" class="text-muted">
                  🔑 <code>{{ tool.credentials.user }} / {{ tool.credentials.pass }}</code>
                </span>
                <span *ngIf="!tool.credentials" class="text-muted">
                  🔓 <em>Şifresiz</em>
                </span>
              </div>

              <div class="flex gap-2">
                <button class="btn btn--sm btn--secondary" (click)="selectTool(tool)">
                  {{ tool.canEmbed ? 'Konsola Getir' : 'İncele' }}
                </button>
                <a [href]="tool.url" target="_blank" rel="noopener noreferrer" class="btn btn--sm btn--primary">
                  Aç ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .gap-1 { gap: 4px; }
    .gap-2 { gap: 8px; }
    .gap-3 { gap: 12px; }
    .gap-4 { gap: 16px; }
    .mb-4 { margin-bottom: 16px; }
    .mb-5 { margin-bottom: 20px; }
    .mb-6 { margin-bottom: 24px; }
    .mb-8 { margin-bottom: 32px; }
    .mt-1 { margin-top: 4px; }
    .mt-3 { margin-top: 12px; }
    .mt-4 { margin-top: 16px; }
    .pt-3 { padding-top: 12px; }
    .text-center { text-align: center; }
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.875rem; }
    .text-muted { color: #94a3b8; }
    .text-amber { color: #f59e0b; }
    .text-emerald { color: #10b981; }
    .max-w-xl { max-width: 36rem; }
    .max-w-3xl { max-width: 48rem; }
    .w-full { width: 100%; }

    .page-title {
      font-size: 1.625rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #ffffff;
      margin: 0;
    }

    .section-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }

    .page--fullscreen {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: #090c10;
      padding: 16px 24px;
      overflow-y: auto;
    }

    .toast-notification {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 10000;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid #6366f1;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.4);
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Tabs Bar */
    .tool-tabs-bar {
      overflow-x: auto;
      padding-bottom: 6px;
    }
    .tabs-scroll {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .tab-tool-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.8125rem;
      font-weight: 500;
      transition: all 0.2s ease;
      white-space: nowrap;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.18);
      }

      &--active {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%);
        color: #ffffff;
        border-color: #6366f1;
        box-shadow: 0 0 16px rgba(99, 102, 241, 0.3);
      }

      .tab-mode-chip {
        font-size: 0.6875rem;
        background: rgba(255, 255, 255, 0.06);
        padding: 2px 6px;
        border-radius: 6px;
        color: #94a3b8;

        &--live {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          font-weight: 600;
        }
      }
    }

    /* Viewer Window */
    .viewer-window {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(20px);

      &--fullscreen {
        height: calc(100vh - 160px);
      }
    }

    .viewer-toolbar {
      padding: 12px 20px;
      background: rgba(10, 14, 22, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
    }

    .window-controls {
      display: flex;
      gap: 6px;
      padding-right: 12px;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
    }

    .window-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      &--red { background: #ef4444; }
      &--yellow { background: #f59e0b; }
      &--green { background: #10b981; }
    }

    .viewer-icon { font-size: 1.5rem; }
    .viewer-title { font-size: 1.05rem; font-weight: 700; color: #ffffff; }

    .creds-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.75rem;
      code { color: #f59e0b; font-weight: 600; font-family: monospace; }
      &:hover { background: rgba(245, 158, 11, 0.2); }

      &--open {
        background: rgba(16, 185, 129, 0.1);
        border-color: rgba(16, 185, 129, 0.25);
        color: #34d399;
      }
    }

    .url-box {
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 0.75rem;
      color: #94a3b8;
      max-width: 280px;
      .url-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: monospace;
      }
      .lock-icon { font-size: 0.75rem; }
    }

    .btn-icon {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffffff;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      &:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.25);
      }
    }

    .viewer-content {
      position: relative;
      width: 100%;
      height: 680px;
      background: #000000;
    }

    .embedded-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #ffffff;
    }

    /* ── Mission Control Panel (Non-Embeddable Tools) ───── */
    .mission-control-panel {
      height: 100%;
      background: radial-gradient(circle at center, rgba(30, 41, 59, 0.6) 0%, rgba(9, 12, 16, 0.95) 100%);
    }

    .radar-container {
      position: relative;
      width: 90px;
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .radar-core {
      font-size: 3rem;
      position: relative;
      z-index: 2;
    }

    .radar-ring {
      position: absolute;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 2px solid rgba(99, 102, 241, 0.5);
      animation: ripple 2.5s infinite;

      &--outer {
        width: 85px;
        height: 85px;
        border-color: rgba(168, 85, 247, 0.3);
        animation-delay: 0.5s;
      }
    }

    @keyframes ripple {
      0% { transform: scale(0.8); opacity: 0.8; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    .mission-title {
      font-size: 1.625rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 6px 0;
    }

    .connection-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 9999px;
      font-size: 0.75rem;
      color: #34d399;
      font-weight: 600;

      .beacon-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 8px #10b981;
      }
    }

    .launch-btn {
      box-shadow: 0 0 25px rgba(99, 102, 241, 0.4);
    }

    .info-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 16px;
      &__label { font-size: 0.6875rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
      &__value { font-size: 0.9375rem; font-weight: 700; color: #ffffff; margin: 4px 0 2px 0; }
    }

    /* Grid Matrix */
    .grid { display: grid; gap: 16px; }
    .grid--3 { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }

    .tool-card {
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.22s ease;
      backdrop-filter: blur(14px);

      &:hover {
        border-color: rgba(99, 102, 241, 0.4);
        transform: translateY(-2px);
        box-shadow: 0 12px 25px rgba(0, 0, 0, 0.35);
      }

      &--active {
        border-color: #6366f1;
        box-shadow: 0 0 18px rgba(99, 102, 241, 0.25);
      }

      &__icon-box { font-size: 1.75rem; }
      &__title { font-size: 1rem; font-weight: 700; margin: 0 0 4px 0; color: #ffffff; }
      &__desc { min-height: 38px; line-height: 1.4; }
      &__footer { border-top: 1px solid rgba(255, 255, 255, 0.06); }
    }

    .status-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
    }

    .badge--pulse-emerald {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge--soft-emerald {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge--soft-primary {
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }
  `]
})
export class ObservabilityComponent implements OnInit {
  isFullscreen = false;
  toastMessage: string | null = null;
  iframeSrc: SafeResourceUrl | null = null;

  tools: ObservabilityTool[] = [
    {
      id: 'grafana',
      name: 'Grafana Dashboards',
      category: 'Metrics',
      categoryLabel: 'Metrik & Görselleştirme',
      categoryColor: '#f97316',
      port: 3001,
      url: 'http://localhost:3001',
      icon: '📊',
      description: 'Mikroservis CPU/RAM, HTTP gecikmeleri, istek hacmi ve Prometheus zaman serisi göstergeleri.',
      credentials: { user: 'admin', pass: 'GRAFANA_ADMIN_PASSWORD (.env)' },
      canEmbed: true,
      architectureDetails: {
        containerName: 'rent-grafana',
        role: 'Zaman Serisi Dashboard & Alarm Yönetimi',
        dependencies: 'rent-prometheus (:9090)',
        techStack: 'Grafana v11'
      }
    },
    {
      id: 'zipkin',
      name: 'Zipkin Tracing',
      category: 'Tracing',
      categoryLabel: 'Dağıtık İzleme (Trace)',
      categoryColor: '#38bdf8',
      port: 9411,
      url: 'http://localhost:9411',
      icon: '⚡',
      description: 'Saga adımları ve servisler arası HTTP/gRPC çağrılarının uçtan uca gecikme ve trace ağacı analizi.',
      canEmbed: true,
      architectureDetails: {
        containerName: 'rent-zipkin',
        role: 'Uçtan Uca Dağıtık Trace Analizi',
        dependencies: 'rent-otel-collector (:4317)',
        techStack: 'OpenZipkin v3'
      }
    },
    {
      id: 'consul',
      name: 'Consul Service Discovery',
      category: 'Service Discovery',
      categoryLabel: 'Servis Keşfi & Sağlık',
      categoryColor: '#ec4899',
      port: 8500,
      url: 'http://localhost:8500',
      icon: '🌲',
      description: 'Canlı servis kayıtları, port haritası, health check sinyalleri ve dinamik yapılandırma anahtarları.',
      canEmbed: true,
      architectureDetails: {
        containerName: 'rent-consul',
        role: 'Dinamik Servis Keşfi & Port Envanteri',
        dependencies: 'Tüm .NET Mikroservisleri',
        techStack: 'HashiCorp Consul Dev'
      }
    },
    {
      id: 'rabbitmq',
      name: 'RabbitMQ Management',
      category: 'Messaging',
      categoryLabel: 'Olay Kuyruğu & Broker',
      categoryColor: '#f97316',
      port: 15672,
      url: 'http://localhost:15672',
      icon: '🐰',
      description: 'MassTransit kuyrukları, exchange yönlendirmeleri, mesaj oranları ve saga olay akışları.',
      credentials: { user: 'rentflow', pass: 'RABBITMQ_DEFAULT_PASS (.env)' },
      canEmbed: true,
      architectureDetails: {
        containerName: 'rent-rabbitmq',
        role: 'MassTransit AMQP Mesaj Broker & Saga Olayları',
        dependencies: 'SagaOrchestrator, NotificationService',
        techStack: 'RabbitMQ 3.13 Management'
      }
    },
    {
      id: 'prometheus',
      name: 'Prometheus TSDB',
      category: 'Metrics',
      categoryLabel: 'Zaman Serisi Veritabanı',
      categoryColor: '#eab308',
      port: 9090,
      url: 'http://localhost:9090',
      icon: '📈',
      description: 'Mikroservis .NET metrik toplayıcısı, PromQL sorgu motoru ve ham metrik hedefleri.',
      canEmbed: true,
      architectureDetails: {
        containerName: 'rent-prometheus',
        role: 'Metrik Kazıma & PromQL Zaman Serisi Motoru',
        dependencies: 'Tüm Mikroservis /metrics uçları',
        techStack: 'Prometheus TSDB'
      }
    },
    {
      id: 'mailhog',
      name: 'MailHog SMTP UI',
      category: 'Mail',
      categoryLabel: 'E-Posta Test Konsolu',
      categoryColor: '#14b8a6',
      port: 8025,
      url: 'http://localhost:8025',
      icon: '✉️',
      description: 'Sistem tarafından gönderilen bildirim, kira makbuzu ve sözleşme e-postalarının test kutusu.',
      canEmbed: true,
      architectureDetails: {
        containerName: 'rent-mailhog',
        role: 'SMTP Mock & E-Posta Test Arayüzü',
        dependencies: 'NotificationService (Port 1025)',
        techStack: 'MailHog SMTP Server'
      }
    },
    {
      id: 'minio',
      name: 'MinIO S3 Console',
      category: 'Storage',
      categoryLabel: 'S3 Nesne Depolama',
      categoryColor: '#e11d48',
      port: 9001,
      url: 'http://localhost:9001',
      icon: '📦',
      description: 'Sözleşme PDF belgeleri, kiracı/mülk görselleri ve S3 bucket nesne depolama konsolu.',
      credentials: { user: 'rentadmin', pass: 'MINIO_ROOT_PASSWORD (.env)' },
      canEmbed: false,
      securityReason: 'MinIO Console güvenlik politikası (X-Frame-Options: DENY), oturum izolasyonu nedeniyle gömülü iframe erişimini kısıtlar. Konsola tek tıkla yeni sekmede veya bağımsız pencerede kesintisiz erişebilirsiniz.',
      architectureDetails: {
        containerName: 'rent-minio',
        role: 'S3 Bucket (documents, images) Depolama Konsolu',
        dependencies: 'DocumentService, PropertyService',
        techStack: 'MinIO High-Performance Object Storage'
      }
    },
    {
      id: 'redisinsight',
      name: 'RedisInsight',
      category: 'Database',
      categoryLabel: 'In-Memory Önbellek',
      categoryColor: '#ef4444',
      port: 8001,
      url: 'http://localhost:8001',
      icon: '⚡',
      description: 'Dağıtık RedLock kilitleri, idempotency anahtarları, rate limit sayaçları ve bellek haritası.',
      canEmbed: false,
      securityReason: 'RedisInsight web arayüzü, SameOrigin güvenlik ilkesi gereği tarayıcı içi gömülme yerine doğrudan oturumla çalıştırılmaktadır. Aşağıdaki butondan hemen başlatabilirsiniz.',
      architectureDetails: {
        containerName: 'rent-redisinsight',
        role: 'Redis Bellek, RedLock & Cache Görselleştirme',
        dependencies: 'rent-redis (:6379)',
        techStack: 'Redis 7 & RedisInsight GUI'
      }
    },
    {
      id: 'pgadmin',
      name: 'pgAdmin PostgreSQL',
      category: 'Database',
      categoryLabel: 'İlişkisel Veritabanı',
      categoryColor: '#2563eb',
      port: 5050,
      url: 'http://localhost:5050',
      icon: '🐘',
      description: 'User, Report ve Saga PostgreSQL tablolarının GUI üzerinden yönetimi ve SQL sorguları.',
      credentials: { user: 'admin@rent.com', pass: 'POSTGRES_PASSWORD (.env)' },
      canEmbed: false,
      securityReason: 'pgAdmin güvenlik mimarisi (X-Frame-Options: SAMEORIGIN & CSRF Koruması), iframe içi oturum açmayı kısıtlamaktadır. Konsola bağımsız pencerede veya harici sekmede tek tıkla bağlanabilirsiniz.',
      architectureDetails: {
        containerName: 'rent-pgadmin',
        role: 'PostgreSQL Veritabanı Görsel Yönetim Masası',
        dependencies: 'rent-postgres (:5432) -> user_db, report_db, saga_db',
        techStack: 'pgAdmin 4 Web'
      }
    },
    {
      id: 'seq',
      name: 'Seq Log Viewer',
      category: 'Logging',
      categoryLabel: 'Yapılandırılmış Loglar',
      categoryColor: '#a855f7',
      port: 5341,
      url: 'http://localhost:5341',
      icon: '📜',
      description: 'Serilog ile üretilen yapılandırılmış (structured) JSON logları, CorrelationId filtreleri ve hata kayıtları.',
      credentials: { user: 'admin', pass: 'Admin123!' },
      canEmbed: false,
      securityReason: 'Seq Log sunucusu, Content Security Policy (frame-ancestors: none) politikası ile korunmaktadır. Ayrı sekmede veya bağımsız pencerede anında açabilirsiniz.',
      architectureDetails: {
        containerName: 'rent-seq',
        role: 'Serilog JSON Structured Log Toplama & Analiz',
        dependencies: 'Tüm .NET Mikroservisleri Serilog Seq Sink',
        techStack: 'Datalust Seq v2024'
      }
    },
    {
      id: 'keycloak',
      name: 'Keycloak IAM Admin',
      category: 'Auth',
      categoryLabel: 'Kimlik & Yetki (IAM)',
      categoryColor: '#3b82f6',
      port: 8080,
      url: 'http://localhost:8080/admin',
      icon: '🛡️',
      description: 'OAuth2/OIDC kullanıcı havuzu, roller (Admin/Landlord/Tenant), realm istemcileri ve JWT belirteçleri.',
      credentials: { user: 'admin', pass: 'KEYCLOAK_ADMIN_PASSWORD (.env)' },
      canEmbed: false,
      securityReason: 'Keycloak Güvenlik Standartları (OAuth2/OIDC), Clickjacking saldırılarına karşı iframe içinde yönetim konsolu çalıştırılmasını engeller.',
      architectureDetails: {
        containerName: 'rent-keycloak',
        role: 'Kimlik Doğrulama, Kullanıcı Havuzu & JWT Yetkilendirme',
        dependencies: 'PostgreSQL keycloak_db',
        techStack: 'Keycloak 24 Quarkus'
      }
    }
  ];

  selectedTool: ObservabilityTool = this.tools[0]; // Default: Grafana

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.updateIframeSrc();
  }

  selectTool(tool: ObservabilityTool) {
    this.selectedTool = tool;
    this.updateIframeSrc();
  }

  private updateIframeSrc() {
    if (this.selectedTool.canEmbed) {
      this.iframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.selectedTool.url);
    } else {
      this.iframeSrc = null;
    }
  }

  reloadIframe() {
    const current = this.selectedTool;
    this.iframeSrc = null;
    setTimeout(() => {
      this.updateIframeSrc();
      this.showToast(`${current.name} ekranı yenilendi.`);
    }, 150);
  }

  openActiveInNewTab() {
    window.open(this.selectedTool.url, '_blank', 'noopener,noreferrer');
  }

  openAsPopup(url: string) {
    const width = 1280;
    const height = 820;
    const left = Math.max(0, (window.screen.width - width) / 2);
    const top = Math.max(0, (window.screen.height - height) / 2);
    window.open(url, '_blank', `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`);
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
  }

  copyUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      this.showToast(`URL kopyalandı: ${url}`);
    });
  }

  copyCredentials(tool: ObservabilityTool) {
    if (tool.credentials) {
      const text = `${tool.credentials.user} / ${tool.credentials.pass}`;
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(`Giriş bilgisi kopyalandı: ${text}`);
      });
    }
  }

  private showToast(msg: string) {
    this.toastMessage = msg;
    setTimeout(() => {
      if (this.toastMessage === msg) {
        this.toastMessage = null;
      }
    }, 3000);
  }
}
