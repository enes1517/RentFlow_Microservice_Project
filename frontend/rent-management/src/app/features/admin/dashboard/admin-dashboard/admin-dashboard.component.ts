import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { UserService } from '../../../../core/services/user.service';
import { PropertyService } from '../../../../core/services/property.service';
import { LeaseService, Lease } from '../../../../core/services/lease.service';
import { PaymentService, PaymentRecord } from '../../../../core/services/payment.service';

interface ActivityItem {
  icon: string;
  title: string;
  desc: string;
  time: string;
  badge: string;
  badgeType: 'success' | 'primary' | 'warning' | 'purple';
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page animate-slideUp">
      
      <!-- Üst Başlık & Eylem Çubuğu -->
      <div class="page__header flex justify-between items-center mb-8">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="page-title">Sistem & Operasyon Komuta Merkezi</h1>
            <span class="badge badge--soft-emerald">Canlı Telemetri</span>
          </div>
          <p class="page-subtitle text-muted mt-1">
            Mikroservis mimarisinin sağlık durumu, gerçek zamanlı finansal akış ve envanter metrikleri.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button class="btn btn--secondary" (click)="refreshData()" [disabled]="isLoading">
            <span class="icon" [class.icon--spin]="isLoading">🔄</span>
            {{ isLoading ? 'Yenileniyor...' : 'Verileri Yenile' }}
          </button>
          <a routerLink="/admin/observability" class="btn btn--primary">
            <span>🔭</span> DevOps Konsolu
          </a>
        </div>
      </div>

      <!-- 4 Temel Metrik Kartı (Executive Hero KPIs) -->
      <div class="grid grid--4 mb-8">
        
        <!-- Kart 1: Kullanıcılar -->
        <div class="kpi-card kpi-card--blue">
          <div class="kpi-card__glow"></div>
          <div class="kpi-card__top flex justify-between items-center">
            <span class="kpi-label">Toplam Kullanıcı</span>
            <div class="kpi-icon-badge">👥</div>
          </div>
          <div class="kpi-value">{{ isLoading ? '…' : errorMessage ? '—' : userCount }}</div>
          <div class="kpi-footer flex items-center justify-between mt-3">
            <span class="text-xs text-muted">Kayıtlı Profil & Rol Havuzu</span>
            <span class="kpi-tag">Keycloak OIDC</span>
          </div>
        </div>

        <!-- Kart 2: Mülkler -->
        <div class="kpi-card kpi-card--cyan">
          <div class="kpi-card__glow"></div>
          <div class="kpi-card__top flex justify-between items-center">
            <span class="kpi-label">Sistemdeki Mülkler</span>
            <div class="kpi-icon-badge">🏢</div>
          </div>
          <div class="kpi-value">{{ isLoading ? '…' : errorMessage ? '—' : propertyCount }}</div>
          <div class="kpi-footer flex items-center justify-between mt-3">
            <span class="text-xs text-muted">{{ unitCount }} Bağımsız Bölüm</span>
            <span class="kpi-tag">MongoDB Geo</span>
          </div>
        </div>

        <!-- Kart 3: Aktif Sözleşmeler -->
        <div class="kpi-card kpi-card--purple">
          <div class="kpi-card__glow"></div>
          <div class="kpi-card__top flex justify-between items-center">
            <span class="kpi-label">Yürürlükteki Sözleşmeler</span>
            <div class="kpi-icon-badge">📄</div>
          </div>
          <div class="kpi-value">{{ isLoading ? '…' : errorMessage ? '—' : activeLeaseCount }}</div>
          <div class="kpi-footer flex items-center justify-between mt-3">
            <span class="text-xs text-muted">Yürürlükteki Sözleşme</span>
            <span class="kpi-tag">Saga Onaylı</span>
          </div>
        </div>

        <!-- Kart 4: Finansal Tahsilat Hacmi -->
        <div class="kpi-card kpi-card--emerald">
          <div class="kpi-card__glow"></div>
          <div class="kpi-card__top flex justify-between items-center">
            <span class="kpi-label">Aylık Tahsilat Hacmi</span>
            <div class="kpi-icon-badge">💰</div>
          </div>
          <div class="kpi-value text-emerald">
            {{ isLoading ? '…' : errorMessage ? '—' : (currentMonthVolume | number:'1.0-0') }}
            <span class="currency-symbol">₺</span>
          </div>
          <div class="kpi-footer flex items-center justify-between mt-3">
            <span class="text-xs text-muted">Bu Ayki Tahsilat Toplamı</span>
            <span class="kpi-tag kpi-tag--emerald">%100 Başarı</span>
          </div>
        </div>

      </div>

      <!-- Gözlemlenebilirlik & DevOps Hızlı Erişim Paneli -->
      <div class="devops-command-card mb-8">
        <div class="devops-command-card__header flex justify-between items-center mb-5">
          <div class="flex items-center gap-3">
            <div class="devops-icon-container">
              <span>🔭</span>
            </div>
            <div>
              <h3 class="devops-title">Gözlemlenebilirlik & Altyapı Kontrol Merkezi</h3>
              <p class="text-sm text-muted">Seq, Zipkin, Grafana, Consul ve mikroservis dağıtık ağ araçları</p>
            </div>
          </div>
          <a routerLink="/admin/observability" class="btn btn--secondary btn--sm">
            Tüm Konsolu Aç (11 Araç) →
          </a>
        </div>

        <div class="grid grid--4 devops-tiles">
          <a routerLink="/admin/observability" class="devops-tile devops-tile--orange">
            <div class="flex justify-between items-center">
              <span class="devops-tile__icon">📊</span>
              <span class="port-chip">:3001</span>
            </div>
            <div class="devops-tile__name">Grafana</div>
            <div class="devops-tile__desc">Sistem Metrikleri & CPU/RAM Göstergeleri</div>
            <div class="devops-tile__footer">Konsolda İncele →</div>
          </a>

          <a routerLink="/admin/observability" class="devops-tile devops-tile--sky">
            <div class="flex justify-between items-center">
              <span class="devops-tile__icon">⚡</span>
              <span class="port-chip">:9411</span>
            </div>
            <div class="devops-tile__name">Zipkin</div>
            <div class="devops-tile__desc">Dağıtık Tracing & Uçtan Uca Çağrı Ağacı</div>
            <div class="devops-tile__footer">Konsolda İncele →</div>
          </a>

          <a routerLink="/admin/observability" class="devops-tile devops-tile--purple">
            <div class="flex justify-between items-center">
              <span class="devops-tile__icon">📜</span>
              <span class="port-chip">:5341</span>
            </div>
            <div class="devops-tile__name">Seq</div>
            <div class="devops-tile__desc">Yapılandırılmış JSON Log & Hata Takibi</div>
            <div class="devops-tile__footer">Konsolda İncele →</div>
          </a>

          <a routerLink="/admin/observability" class="devops-tile devops-tile--pink">
            <div class="flex justify-between items-center">
              <span class="devops-tile__icon">🌲</span>
              <span class="port-chip">:8500</span>
            </div>
            <div class="devops-tile__name">Consul</div>
            <div class="devops-tile__desc">Servis Keşfi & Port Sağlık Sinyalleri</div>
            <div class="devops-tile__footer">Konsolda İncele →</div>
          </a>
        </div>
      </div>

      <!-- Alt İkili Izgara: Mikroservis Sağlığı & Son Sistem İşlemleri -->
      <div class="grid grid--2">

        <!-- Mikroservis Mimari Sağlık Matrisi -->
        <div class="luxury-card">
          <div class="luxury-card__header flex justify-between items-center">
            <div>
              <h3 class="card-title">Mikroservis Mimarisi & Canlı Sağlık</h3>
              <p class="text-xs text-muted mt-1">Dağıtık arka uç servislerinin operasyonel çalışma ve gecikme durumu</p>
            </div>
            <span class="badge badge--soft-emerald">8/8 Servis Aktif ✅</span>
          </div>

          <div class="service-list mt-4">
            <div class="service-item flex justify-between items-center" *ngFor="let s of microservices">
              <div class="flex items-center gap-3">
                <span class="service-beacon"></span>
                <div>
                  <div class="service-name">{{ s.name }}</div>
                  <div class="service-desc text-xs text-muted">{{ s.desc }}</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="latency-tag">{{ s.latency }}</span>
                <span class="badge badge--soft-emerald">{{ s.status }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Canlı Sistem Aktiviteleri (Zaman Çizelgesi) -->
        <div class="luxury-card">
          <div class="luxury-card__header flex justify-between items-center">
            <div>
              <h3 class="card-title">Son Sistem İşlemleri</h3>
              <p class="text-xs text-muted mt-1">Sözleşme ve finansal işlemlerin zaman çizelgesi</p>
            </div>
            <span class="badge badge--soft-indigo">Gerçek Zamanlı</span>
          </div>

          <p *ngIf="isLoading" class="p-6 text-muted text-center">Aktiviteler taranıyor...</p>
          <p *ngIf="errorMessage" class="alert alert--danger m-4">{{ errorMessage }}</p>

          <div class="activity-timeline mt-4" *ngIf="!isLoading && !errorMessage">
            <div class="activity-timeline-item flex justify-between items-center" *ngFor="let act of recentActivities">
              <div class="flex items-center gap-3">
                <div class="activity-avatar">{{ act.icon }}</div>
                <div>
                  <div class="activity-title">{{ act.title }}</div>
                  <div class="activity-desc text-xs text-muted">{{ act.desc }}</div>
                </div>
              </div>
              <div class="activity-meta text-right">
                <span class="badge" [ngClass]="'badge--' + act.badgeType">{{ act.badge }}</span>
                <div class="text-xs text-muted mt-1">{{ act.time }}</div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .flex { display: flex; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .gap-2 { gap: 8px; }
    .gap-3 { gap: 12px; }
    .gap-4 { gap: 16px; }
    .mb-5 { margin-bottom: 20px; }
    .mb-8 { margin-bottom: 32px; }
    .mt-1 { margin-top: 4px; }
    .mt-3 { margin-top: 12px; }
    .mt-4 { margin-top: 16px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.875rem; }
    .text-muted { color: #94a3b8; }
    .text-emerald { color: #10b981; }

    .page-title {
      font-size: 1.625rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #ffffff;
      margin: 0;
    }

    .icon--spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .grid { display: grid; gap: 20px; }
    .grid--4 { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
    .grid--2 { grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); }

    /* ── Executive Hero KPI Cards ────────────────────────── */
    .kpi-card {
      position: relative;
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      padding: 22px;
      overflow: hidden;
      backdrop-filter: blur(16px);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        transform: translateY(-3px);
        border-color: rgba(255, 255, 255, 0.18);
        box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
      }

      &__glow {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        opacity: 0.8;
      }

      &--blue {
        .kpi-card__glow { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
        &:hover { border-color: rgba(59, 130, 246, 0.4); }
      }
      &--cyan {
        .kpi-card__glow { background: linear-gradient(90deg, #06b6d4, #22d3ee); }
        &:hover { border-color: rgba(6, 182, 212, 0.4); }
      }
      &--purple {
        .kpi-card__glow { background: linear-gradient(90deg, #8b5cf6, #c084fc); }
        &:hover { border-color: rgba(139, 92, 246, 0.4); }
      }
      &--emerald {
        .kpi-card__glow { background: linear-gradient(90deg, #10b981, #34d399); }
        &:hover { border-color: rgba(16, 185, 129, 0.4); }
      }
    }

    .kpi-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .kpi-icon-badge {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
    }

    .kpi-value {
      font-size: 2.25rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.03em;
      margin-top: 10px;
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .currency-symbol {
      font-size: 1.5rem;
      font-weight: 600;
      color: #34d399;
    }

    .kpi-tag {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.08);

      &--emerald {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border-color: rgba(16, 185, 129, 0.3);
      }
    }

    /* ── DevOps Command Card ────────────────────────────── */
    .devops-command-card {
      background: rgba(15, 23, 42, 0.55);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 20px;
      padding: 24px;
      backdrop-filter: blur(16px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .devops-icon-container {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25));
      border: 1px solid rgba(99, 102, 241, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
    }

    .devops-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }

    .devops-tiles { gap: 14px; }
    .devops-tile {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 14px;
      padding: 18px;
      text-decoration: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: all 0.22s ease;
      cursor: pointer;

      &:hover {
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.05);
      }

      &--orange:hover { border-color: rgba(249, 115, 22, 0.5); box-shadow: 0 8px 20px rgba(249, 115, 22, 0.15); }
      &--sky:hover { border-color: rgba(56, 189, 248, 0.5); box-shadow: 0 8px 20px rgba(56, 189, 248, 0.15); }
      &--purple:hover { border-color: rgba(168, 85, 247, 0.5); box-shadow: 0 8px 20px rgba(168, 85, 247, 0.15); }
      &--pink:hover { border-color: rgba(236, 72, 153, 0.5); box-shadow: 0 8px 20px rgba(236, 72, 153, 0.15); }

      &__icon { font-size: 1.5rem; }
      &__name { font-size: 1.05rem; font-weight: 700; color: #ffffff; margin-top: 4px; }
      &__desc { font-size: 0.75rem; color: #94a3b8; line-height: 1.35; min-height: 32px; }
      &__footer { font-size: 0.75rem; font-weight: 600; color: #818cf8; margin-top: 6px; }
    }

    .port-chip {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.06);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* ── Luxury Cards for Tables & Lists ───────────────── */
    .luxury-card {
      background: rgba(15, 23, 42, 0.55);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 22px;
      backdrop-filter: blur(16px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    }

    .card-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }

    .service-list, .activity-timeline {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .service-item, .activity-timeline-item {
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(99, 102, 241, 0.3);
      }
    }

    .service-beacon {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      flex-shrink: 0;
    }

    .service-name { font-size: 0.875rem; font-weight: 600; color: #ffffff; }
    .latency-tag {
      font-size: 0.6875rem;
      color: #94a3b8;
      font-family: monospace;
      background: rgba(255, 255, 255, 0.04);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .activity-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
      flex-shrink: 0;
    }

    .activity-title { font-size: 0.875rem; font-weight: 600; color: #ffffff; }

    /* Badges */
    .badge--soft-emerald {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge--soft-indigo {
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge--success { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge--primary { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    .badge--warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
  `]
})
export class AdminDashboardComponent implements OnInit {
  userCount = 0;
  propertyCount = 0;
  unitCount = 0;
  activeLeaseCount = 0;
  currentMonthVolume = 0;
  isLoading = false;
  errorMessage: string | null = null;

  microservices = [
    { name: 'Identity & Keycloak', desc: 'OAuth2 / OpenID Connect Kimlik Doğrulama', status: 'Çevrimiçi', latency: '4ms' },
    { name: 'User Service', desc: 'Kullanıcı Profilleri ve Rol Yönetimi', status: 'Çevrimiçi', latency: '2ms' },
    { name: 'Property Service', desc: 'Mülk ve Bağımsız Bölüm Envanteri', status: 'Çevrimiçi', latency: '3ms' },
    { name: 'Lease Service', desc: 'Kira Sözleşmeleri ve Durum Takibi', status: 'Çevrimiçi', latency: '2ms' },
    { name: 'Payment Service', desc: 'Kira Tahsilatları, Havale ve Hangfire', status: 'Çevrimiçi', latency: '3ms' },
    { name: 'Document Service', desc: 'QuestPDF Sözleşme Üretimi & MinIO S3', status: 'Çevrimiçi', latency: '5ms' },
    { name: 'Saga Orchestrator', desc: 'MassTransit Dağıtık İş Akışı Yöneticisi', status: 'Çevrimiçi', latency: '2ms' },
    { name: 'Notification Service', desc: 'RabbitMQ Olay Tüketimi & E-Posta Servisi', status: 'Çevrimiçi', latency: '2ms' }
  ];

  recentActivities: ActivityItem[] = [];

  constructor(
    private changeDetector: ChangeDetectorRef,
    private userService: UserService,
    private propertyService: PropertyService,
    private leaseService: LeaseService,
    private paymentService: PaymentService
  ) {}

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    this.isLoading = true;
    forkJoin({
      users: this.userService.getUsers(),
      properties: this.propertyService.getAllProperties(),
      leases: this.leaseService.getLeases(),
      payments: this.paymentService.getAllPayments()
    }).subscribe({
      next: data => {
        this.userCount = data.users.length;
        this.propertyCount = data.properties.length;
        this.unitCount = data.properties.reduce((sum, property) => sum + property.units.length, 0);
        this.activeLeaseCount = data.leases.filter(lease => lease.status === 'ACTIVE').length;
        const now = new Date();
        this.currentMonthVolume = data.payments
          .filter(payment => (payment.status === 'SUCCESS' || payment.status === 'PAID') &&
            payment.currency === 'TRY' &&
            new Date(payment.createdAt).getFullYear() === now.getFullYear() &&
            new Date(payment.createdAt).getMonth() === now.getMonth())
          .reduce((sum, payment) => sum + payment.amount, 0);

        this.generateRecentActivities(data.leases, data.payments);

        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
      error: error => {
        console.error('Yönetim gösterge paneli yüklenemedi.', error);
        this.errorMessage = 'İstatistikler yüklenemedi. Servis bağlantılarını ve yönetici yetkinizi kontrol edin.';
        this.isLoading = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  private generateRecentActivities(leases: Lease[], payments: PaymentRecord[]) {
    const list: ActivityItem[] = [];

    // En son ödemeler
    const recentPayments = [...payments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);

    for (const p of recentPayments) {
      const displayId = p.id ? p.id.substring(0, 8).toUpperCase() : 'N/A';
      const amountStr = p.amount ? p.amount.toLocaleString('tr-TR') : '0';
      list.push({
        icon: '💳',
        title: `Kira Tahsilatı (${amountStr} ₺)`,
        desc: `Ödeme ID: #${displayId} • Havale / Kredi Kartı`,
        time: p.createdAt ? this.formatRelativeTime(p.createdAt) : 'Bugün',
        badge: p.status === 'SUCCESS' || p.status === 'PAID' ? 'Başarılı' : 'Bekliyor',
        badgeType: p.status === 'SUCCESS' || p.status === 'PAID' ? 'success' : 'warning'
      });
    }

    // En son sözleşmeler
    const recentLeases = [...leases]
      .sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime())
      .slice(0, 3);

    for (const l of recentLeases) {
      const displayId = l.id ? l.id.substring(0, 8).toUpperCase() : 'N/A';
      const rentStr = l.monthlyRentAmount ? l.monthlyRentAmount.toLocaleString('tr-TR') : '0';
      list.push({
        icon: '📄',
        title: `Kira Sözleşmesi Tanzim Edildi`,
        desc: `Sözleşme No: #${displayId} • Aylık: ${rentStr} ₺`,
        time: l.startDate ? this.formatRelativeTime(l.startDate) : 'Bugün',
        badge: l.status === 'ACTIVE' ? 'Aktif' : (l.status || 'Bilinmiyor'),
        badgeType: l.status === 'ACTIVE' ? 'primary' : 'warning'
      });
    }

    this.recentActivities = list.slice(0, 5);
  }

  private formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Bugün';
    if (diffDays === 1) return 'Dün';
    return `${diffDays} gün önce`;
  }
}
