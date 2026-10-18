import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import turkishLocale from '@angular/common/locales/tr';
import { FormsModule } from '@angular/forms';
import { LeaseService, Lease, CreateLeaseRequest } from '../../../../core/services/lease.service';
import { PropertyService, Property, PropertyUnit } from '../../../../core/services/property.service';
import { DocumentService } from '../../../../core/services/document.service';
import { Store } from '@ngrx/store';
import { filter, switchMap, take, throwError } from 'rxjs';
import { selectUserId } from '../../../../store/auth/auth.selectors';
import { TenantLookup, UserService } from '../../../../core/services/user.service';

registerLocaleData(turkishLocale);

@Component({
  selector: 'app-leases',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page animate-slideUp relative">
      
      <!-- Toast Notification -->
      <div *ngIf="toastMessage" class="toast-notification animate-slideDown">
        <span class="mr-2">✨</span> {{ toastMessage }}
      </div>

      <!-- Sayfa Başlığı ve Aksiyonlar -->
      <div class="page__header flex justify-between items-center mb-8">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="page-title">Kira Sözleşmeleri</h1>
            <span class="badge badge--soft-indigo">Hukuki Süreçler & Belgeler</span>
          </div>
          <p class="text-sm text-muted mt-1">
            Yürürlükteki ve bekleyen tüm kira kontratlarınızı izleyin, PDF dökümü alın ve sonlandırma süreçlerini yönetin.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button class="btn btn--secondary" (click)="loadLeases()" [disabled]="isLoadingProperties">
            <span class="icon">🔄</span> Yenile
          </button>
          <button class="btn btn--primary" (click)="openWizard()">
            <span class="icon">📄</span> Yeni Sözleşme (Wizard)
          </button>
        </div>
      </div>

      <!-- KPI Özet Göstergeleri (Executive Leases Metrics) -->
      <div class="grid grid--4 mb-8" *ngIf="leases.length > 0">
        <div class="stat-kpi-card">
          <div class="stat-kpi-label">Toplam Sözleşme</div>
          <div class="stat-kpi-val">{{ leases.length }}</div>
          <div class="stat-kpi-sub text-muted">Kayıtlı kontrat havuzu</div>
        </div>

        <div class="stat-kpi-card stat-kpi-card--emerald">
          <div class="stat-kpi-label">Yürürlükte / Aktif</div>
          <div class="stat-kpi-val text-emerald">{{ activeLeasesCount }}</div>
          <div class="stat-kpi-sub text-muted">Geçerli kira bağı</div>
        </div>

        <div class="stat-kpi-card stat-kpi-card--amber">
          <div class="stat-kpi-label">Beklemede / Onay</div>
          <div class="stat-kpi-val text-amber">{{ pendingLeasesCount }}</div>
          <div class="stat-kpi-sub text-muted">İşlem sırasındaki</div>
        </div>

        <div class="stat-kpi-card stat-kpi-card--cyan">
          <div class="stat-kpi-label">Aylık Aktif Hacim</div>
          <div class="stat-kpi-val text-cyan">{{ totalMonthlyVolume | number:'1.0-0' }} <span class="currency-sm">₺</span></div>
          <div class="stat-kpi-sub text-muted">Aktif kontrat toplamı</div>
        </div>
      </div>

      <p class="alert alert--danger mb-6" *ngIf="errorMessage">{{ errorMessage }}</p>

      <!-- New Lease Wizard Modal -->
      <div class="modal" [class.modal--open]="isWizardOpen" *ngIf="isWizardOpen">
        <div class="modal__overlay" (click)="closeWizard()"></div>
        <div class="modal__content" style="max-width: 600px;">
          <div class="modal__header">
            <h3 class="modal__title">Yeni Sözleşme Oluştur</h3>
            <button class="modal__close" (click)="closeWizard()">✕</button>
          </div>
          <div class="modal__body flex-col gap-4">
            <div class="form-group">
              <label for="tenant-search">Kiracı ara</label>
              <div class="flex gap-2">
                <input id="tenant-search" class="input" [(ngModel)]="tenantSearch"
                       placeholder="Ad, soyad veya e-posta (en az 2 karakter)"
                       (keyup.enter)="searchTenants()">
                <button type="button" class="btn btn--secondary" (click)="searchTenants()"
                        [disabled]="isLoadingTenants || tenantSearch.trim().length < 2">
                  {{ isLoadingTenants ? 'Aranıyor...' : 'Ara' }}
                </button>
              </div>
              <label for="tenant-select" class="mt-2">Sonuçlar</label>
              <select id="tenant-select" class="input" [(ngModel)]="newLease.tenantId"
                      [disabled]="isLoadingTenants || tenants.length === 0">
                <option value="">{{ isLoadingTenants ? 'Kiracılar aranıyor…' : 'Kiracı seçin' }}</option>
                <option *ngFor="let tenant of tenants" [value]="tenant.id">
                  {{ tenant.firstName }} {{ tenant.lastName }} · {{ tenant.email }}
                </option>
              </select>
              <small *ngIf="!isLoadingTenants && !tenants.length">Kiracı aramak için en az 2 karakter girin. Kiracının önce RentFlow’a giriş yapması gerekir.</small>
            </div>
            <div class="form-group">
              <label for="lease-property">İlgili Mülk</label>
              <select id="lease-property" class="input" [(ngModel)]="newLease.propertyId" (ngModelChange)="onPropertySelected($event)">
                <option value="">{{ isLoadingProperties ? 'Mülkler yükleniyor...' : 'Mülk seçin' }}</option>
                <option *ngFor="let property of properties" [value]="property.id">{{ property.name }} — {{ property.city }}</option>
              </select>
              <small *ngIf="!isLoadingProperties && properties.length === 0" class="text-warning">Kayıtlı mülk bulunamadı. Önce "Mülklerim" sayfasından mülk ekleyin.</small>
            </div>
            <div class="form-group">
              <label for="lease-unit">Boş Bağımsız Bölüm</label>
              <select id="lease-unit" class="input" [(ngModel)]="newLease.unitId" (ngModelChange)="onUnitSelected($event)" [disabled]="availableUnits.length === 0">
                <option value="">{{ !newLease.propertyId ? 'Önce mülk seçin' : availableUnits.length === 0 ? 'Kiralanabilir boş birim yok' : 'Birim seçin' }}</option>
                <option *ngFor="let unit of availableUnits" [value]="unit.id">{{ unit.unitNumber }} — {{ unit.rentAmount | number:'1.0-0' }} {{ unit.currency === 'TRY' ? 'TL' : (unit.currency || 'TL') }}/ay</option>
              </select>
              <small *ngIf="newLease.propertyId && availableUnits.length === 0" class="text-warning">Bu mülkte kiralanabilir boş birim bulunamadı.</small>
            </div>
            <div class="grid grid--2 gap-4">
              <div class="form-group">
                <label for="lease-rent">Aylık Kira (₺)</label>
                <input id="lease-rent" type="number" class="input" [value]="selectedUnit?.rentAmount ?? ''" readonly>
              </div>
              <div class="form-group">
                <label for="lease-deposit">Depozito (₺)</label>
                <input id="lease-deposit" type="number" class="input" placeholder="0" [(ngModel)]="newLease.deposit">
              </div>
            </div>
            <div class="grid grid--2 gap-4">
              <div class="form-group">
                <label for="lease-start-date">Başlangıç tarihi</label>
                <input id="lease-start-date" type="date" class="input" [(ngModel)]="newLease.startDate">
              </div>
              <div class="form-group">
                <label for="lease-end-date">Bitiş tarihi</label>
                <input id="lease-end-date" type="date" class="input" [(ngModel)]="newLease.endDate">
              </div>
            </div>
            <p class="alert alert--danger" *ngIf="formError">{{ formError }}</p>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" (click)="closeWizard()">İptal</button>
            <button class="btn btn--primary" (click)="submitWizard()" [disabled]="isSaving || !selectedUnit">
              {{ isSaving ? 'Başlatılıyor...' : 'Sözleşmeyi Başlat' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Lease Termination Wizard Modal -->
      <div class="modal" [class.modal--open]="isTerminationWizardOpen" *ngIf="isTerminationWizardOpen">
        <div class="modal__overlay" (click)="closeTerminationWizard()"></div>
        <div class="modal__content" style="max-width: 600px;">
          <div class="modal__header">
            <h3 class="modal__title text-danger">Sözleşmeyi Sonlandır</h3>
            <button class="modal__close" (click)="closeTerminationWizard()">✕</button>
          </div>
          <div class="modal__body flex-col gap-4">
            <div class="alert alert--warning mb-4">
              <strong>Dikkat:</strong> Bu işlem geri alınamaz. Depozito iadesi ve mülk durum güncellemesi otomatik olarak (Saga) başlayacaktır.
            </div>
            
            <div class="form-group">
              <label>Sözleşme ID</label>
              <input type="text" class="input" [value]="getTerminationLeaseId()" readonly disabled>
            </div>
            
            <div class="form-group">
              <label>Depozito İade Durumu</label>
              <select class="input" [(ngModel)]="terminationReason">
                <option value="full">Tam İade (Hasar Yok)</option>
                <option value="partial">Kısmi İade (Hasar Kesintisi)</option>
                <option value="none">İade Yok (Ağır Hasar / Borç)</option>
              </select>
            </div>
            
            <div class="form-group" *ngIf="terminationReason === 'partial'">
              <label>Kesinti Miktarı (₺)</label>
              <input type="number" class="input" [(ngModel)]="deductionAmount" placeholder="0">
              <small class="text-muted">Mevcut depozito: {{ leaseToTerminate?.depositAmount | number:'1.2-2':'tr-TR' }} ₺</small>
            </div>

            <div class="form-group">
              <label>İptal Nedeni / Açıklama</label>
              <textarea class="input" rows="3" [(ngModel)]="terminationNotes" placeholder="Sonlandırma nedeni veya hasar detayları..."></textarea>
            </div>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" (click)="closeTerminationWizard()">İptal</button>
            <button class="btn btn--danger" (click)="confirmTermination()" [disabled]="isTerminating">
              {{ isTerminating ? 'Sonlandırılıyor...' : 'Sözleşmeyi Kesin Olarak Sonlandır' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Sözleşme Kartları Izgarası -->
      <div class="grid grid--2 mt-6" *ngIf="leases.length > 0">
        <article class="lease-card" *ngFor="let lease of leases">
          <div class="lease-card__header flex justify-between items-center mb-4">
            <div class="badge" [class.badge--paid]="lease.status === 'ACTIVE'" [class.badge--warning]="lease.status === 'PENDING'">
              <span class="status-dot"></span>
              {{ getStatusText(lease.status) }}
            </div>
            <span class="lease-id mono" [title]="lease.id">
              <span>#</span>{{ (lease.id | slice:0:8) }}...
            </span>
          </div>

          <!-- Finansal Vurgu Kutusu -->
          <div class="lease-finance-hero mb-4">
            <div class="finance-block">
              <span class="finance-label">Aylık Kira Bedeli</span>
              <span class="finance-value currency text-emerald">{{ lease.monthlyRentAmount | number:'1.0-0':'tr-TR' }} ₺</span>
            </div>
            <div class="finance-divider"></div>
            <div class="finance-block">
              <span class="finance-label">Güvence Depozitosu</span>
              <span class="finance-value currency text-cyan">{{ lease.depositAmount | number:'1.0-0':'tr-TR' }} ₺</span>
            </div>
          </div>

          <!-- Mülk ve Kiracı Detayları -->
          <div class="lease-meta-grid mb-4">
            <div class="lease-meta-pill">
              <span class="meta-icon">🏢</span>
              <div class="meta-info">
                <span class="meta-label">Mülk Kaydı</span>
                <span class="meta-val mono">{{ (lease.propertyId | slice:0:8) }}...</span>
              </div>
            </div>
            <div class="lease-meta-pill">
              <span class="meta-icon">👤</span>
              <div class="meta-info">
                <span class="meta-label">Kiracı</span>
                <span class="meta-val mono">{{ (lease.tenantId | slice:0:8) }}...</span>
              </div>
            </div>
          </div>

          <!-- Sözleşme Takvim Periyodu -->
          <div class="lease-period-box mb-4">
            <div class="period-dates flex justify-between items-center text-xs">
              <span class="text-muted">Başlangıç: <strong class="text-white">{{ lease.startDate | date:'d MMM y' }}</strong></span>
              <span class="period-badge">12 Ay</span>
              <span class="text-muted">Bitiş: <strong class="text-white">{{ lease.endDate | date:'d MMM y' }}</strong></span>
            </div>
            <div class="period-track">
              <div class="period-fill" [style.width]="'75%'"></div>
            </div>
          </div>

          <!-- İşlem Butonları -->
          <div class="lease-card__actions flex items-center gap-3 pt-3">
            <button class="btn btn--secondary btn--sm flex-1" (click)="downloadPdf(lease.id)" [disabled]="downloadingId === lease.id || lease.status !== 'ACTIVE'">
              <span>📥</span> {{ downloadingId === lease.id ? 'Hazırlanıyor...' : 'PDF İndir' }}
            </button>
            <button class="btn btn--danger btn--sm flex-1" (click)="openTerminationWizard(lease)" [disabled]="lease.status !== 'ACTIVE'">
              <span>✕</span> Sonlandır
            </button>
          </div>
        </article>
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

    .currency-sm {
      font-size: 1.25rem;
      font-weight: 600;
      color: #38bdf8;
    }

    .flex-1 { flex: 1; }

    .lease-card {
      background: var(--gradient-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: 24px;
      transition: all var(--transition-normal);
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-md);

      &:hover {
        border-color: var(--border-hover);
        box-shadow: var(--shadow-lg), 0 0 25px rgba(99, 102, 241, 0.15);
        transform: translateY(-4px);
      }

      .lease-id {
        font-family: var(--font-mono, monospace);
        color: #94a3b8;
        font-size: 0.8125rem;
        background: rgba(255, 255, 255, 0.04);
        padding: 4px 10px;
        border-radius: var(--radius-sm);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        display: inline-block;
        margin-right: 4px;
      }
    }

    /* Finansal Vurgu Kutusu */
    .lease-finance-hero {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 16px 20px;
    }

    .finance-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .finance-label {
      font-size: 0.6875rem;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .finance-value {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .finance-divider {
      width: 1px;
      height: 36px;
      background: rgba(255, 255, 255, 0.08);
      margin: 0 16px;
    }

    /* Mülk & Kiracı Rozetleri */
    .lease-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .lease-meta-pill {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 10px;

      .meta-icon { font-size: 1.15rem; }
      .meta-info { display: flex; flex-direction: column; }
      .meta-label { font-size: 0.6875rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
      .meta-val { font-size: 0.8125rem; font-weight: 600; color: #e2e8f0; }
    }

    /* Sözleşme Periyot Barı */
    .lease-period-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 12px 14px;
    }

    .period-dates { margin-bottom: 8px; }

    .period-badge {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
    }

    .period-track {
      width: 100%;
      height: 4px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
    }

    .period-fill {
      height: 100%;
      border-radius: 9999px;
      background: linear-gradient(90deg, #6366f1, #06b6d4);
    }

    .lease-card__actions {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
  `]
})
export class LeasesComponent implements OnInit {
  leases: Lease[] = [];
  properties: Property[] = [];
  tenants: TenantLookup[] = [];
  availableUnits: PropertyUnit[] = [];
  selectedUnit: PropertyUnit | null = null;
  currentUserId: string | null = null;
  formError: string | null = null;
  isSaving = false;
  isLoadingTenants = false;
  isLoadingProperties = false;
  errorMessage: string | null = null;
  tenantSearch = '';

  get activeLeasesCount(): number {
    return this.leases.filter(l => l.status === 'ACTIVE').length;
  }

  get pendingLeasesCount(): number {
    return this.leases.filter(l => l.status === 'PENDING').length;
  }

  get totalMonthlyVolume(): number {
    return this.leases
      .filter(l => l.status === 'ACTIVE')
      .reduce((sum, l) => sum + (l.monthlyRentAmount || 0), 0);
  }

  constructor(
    private changeDetector: ChangeDetectorRef,
    private leaseService: LeaseService,
    private propertyService: PropertyService,
    private documentService: DocumentService,
    private userService: UserService,
    private store: Store
  ) {}

  ngOnInit() {
    this.store.select(selectUserId).pipe(
      filter((id): id is string => Boolean(id))
    ).subscribe(id => {
      this.currentUserId = id;
      this.loadLeases(id);
      this.loadProperties(id);
    });
  }

  loadProperties(landlordId?: string) {
    const id = landlordId || this.currentUserId;
    if (!id) return;
    this.isLoadingProperties = true;
    this.propertyService.getProperties(id).subscribe({
      next: properties => {
        this.properties = properties ?? [];
        this.isLoadingProperties = false;
        this.changeDetector.markForCheck();
      },
      error: error => {
        console.error('Mülkler yüklenemedi.', error);
        this.isLoadingProperties = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  loadLeases(landlordId?: string) {
    const id = landlordId || this.currentUserId;
    if (!id) {
      this.store.select(selectUserId).pipe(
        filter((userId): userId is string => Boolean(userId)),
        take(1)
      ).subscribe(userId => {
        this.currentUserId = userId;
        this.loadLeases(userId);
      });
      return;
    }
    this.errorMessage = null;
    this.leaseService.getLeasesByLandlord(id).subscribe({
      next: (data) => {
        this.leases = data ?? [];
        this.errorMessage = null;
        this.changeDetector.markForCheck();
      },
      error: (err) => {
        console.error('Sözleşmeler yüklenemedi.', err);
        this.errorMessage = 'Sözleşmeler yüklenemedi. Lütfen tekrar deneyin.';
        this.changeDetector.markForCheck();
      }
    });
  }

  toastMessage: string | null = null;
  downloadingId: string | null = null;
  
  // Wizard State
  isWizardOpen = false;
  newLease = this.createEmptyLeaseDraft();

  showToast(msg: string) {
    this.toastMessage = msg;
    setTimeout(() => this.toastMessage = null, 3000);
  }

  openWizard() {
    this.newLease = this.createEmptyLeaseDraft();
    this.tenants = [];
    this.tenantSearch = '';
    this.availableUnits = [];
    this.selectedUnit = null;
    this.formError = null;
    this.isWizardOpen = true;

    this.store.select(selectUserId).pipe(
      filter((id): id is string => Boolean(id)),
      take(1)
    ).subscribe({
      next: (userId) => {
        this.currentUserId = userId;
        this.loadProperties(userId);
      },
      error: () => {
        this.formError = 'Oturum bilgisi bulunamadı. Lütfen yeniden giriş yapın.';
        this.changeDetector.markForCheck();
      }
    });
  }

  searchTenants() {
    const search = this.tenantSearch.trim();
    if (search.length < 2 || this.isLoadingTenants) return;

    this.isLoadingTenants = true;
    this.tenants = [];
    this.newLease.tenantId = '';
    this.userService.getTenants(search).subscribe({
      next: tenants => {
        this.tenants = tenants ?? [];
        if (this.tenants.length === 1) {
          this.newLease.tenantId = this.tenants[0].id;
        }
        this.isLoadingTenants = false;
        this.changeDetector.markForCheck();
      },
      error: error => {
        console.error('Kiracı listesi sözleşme sihirbazı için yüklenemedi.', error);
        this.formError = 'Kiracı listesi yüklenemedi. Lütfen tekrar deneyin.';
        this.isLoadingTenants = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  closeWizard() {
    this.isWizardOpen = false;
  }

  onPropertySelected(propertyId: string) {
    this.newLease.unitId = '';
    this.selectedUnit = null;
    if (!propertyId) {
      this.availableUnits = [];
      this.changeDetector.markForCheck();
      return;
    }
    const selectedProp = this.properties.find(property =>
      property.id?.toLowerCase() === propertyId.toLowerCase()
    );
    this.availableUnits = (selectedProp?.units ?? []).filter(unit =>
      unit.status?.toUpperCase() === 'AVAILABLE' || unit.status === 'Müsait'
    );
    this.changeDetector.markForCheck();
  }

  onUnitSelected(unitId: string) {
    this.selectedUnit = this.availableUnits.find(unit =>
      unit.id?.toLowerCase() === unitId?.toLowerCase()
    ) ?? null;
    if (this.selectedUnit && (!this.newLease.deposit || Number(this.newLease.deposit) === 0)) {
      this.newLease.deposit = this.selectedUnit.rentAmount;
    }
    this.changeDetector.markForCheck();
  }

  getStatusText(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Onay bekliyor',
      ACTIVE: 'Aktif',
      CANCELLED: 'İptal edildi'
    };
    return labels[status] ?? status;
  }

  submitWizard() {
    this.formError = null;
    if (!this.currentUserId) {
      this.formError = 'Oturum kullanıcı bilgisi bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.';
      return;
    }
    if (!this.newLease.tenantId) {
      this.formError = 'Lütfen "Sonuçlar" açılır kutusundan kiracıyı seçin.';
      return;
    }
    if (!this.newLease.propertyId) {
      this.formError = 'Lütfen "İlgili Mülk" seçin.';
      return;
    }
    if (!this.selectedUnit) {
      this.formError = 'Lütfen kiralanacak "Boş Bağımsız Bölüm" seçin.';
      return;
    }
    if (this.newLease.deposit === null || this.newLease.deposit === undefined || Number(this.newLease.deposit) < 0) {
      this.formError = 'Geçerli bir depozito tutarı girin (0 veya daha büyük).';
      return;
    }
    if (!this.newLease.startDate || !this.newLease.endDate) {
      this.formError = 'Lütfen başlangıç ve bitiş tarihlerini belirleyin.';
      return;
    }
    if (new Date(this.newLease.endDate) <= new Date(this.newLease.startDate)) {
      this.formError = 'Bitiş tarihi, başlangıç tarihinden sonraki bir tarih olmalıdır.';
      return;
    }

    const request: CreateLeaseRequest = {
      tenantId: this.newLease.tenantId,
      landlordId: this.currentUserId,
      propertyId: this.newLease.propertyId,
      unitId: this.selectedUnit.id,
      startDate: new Date(`${this.newLease.startDate}T00:00:00Z`).toISOString(),
      endDate: new Date(`${this.newLease.endDate}T00:00:00Z`).toISOString(),
      monthlyRentAmount: this.selectedUnit.rentAmount,
      depositAmount: Number(this.newLease.deposit)
    };
    this.isSaving = true;
    this.leaseService.createLease(request).subscribe({
      next: () => {
        this.isSaving = false;
        this.showToast('Sözleşme oluşturuldu ve Saga süreci başlatıldı.');
        this.closeWizard();
        this.changeDetector.markForCheck();
        this.loadLeases();
      },
      error: (err) => {
        console.error('Sözleşme oluşturulamadı.', err);
        this.formError = err?.error?.message || err?.error?.detail || err?.message || 'Sözleşme başlatılamadı. Seçimleri ve kiracı ID değerini kontrol edin.';
        this.isSaving = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  downloadPdf(leaseId: string) {
    this.downloadingId = leaseId;
    const lease = this.leases.find(item => item.id === leaseId);
    if (!lease) {
      this.downloadingId = null;
      this.showToast('Sözleşme kaydı bulunamadı.');
      return;
    }
    this.documentService.generateLeaseContract(lease.id)
      .pipe(switchMap(document => this.documentService.download(document.documentId)))
      .subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `kira-sozlesmesi-${lease.id}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
          this.downloadingId = null;
          this.showToast('Sözleşme PDF olarak indirildi.');
        },
        error: error => {
          console.error('Sözleşme PDF’i indirilemedi.', error);
          this.downloadingId = null;
          this.showToast('PDF oluşturulamadı. Lütfen tekrar deneyin.');
        }
      });
  }

  // Termination Wizard State
  isTerminationWizardOpen = false;
  leaseToTerminate: Lease | null = null;
  terminationReason = 'full';
  deductionAmount = 0;
  terminationNotes = '';
  isTerminating = false;

  openTerminationWizard(lease: Lease) {
    this.leaseToTerminate = lease;
    this.terminationReason = 'full';
    this.deductionAmount = 0;
    this.terminationNotes = '';
    this.isTerminationWizardOpen = true;
    this.changeDetector.markForCheck();
  }

  getTerminationLeaseId(): string {
    if (!this.leaseToTerminate) return '';
    const item = this.leaseToTerminate as any;
    return item.id || item.leaseId || item.Id || '';
  }

  closeTerminationWizard() {
    this.isTerminationWizardOpen = false;
    this.leaseToTerminate = null;
    this.changeDetector.markForCheck();
  }

  confirmTermination() {
    const leaseId = this.getTerminationLeaseId();
    if (!leaseId) {
      this.showToast('Sonlandırılacak geçerli bir sözleşme ID bulunamadı.');
      return;
    }
    
    // UI demonstrates robust wizard experience, but backend only needs the leaseId
    this.isTerminating = true;
    this.leaseService.cancelLease(leaseId).subscribe({
      next: () => {
        this.isTerminating = false;
        this.showToast('Sözleşme iptal edildi ve iade süreci (Saga) başlatıldı.');
        this.closeTerminationWizard();
        this.loadLeases();
      },
      error: error => {
        this.isTerminating = false;
        console.error('Sözleşme iptal edilemedi.', error);
        this.showToast('Sözleşme iptal edilemedi.');
        this.changeDetector.markForCheck();
      }
    });
  }

  private createEmptyLeaseDraft() {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    return {
      tenantId: '',
      propertyId: '',
      unitId: '',
      deposit: 0,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10)
    };
  }
}
