import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaintenanceService, MaintenanceRequest } from '../../../core/services/maintenance.service';
import { Lease, LeaseService } from '../../../core/services/lease.service';
import { Store } from '@ngrx/store';
import { forkJoin, switchMap, take, throwError } from 'rxjs';
import { selectUserId } from '../../../store/auth/auth.selectors';

// Interface moved to service

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page animate-slideUp">
      <div class="page__header flex items-center justify-between mb-6">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="page-title">Bakım & Arıza Talepleri 🔧</h1>
            <span class="badge badge--soft-emerald">Teknik Destek</span>
          </div>
          <p class="text-sm text-muted mt-1">Mülkünüzle ilgili arıza veya bakım ihtiyaçlarını anında iletin, durumunu canlı takip edin.</p>
        </div>
        <button class="btn btn--primary" (click)="openNewRequestModal()">
          <span class="text-lg">+</span> Yeni Talep Oluştur
        </button>
      </div>

      <p class="alert alert--danger mb-6" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="text-muted mb-4" *ngIf="isLoading">Bakım talepleri yükleniyor...</p>

      <!-- KPI Özet Çubuğu -->
      <div class="grid grid--3 mb-6" *ngIf="!isLoading && !errorMessage && requests.length > 0">
        <div class="stat-card stat-card--blue">
          <div class="stat-card__icon">📋</div>
          <div>
            <div class="stat-card__label">Toplam Talep</div>
            <div class="stat-card__value">{{ requests.length }}</div>
          </div>
          <div class="text-xs text-muted mt-2">Kayıtlı teknik bildirim</div>
        </div>

        <div class="stat-card stat-card--indigo">
          <div class="stat-card__icon">⚙️</div>
          <div>
            <div class="stat-card__label">İşlemdeki Talepler</div>
            <div class="stat-card__value text-indigo">{{ openRequestsCount }}</div>
          </div>
          <div class="text-xs text-muted mt-2">Açık veya işlemde olan</div>
        </div>

        <div class="stat-card stat-card--emerald">
          <div class="stat-card__icon">✅</div>
          <div>
            <div class="stat-card__label">Tamamlanan & Çözülen</div>
            <div class="stat-card__value text-emerald">{{ resolvedRequestsCount }}</div>
          </div>
          <div class="text-xs text-muted mt-2">Başarıyla onarılan</div>
        </div>
      </div>

      <!-- Boş Durum -->
      <div class="empty-state" *ngIf="!isLoading && !errorMessage && requests.length === 0">
        <div class="empty-state__icon">🛠️</div>
        <h3>Henüz bakım talebiniz yok</h3>
        <p class="text-muted">Dairenizle ilgili elektrik, sıhhi tesisat veya diğer teknik konularda talep oluşturabilirsiniz.</p>
        <button class="btn btn--primary mt-4" (click)="openNewRequestModal()">
          <span>+</span> İlk Talebini Oluştur
        </button>
      </div>
      
      <div class="grid grid--3">
        <!-- Talepler Listesi -->
        <div class="card ticket-card" *ngFor="let req of requests" [ngClass]="'priority-' + req.priority.toLowerCase()">
          <div class="flex justify-between items-start mb-4">
            <span class="badge" 
                  [class.badge--info]="req.status === 'OPEN'"
                  [class.badge--pending]="req.status === 'IN_PROGRESS'"
                  [class.badge--completed]="req.status === 'RESOLVED'">
              {{ getStatusText(req.status) }}
            </span>
            <span class="priority-chip"
                  [ngClass]="{
                    'priority-chip--critical': req.priority === 'CRITICAL' || req.priority === 'HIGH',
                    'priority-chip--medium': req.priority === 'MEDIUM',
                    'priority-chip--low': req.priority === 'LOW'
                  }">
              {{ getPriorityText(req.priority) }}
            </span>
          </div>

          <h3 class="ticket-title">{{ req.title }}</h3>
          <p class="ticket-desc">{{ req.description }}</p>

          <div class="divider"></div>

          <div class="flex justify-between items-center text-xs text-secondary">
            <span class="font-mono text-muted">#{{ req.id }}</span>
            <span>{{ req.createdAt | date:'mediumDate' }}</span>
          </div>
        </div>
      </div>

      <!-- Yeni Talep Modal -->
      <div class="modal-overlay" *ngIf="isModalOpen" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3 class="modal__title">Yeni Bakım Talebi</h3>
            <button class="modal__close" (click)="closeModal()">×</button>
          </div>
          
          <div class="flex-col gap-4">
            <div class="form-group">
              <label>Sözleşme / Mülk</label>
              <select class="input" [(ngModel)]="selectedLeaseId" [disabled]="leases.length === 0">
                <option value="">Sözleşme seçin</option>
                <option *ngFor="let lease of leases" [value]="lease.id">
                  {{ lease.propertyId }} — {{ lease.unitId }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Sorun Başlığı</label>
              <input type="text" class="input" placeholder="Örn: Kombi su akıtıyor" [(ngModel)]="newRequest.title">
            </div>
            
            <div class="form-group">
              <label>Aciliyet Durumu</label>
              <select class="input" [(ngModel)]="newRequest.priority">
                <option value="LOW">Düşük (Kozmetik / Acil olmayan)</option>
                <option value="MEDIUM">Orta (Kısmi sorun)</option>
                <option value="HIGH">Yüksek (Günlük yaşamı etkileyen)</option>
                <option value="CRITICAL">Kritik (Güvenlik riski / Su baskını vb.)</option>
              </select>
            </div>

            <div class="form-group">
              <label>Açıklama</label>
              <textarea class="input" rows="4" placeholder="Sorunu detaylıca açıklayın..." [(ngModel)]="newRequest.description"></textarea>
            </div>
          </div>

          <div class="modal__footer">
            <button class="btn btn--secondary" (click)="closeModal()">İptal</button>
            <button class="btn btn--primary" (click)="submitRequest()" [disabled]="isSubmitting || !leases.length">
              {{ isSubmitting ? 'Gönderiliyor...' : 'Talebi Gönder' }}
            </button>
          </div>
          <p class="alert alert--danger mt-4" *ngIf="formError">{{ formError }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ticket-card {
      transition: all var(--transition-normal);
      border-left: 3px solid transparent;

      &.priority-critical, &.priority-high {
        border-left-color: var(--danger);
      }
      &.priority-medium {
        border-left-color: var(--warning);
      }
      &.priority-low {
        border-left-color: var(--success);
      }

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
      }
    }

    .ticket-title {
      font-size: 1.0625rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 6px;
    }

    .ticket-desc {
      font-size: 0.875rem;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .priority-chip {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 3px 8px;
      border-radius: var(--radius-full);

      &--critical {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }
      &--medium {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.3);
      }
      &--low {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
    }
  `]
})
export class MaintenanceComponent implements OnInit {
  isModalOpen = false;
  newRequest: Partial<MaintenanceRequest> = { title: '', priority: 'LOW', description: '' };
  requests: MaintenanceRequest[] = [];
  leases: Lease[] = [];
  selectedLeaseId = '';
  tenantId: string | null = null;
  isLoading = false;
  isSubmitting = false;
  errorMessage: string | null = null;
  formError: string | null = null;

  get openRequestsCount(): number {
    return this.requests.filter(r => r.status !== 'RESOLVED').length;
  }

  get resolvedRequestsCount(): number {
    return this.requests.filter(r => r.status === 'RESOLVED').length;
  }

  constructor(
    private maintenanceService: MaintenanceService,
    private leaseService: LeaseService,
    private store: Store,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.errorMessage = null;
    this.store.select(selectUserId).pipe(
      take(1),
      switchMap(id => {
        if (!id) return throwError(() => new Error('Oturum kullanıcı profili bulunamadı.'));
        this.tenantId = id;
        return forkJoin({
          leases: this.leaseService.getLeasesByTenant(id),
          requests: this.maintenanceService.getRequestsForTenant(id)
        });
      })
    ).subscribe({
      next: data => {
        this.leases = data.leases.filter(lease => lease.status === 'ACTIVE');
        this.requests = data.requests ?? [];
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
      error: error => {
        console.error('Bakım ekranı verileri yüklenemedi.', error);
        this.errorMessage = 'Bakım verileri yüklenemedi. Oturumunuzu ve servis bağlantısını kontrol edip yeniden deneyin.';
        this.isLoading = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  loadRequests() {
    if (!this.tenantId) return;
    this.maintenanceService.getRequestsForTenant(this.tenantId).subscribe({
      next: data => {
        this.requests = data ?? [];
        this.changeDetector.markForCheck();
      },
      error: error => {
        console.error('Bakım talepleri yenilenemedi.', error);
        this.errorMessage = 'Bakım talepleri yenilenemedi.';
        this.changeDetector.markForCheck();
      }
    });
  }

  getStatusText(status: string | undefined): string {
    if (!status) return 'Bilinmiyor';

    switch(status) {
      case 'OPEN': return 'Açık';
      case 'IN_PROGRESS': return 'İşlemde';
      case 'RESOLVED': return 'Çözüldü';
      case 'CLOSED': return 'Kapatıldı';
      default: return status;
    }
  }

  getPriorityText(priority: string): string {
    switch(priority) {
      case 'LOW': return 'DÜŞÜK';
      case 'MEDIUM': return 'ORTA';
      case 'HIGH': return 'YÜKSEK';
      case 'CRITICAL': return 'KRİTİK';
      default: return priority;
    }
  }

  openNewRequestModal() { 
    this.newRequest = { title: '', priority: 'LOW', description: '' };
    this.selectedLeaseId = '';
    this.formError = null;
    this.isModalOpen = true; 
  }
  closeModal() { this.isModalOpen = false; }
  
  submitRequest() {
    const lease = this.leases.find(item => item.id === this.selectedLeaseId);
    if (!this.tenantId || !lease || !this.newRequest.title?.trim() || !this.newRequest.description?.trim()) {
      this.formError = 'Sözleşme, başlık ve açıklama alanlarını doldurun.';
      return;
    }
    
    const requestPayload: MaintenanceRequest = {
      tenantId: this.tenantId,
      propertyId: lease.propertyId,
      unitId: lease.unitId,
      title: this.newRequest.title.trim(),
      description: this.newRequest.description.trim(),
      priority: this.newRequest.priority ?? 'LOW'
    };

    this.isSubmitting = true;
    this.formError = null;
    this.maintenanceService.createRequest(requestPayload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeModal();
        this.loadRequests();
        this.changeDetector.markForCheck();
      },
      error: err => {
        console.error('Bakım talebi oluşturulamadı.', err);
        this.formError = 'Bakım talebi gönderilemedi. Bilgileri kontrol edip tekrar deneyin.';
        this.isSubmitting = false;
        this.changeDetector.markForCheck();
      }
    });
  }
}
