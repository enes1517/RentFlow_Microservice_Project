import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { catchError, filter, forkJoin, map, of, switchMap, take, throwError } from 'rxjs';
import { Lease, LeaseService } from '../../../../core/services/lease.service';
import { TenantLookup, UserService } from '../../../../core/services/user.service';
import { PropertyService, Property } from '../../../../core/services/property.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { selectUserId } from '../../../../store/auth/auth.selectors';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page animate-slideUp relative">

      <!-- Toast Notification -->
      <div *ngIf="toastMessage" class="toast-notification animate-slideDown">
        <span class="mr-2">👤</span> {{ toastMessage }}
      </div>

      <!-- Sayfa Başlığı ve Arama -->
      <div class="page__header flex justify-between items-center mb-8">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="page-title">Kiracı Yönetimi</h1>
            <span class="badge badge--soft-indigo">Müşteri İlişkileri & İletişim</span>
          </div>
          <p class="text-sm text-muted mt-1">
            Mülklerinizdeki kayıtlı kiracıları, sözleşme periyotlarını ve ödeme düzenlerini tek merkezden yönetin.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <div class="search-box">
            <input type="text" placeholder="Kiracı veya mülk adı ile ara..." class="input" [(ngModel)]="searchText">
          </div>
          <button class="btn btn--secondary" (click)="loadTenants()" [disabled]="isLoading">
            <span class="icon">🔄</span> Yenile
          </button>
        </div>
      </div>

      <!-- KPI Özet Göstergeleri (Executive Tenant Metrics) -->
      <div class="grid grid--4 mb-8" *ngIf="!isLoading && !errorMessage && tenants.length > 0">
        <div class="stat-kpi-card">
          <div class="stat-kpi-label">Toplam Kiracı</div>
          <div class="stat-kpi-val">{{ tenants.length }}</div>
          <div class="stat-kpi-sub text-muted">Aktif sözleşmeli profil</div>
        </div>

        <div class="stat-kpi-card stat-kpi-card--emerald">
          <div class="stat-kpi-label">Düzenli Ödeyen</div>
          <div class="stat-kpi-val text-emerald">{{ regularCount }}</div>
          <div class="stat-kpi-sub text-muted">Sorunsuz tahsilat</div>
        </div>

        <div class="stat-kpi-card stat-kpi-card--amber">
          <div class="stat-kpi-label">Gecikmede Olan</div>
          <div class="stat-kpi-val text-amber">{{ lateCount }}</div>
          <div class="stat-kpi-sub text-muted">Takip gerektiren</div>
        </div>

        <div class="stat-kpi-card stat-kpi-card--cyan">
          <div class="stat-kpi-label">İletişim Kanalı</div>
          <div class="stat-kpi-val text-cyan">E-Posta</div>
          <div class="stat-kpi-sub text-muted">RabbitMQ & MailHog</div>
        </div>
      </div>

      <p class="alert alert--danger mb-6" *ngIf="errorMessage">{{ errorMessage }}</p>

      <div class="loading-state" *ngIf="isLoading">
        <div class="spinner"></div>
        <p class="text-muted mt-3">Kiracı listesi yükleniyor...</p>
      </div>

      <!-- Tenant Details Modal -->
      <div class="modal" [class.modal--open]="isModalOpen" *ngIf="isModalOpen && selectedTenant">
        <div class="modal__overlay" (click)="closeModal()"></div>
        <div class="modal__content" style="max-width: 540px;">
          <div class="modal__header">
            <h3 class="modal__title">Kiracı Bilgi Kartı</h3>
            <button class="modal__close" (click)="closeModal()">✕</button>
          </div>
          <div class="modal__body flex-col gap-4">
            <div class="user-cell mb-4">
              <div class="user-cell__avatar" style="width:58px; height:58px; font-size:1.4rem;">{{ selectedTenant.name.charAt(0) }}</div>
              <div class="user-cell__info">
                <span class="name" style="font-size:1.15rem;">{{ selectedTenant.name }}</span>
                <span class="email">{{ selectedTenant.email }}</span>
                <span class="badge mt-2" [class.badge--paid]="selectedTenant.status === 'Düzenli'" [class.badge--warning]="selectedTenant.status === 'Gecikmede'" style="align-self: flex-start;">
                  <span class="status-dot"></span>
                  {{ selectedTenant.status }}
                </span>
              </div>
            </div>
            
            <div class="tenant-modal-grid">
              <div class="modal-info-item">
                <span class="label">İkamet Edilen Mülk</span>
                <span class="val">{{ selectedTenant.property }}</span>
              </div>
              <div class="modal-info-item">
                <span class="label">Aylık Kira Bedeli</span>
                <span class="val currency text-emerald">{{ selectedTenant.rent }} ₺</span>
              </div>
              <div class="modal-info-item modal-info-item--full">
                <span class="label">Sözleşme Bitiş Tarihi</span>
                <span class="val">{{ selectedTenant.leaseEnd }}</span>
              </div>
            </div>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" (click)="closeModal()">Kapat</button>
            <button class="btn btn--primary" (click)="isComposing = !isComposing">
              <span>{{ isComposing ? 'Detayları Göster' : '✉️ E-posta Gönder' }}</span>
            </button>
          </div>
          <div class="modal__body flex-col gap-4 mt-3" *ngIf="isComposing">
            <div class="form-group">
              <label>E-Posta Konusu</label>
              <input class="input" [(ngModel)]="messageSubject" maxlength="255" placeholder="Örn: Kira dekontu hakkında bilgilendirme">
            </div>
            <div class="form-group">
              <label>Mesaj İçeriği</label>
              <textarea class="input" rows="4" [(ngModel)]="messageContent" placeholder="Kiracınıza iletmek istediğiniz mesaj..."></textarea>
            </div>
            <p class="alert alert--danger" *ngIf="messageError">{{ messageError }}</p>
            <button class="btn btn--primary w-full" (click)="sendEmail()" [disabled]="isSending">
              {{ isSending ? 'Gönderiliyor...' : 'E-postayı Hemen Gönder' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Kiracı Tablosu Kartı -->
      <div class="luxury-table-card mt-6" *ngIf="!isLoading && !errorMessage">
        <p class="text-muted p-6 text-center" *ngIf="tenants.length === 0">Henüz aktif kiracı kaydı bulunmuyor.</p>
        <div class="table-wrapper" *ngIf="tenants.length > 0">
          <table class="table">
            <thead>
              <tr>
                <th>Kiracı Profili</th>
                <th>Mülk & Adres</th>
                <th>Sözleşme Bitiş</th>
                <th>Aylık Kira</th>
                <th>Tahsilat Durumu</th>
                <th style="text-align: right;">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let tenant of filteredTenants">
                <td>
                  <div class="user-cell">
                    <div class="user-cell__avatar">{{ tenant.name.charAt(0) }}</div>
                    <div class="user-cell__info">
                      <span class="name">{{ tenant.name }}</span>
                      <span class="email">{{ tenant.email }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <span>🏢</span>
                    <span>{{ tenant.property }}</span>
                  </div>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <span>📅</span>
                    <span>{{ tenant.leaseEnd }}</span>
                  </div>
                </td>
                <td class="currency font-bold text-white">{{ tenant.rent }} ₺</td>
                <td>
                  <span class="badge" [class.badge--paid]="tenant.status === 'Düzenli'" [class.badge--warning]="tenant.status === 'Gecikmede'">
                    <span class="status-dot"></span>
                    {{ tenant.status }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <button class="btn btn--secondary btn--sm" (click)="openModal(tenant)">
                    <span>🔍</span> Detay
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-notification {
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(10, 15, 29, 0.95);
      border: 1px solid rgba(34, 197, 94, 0.5);
      color: #4ade80;
      padding: 12px 28px;
      border-radius: var(--radius-full, 9999px);
      font-weight: 600;
      font-size: 0.95rem;
      z-index: 99999;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.7), 0 0 20px rgba(34, 197, 94, 0.25);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      white-space: nowrap;
      pointer-events: none;
    }
    .animate-slideDown { animation: slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideDown {
      from { transform: translate(-50%, -30px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
    .relative { position: relative; }
    .mr-2 { margin-right: 8px; }

    .justify-between { justify-content: space-between; }
    
    .search-box {
      width: 320px;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      
      th {
        padding: 16px 24px;
        font-size: 0.8125rem;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.02);
      }
      
      td {
        padding: 16px 24px;
        vertical-align: middle;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        color: #cbd5e1;
        font-size: 0.9375rem;
      }
      
      tr:last-child td {
        border-bottom: none;
      }
      
      tr:hover td {
        background: rgba(255, 255, 255, 0.035);
        color: #ffffff;
      }
    }

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

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      display: inline-block;
      margin-right: 4px;
    }

    .tenant-modal-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 16px;
    }

    .modal-info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      &--full { grid-column: span 2; }
      .label { font-size: 0.6875rem; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
      .val { font-size: 0.9375rem; font-weight: 700; color: #ffffff; }
    }

    .luxury-table-card {
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(16px);
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

    @keyframes spin { 100% { transform: rotate(360deg); } }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 14px;
      
      &__avatar {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.25));
        border: 1px solid rgba(99, 102, 241, 0.4);
        color: #a5b4fc;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 1rem;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
      }
      
      &__info {
        display: flex;
        flex-direction: column;
        
        .name { color: #ffffff; font-weight: 700; font-size: 0.9375rem; }
        .email { font-size: 0.8125rem; color: #94a3b8; }
      }
    }
    
    .btn--sm { padding: 6px 14px; font-size: 0.8125rem; }
  `]
})
export class TenantsComponent implements OnInit {
  tenants: TenantRow[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  messageError: string | null = null;
  isComposing = false;
  isSending = false;
  messageSubject = '';
  messageContent = '';

  get regularCount(): number {
    return this.tenants.filter(t => t.status === 'Düzenli').length;
  }

  get lateCount(): number {
    return this.tenants.filter(t => t.status === 'Gecikmede').length;
  }

  constructor(
    private changeDetector: ChangeDetectorRef,
    private store: Store,
    private leaseService: LeaseService,
    private userService: UserService,
    private propertyService: PropertyService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() { this.loadTenants(); }

  toastMessage: string | null = null;
  isModalOpen = false;
  selectedTenant: TenantRow | null = null;
  searchText: string = '';

  get filteredTenants() {
    if (!this.searchText) {
      return this.tenants;
    }
    const lower = this.searchText.toLowerCase();
    return this.tenants.filter(t => 
      t.name.toLowerCase().includes(lower) || 
      t.property.toLowerCase().includes(lower)
    );
  }

  loadTenants() {
    this.isLoading = true;
    this.errorMessage = null;
    this.store.select(selectUserId).pipe(
      filter((id): id is string => Boolean(id)),
      take(1),
      switchMap(id => this.leaseService.getLeasesByLandlord(id)),
      switchMap(leases => {
        const activeLeases = leases.filter(lease => lease.status === 'ACTIVE');
        if (!activeLeases.length) return of({ leases: activeLeases, tenants: [] as TenantLookup[] });

        const tenantIds = [...new Set(activeLeases.map(lease => lease.tenantId))];
        return this.userService.getTenantsByIds(tenantIds)
          .pipe(map(tenants => ({ leases: activeLeases, tenants })));
      })
    ).subscribe({
      next: ({ leases, tenants }) => {
        if (!leases.length) {
          this.tenants = [];
          this.isLoading = false;
          this.changeDetector.markForCheck();
          return;
        }
        forkJoin(leases.map(lease => this.createTenantRow(
          lease,
          tenants.find(tenant => tenant.id === lease.tenantId)
        ))).subscribe({
          next: rows => {
            this.tenants = rows;
            this.isLoading = false;
            this.changeDetector.markForCheck();
          },
          error: error => {
            console.error('Kiracı detayları yüklenemedi.', error);
            this.errorMessage = 'Kiracı ve mülk bilgileri yüklenemedi.';
            this.isLoading = false;
            this.changeDetector.markForCheck();
          }
        });
      },
      error: error => {
        console.error('Kiracı sözleşmeleri yüklenemedi.', error);
        this.errorMessage = 'Kiracı listesi yüklenemedi. Lütfen tekrar deneyin.';
        this.isLoading = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  private createTenantRow(lease: Lease, tenant: TenantLookup | undefined) {
    const tenantName = tenant
      ? (`${tenant.firstName} ${tenant.lastName}`.trim() || tenant.email)
      : `Kiracı (${lease.tenantId.substring(0, 8)}...)`;
    const tenantEmail = tenant?.email || '-';
    const tenantId = tenant?.id || lease.tenantId;

    return this.propertyService.getProperty(lease.propertyId).pipe(
      catchError(() => of({ name: 'Kayıtlı Mülk', street: '' } as Property)),
      map(property => ({
        id: tenantId,
        name: tenantName,
        email: tenantEmail,
        property: property.street ? `${property.name} — ${property.street}` : property.name,
        leaseEnd: lease.endDate ? new Date(lease.endDate).toLocaleDateString('tr-TR') : '-',
        rent: lease.monthlyRentAmount,
        status: 'Aktif',
        leaseId: lease.id
      }))
    );
  }

  openModal(tenant: TenantRow) {
    this.selectedTenant = tenant;
    this.isModalOpen = true;
    this.isComposing = false;
    this.messageSubject = '';
    this.messageContent = '';
    this.messageError = null;
  }

  closeModal() {
    this.isModalOpen = false;
    setTimeout(() => this.selectedTenant = null, 300); // Wait for animation
  }
  
  sendEmail() {
    if (!this.selectedTenant || !this.messageSubject.trim() || !this.messageContent.trim()) {
      this.messageError = 'Konu ve mesaj alanlarını doldurun.';
      return;
    }
    this.isSending = true;
    this.messageError = null;
    this.notificationService.sendEmail(
      this.selectedTenant.id,
      this.selectedTenant.email,
      this.messageSubject.trim(),
      this.messageContent.trim()
    ).subscribe({
      next: response => {
        this.isSending = false;
        if (response.status !== 'SENT') {
          this.messageError = 'E-posta gönderilemedi. Lütfen tekrar deneyin.';
          this.changeDetector.markForCheck();
          return;
        }
        this.closeModal();
        this.toastMessage = `${this.selectedTenant?.name ?? 'Kiracı'} için e-posta gönderildi.`;
        this.changeDetector.markForCheck();
        setTimeout(() => this.toastMessage = null, 3000);
      },
      error: error => {
        console.error('Kiracıya e-posta gönderilemedi.', error);
        this.messageError = 'E-posta gönderilemedi. SMTP/MailHog yapılandırmasını kontrol edin.';
        this.isSending = false;
        this.changeDetector.markForCheck();
      }
    });
  }
}

interface TenantRow {
  id: string;
  name: string;
  email: string;
  property: string;
  leaseEnd: string;
  rent: number;
  status: string;
  leaseId: string;
}
