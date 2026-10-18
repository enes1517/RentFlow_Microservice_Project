import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { forkJoin, map, of, switchMap, take } from 'rxjs';
import { selectUserId } from '../../../store/auth/auth.selectors';
import { MaintenanceRequest, MaintenanceService } from '../../../core/services/maintenance.service';
import { PropertyService } from '../../../core/services/property.service';

@Component({
  selector: 'app-landlord-maintenance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page animate-slideUp">
      <!-- Sayfa Başlığı -->
      <header class="page__header flex items-center justify-between mb-8">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="page-title">Bakım & Arıza Yönetimi</h1>
            <span class="badge badge--soft-indigo">Mülk Operasyonları</span>
          </div>
          <p class="text-sm text-muted mt-1">
            Kiracılarınızdan gelen arıza ve bakım taleplerini inceleyin, iş akışını yönetin ve sonuçlandırın.
          </p>
        </div>
        <button class="btn btn--secondary" type="button" (click)="loadRequests()" [disabled]="isLoading || !landlordId">
          <span class="icon" [class.icon--spin]="isLoading">🔄</span>
          {{ isLoading ? 'Yenileniyor...' : 'Talepleri Yenile' }}
        </button>
      </header>

      <!-- KPI Özet Göstergeleri -->
      <div class="grid grid--4 mb-8" *ngIf="!isLoading && !errorMessage && requests.length > 0">
        <div class="stat-kpi-card">
          <div class="stat-kpi-label">Toplam Talep</div>
          <div class="stat-kpi-val">{{ requests.length }}</div>
          <div class="stat-kpi-sub text-muted">Kayıtlı bildirim</div>
        </div>
        <div class="stat-kpi-card stat-kpi-card--cyan">
          <div class="stat-kpi-label">Açık / Yeni</div>
          <div class="stat-kpi-val text-cyan">{{ getOpenCount() }}</div>
          <div class="stat-kpi-sub text-muted">İnceleme bekleyen</div>
        </div>
        <div class="stat-kpi-card stat-kpi-card--amber">
          <div class="stat-kpi-label">İşlemde</div>
          <div class="stat-kpi-val text-amber">{{ getInProgressCount() }}</div>
          <div class="stat-kpi-sub text-muted">Müdahale ediliyor</div>
        </div>
        <div class="stat-kpi-card stat-kpi-card--emerald">
          <div class="stat-kpi-label">Çözüldü & Kapalı</div>
          <div class="stat-kpi-val text-emerald">{{ getResolvedCount() }}</div>
          <div class="stat-kpi-sub text-muted">Tamamlanmış</div>
        </div>
      </div>

      <!-- Hata & Yükleniyor Durumu -->
      <div class="alert alert--danger mb-6" *ngIf="errorMessage" role="alert">
        <span>⚠️</span>
        <span>{{ errorMessage }}</span>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <div class="spinner"></div>
        <p class="text-muted mt-3">Bakım ve arıza talepleri taranıyor...</p>
      </div>

      <!-- Boş Durum -->
      <div class="empty-state-luxury" *ngIf="!isLoading && !errorMessage && requests.length === 0">
        <div class="empty-icon-wrap">🛠️</div>
        <h3>Henüz Aktif Bakım Talebi Yok</h3>
        <p class="text-muted">Mülkleriniz için kiracılardan iletilen herhangi bir arıza veya bakım talebi bulunmuyor.</p>
      </div>

      <!-- Talep Kartları Izgarası -->
      <div class="grid grid--2" *ngIf="!isLoading && requests.length > 0">
        <article
          class="maintenance-card"
          *ngFor="let request of requests; trackBy: trackById"
          [attr.data-priority]="request.priority"
        >
          <!-- Üst Durum ve Öncelik Şeridi -->
          <div class="maintenance-card__top flex items-center justify-between gap-4 mb-4">
            <span class="badge"
              [class.badge--info]="request.status === 'OPEN'"
              [class.badge--pending]="request.status === 'IN_PROGRESS'"
              [class.badge--completed]="request.status === 'RESOLVED' || request.status === 'CLOSED'">
              {{ statusLabel(request.status) }}
            </span>

            <span class="priority-pill" [class]="'priority-pill--' + (request.priority || 'MEDIUM').toLowerCase()">
              <span class="priority-dot"></span>
              {{ priorityLabel(request.priority) }} Öncelik
            </span>
          </div>

          <h2 class="maintenance-title mb-2">{{ request.title }}</h2>
          <p class="maintenance-desc mb-4">{{ request.description }}</p>

          <!-- Bilgi Detayları -->
          <div class="meta-chips-grid mb-4">
            <div class="meta-chip">
              <span class="meta-chip__icon">🏢</span>
              <div class="meta-chip__body">
                <span class="meta-chip__label">Bağımsız Birim</span>
                <span class="meta-chip__val mono">{{ request.unitId || 'Tüm Mülk' }}</span>
              </div>
            </div>

            <div class="meta-chip">
              <span class="meta-chip__icon">👤</span>
              <div class="meta-chip__body">
                <span class="meta-chip__label">Kiracı</span>
                <span class="meta-chip__val mono">{{ (request.tenantId | slice:0:8) || 'Bilinmiyor' }}...</span>
              </div>
            </div>

            <div class="meta-chip meta-chip--full">
              <span class="meta-chip__icon">📅</span>
              <div class="meta-chip__body">
                <span class="meta-chip__label">Bildirim Tarihi</span>
                <span class="meta-chip__val">{{ request.createdAt | date:'d MMMM y, HH:mm' }}</span>
              </div>
            </div>
          </div>

          <!-- Aksiyon Butonları -->
          <div class="maintenance-card__actions flex items-center gap-3 pt-4" *ngIf="request.id && request.status !== 'CLOSED'">
            <button
              *ngIf="request.status === 'OPEN'"
              class="btn btn--secondary btn--sm flex-1"
              type="button"
              (click)="changeStatus(request, 'IN_PROGRESS')"
              [disabled]="updatingId === request.id">
              <span>⚙️</span> İşleme Al
            </button>

            <button
              *ngIf="request.status === 'IN_PROGRESS'"
              class="btn btn--primary btn--sm flex-1"
              type="button"
              (click)="changeStatus(request, 'RESOLVED')"
              [disabled]="updatingId === request.id">
              <span>✅</span> Çözüldü Olarak İşaretle
            </button>

            <button
              *ngIf="request.status === 'RESOLVED'"
              class="btn btn--secondary btn--sm flex-1"
              type="button"
              (click)="changeStatus(request, 'CLOSED')"
              [disabled]="updatingId === request.id">
              <span>🔒</span> Talebi Kapat
            </button>
          </div>

          <!-- Güncelleniyor bildirim durumu -->
          <div class="status-updating-notice mt-3" *ngIf="updatingId === request.id">
            <span class="spinner-sm"></span> Talep durumu güncelleniyor...
          </div>
        </article>
      </div>
    </section>
  `,
  styles: [`
    .flex { display: flex; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .gap-2 { gap: 8px; }
    .gap-3 { gap: 12px; }
    .gap-4 { gap: 16px; }
    .flex-1 { flex: 1; }
    .mb-2 { margin-bottom: 8px; }
    .mb-4 { margin-bottom: 16px; }
    .mb-6 { margin-bottom: 24px; }
    .mb-8 { margin-bottom: 32px; }
    .mt-1 { margin-top: 4px; }
    .mt-3 { margin-top: 12px; }
    .pt-4 { padding-top: 16px; }
    .text-sm { font-size: 0.875rem; }
    .text-muted { color: #94a3b8; }
    .text-cyan { color: #22d3ee; }
    .text-amber { color: #fbbf24; }
    .text-emerald { color: #34d399; }
    .mono { font-family: var(--font-mono, monospace); }

    .page-title {
      font-size: 1.625rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #ffffff;
      margin: 0;
    }

    .icon--spin {
      display: inline-block;
      animation: spin 1s linear infinite;
    }

    @keyframes spin { 100% { transform: rotate(360deg); } }

    .grid { display: grid; gap: 20px; }
    .grid--4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    .grid--2 { grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); }

    /* KPI Summary Cards */
    .stat-kpi-card {
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      padding: 20px;
      backdrop-filter: blur(16px);
      transition: all 0.22s ease;

      &:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.16);
      }

      &--cyan { border-top: 3px solid #06b6d4; }
      &--amber { border-top: 3px solid #f59e0b; }
      &--emerald { border-top: 3px solid #10b981; }
    }

    .stat-kpi-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .stat-kpi-val {
      font-size: 2rem;
      font-weight: 800;
      color: #ffffff;
      margin: 6px 0 2px 0;
      letter-spacing: -0.02em;
    }

    .stat-kpi-sub {
      font-size: 0.75rem;
    }

    /* Maintenance Ticket Card */
    .maintenance-card {
      position: relative;
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 24px;
      backdrop-filter: blur(18px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        width: 4px;
        background: #3b82f6;
      }

      &[data-priority="CRITICAL"]::before { background: #ef4444; box-shadow: 0 0 12px rgba(239, 68, 68, 0.8); }
      &[data-priority="HIGH"]::before { background: #f59e0b; box-shadow: 0 0 12px rgba(245, 158, 11, 0.8); }
      &[data-priority="MEDIUM"]::before { background: #06b6d4; }
      &[data-priority="LOW"]::before { background: #10b981; }

      &:hover {
        transform: translateY(-3px);
        border-color: rgba(99, 102, 241, 0.35);
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
      }
    }

    .priority-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      background: rgba(255, 255, 255, 0.05);
      color: #94a3b8;
      border: 1px solid rgba(255, 255, 255, 0.1);

      .priority-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }

      &--critical {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
        border-color: rgba(239, 68, 68, 0.3);
      }
      &--high {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
        border-color: rgba(245, 158, 11, 0.3);
      }
      &--medium {
        background: rgba(6, 182, 212, 0.15);
        color: #22d3ee;
        border-color: rgba(6, 182, 212, 0.3);
      }
      &--low {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border-color: rgba(16, 185, 129, 0.3);
      }
    }

    .maintenance-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 6px 0;
      line-height: 1.35;
    }

    .maintenance-desc {
      font-size: 0.875rem;
      color: #94a3b8;
      line-height: 1.5;
      margin: 0;
    }

    .meta-chips-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .meta-chip {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 10px;

      &--full { grid-column: span 2; }
      &__icon { font-size: 1.1rem; }
      &__body { display: flex; flex-direction: column; }
      &__label { font-size: 0.6875rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; }
      &__val { font-size: 0.8125rem; font-weight: 600; color: #e2e8f0; }
    }

    .maintenance-card__actions {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .status-updating-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.75rem;
      color: #818cf8;
    }

    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(99, 102, 241, 0.2);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Badges */
    .badge--soft-indigo {
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .empty-state-luxury {
      background: rgba(15, 23, 42, 0.45);
      border: 1px dashed rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 56px 24px;
      text-align: center;
      .empty-icon-wrap { font-size: 3.5rem; margin-bottom: 16px; opacity: 0.6; }
      h3 { font-size: 1.25rem; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
      p { max-width: 440px; margin: 0 auto; font-size: 0.875rem; }
    }

    .loading-state {
      text-align: center;
      padding: 48px;
      .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(99, 102, 241, 0.2);
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto;
      }
    }
  `]
})
export class LandlordMaintenanceComponent implements OnInit {
  landlordId: string | null = null;
  requests: MaintenanceRequest[] = [];
  isLoading = false;
  updatingId: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private readonly changeDetector: ChangeDetectorRef,
    private readonly store: Store,
    private readonly maintenanceService: MaintenanceService,
    private readonly propertyService: PropertyService
  ) {}

  ngOnInit(): void {
    this.store.select(selectUserId).pipe(take(1)).subscribe(id => {
      if (!id) {
        this.errorMessage = 'Oturum profili bulunamadı. Yeniden giriş yapıp tekrar deneyin.';
        this.changeDetector.markForCheck();
        return;
      }
      this.landlordId = id;
      this.loadRequests();
    });
  }

  loadRequests(): void {
    if (!this.landlordId) return;
    this.isLoading = true;
    this.errorMessage = null;
    this.propertyService.getProperties(this.landlordId).pipe(
      take(1),
      switchMap(properties => properties.length
        ? forkJoin(properties.map(property => this.maintenanceService.getRequestsForProperty(property.id)))
        : of([] as MaintenanceRequest[][])),
      map(grouped => grouped.flat().sort((a, b) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()))
    ).subscribe({
      next: requests => {
        this.requests = requests;
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
      error: error => this.handleLoadError(error)
    });
  }

  changeStatus(request: MaintenanceRequest, status: NonNullable<MaintenanceRequest['status']>): void {
    if (!request.id || this.updatingId) return;
    this.updatingId = request.id;
    this.errorMessage = null;
    this.maintenanceService.updateStatus(request.id, status).pipe(take(1)).subscribe({
      next: result => {
        request.status = result.status;
        this.updatingId = null;
        this.changeDetector.markForCheck();
      },
      error: error => {
        console.error('Bakım talebi durumu güncellenemedi.', error);
        this.errorMessage = 'Talep durumu güncellenemedi. Yetkinizi ve bağlantıyı kontrol edip yeniden deneyin.';
        this.updatingId = null;
        this.changeDetector.markForCheck();
      }
    });
  }

  getOpenCount(): number {
    return this.requests.filter(r => r.status === 'OPEN').length;
  }

  getInProgressCount(): number {
    return this.requests.filter(r => r.status === 'IN_PROGRESS').length;
  }

  getResolvedCount(): number {
    return this.requests.filter(r => r.status === 'RESOLVED' || r.status === 'CLOSED').length;
  }

  trackById(_index: number, request: MaintenanceRequest): string {
    return request.id ?? `${request.propertyId}:${request.unitId}:${request.createdAt}`;
  }

  statusLabel(status?: string): string {
    const labels: Record<string, string> = {
      OPEN: 'Açık',
      IN_PROGRESS: 'İşlemde',
      RESOLVED: 'Çözüldü',
      CLOSED: 'Kapalı'
    };
    return status ? labels[status] ?? status : 'Bilinmiyor';
  }

  priorityLabel(priority: MaintenanceRequest['priority']): string {
    const labels: Record<MaintenanceRequest['priority'], string> = {
      LOW: 'Düşük',
      MEDIUM: 'Orta',
      HIGH: 'Yüksek',
      CRITICAL: 'Kritik'
    };
    return labels[priority];
  }

  private handleLoadError(error: unknown): void {
    console.error('Ev sahibinin bakım talepleri yüklenemedi.', error);
    this.errorMessage = 'Bakım talepleri yüklenemedi. Mülk ve bakım servisi erişimini kontrol edin.';
    this.isLoading = false;
    this.changeDetector.markForCheck();
  }
}
