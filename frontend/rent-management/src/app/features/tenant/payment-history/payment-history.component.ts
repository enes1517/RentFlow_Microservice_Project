import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService, PaymentRecord } from '../../../core/services/payment.service';
import { Store } from '@ngrx/store';
import { switchMap, take, throwError } from 'rxjs';
import { selectUserId, selectUserName } from '../../../store/auth/auth.selectors';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page animate-slideUp relative">
      
      <!-- Toast Bildirimi -->
      <div *ngIf="toastMessage" class="toast-notification animate-slideDown">
        <span class="mr-2">✅</span> {{ toastMessage }}
      </div>

      <!-- Sayfa Başlığı & Üst Aksiyonlar -->
      <div class="page__header flex justify-between items-center mb-6">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="page-title">Ödeme Geçmişi & Dekontlar 📜</h1>
            <span class="badge badge--soft-emerald">Finansal Kayıtlar</span>
          </div>
          <p class="text-sm text-muted mt-1">
            Tüm kira ve depozito ödemelerinizin zaman damgalı işlem dökümü, e-makbuzları ve mali muhasebe kayıtları.
          </p>
        </div>
        <div class="section-header__actions flex items-center gap-3" *ngIf="payments.length">
          <button class="btn btn--secondary" (click)="downloadCsv()" [disabled]="isExporting">
            <span>📥</span> {{ isExporting ? 'İndiriliyor...' : 'CSV Olarak Dışa Aktar' }}
          </button>
        </div>
      </div>

      <!-- Durum Mesajları -->
      <p class="text-muted mb-4" *ngIf="isLoading">Ödeme geçmişi yükleniyor...</p>
      <p class="alert alert--danger mb-6" *ngIf="errorMessage" role="alert">{{ errorMessage }}</p>

      <!-- 4 Temel Finansal KPI Kartı (İşlem Verisi Varsa) -->
      <div class="grid grid--4 mb-6" *ngIf="!isLoading && !errorMessage && payments.length > 0">
        
        <div class="kpi-card kpi-card--emerald">
          <div class="kpi-card__top flex justify-between items-center">
            <span class="kpi-label">Toplam Ödeme Hacmi</span>
            <div class="kpi-icon-badge">💰</div>
          </div>
          <div class="kpi-value text-emerald">
            {{ totalPaidAmount | number:'1.2-2' }} <span class="currency-symbol">₺</span>
          </div>
          <div class="kpi-footer flex items-center justify-between mt-3">
            <span class="text-xs text-muted">Tamamlanan Tahsilatlar</span>
            <span class="kpi-tag kpi-tag--emerald">{{ successfulCount }} Başarılı</span>
          </div>
        </div>

        <div class="kpi-card kpi-card--blue">
          <div class="kpi-card__top flex justify-between items-center">
            <span class="kpi-label">Toplam İşlem Sayısı</span>
            <div class="kpi-icon-badge">📑</div>
          </div>
          <div class="kpi-value">{{ payments.length }}</div>
          <div class="kpi-footer flex items-center justify-between mt-3">
            <span class="text-xs text-muted">Kayıtlı Havuz</span>
            <span class="kpi-tag">Zaman Damgalı</span>
          </div>
        </div>

        <div class="kpi-card kpi-card--purple">
          <div class="kpi-card__top flex justify-between items-center">
            <span class="kpi-label">Onaydaki / Bekleyen</span>
            <div class="kpi-icon-badge">⏳</div>
          </div>
          <div class="kpi-value text-indigo">{{ pendingCount }}</div>
          <div class="kpi-footer flex items-center justify-between mt-3">
            <span class="text-xs text-muted">Banka / Takas Süreci</span>
            <span class="kpi-tag kpi-tag--indigo">{{ pendingCount > 0 ? 'İşlemde' : 'Temiz' }}</span>
          </div>
        </div>

        <div class="kpi-card kpi-card--cyan">
          <div class="kpi-card__top flex justify-between items-center">
            <span class="kpi-label">Son Başarılı Ödeme</span>
            <div class="kpi-icon-badge">📅</div>
          </div>
          <div class="kpi-value-sm text-cyan">
            {{ lastSuccessfulDate ? (lastSuccessfulDate | date:'mediumDate') : '—' }}
          </div>
          <div class="kpi-footer flex items-center justify-between mt-3">
            <span class="text-xs text-muted">Son Makbuz Tarihi</span>
            <span class="kpi-tag kpi-tag--cyan">3D Secure</span>
          </div>
        </div>

      </div>

      <!-- Filtre Sekmeleri & Arama -->
      <div class="filter-bar flex justify-between items-center mb-6" *ngIf="!isLoading && !errorMessage && payments.length > 0">
        <div class="tabs flex gap-2">
          <button 
            class="tab-btn" 
            [class.tab-btn--active]="selectedStatusFilter === 'ALL'" 
            (click)="selectedStatusFilter = 'ALL'">
            Tümü ({{ payments.length }})
          </button>
          <button 
            class="tab-btn" 
            [class.tab-btn--active]="selectedStatusFilter === 'SUCCESS'" 
            (click)="selectedStatusFilter = 'SUCCESS'">
            ✓ Ödendi ({{ successfulCount }})
          </button>
          <button 
            class="tab-btn" 
            [class.tab-btn--active]="selectedStatusFilter === 'PENDING'" 
            (click)="selectedStatusFilter = 'PENDING'">
            ⏳ Bekleyen ({{ pendingCount }})
          </button>
          <button 
            class="tab-btn" 
            [class.tab-btn--active]="selectedStatusFilter === 'LATE'" 
            (click)="selectedStatusFilter = 'LATE'">
            ⚠️ Gecikmiş / Başarısız ({{ failedCount }})
          </button>
        </div>

        <div class="search-box">
          <input
            type="text"
            class="search-input"
            placeholder="İşlem No veya açıklama ara..."
            [(ngModel)]="searchQuery"
          />
        </div>
      </div>

      <!-- Boş Durum -->
      <div class="empty-state" *ngIf="!isLoading && !errorMessage && payments.length === 0">
        <div class="empty-state__icon">💳</div>
        <h3>Henüz ödeme kaydı bulunmuyor</h3>
        <p class="text-muted">Kira veya depozito ödemesi yaptığınızda tüm işlem detayları ve elektronik dekontlar burada listelenecektir.</p>
      </div>

      <!-- İşlem Dökümü Tablosu -->
      <div class="table-wrapper" *ngIf="!isLoading && filteredPayments.length > 0">
        <table class="table">
          <thead>
            <tr>
              <th>İşlem ID / Dekont Ref</th>
              <th>İşlem Türü</th>
              <th>Ödeme Tarihi</th>
              <th>Tutar & Para Birimi</th>
              <th>Ödeme Durumu</th>
              <th style="text-align: right;">Mali Dekont</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of filteredPayments">
              <td>
                <div class="flex items-center gap-2">
                  <span class="tx-badge font-mono">TX</span>
                  <div>
                    <span class="font-mono text-white font-bold text-sm">#{{ p.id }}</span>
                    <div class="text-xs text-muted font-mono">Sanal POS • 3DS</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <span class="payment-type-icon">{{ p.paymentType === 'RENT' ? '🏠' : '🛡️' }}</span>
                  <span class="font-semibold text-white">{{ getPaymentTypeText(p.paymentType) }}</span>
                </div>
              </td>
              <td>
                <div class="text-white text-sm">{{ p.createdAt | date:'mediumDate' }}</div>
                <div class="text-xs text-muted font-mono">{{ p.createdAt | date:'shortTime' }}</div>
              </td>
              <td>
                <div class="currency font-bold text-white text-base">
                  {{ p.amount | number:'1.2-2' }} <span class="currency-symbol">{{ p.currency === 'TRY' ? 'TL' : (p.currency || 'TL') }}</span>
                </div>
              </td>
              <td>
                <span class="badge" 
                    [class.badge--paid]="p.status === 'PAID' || p.status === 'SUCCESS'"
                    [class.badge--pending]="p.status === 'PENDING'"
                    [class.badge--late]="p.status === 'LATE' || p.status === 'FAILED'">
                  <span class="status-pulse-dot" [class.status-pulse-dot--green]="p.status === 'PAID' || p.status === 'SUCCESS'"></span>
                  {{ getStatusText(p.status) }}
                </span>
              </td>
              <td style="text-align: right;">
                <button class="btn btn--secondary btn--sm" (click)="openReceipt(p)">
                  <span>🧾</span> Dekont Görüntüle
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Elektronik Dekont Modalı (Fintech PDF Preview Simulation) -->
      <div class="modal modal--open" *ngIf="selectedReceipt">
        <div class="modal__overlay" (click)="selectedReceipt = null"></div>
        <div class="modal__content receipt-modal">
          
          <div class="modal__header">
            <div class="flex items-center gap-2">
              <span class="text-xl">🧾</span>
              <div>
                <h3 class="modal__title">Elektronik Kira Tahsilat Makbuzu</h3>
                <span class="text-xs text-muted font-mono">E-Arşiv / Mali Mühürlü Dekont</span>
              </div>
            </div>
            <button class="modal__close" (click)="selectedReceipt = null">✕</button>
          </div>

          <div class="modal__body flex-col gap-4">
            
            <!-- Dekont Başlık Kartı -->
            <div class="receipt-paper">
              
              <div class="receipt-header flex justify-between items-start pb-4 border-b border-white-10">
                <div class="brand flex items-center gap-3">
                  <div class="brand-logo">RF</div>
                  <div>
                    <h4 class="text-white font-bold text-base">RentFlow Finansal Teknolojiler A.Ş.</h4>
                    <span class="text-xs text-muted">Ödeme & E-Tahsilat Sistemi</span>
                  </div>
                </div>
                <div class="receipt-seal text-right">
                  <span class="badge badge--soft-emerald">✓ MALİ ONAYLI</span>
                  <div class="text-xs text-muted font-mono mt-1">Ref: RF-{{ selectedReceipt.id.slice(0, 8).toUpperCase() }}</div>
                </div>
              </div>

              <!-- Dekont İçerik Tablosu -->
              <div class="receipt-info-grid mt-4">
                <div class="r-row">
                  <span class="r-label">Kiracı Bilgisi:</span>
                  <strong class="r-val text-white">{{ userName || 'Kayıtlı Kiracı' }}</strong>
                </div>
                <div class="r-row">
                  <span class="r-label">Ödeme Türü:</span>
                  <strong class="r-val text-white">{{ getPaymentTypeText(selectedReceipt.paymentType) }} Ödemesi</strong>
                </div>
                <div class="r-row">
                  <span class="r-label">İşlem Tarihi:</span>
                  <span class="r-val font-mono text-white">{{ selectedReceipt.createdAt | date:'medium' }}</span>
                </div>
                <div class="r-row">
                  <span class="r-label">Ödeme Metodu:</span>
                  <span class="r-val text-cyan">Sanal POS / Kredi Kartı (3D Secure)</span>
                </div>
                <div class="r-row">
                  <span class="r-label">İşlem Durumu:</span>
                  <span class="badge badge--soft-emerald">{{ getStatusText(selectedReceipt.status) }}</span>
                </div>
              </div>

              <!-- Mali Tutar Kutusu -->
              <div class="receipt-amount-box mt-4 flex justify-between items-center p-4 rounded-xl">
                <div>
                  <span class="text-xs text-muted uppercase font-bold tracking-wider">Tahsil Edilen Toplam Tutar</span>
                  <div class="text-xs text-muted">KDV & Stopaj Muafiyeti (Konut Kirası)</div>
                </div>
                <div class="amount-huge text-emerald font-bold text-2xl font-mono">
                  {{ selectedReceipt.amount | number:'1.2-2' }} {{ selectedReceipt.currency === 'TRY' ? 'TL' : (selectedReceipt.currency || 'TL') }}
                </div>
              </div>

              <!-- Alt Güvenlik & Doğrulama -->
              <div class="receipt-footer mt-4 pt-4 border-t border-white-10 flex justify-between items-center text-xs text-muted">
                <div class="flex items-center gap-2">
                  <span>🔒</span>
                  <span>256-Bit SHA Dijital İmza ile İmzalanmıştır</span>
                </div>
                <span class="font-mono">rentflow.cloud/verify</span>
              </div>

            </div>

          </div>

          <div class="modal__footer flex justify-between items-center">
            <button class="btn btn--secondary" (click)="simulatePrint()">
              <span>🖨️</span> Dekontu Yazdır / PDF
            </button>
            <button class="btn btn--primary" (click)="selectedReceipt = null">Pencereyi Kapat</button>
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

      .kpi-value-sm {
        font-size: 1.25rem;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: -0.01em;
        line-height: 1.4;
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
      }
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

    .search-box .search-input {
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

    .tx-badge {
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 3px 6px;
      border-radius: 6px;
      font-size: 0.6875rem;
      font-weight: 800;
    }

    .status-pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      display: inline-block;

      &--green {
        background: #10b981;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
      }
    }

    .receipt-modal {
      max-width: 600px;
      width: 100%;
    }

    .receipt-paper {
      background: rgba(11, 16, 27, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px;
      box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);
    }

    .brand-logo {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      color: white;
      font-size: 1rem;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }

    .receipt-info-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
      
      .r-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.875rem;
        padding-bottom: 6px;
        border-bottom: 1px dashed rgba(255, 255, 255, 0.05);

        .r-label { color: #94a3b8; }
      }
    }

    .receipt-amount-box {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
    }

    .toast-notification {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
      padding: 12px 24px;
      border-radius: var(--radius-md);
      font-weight: 600;
      z-index: 10;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      backdrop-filter: blur(12px);
    }

    .animate-slideDown {
      animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideDown {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .empty-state {
      background: rgba(15, 23, 42, 0.4);
      border: 1px dashed rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 48px;
      text-align: center;
      &__icon { font-size: 3rem; margin-bottom: 12px; opacity: 0.5; }
      h3 { font-size: 1.125rem; font-weight: 600; color: #ffffff; margin-bottom: 4px; }
    }

    .border-b { border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
    .border-t { border-top: 1px solid rgba(255, 255, 255, 0.08); }
    .border-white-10 { border-color: rgba(255, 255, 255, 0.08); }
  `]
})
export class PaymentHistoryComponent implements OnInit {
  payments: PaymentRecord[] = [];
  errorMessage: string | null = null;
  isLoading = false;
  toastMessage: string | null = null;
  isExporting = false;
  selectedReceipt: PaymentRecord | null = null;
  selectedStatusFilter: 'ALL' | 'SUCCESS' | 'PENDING' | 'LATE' = 'ALL';
  searchQuery = '';
  userName: string | null = null;

  constructor(
    private paymentService: PaymentService,
    private store: Store,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.store.select(selectUserName).pipe(take(1)).subscribe(name => {
      this.userName = name;
    });
    this.loadPayments();
  }

  get totalPaidAmount(): number {
    return this.payments
      .filter(p => p.status === 'PAID' || p.status === 'SUCCESS')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }

  get successfulCount(): number {
    return this.payments.filter(p => p.status === 'PAID' || p.status === 'SUCCESS').length;
  }

  get pendingCount(): number {
    return this.payments.filter(p => p.status === 'PENDING').length;
  }

  get failedCount(): number {
    return this.payments.filter(p => p.status === 'LATE' || p.status === 'FAILED').length;
  }

  get lastSuccessfulDate(): string | null {
    const successPayments = this.payments
      .filter(p => p.status === 'PAID' || p.status === 'SUCCESS')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return successPayments.length ? successPayments[0].createdAt : null;
  }

  get filteredPayments(): PaymentRecord[] {
    let list = this.payments;

    if (this.selectedStatusFilter === 'SUCCESS') {
      list = list.filter(p => p.status === 'PAID' || p.status === 'SUCCESS');
    } else if (this.selectedStatusFilter === 'PENDING') {
      list = list.filter(p => p.status === 'PENDING');
    } else if (this.selectedStatusFilter === 'LATE') {
      list = list.filter(p => p.status === 'LATE' || p.status === 'FAILED');
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        p.id.toLowerCase().includes(q) ||
        this.getPaymentTypeText(p.paymentType).toLowerCase().includes(q) ||
        this.getStatusText(p.status).toLowerCase().includes(q)
      );
    }

    return list;
  }

  loadPayments() {
    this.isLoading = true;
    this.errorMessage = null;
    this.store.select(selectUserId).pipe(
      take(1),
      switchMap(id => id
        ? this.paymentService.getPaymentsByTenant(id)
        : throwError(() => new Error('Oturum kullanıcı profili bulunamadı.')))
    ).subscribe({
      next: (data) => {
        this.payments = data ?? [];
        this.errorMessage = null;
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load payments', err);
        this.errorMessage = 'Ödeme geçmişi yüklenemedi. Lütfen tekrar deneyin.';
        this.isLoading = false;
        this.showToast('Ödemeler yüklenirken hata oluştu.');
        this.changeDetector.markForCheck();
      }
    });
  }

  getPaymentTypeText(paymentType: string): string {
    return paymentType === 'RENT' ? 'Kira' : paymentType === 'DEPOSIT' ? 'Depozito' : paymentType;
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'PAID': 
      case 'SUCCESS': return 'Ödendi';
      case 'PENDING': return 'Bekliyor';
      case 'LATE': return 'Gecikmiş';
      case 'FAILED': return 'Başarısız';
      default: return status;
    }
  }

  openReceipt(payment: PaymentRecord) {
    this.selectedReceipt = payment;
  }

  simulatePrint() {
    window.print();
  }

  showToast(message: string) {
    this.toastMessage = message;
    this.changeDetector.markForCheck();
    setTimeout(() => {
      this.toastMessage = null;
      this.changeDetector.markForCheck();
    }, 3000);
  }

  downloadCsv() {
    if (!this.payments.length) {
      this.showToast('Dışa aktarılacak ödeme kaydı bulunmuyor.');
      return;
    }
    this.isExporting = true;
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [
      ['İşlem ID', 'İşlem Türü', 'Tarih', 'Tutar', 'Para Birimi', 'Durum'],
      ...this.payments.map(payment => [
        payment.id,
        this.getPaymentTypeText(payment.paymentType),
        new Date(payment.createdAt).toLocaleDateString('tr-TR'),
        payment.amount,
        payment.currency,
        this.getStatusText(payment.status)
      ])
    ];
    const csv = '\ufeff' + rows.map(row => row.map(escape).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rentflow-odeme-gecmisi.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.isExporting = false;
    this.showToast('Ödeme geçmişi CSV olarak indirildi.');
  }
}
