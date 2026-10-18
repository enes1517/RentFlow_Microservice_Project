import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { selectUserId, selectUserName } from '../../../../store/auth/auth.selectors';
import { filter, forkJoin, map, of, switchMap, take, throwError } from 'rxjs';
import { Lease, LeaseService } from '../../../../core/services/lease.service';
import { PaymentRecord, PaymentService } from '../../../../core/services/payment.service';
import { Property, PropertyService } from '../../../../core/services/property.service';

@Component({
  selector: 'app-landlord-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, BaseChartDirective],
  template: `
    <div class="page animate-slideUp relative">

      <!-- Sayfa Başlığı & Hızlı Aksiyonlar -->
      <div class="page__header flex justify-between items-center mb-6">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="page-title">Hoş Geldin, <span class="gradient-text">{{ userName$ | async }}</span> 🏢</h1>
            <span class="badge badge--soft-emerald">Portföy Yönetim Portalı</span>
          </div>
          <p class="text-sm text-muted mt-1">
            Tüm gayrimenkullerinizin, kira tahsilat akışınızın ve sözleşme durumlarınızın anlık finansal komuta merkezi.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <a routerLink="/landlord/properties" class="btn btn--secondary">
            <span>🏠</span> Mülk Ekle
          </a>
          <a routerLink="/landlord/leases" class="btn btn--primary">
            <span>📄</span> Yeni Sözleşme
          </a>
        </div>
      </div>

      <!-- Durum Mesajları -->
      <p class="text-muted mb-4" *ngIf="isLoading" role="status">Gösterge paneli yükleniyor...</p>
      <p class="alert alert--danger mb-6" *ngIf="errorMessage" role="alert">{{ errorMessage }}</p>

      <!-- 4 Temel Yönetici Finans & Portföy KPI Kartı -->
      <div class="grid grid--4 mb-8" *ngIf="!isLoading">
        
        <!-- Kart 1: Portföy ve Doluluk -->
        <div class="kpi-card kpi-card--blue">
          <div class="kpi-card__top flex justify-between items-center">
            <span class="kpi-label">Kayıtlı Portföy</span>
            <div class="kpi-icon-badge">🏠</div>
          </div>
          <div class="kpi-value">
            {{ properties.length }} <span class="text-sm text-muted font-normal">Mülk</span>
          </div>
          <div class="kpi-footer flex items-center justify-between mt-3">
            <span class="text-xs text-muted">{{ rentedUnits }} Kirada • {{ availableUnits }} Müsait</span>
            <span class="kpi-tag kpi-tag--cyan">%{{ occupancyRate }} Doluluk</span>
          </div>
        </div>

        <!-- Kart 2: Aylık Tahsilat -->
        <div class="kpi-card kpi-card--emerald">
          <div class="kpi-card__top flex justify-between items-center">
            <span class="kpi-label">Bu Ayki Tahsilat</span>
            <div class="kpi-icon-badge">💰</div>
          </div>
          <div class="kpi-value text-emerald">
            {{ collectedThisMonth | number:'1.0-0' }} <span class="currency-symbol">₺</span>
          </div>
          <div class="kpi-footer flex items-center justify-between mt-3">
            <span class="text-xs text-muted">Başarıyla Tahsil Edilen</span>
            <span class="kpi-tag kpi-tag--emerald">Kasa Aktif</span>
          </div>
        </div>

        <!-- Kart 3: Tahakkuk / Bekleyen -->
        <div class="kpi-card kpi-card--gold">
          <div class="kpi-card__top flex justify-between items-center">
            <span class="kpi-label">Tahakkuk / Bekleyen</span>
            <div class="kpi-icon-badge">⏳</div>
          </div>
          <div class="kpi-value text-warning">
            {{ outstandingAmount | number:'1.0-0' }} <span class="currency-symbol">₺</span>
          </div>
          <div class="kpi-footer flex items-center justify-between mt-3">
            <span class="text-xs text-warning">Bekleyen Kira Alacağı</span>
            <span class="kpi-tag kpi-tag--gold">{{ outstandingAmount > 0 ? 'Ödeme Bekleniyor' : 'Güncel' }}</span>
          </div>
        </div>

        <!-- Kart 4: Aktif Sözleşmeler -->
        <div class="kpi-card kpi-card--purple">
          <div class="kpi-card__top flex justify-between items-center">
            <span class="kpi-label">Yürürlükteki Sözleşmeler</span>
            <div class="kpi-icon-badge">📄</div>
          </div>
          <div class="kpi-value text-indigo">
            {{ activeLeasesCount }} <span class="text-sm text-muted font-normal">Aktif</span>
          </div>
          <div class="kpi-footer flex items-center justify-between mt-3">
            <span class="text-xs text-muted">Toplam {{ leases.length }} Kontrat</span>
            <span class="kpi-tag kpi-tag--indigo">Saga Onaylı</span>
          </div>
        </div>

      </div>

      <!-- 2 Kolonlu Ana Bölüm: Gelir Grafiği & Dikkat Gerektirenler -->
      <div class="grid grid--2" *ngIf="!isLoading">
        
        <!-- Gelir Grafiği Kartı -->
        <div class="card">
          <div class="section-header flex justify-between items-center mb-4">
            <div class="flex items-center gap-2">
              <span class="text-lg">📈</span>
              <h3 class="card-title">Son 6 Ayda Kaydedilen Ödemeler</h3>
            </div>
            <a routerLink="/landlord/income-report" class="text-sm font-semibold text-cyan hover:underline">Detaylı Rapor →</a>
          </div>
          <div class="chart-container">
            <canvas baseChart
              [data]="barChartData"
              [options]="barChartOptions"
              [type]="'bar'">
            </canvas>
          </div>
        </div>

        <!-- Son İşlemler / Gecikmeler Kartı -->
        <div class="card">
          <div class="section-header flex justify-between items-center mb-4">
            <div class="flex items-center gap-2">
              <span class="text-lg">⚠️</span>
              <h3 class="card-title">Dikkat Gerektirenler</h3>
            </div>
            <a routerLink="/landlord/tenants" class="text-sm font-semibold text-cyan hover:underline">Kiracıları Gör →</a>
          </div>
          
          <div class="payment-list">
            <div class="payment-item" *ngFor="let payment of attentionPayments">
              <div class="payment-item__icon warning">!</div>
              <div class="payment-item__info">
                <div class="title">{{ payment.status === 'LATE' ? 'Ödeme gecikmiş' : 'Ödeme başarısız' }}</div>
                <div class="date font-mono">{{ payment.createdAt | date:'shortDate' }} — {{ payment.amount | number:'1.2-2' }} {{ payment.currency }}</div>
              </div>
              <span class="badge badge--danger">{{ payment.status === 'LATE' ? 'Gecikmiş' : 'Başarısız' }}</span>
            </div>
            <div class="empty-notice p-6 text-center" *ngIf="attentionPayments.length === 0">
              <span class="text-2xl block mb-2">🎉</span>
              <p class="text-sm text-muted">Son ödeme sorgusunda gecikmiş veya başarısız işlem bulunmadı. Tüm tahsilatlar güncel!</p>
            </div>
            <p class="alert alert--danger" *ngIf="errorMessage">{{ errorMessage }}</p>
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

    .kpi-card {
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

      &--blue { border-left: 4px solid #3b82f6; }
      &--purple { border-left: 4px solid #8b5cf6; }
      &--cyan { border-left: 4px solid #06b6d4; }
      &--emerald { border-left: 4px solid #10b981; }
      &--gold { border-left: 4px solid #f59e0b; }

      &__top { margin-bottom: 8px; }

      .kpi-label {
        font-size: 0.75rem;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .kpi-icon-badge {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.125rem;
      }

      .kpi-value {
        font-size: 1.875rem;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: -0.03em;
        line-height: 1.1;
      }

      .kpi-tag {
        font-size: 0.6875rem;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.06);
        color: #cbd5e1;

        &--indigo { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
        &--cyan { background: rgba(6, 182, 212, 0.15); color: #22d3ee; }
        &--emerald { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        &--gold { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
      }
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
        
        &.warning {
          color: #fbbf24;
          background: rgba(245, 158, 11, 0.15);
          border-color: rgba(245, 158, 11, 0.3);
        }
      }

      &__info {
        flex: 1;
        
        .title { font-weight: 600; color: #ffffff; font-size: 0.9375rem; }
        .date { font-size: 0.75rem; color: #64748b; margin-top: 2px; }
      }
    }

    .empty-notice {
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed rgba(255, 255, 255, 0.08);
      border-radius: 14px;
    }

    .chart-container {
      position: relative;
      height: 300px;
      width: 100%;
      padding-top: 10px;
    }
  `]
})
export class LandlordDashboardComponent implements OnInit {
  private store = inject(Store);
  private leaseService = inject(LeaseService);
  private paymentService = inject(PaymentService);
  private propertyService = inject(PropertyService);
  private changeDetector = inject(ChangeDetectorRef);
  
  userName$ = this.store.select(selectUserName).pipe(
    map(name => name.split(' ')[0])
  );

  properties: Property[] = [];
  leases: Lease[] = [];
  payments: PaymentRecord[] = [];
  attentionPayments: PaymentRecord[] = [];
  errorMessage: string | null = null;
  isLoading = false;
  collectedThisMonth = 0;
  outstandingAmount = 0;
  rentedUnits = 0;
  availableUnits = 0;

  get occupancyRate(): number {
    const total = this.rentedUnits + this.availableUnits;
    return total > 0 ? Math.round((this.rentedUnits / total) * 100) : 0;
  }

  get activeLeasesCount(): number {
    return this.leases.filter(lease => lease.status === 'ACTIVE').length;
  }

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
        label: 'Aylık Gelir (₺)',
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        hoverBackgroundColor: '#8b5cf6',
        borderRadius: 4,
      }
    ]
  };

  ngOnInit() {
    this.isLoading = true;
    this.store.select(selectUserId).pipe(
      filter((id): id is string => Boolean(id)),
      take(1),
      switchMap(id => forkJoin({
        properties: this.propertyService.getProperties(id),
        leases: this.leaseService.getLeasesByLandlord(id)
      })),
      switchMap(data => {
        this.properties = data.properties ?? [];
        this.leases = data.leases ?? [];
        const leases = this.leases.length
          ? forkJoin(this.leases.map(lease => this.paymentService.getPaymentsByLease(lease.id)))
          : of([]);
        return leases.pipe(map(records => ({ ...data, records: records.flat() })));
      })
    ).subscribe({
      next: data => {
        this.payments = data.records;
        const rentPayments = this.payments.filter(payment => payment.paymentType === 'RENT');
        this.attentionPayments = rentPayments
          .filter(payment => payment.status === 'FAILED' || payment.status === 'LATE');
        const now = new Date();
        this.collectedThisMonth = rentPayments
          .filter(payment => (payment.status === 'SUCCESS' || payment.status === 'PAID') &&
            new Date(payment.createdAt).getFullYear() === now.getFullYear() &&
            new Date(payment.createdAt).getMonth() === now.getMonth())
          .reduce((total, payment) => total + payment.amount, 0);
        const paidLeaseIds = new Set(rentPayments
          .filter(payment => (payment.status === 'SUCCESS' || payment.status === 'PAID') &&
            new Date(payment.createdAt).getFullYear() === now.getFullYear() &&
            new Date(payment.createdAt).getMonth() === now.getMonth())
          .map(payment => payment.leaseId));
        this.outstandingAmount = this.leases
          .filter(lease => lease.status === 'ACTIVE' && !paidLeaseIds.has(lease.id))
          .reduce((total, lease) => total + lease.monthlyRentAmount, 0);
        this.rentedUnits = this.properties.reduce(
          (total, property) => total + property.units.filter(unit => unit.status === 'RENTED').length, 0);
        this.availableUnits = this.properties.reduce(
          (total, property) => total + property.units.filter(unit => unit.status === 'AVAILABLE').length, 0);
        this.updateChart();
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
      error: error => {
        console.error('Gösterge paneli verileri yüklenemedi.', error);
        this.errorMessage = 'Gösterge paneli verileri yüklenemedi. Oturumunuzu ve API bağlantısını kontrol edin.';
        this.isLoading = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  private updateChart() {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      return {
        year: month.getFullYear(),
        month: month.getMonth(),
        label: month.toLocaleDateString('tr-TR', { month: 'short' })
      };
    });
    this.barChartData = {
      ...this.barChartData,
      labels: months.map(month => month.label),
      datasets: [{
        ...this.barChartData.datasets[0],
        data: months.map(month => this.payments
          .filter(payment => payment.paymentType === 'RENT' &&
            (payment.status === 'SUCCESS' || payment.status === 'PAID') &&
            new Date(payment.createdAt).getFullYear() === month.year &&
            new Date(payment.createdAt).getMonth() === month.month)
          .reduce((total, payment) => total + payment.amount, 0))
      }]
    };
  }
}
