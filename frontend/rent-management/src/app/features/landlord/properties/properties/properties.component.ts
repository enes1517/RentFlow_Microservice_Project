import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PropertyService, Property, PropertyUnit } from '../../../../core/services/property.service';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { filter, switchMap, take, throwError } from 'rxjs';
import { selectUserId } from '../../../../store/auth/auth.selectors';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  template: `
    <div class="page animate-slideUp relative">

      <!-- Toast Notification -->
      <div *ngIf="toastMessage" class="toast-notification animate-slideDown">
        <span class="mr-2">🏠</span> {{ toastMessage }}
      </div>

      <!-- Sayfa Başlığı ve Aksiyonlar -->
      <div class="page__header flex justify-between items-center mb-8">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="page-title">Mülk Portföyü</h1>
            <span class="badge badge--soft-indigo">Envanter & Varlıklar</span>
          </div>
          <p class="text-sm text-muted mt-1">
            Sahip olduğunuz tüm mülkleri, bağımsız bölümleri ve kira doluluk oranlarını tek ekranda yönetin.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button class="btn btn--secondary" (click)="loadProperties()" [disabled]="isLoading">
            <span class="icon" [class.icon--spin]="isLoading">🔄</span>
            {{ isLoading ? 'Yenileniyor...' : 'Yenile' }}
          </button>
          <button class="btn btn--primary" (click)="openAddModal()">
            <span class="icon">+</span> Yeni Mülk Ekle
          </button>
        </div>
      </div>

      <!-- KPI Özet Göstergeleri (Executive Portfolio Metrics) -->
      <div class="grid grid--4 mb-8" *ngIf="!isLoading && !errorMessage && properties.length > 0">
        <div class="stat-kpi-card">
          <div class="stat-kpi-label">Toplam Mülk</div>
          <div class="stat-kpi-val">{{ properties.length }}</div>
          <div class="stat-kpi-sub text-muted">Kayıtlı Bina & Rezidans</div>
        </div>

        <div class="stat-kpi-card stat-kpi-card--cyan">
          <div class="stat-kpi-label">Bağımsız Bölüm</div>
          <div class="stat-kpi-val text-cyan">{{ totalUnits }}</div>
          <div class="stat-kpi-sub text-muted">Daire / Ofis Havuzu</div>
        </div>

        <div class="stat-kpi-card stat-kpi-card--emerald">
          <div class="stat-kpi-label">Kirada Olan</div>
          <div class="stat-kpi-val text-emerald">{{ rentedUnitsCount }}</div>
          <div class="stat-kpi-sub text-muted">Gelir Üreten Birim</div>
        </div>

        <div class="stat-kpi-card stat-kpi-card--amber">
          <div class="stat-kpi-label">Boş / Müsait</div>
          <div class="stat-kpi-val text-amber">{{ vacantUnitsCount }}</div>
          <div class="stat-kpi-sub text-muted">Hemen Kiralanabilir</div>
        </div>
      </div>

      <p class="alert alert--danger mb-6" *ngIf="errorMessage">{{ errorMessage }}</p>

      <div class="loading-state" *ngIf="isLoading">
        <div class="spinner"></div>
        <p class="text-muted mt-3">Mülk envanteri taranıyor...</p>
      </div>

      <!-- Boş Durum -->
      <div class="empty-state-luxury" *ngIf="!isLoading && !errorMessage && properties.length === 0">
        <div class="empty-icon-wrap">🏢</div>
        <h3>Henüz Kayıtlı Mülkünüz Yok</h3>
        <p class="text-muted">Portföyünüzü oluşturmak için "Yeni Mülk Ekle" butonunu kullanarak ilk mülkünüzü ve bağımsız bölümlerinizi ekleyin.</p>
        <button class="btn btn--primary mt-4" (click)="openAddModal()">+ İlk Mülkü Ekle</button>
      </div>

      <!-- Property Modal (Manage or Add) -->
      <div class="modal" [class.modal--open]="isModalOpen" *ngIf="isModalOpen">
        <div class="modal__overlay" (click)="closeModal()"></div>
        <div class="modal__content" style="max-width: 600px;">
          <div class="modal__header">
            <h3 class="modal__title">{{ selectedProperty ? selectedProperty.name + ' - Yeni Bağımsız Bölüm' : 'Yeni Mülk ve Birim Ekle' }}</h3>
            <button class="modal__close" (click)="closeModal()">✕</button>
          </div>
          <div class="modal__body flex-col gap-4">
            <ng-container *ngIf="!selectedProperty">
            <div class="form-group">
              <label for="property-name">Mülk Adı / Başlık</label>
              <input id="property-name" type="text" class="input" [(ngModel)]="draft.name" placeholder="Örn: Kadıköy Apartmanı">
            </div>
            <div class="form-group">
              <label for="property-street">Açık Adres</label>
              <textarea id="property-street" class="input" rows="2" [(ngModel)]="draft.street" placeholder="Cadde, mahalle, no..."></textarea>
            </div>
            <div class="grid grid--2 gap-4">
              <div class="form-group">
                <label for="property-city">Şehir / İl</label>
                <input id="property-city" type="text" class="input" [(ngModel)]="draft.city" placeholder="İstanbul">
              </div>
              <div class="form-group">
                <label for="property-zip-code">Posta Kodu</label>
                <input id="property-zip-code" type="text" class="input" [(ngModel)]="draft.zipCode" placeholder="34000">
              </div>
            </div>
            </ng-container>
            <div class="grid grid--2 gap-4">
              <div class="form-group">
                <label for="property-unit-number">Bağımsız Bölüm No</label>
                <input id="property-unit-number" type="text" class="input" [(ngModel)]="draft.unitNumber" placeholder="Daire 1">
              </div>
              <div class="form-group">
                <label for="property-floor">Bulunduğu Kat</label>
                <input id="property-floor" type="number" class="input" [(ngModel)]="draft.floor">
              </div>
              <div class="form-group">
                <label for="property-area">Kullanım Alanı (m²)</label>
                <input id="property-area" type="number" min="1" class="input" [(ngModel)]="draft.squareMeters">
              </div>
              <div class="form-group">
                <label for="property-rent">Hedef Aylık Kira (₺)</label>
                <input id="property-rent" type="number" min="1" class="input" [(ngModel)]="draft.rentAmount">
              </div>
            </div>
            <p class="alert alert--danger" *ngIf="formError">{{ formError }}</p>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" (click)="closeModal()">İptal</button>
            <button class="btn btn--primary" (click)="saveProperty()" [disabled]="isSaving">
              {{ isSaving ? 'Kaydediliyor...' : selectedProperty ? 'Birimi Kaydet' : 'Mülkü ve Birimi Kaydet' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Mülk Kartları Izgarası -->
      <div class="properties-grid mt-6" *ngIf="!isLoading && properties.length > 0">
        <div class="property-card" *ngFor="let property of properties">
          <!-- Resim alanı -->
          <div class="property-card__image-wrapper">
            <img [src]="imageUrl" [alt]="property.name" class="property-card__image">
            <div class="property-card__city-badge">
              <span>📍</span> {{ property.city || 'Türkiye' }}
            </div>
            <div class="property-card__badge" [class.badge--success]="hasRentedUnit(property)" [class.badge--warning]="!hasRentedUnit(property)">
              <span class="status-dot"></span>
              {{ hasRentedUnit(property) ? 'Kiralanmış Birim Var' : 'Tümü Müsait' }}
            </div>
          </div>
          
          <!-- Bilgi alanı -->
          <div class="property-card__content">
            <h3 class="property-card__title">{{ property.name }}</h3>
            <p class="property-card__address">{{ property.street }}, {{ property.city }}</p>
            
            <div class="property-card__features">
              <span class="feature-tag">🏢 {{ property.units.length }} Bağımsız Birim</span>
              <span class="feature-tag">📐 {{ getTotalArea(property.units) }} m² Alan</span>
            </div>
            
            <div class="property-card__footer">
              <div class="property-card__price">
                <span class="price-label">Başlangıç Kirası</span>
                <span class="amount currency">{{ property.units.length ? (getStartingRent(property.units) | number:'1.0-0') + ' ₺' : 'Kira Belirlenmedi' }}</span>
              </div>
              <button class="btn btn--secondary btn--sm" (click)="openManageModal(property)">
                <span>+</span> Birim Ekle
              </button>
            </div>
          </div>
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
    
    .properties-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: var(--space-6);
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

    @keyframes spin { 100% { transform: rotate(360deg); } }

    .property-card {
      background: var(--gradient-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      overflow: hidden;
      transition: all var(--transition-normal);
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-md);

      &:hover {
        transform: translateY(-5px);
        border-color: var(--border-hover);
        box-shadow: var(--shadow-xl), 0 0 30px rgba(99, 102, 241, 0.15);
        
        .property-card__image { transform: scale(1.08); }
      }

      &__image-wrapper {
        position: relative;
        height: 210px;
        overflow: hidden;

        &::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 40%, rgba(12, 16, 26, 0.85) 100%);
          pointer-events: none;
        }
      }

      &__city-badge {
        position: absolute;
        top: 14px;
        left: 14px;
        padding: 5px 12px;
        border-radius: var(--radius-full);
        font-size: 0.75rem;
        font-weight: 700;
        background: rgba(12, 16, 26, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #f1f5f9;
        backdrop-filter: blur(12px);
        z-index: 2;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      &__image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      }

      &__badge {
        position: absolute;
        top: 14px;
        right: 14px;
        padding: 6px 14px;
        border-radius: var(--radius-full);
        font-size: 0.75rem;
        font-weight: 700;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 2;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 6px;
        
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        &.badge--success { 
          background: rgba(16, 185, 129, 0.85); 
          color: white; 
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        &.badge--warning { 
          background: rgba(245, 158, 11, 0.85); 
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
      }

      &__content {
        padding: 24px;
        display: flex;
        flex-direction: column;
        flex: 1;
      }

      &__title {
        font-size: 1.25rem;
        font-weight: 800;
        color: #ffffff;
        margin-bottom: 4px;
        letter-spacing: -0.02em;
      }

      &__address {
        font-size: 0.875rem;
        color: #94a3b8;
        margin-bottom: 18px;
        line-height: 1.4;
      }

      &__features {
        display: flex;
        gap: 10px;
        font-size: 0.8125rem;
        color: #cbd5e1;
        padding-bottom: 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        margin-bottom: 18px;
        flex-wrap: wrap;

        .feature-tag {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-weight: 600;
        }
      }

      &__footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: auto;
      }

      &__price {
        display: flex;
        flex-direction: column;
        .price-label {
          font-size: 0.6875rem;
          color: #94a3b8;
          font-weight: 600;
          text-transform: uppercase;
        }
        .amount { 
          font-size: 1.25rem; 
          font-weight: 800; 
          color: #38bdf8; 
          letter-spacing: -0.02em;
        }
      }
    }
  `]
})
export class PropertiesComponent implements OnInit {
  properties: Property[] = [];
  readonly imageUrl = 'https://images.unsplash.com/photo-1502672260266-1c1e5240980c?auto=format&fit=crop&q=80&w=800';
  isLoading = false;
  isSaving = false;
  errorMessage: string | null = null;
  formError: string | null = null;
  currentUserId: string | null = null;
  draft = this.emptyDraft();
  selectedProperty: Property | null = null;
  isModalOpen = false;
  toastMessage: string | null = null;

  get totalUnits(): number {
    return this.properties.reduce((sum, p) => sum + p.units.length, 0);
  }

  get rentedUnitsCount(): number {
    return this.properties.reduce((sum, p) => sum + p.units.filter(u => u.status === 'RENTED').length, 0);
  }

  get vacantUnitsCount(): number {
    return this.properties.reduce((sum, p) => sum + p.units.filter(u => u.status !== 'RENTED').length, 0);
  }
  
  constructor(
    private changeDetector: ChangeDetectorRef,
    private propertyService: PropertyService,
    private store: Store
  ) {}

  ngOnInit() {
    this.loadProperties();
  }

  loadProperties() {
    this.isLoading = true;
    this.errorMessage = null;
    this.store.select(selectUserId).pipe(
      filter((id): id is string => Boolean(id)),
      take(1),
      switchMap(id => {
        this.currentUserId = id;
        return this.propertyService.getProperties(id);
      })
    ).subscribe({
      next: (data) => {
        this.properties = data ?? [];
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Mülkler yüklenemedi.', err);
        this.errorMessage = 'Mülkler yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.';
        this.isLoading = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    setTimeout(() => this.toastMessage = null, 3000);
  }

  openAddModal() {
    this.selectedProperty = null;
    this.draft = this.emptyDraft();
    this.formError = null;
    this.isModalOpen = true;
  }

  openManageModal(property: Property) {
    this.selectedProperty = property;
    this.draft = this.emptyDraft();
    this.formError = null;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveProperty() {
    if (!this.validateDraft()) return;
    this.isSaving = true;
    this.formError = null;
    const addUnit = (propertyId: string) => this.propertyService.addUnit(propertyId, {
      unitNumber: this.draft.unitNumber.trim(),
      floor: Number(this.draft.floor),
      squareMeters: Number(this.draft.squareMeters),
      rentAmount: Number(this.draft.rentAmount),
      currency: 'TRY'
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.showToast(this.selectedProperty ? 'Bağımsız bölüm eklendi.' : 'Mülk ve ilk bağımsız bölüm eklendi.');
        this.changeDetector.markForCheck();
        this.loadProperties();
      },
      error: (err: unknown) => {
        console.error('Bağımsız bölüm kaydedilemedi.', err);
        this.formError = this.selectedProperty
          ? 'Birim eklenemedi. Bilgileri kontrol edip tekrar deneyin.'
          : 'Mülk kaydedildi ancak birim eklenemedi. Mülkü listeden açıp birimi tekrar ekleyebilirsiniz.';
        this.isSaving = false;
        this.changeDetector.markForCheck();
        this.loadProperties();
      }
    });

    if (this.selectedProperty) {
      addUnit(this.selectedProperty.id);
      return;
    }
    if (!this.currentUserId) {
      this.formError = 'Oturum kullanıcı bilgisi bulunamadı. Lütfen yeniden giriş yapın.';
      this.isSaving = false;
      return;
    }
    this.propertyService.createProperty({
      name: this.draft.name.trim(),
      description: this.draft.street.trim(),
      landlordId: this.currentUserId,
      address: {
        street: this.draft.street.trim(),
        city: this.draft.city.trim(),
        state: 'TR',
        zipCode: this.draft.zipCode.trim(),
        country: 'Türkiye'
      }
    }).subscribe({
      next: response => addUnit(response.id),
      error: (err: unknown) => {
        console.error('Mülk kaydedilemedi.', err);
        this.formError = 'Mülk kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.';
        this.isSaving = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  hasRentedUnit(property: Property): boolean {
    return property.units.some(unit => unit.status === 'RENTED');
  }

  getTotalArea(units: PropertyUnit[]): number {
    return units.reduce((total, unit) => total + unit.squareMeters, 0);
  }

  getStartingRent(units: PropertyUnit[]): number {
    return units.length ? Math.min(...units.map(unit => unit.rentAmount)) : 0;
  }

  getRentRange(units: PropertyUnit[]): string {
    return units.length ? `${units.length} birim` : 'Birim yok';
  }

  private validateDraft(): boolean {
    if (!this.selectedProperty && (!this.draft.name.trim() || !this.draft.street.trim() || !this.draft.city.trim())) {
      this.formError = 'Mülk adı, açık adres ve il alanlarını doldurun.';
      return false;
    }
    if (!this.draft.unitNumber.trim() || Number(this.draft.squareMeters) <= 0 || Number(this.draft.rentAmount) <= 0) {
      this.formError = 'Birim numarası, pozitif alan ve kira tutarı girin.';
      return false;
    }
    return true;
  }

  private emptyDraft() {
    return { name: '', street: '', city: '', zipCode: '', unitNumber: '1', floor: 0, squareMeters: 0, rentAmount: 0 };
  }
}
