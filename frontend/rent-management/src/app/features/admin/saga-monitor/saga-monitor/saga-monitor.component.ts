import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SagaService, SagaState } from '../../../../core/services/saga.service';

@Component({
  selector: 'app-saga-monitor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page animate-slideUp relative">

      <!-- Toast Notification -->
      <div *ngIf="toastMessage" class="toast-notification animate-slideDown">
        <span class="mr-2">⚙️</span> {{ toastMessage }}
      </div>

      <!-- Sayfa Başlığı & Yenileme -->
      <div class="page__header flex justify-between items-center mb-6">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="page-title">Saga Monitor (Orchestrator) ⚙️</h1>
            <span class="badge badge--soft-emerald">MassTransit RabbitMQ</span>
          </div>
          <p class="text-sm text-muted mt-1">
            Kira Sözleşmesi Tanzimi, Ödeme & Tahsilat ve Fesih dağıtık sagalarının gerçek zamanlı durumunu izleyin.
          </p>
        </div>
        <button class="btn btn--secondary" (click)="loadSagas()" [disabled]="isLoading">
          <span class="icon">🔄</span> {{ isLoading ? 'Yükleniyor...' : 'Yenile' }}
        </button>
      </div>

      <!-- Özet İstatistik Kartları -->
      <div class="grid grid--4 mb-6">
        <div class="stat-card stat-card--blue">
          <div class="stat-card__icon">🔄</div>
          <div>
            <div class="stat-card__label">Toplam Saga</div>
            <div class="stat-card__value">{{ isLoading ? '…' : sagas.length }}</div>
          </div>
          <div class="text-sm text-muted mt-2">İzlenen orkestrasyon</div>
        </div>

        <div class="stat-card stat-card--emerald">
          <div class="stat-card__icon" style="color: var(--success, #22c55e);">✅</div>
          <div>
            <div class="stat-card__label">Tamamlandı</div>
            <div class="stat-card__value" style="color: var(--success, #22c55e);">{{ isLoading ? '…' : completedCount }}</div>
          </div>
          <div class="text-sm text-muted mt-2">Başarılı iş akışı</div>
        </div>

        <div class="stat-card stat-card--indigo">
          <div class="stat-card__icon" style="color: var(--accent-primary, #3b82f6);">⚙️</div>
          <div>
            <div class="stat-card__label">Devam Eden</div>
            <div class="stat-card__value" style="color: var(--accent-primary, #3b82f6);">{{ isLoading ? '…' : runningCount }}</div>
          </div>
          <div class="text-sm text-muted mt-2">Aktif işlem</div>
        </div>

        <div class="stat-card stat-card--red">
          <div class="stat-card__icon" style="color: var(--danger, #ef4444);">⚠️</div>
          <div>
            <div class="stat-card__label">Hatalı / Telafi</div>
            <div class="stat-card__value" style="color: var(--danger, #ef4444);">{{ isLoading ? '…' : failedCount }}</div>
          </div>
          <div class="text-sm text-muted mt-2">Telafi akışı</div>
        </div>
      </div>

      <!-- Filtreler ve Arama -->
      <div class="filter-bar flex justify-between items-center mb-6">
        <div class="tabs flex gap-2">
          <button class="tab-btn" [class.tab-btn--active]="selectedFilter === 'ALL'" (click)="setFilter('ALL')">
            Tümü ({{ sagas.length }})
          </button>
          <button class="tab-btn" [class.tab-btn--active]="selectedFilter === 'LEASE'" (click)="setFilter('LEASE')">
            📄 Kira Sözleşmesi ({{ leaseCount }})
          </button>
          <button class="tab-btn" [class.tab-btn--active]="selectedFilter === 'PAYMENT'" (click)="setFilter('PAYMENT')">
            💳 Kira Ödemesi ({{ paymentCount }})
          </button>
          <button class="tab-btn" [class.tab-btn--active]="selectedFilter === 'TERMINATION'" (click)="setFilter('TERMINATION')">
            🚪 Fesih & Tahliye ({{ terminationCount }})
          </button>
        </div>

        <div class="search-box">
          <input
            type="text"
            class="form-control"
            placeholder="Correlation ID veya tip ara..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="applyFilter()"
          />
        </div>
      </div>

      <!-- Hata Uyarısı -->
      <p class="alert alert--danger mb-6" *ngIf="errorMessage">{{ errorMessage }}</p>

      <!-- Boş Durum -->
      <div class="empty-state" *ngIf="!isLoading && !errorMessage && filteredSagas.length === 0">
        <div class="empty-state__icon">🔍</div>
        <h3>Eşleşen saga kaydı bulunamadı</h3>
        <p class="text-muted">Arama filtrenizi temizleyebilir veya yeni işlemler başlatabilirsiniz.</p>
      </div>

      <!-- Saga Kartları -->
      <div class="saga-list">
        <div class="saga-card" *ngFor="let saga of filteredSagas">
          <div class="saga-card__header">
            <div>
              <div class="saga-type flex items-center gap-2">
                <span class="type-icon">{{ getTypeIcon(saga.type) }}</span>
                <span>{{ getTypeLabel(saga.type) }}</span>
              </div>
              <div class="saga-id flex items-center gap-2 mt-1">
                <span class="text-xs text-muted">Correlation ID:</span>
                <span class="mono">{{ saga.id }}</span>
                <button class="copy-chip-btn" (click)="copyId(saga.id)" title="ID Kopyala">
                  <span>📋</span> Kopyala
                </button>
              </div>
            </div>
            <div class="badge" [ngClass]="getBadgeClass(saga.status)">
              <span class="pulse-beacon" [class.pulse-beacon--green]="saga.status === 'COMPLETED'" [class.pulse-beacon--yellow]="saga.status === 'RUNNING'"></span>
              {{ getStatusText(saga.status) }}
            </div>
          </div>

          <div class="saga-card__steps">
            <div
              class="step"
              *ngFor="let step of saga.steps; let idx = index"
              [class.step--active]="step.status === 'ACTIVE'"
              [class.step--done]="step.status === 'DONE'"
              [class.step--error]="step.status === 'ERROR' || step.status === 'FAILED'"
            >
              <div class="step__icon">
                <span *ngIf="step.status === 'DONE'">✓</span>
                <span *ngIf="step.status === 'ACTIVE'" class="animate-spin">⟳</span>
                <span *ngIf="step.status === 'ERROR' || step.status === 'FAILED'">!</span>
                <span *ngIf="step.status === 'PENDING'" class="step-num">{{ idx + 1 }}</span>
              </div>
              <div class="step__label">{{ getStepLabel(step.label) }}</div>
            </div>
          </div>

          <div class="saga-card__footer" *ngIf="saga.error">
            <div class="error-msg">⚠️ Telafi & Hata: {{ saga.error }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-notification {
      position: absolute;
      top: 0px;
      right: 0px;
      background: var(--success-dim);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: var(--success);
      padding: 12px 24px;
      border-radius: var(--radius-md);
      font-weight: 500;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .animate-slideDown { animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideDown {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .relative { position: relative; }
    .mr-2 { margin-right: 8px; }
    .flex { display: flex; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .gap-2 { gap: 8px; }
    .mb-6 { margin-bottom: 24px; }
    .mt-2 { margin-top: 8px; }

    .grid { display: grid; gap: var(--space-4); }
    .grid--4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }

    .stat-card {
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(16px);
      transition: all 0.22s ease;

      &:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.16);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35);
      }

      &__icon { font-size: 1.5rem; margin-bottom: 8px; }
      &__label { font-size: 0.75rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
      &__value { font-size: 2rem; font-weight: 800; color: #ffffff; margin-top: 4px; letter-spacing: -0.02em; }
    }

    .filter-bar {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 12px 18px;
      flex-wrap: wrap;
      gap: 12px;
      backdrop-filter: blur(16px);
    }

    .tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: #94a3b8;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 500;

      &:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.06);
      }

      &--active {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: #ffffff !important;
        font-weight: 700;
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);
      }
    }

    .search-box input {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 0.8125rem;
      min-width: 260px;
      outline: none;
      transition: all 0.2s ease;

      &:focus {
        border-color: #6366f1;
        box-shadow: 0 0 12px rgba(99, 102, 241, 0.25);
      }
    }

    .empty-state {
      background: rgba(15, 23, 42, 0.4);
      border: 1px dashed rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 48px;
      text-align: center;
      margin-top: 24px;
      &__icon { font-size: 3rem; margin-bottom: 12px; opacity: 0.5; }
      h3 { font-size: 1.125rem; font-weight: 600; color: #ffffff; margin-bottom: 4px; }
    }

    .saga-card {
      background: rgba(15, 23, 42, 0.55);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      padding: 22px;
      margin-bottom: 16px;
      backdrop-filter: blur(16px);
      transition: all 0.22s ease;

      &:hover {
        border-color: rgba(99, 102, 241, 0.4);
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      }
      
      &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-6);
        
        .saga-type {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          .type-icon { font-size: 1.25rem; }
        }
        
        .saga-id {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin-top: 4px;
          .mono {
            font-family: var(--font-mono, monospace);
            color: var(--accent-primary, #3b82f6);
            background: rgba(59, 130, 246, 0.1);
            padding: 2px 8px;
            border-radius: 6px;
          }
        }
      }

      .copy-chip-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        font-size: 0.6875rem;
        padding: 2px 8px;
        border-radius: 6px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(99, 102, 241, 0.2);
          border-color: rgba(99, 102, 241, 0.4);
          color: #ffffff;
        }
      }

      .pulse-beacon {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        display: inline-block;

        &--green {
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.8);
        }

        &--yellow {
          background: #eab308;
          box-shadow: 0 0 8px rgba(234, 179, 8, 0.8);
        }
      }
      
      &__steps {
        display: flex;
        justify-content: space-between;
        position: relative;
        padding: 0 20px;
        
        &::before {
          content: '';
          position: absolute;
          top: 17px;
          left: 40px;
          right: 40px;
          height: 2px;
          background: linear-gradient(90deg, rgba(34, 197, 94, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%);
          z-index: 0;
        }
      }
      
      &__footer {
        margin-top: var(--space-6);
        padding-top: var(--space-4);
        border-top: 1px dashed rgba(239, 68, 68, 0.3);
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .error-msg {
          color: var(--danger);
          font-size: 0.875rem;
        }
      }
    }

    .stat-card--blue { border-left: 4px solid #3b82f6; }
    .stat-card--emerald { border-left: 4px solid #10b981; }
    .stat-card--indigo { border-left: 4px solid #8b5cf6; }
    .stat-card--red { border-left: 4px solid #ef4444; }

    .step-num {
      font-size: 0.75rem;
      color: #64748b;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      position: relative;
      z-index: 1;
      width: 130px;
      
      &__icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--bg-surface);
        border: 2px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: var(--text-muted);
        transition: all 0.3s ease;
      }
      
      &__label {
        font-size: 0.75rem;
        color: var(--text-muted);
        text-align: center;
        font-weight: 500;
        line-height: 1.3;
      }
      
      &--done {
        .step__icon {
          background: var(--success, #22c55e);
          border-color: var(--success, #22c55e);
          color: white;
          box-shadow: 0 0 12px rgba(34, 197, 94, 0.4);
        }
        .step__label { color: var(--success, #22c55e); font-weight: 600; }
      }
      
      &--active {
        .step__icon {
          border-color: var(--warning, #eab308);
          color: var(--warning, #eab308);
          background: rgba(234, 179, 8, 0.1);
        }
        .step__label { color: var(--warning, #eab308); font-weight: 700; }
      }
      
      &--error {
        .step__icon {
          background: var(--danger, #ef4444);
          border-color: var(--danger, #ef4444);
          color: white;
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
        }
        .step__label { color: var(--danger, #ef4444); font-weight: 700; }
      }
    }

    .badge--success { background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); }
    .badge--primary { background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); }
    .badge--danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge--pending { background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); }
  `]
})
export class SagaMonitorComponent implements OnInit {
  sagas: SagaState[] = [];
  filteredSagas: SagaState[] = [];
  toastMessage: string | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  selectedFilter: 'ALL' | 'LEASE' | 'PAYMENT' | 'TERMINATION' = 'ALL';
  searchQuery = '';

  constructor(
    private changeDetector: ChangeDetectorRef,
    private sagaService: SagaService
  ) {}

  copyId(id: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(id).then(() => {
        this.toastMessage = `Correlation ID kopyalandı: ${id.slice(0, 8)}...`;
        this.changeDetector.markForCheck();
        setTimeout(() => {
          this.toastMessage = null;
          this.changeDetector.markForCheck();
        }, 2500);
      });
    }
  }

  ngOnInit() {
    this.loadSagas();
  }

  get completedCount(): number {
    return this.sagas.filter(s => s.status === 'COMPLETED').length;
  }

  get runningCount(): number {
    return this.sagas.filter(s => s.status === 'RUNNING').length;
  }

  get failedCount(): number {
    return this.sagas.filter(s => s.status === 'FAILED').length;
  }

  get leaseCount(): number {
    return this.sagas.filter(s => s.type === 'LeaseAgreementSaga').length;
  }

  get paymentCount(): number {
    return this.sagas.filter(s => s.type === 'RentPaymentSaga').length;
  }

  get terminationCount(): number {
    return this.sagas.filter(s => s.type === 'LeaseTerminationSaga').length;
  }

  loadSagas() {
    this.isLoading = true;
    this.errorMessage = null;
    this.sagaService.getSagas().subscribe({
      next: (data) => {
        this.sagas = (data ?? []).map(s => {
          const raw = s.status || '';
          let normalized = 'RUNNING';
          if (raw === 'Completed' || raw === 'Final' || raw === 'ProcessingSuccess') {
            normalized = 'COMPLETED';
          } else if (raw === 'Initial' || raw === 'Pending') {
            normalized = 'PENDING';
          } else if (raw.includes('Failure') || raw.includes('Failed') || raw.includes('TimedOut')) {
            normalized = 'FAILED';
          }
          return {
            ...s,
            status: normalized
          };
        });
        this.applyFilter();
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load sagas', err);
        this.errorMessage = 'Saga verileri alınamadı. API bağlantısını ve yönetici yetkinizi kontrol edin.';
        this.isLoading = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  setFilter(filter: 'ALL' | 'LEASE' | 'PAYMENT' | 'TERMINATION') {
    this.selectedFilter = filter;
    this.applyFilter();
  }

  applyFilter() {
    let result = [...this.sagas];

    if (this.selectedFilter === 'LEASE') {
      result = result.filter(s => s.type === 'LeaseAgreementSaga');
    } else if (this.selectedFilter === 'PAYMENT') {
      result = result.filter(s => s.type === 'RentPaymentSaga');
    } else if (this.selectedFilter === 'TERMINATION') {
      result = result.filter(s => s.type === 'LeaseTerminationSaga');
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(s =>
        s.id.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q) ||
        this.getTypeLabel(s.type).toLowerCase().includes(q)
      );
    }

    this.filteredSagas = result;
    this.changeDetector.markForCheck();
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'LeaseAgreementSaga': return 'Kira Sözleşmesi Tanzim Sagas';
      case 'RentPaymentSaga': return 'Kira Ödeme & Tahsilat Sagas';
      case 'LeaseTerminationSaga': return 'Sözleşme Fesih & Tahliye Sagas';
      default: return type;
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'LeaseAgreementSaga': return '📄';
      case 'RentPaymentSaga': return '💳';
      case 'LeaseTerminationSaga': return '🚪';
      default: return '🔄';
    }
  }

  getStepLabel(label: string): string {
    switch (label) {
      case 'Check Property': return 'Mülk Rezervasyonu';
      case 'Create Contract': return 'Sözleşme PDF';
      case 'Activate Lease': return 'Sözleşme Aktivasyonu';
      case 'Mark Unit Rented': return 'Birim Kiralandı';
      case 'Process Payment': return 'Ödeme ve Havale';
      case 'Assess Damage': return 'Hasar Tespiti';
      case 'Refund Deposit': return 'Depozito İadesi';
      case 'Release Property': return 'Mülkü Boşa Çıkarma';
      default: return label;
    }
  }

  getBadgeClass(status: string) {
    if (status === 'COMPLETED') return 'badge badge--success';
    if (status === 'RUNNING') return 'badge badge--primary';
    if (status === 'FAILED') return 'badge badge--danger';
    return 'badge badge--pending';
  }

  getStatusText(status: string) {
    if (status === 'COMPLETED') return 'Tamamlandı';
    if (status === 'RUNNING') return 'Devam ediyor';
    if (status === 'PENDING') return 'Bekliyor';
    if (status === 'FAILED') return 'Başarısız';
    return status;
  }
}
