import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { selectUserId, selectUserName } from '../../../store/auth/auth.selectors';
import { map } from 'rxjs/operators';
import { forkJoin, switchMap, take, throwError } from 'rxjs';
import { Lease, LeaseService } from '../../../core/services/lease.service';
import { PaymentRecord, PaymentService } from '../../../core/services/payment.service';

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, BaseChartDirective],
  template: `
    <div class="page animate-slideUp">
      <!-- Sayfa Başlığı -->
      <div class="page__header flex justify-between items-center mb-8">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="page-title">Merhaba, <span class="gradient-text">{{ userName$ | async }}</span> 👋</h1>
            <span class="badge badge--soft-emerald">Kiracı Portalı</span>
          </div>
          <p class="text-sm text-muted mt-1">İşte kira sözleşmeniz, finansal yükümlülükleriniz ve mülkünüzle ilgili güncel özet.</p>
        </div>
        <div class="header-action">
          <a routerLink="/tenant/payment" class="btn btn--primary">
            <span>💳</span> Kira Öde
          </a>
        </div>
      </div>

      <!-- Durum Bildirimleri -->
      <p class="text-muted mb-4" *ngIf="isLoading" role="status">Gösterge paneli yükleniyor...</p>
      <p class="alert alert--danger mb-6" *ngIf="errorMessage" role="alert">{{ errorMessage }}</p>

      <!-- Aktif Sözleşme Lüks Kahraman Kartı (Active Rental Hero Banner) -->
      <div class="rental-hero-card mb-8" *ngIf="!isLoading && !errorMessage && activeLease">
        <div class="rental-hero-card__glow"></div>
        <div class="flex justify-between items-start flex-wrap gap-4">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="badge badge--soft-emerald">
                <span class="pulse-dot"></span> Aktif Kira Sözleşmesi
              </span>
              <span class="font-mono text-xs text-muted">ID: {{ activeLease.id }}</span>
            </div>
            <h2 class="hero-property-title">Kiralık Konut / Bağımsız Bölüm</h2>
            <p class="text-xs text-muted mt-1">
              Sözleşme Başlangıç: {{ activeLease.startDate | date:'mediumDate' }} • Bitiş: {{ activeLease.endDate | date:'mediumDate' }}
            </p>
          </div>

          <div class="hero-due-badge text-right">
            <div class="text-xs text-muted uppercase font-bold tracking-wider">Aylık Kira Bedeli</div>
            <div class="hero-rent-amount text-emerald font-bold text-2xl font-mono">
              {{ activeLease.monthlyRentAmount | number:'1.0-0' }} ₺
            </div>
            <div class="text-xs text-cyan mt-1">Depozito: {{ activeLease.depositAmount | number:'1.0-0' }} ₺</div>
          </div>
        </div>

        <!-- Sözleşme İlerleme Çubuğu -->
        <div class="hero-progress-section mt-5 pt-4 border-t border-white-10">
          <div class="flex justify-between items-center text-xs mb-2">
            <span class="text-muted">Kira Sözleşmesi Tamamlanma Oranı: <strong class="text-white">%{{ leaseProgressPercent }}</strong></span>
            <span class="text-cyan font-bold font-mono">Kalan Süre: {{ daysRemaining }} Gün</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" [style.width.%]="leaseProgressPercent"></div>
          </div>
        </div>
      </div>

      <!-- Quick Stats / 4 Temel Metrik Kartı -->
      <div class="grid grid--4 mb-8" *ngIf="!isLoading">
        <!-- Next Payment / Sözleşme Durumu -->
        <div class="stat-card stat-card--indigo">
          <div class="stat-card__icon">📅</div>
          <div>
            <div class="stat-card__label">Sözleşme Durumu</div>
            <div class="stat-card__value" style="font-size: 1.5rem">
              {{ activeLease ? getLeaseStatus(activeLease.status) : 'Sözleşme yok' }}
            </div>
          </div>
          <div class="text-xs text-muted mt-2 flex items-center justify-between">
            <span>{{ activeLease ? 'Bitiş: ' + (activeLease.endDate | date:'mediumDate') : 'Sözleşme kaydı bulunamadı' }}</span>
            <span class="badge badge--soft-emerald" *ngIf="activeLease">Aktif</span>
          </div>
        </div>

        <!-- Rent Amount -->
        <div class="stat-card stat-card--emerald card--accent">
          <div class="stat-card__icon">💰</div>
          <div>
            <div class="stat-card__label">Aylık Kira Bedeli</div>
            <div class="stat-card__value currency text-emerald">
              {{ activeLease?.monthlyRentAmount ?? 0 | number:'1.0-0' }} ₺
            </div>
          </div>
          <div class="text-xs text-muted mt-2">
            {{ activeLease ? 'Sözleşmeye göre aylık tutar' : 'Aktif kira bedeli yok' }}
          </div>
        </div>

        <!-- Deposit Amount -->
        <div class="stat-card stat-card--purple">
          <div class="stat-card__icon">🛡️</div>
          <div>
            <div class="stat-card__label">Güvence / Depozito</div>
            <div class="stat-card__value currency text-indigo">
              {{ activeLease?.depositAmount ?? 0 | number:'1.0-0' }} ₺
            </div>
          </div>
          <div class="text-xs text-muted mt-2">
            {{ activeLease ? 'Emanet hesabı teminatı' : 'Depozito kaydı yok' }}
          </div>
        </div>

        <!-- Active Lease / Sözleşme Bitiş -->
        <div class="stat-card stat-card--cyan">
          <div class="stat-card__icon">⏳</div>
          <div>
            <div class="stat-card__label">Kalan Sözleşme Süresi</div>
            <div class="stat-card__value text-cyan" style="font-size: 1.5rem">
              {{ activeLease ? daysRemaining + ' Gün' : '—' }}
            </div>
          </div>
          <p class="text-muted mt-2" *ngIf="!activeLease">Sözleşme bilgisi bulunmuyor.</p>
          <div class="text-xs text-muted mt-2" *ngIf="activeLease">
            Bitiş: {{ activeLease.endDate | date:'mediumDate' }}
          </div>
        </div>
      </div>

      <!-- 2 Kolonlu Alt Izgara: Son Ödemeler & Yıllık Analiz Grafiği -->
      <div class="grid grid--2" *ngIf="!isLoading">
        
        <!-- Ödeme Geçmişi Özeti -->
        <div class="card">
          <div class="section-header flex justify-between items-center mb-4">
            <div class="flex items-center gap-2">
              <span class="text-lg">📜</span>
              <h3 class="card-title">Son Ödemeler</h3>
            </div>
            <a routerLink="/tenant/payment-history" class="text-sm font-semibold text-cyan hover:underline">Tümünü Gör →</a>
          </div>
          
          <div class="payment-list">
            <div class="payment-item" *ngFor="let p of recentPayments">
              <div class="payment-item__icon" [class.success]="p.status === 'SUCCESS' || p.status === 'PAID'">
                {{ p.status === 'SUCCESS' || p.status === 'PAID' ? '✓' : '!' }}
              </div>
              <div class="payment-item__info">
                <div class="title">{{ p.paymentType === 'RENT' ? 'Kira Ödemesi' : p.paymentType }} — {{ p.createdAt | date:'mediumDate' }}</div>
                <div class="date font-mono">İşlem ID: #{{ p.id }}</div>
              </div>
              <div class="payment-item__amount currency">{{ p.amount | number:'1.2-2' }} {{ p.currency === 'TRY' ? 'TL' : (p.currency || 'TL') }}</div>
              <div class="payment-item__status">
                <span class="badge" [class.badge--paid]="p.status === 'PAID' || p.status === 'SUCCESS'"
                      [class.badge--pending]="p.status === 'PENDING'"
                      [class.badge--late]="p.status === 'LATE' || p.status === 'FAILED'">
                  {{ getPaymentStatus(p.status) }}
                </span>
              </div>
            </div>
            <p class="text-muted p-4 text-center" *ngIf="!recentPayments.length && !errorMessage">Henüz ödeme kaydı bulunmuyor.</p>
            <p class="alert alert--danger" *ngIf="errorMessage">{{ errorMessage }}</p>
          </div>

          <div class="mt-6">
            <a routerLink="/tenant/payment" class="btn btn--primary w-full text-center block">
              <span>💳</span> Ödeme Ekranını Görüntüle
            </a>
          </div>
        </div>

        <!-- Yıllık Ödeme Grafiği -->
        <div class="card">
          <div class="section-header flex justify-between items-center mb-4">
            <div class="flex items-center gap-2">
              <span class="text-lg">📈</span>
              <h3 class="card-title">Yıllık Ödeme Analizi</h3>
            </div>
            <span class="badge badge--soft-indigo">12 Aylık Trend</span>
          </div>
          <div class="chart-container">
            <canvas baseChart
              [data]="barChartData"
              [options]="barChartOptions"
              [type]="'bar'">
            </canvas>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .page-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
    }

    .rental-hero-card {
      position: relative;
      background: linear-gradient(135deg, rgba(17, 23, 38, 0.85) 0%, rgba(12, 16, 26, 0.95) 100%);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 20px;
      padding: 24px;
      overflow: hidden;
      backdrop-filter: blur(16px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);

      &__glow {
        position: absolute;
        top: -60px;
        right: -60px;
        width: 180px;
        height: 180px;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%);
        pointer-events: none;
      }
    }

    .hero-property-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffffff;
    }

    .progress-track {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #06b6d4);
      border-radius: 9999px;
      transition: width 0.6s ease;
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
      display: inline-block;
      margin-right: 4px;
    }

    .stat-card {
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 22px;
      backdrop-filter: blur(16px);
      transition: all 0.22s ease;

      &:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.16);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
      }

      &--indigo { border-left: 4px solid #6366f1; }
      &--emerald { border-left: 4px solid #10b981; }
      &--cyan { border-left: 4px solid #06b6d4; }
      &--purple { border-left: 4px solid #8b5cf6; }

      &__icon { font-size: 1.75rem; margin-bottom: 8px; }
      &__label { font-size: 0.75rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
      &__value { font-size: 1.875rem; font-weight: 800; color: #ffffff; margin-top: 4px; letter-spacing: -0.02em; }
    }

    .payment-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .payment-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.12);
        transform: translateX(3px);
      }

      &__icon {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        flex-shrink: 0;
        
        &.success {
          color: #34d399;
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.3);
        }
      }

      &__info {
        flex: 1;
        
        .title { font-weight: 600; color: #ffffff; font-size: 0.9375rem; }
        .date { font-size: 0.75rem; color: #64748b; margin-top: 2px; }
      }

      &__amount { font-size: 1.0625rem; font-weight: 700; color: #ffffff; }
    }

    .chart-container {
      position: relative;
      height: 300px;
      width: 100%;
      padding-top: 10px;
    }

    .border-white-10 { border-color: rgba(255, 255, 255, 0.08); }
    .border-t { border-top: 1px solid rgba(255, 255, 255, 0.08); }
    .w-full { width: 100%; }
    .block { display: block; }
  `]
})
export class TenantDashboardComponent implements OnInit {
  private store = inject(Store);
  private leaseService = inject(LeaseService);
  private paymentService = inject(PaymentService);
  private changeDetector = inject(ChangeDetectorRef);
  
  userName$ = this.store.select(selectUserName).pipe(
    map(name => name.split(' ')[0]) // Sadece ilk isim
  );

  activeLease: Lease | null = null;
  recentPayments: PaymentRecord[] = [];
  errorMessage: string | null = null;
  isLoading = false;

  // Chart.js Configuration
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a2035',
        titleColor: '#f1f5f9',
        bodyColor: '#f1f5f9',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8' }
      }
    }
  };

  barChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Ödenen Kira (₺)',
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        hoverBackgroundColor: '#8b5cf6',
        borderRadius: 4,
      }
    ]
  };

  ngOnInit() {
    this.isLoading = true;
    this.store.select(selectUserId).pipe(
      take(1),
      switchMap(id => id
        ? forkJoin({
            leases: this.leaseService.getLeasesByTenant(id),
            payments: this.paymentService.getPaymentsByTenant(id)
          })
        : throwError(() => new Error('Oturum kullanıcı profili bulunamadı.')))
    ).subscribe({
      next: data => {
        this.activeLease = data.leases.find(lease => lease.status === 'ACTIVE') ?? null;
        this.recentPayments = (data.payments ?? []).slice()
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
          .slice(0, 5);
        this.updateChart(data.payments ?? []);
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
      error: error => {
        console.error('Kiracı gösterge paneli yüklenemedi.', error);
        this.errorMessage = 'Gösterge paneli verileri yüklenemedi. Oturumunuzu ve API bağlantısını kontrol edin.';
        this.isLoading = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  get daysRemaining(): number {
    if (!this.activeLease || !this.activeLease.endDate) return 0;
    const end = new Date(this.activeLease.endDate).getTime();
    const now = Date.now();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }

  get leaseProgressPercent(): number {
    if (!this.activeLease || !this.activeLease.startDate || !this.activeLease.endDate) return 0;
    const start = new Date(this.activeLease.startDate).getTime();
    const end = new Date(this.activeLease.endDate).getTime();
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  }

  getLeaseStatus(status: string) {
    return status === 'ACTIVE' ? 'Aktif' : status === 'PENDING' ? 'Onay bekliyor' : status;
  }

  getPaymentStatus(status: string) {
    return status === 'SUCCESS' || status === 'PAID' ? 'Ödendi'
      : status === 'FAILED' ? 'Başarısız' : status === 'PENDING' ? 'Bekliyor'
        : status === 'LATE' ? 'Gecikmiş' : status;
  }

  private updateChart(payments: PaymentRecord[]) {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
      return {
        year: date.getFullYear(),
        month: date.getMonth(),
        label: date.toLocaleDateString('tr-TR', { month: 'short' })
      };
    });
    this.barChartData = {
      ...this.barChartData,
      labels: months.map(month => month.label),
      datasets: [{
        ...this.barChartData.datasets[0],
        data: months.map(month => payments
          .filter(payment => (payment.status === 'SUCCESS' || payment.status === 'PAID') &&
            new Date(payment.createdAt).getFullYear() === month.year &&
            new Date(payment.createdAt).getMonth() === month.month)
          .reduce((sum, payment) => sum + payment.amount, 0))
      }]
    };
  }
}
