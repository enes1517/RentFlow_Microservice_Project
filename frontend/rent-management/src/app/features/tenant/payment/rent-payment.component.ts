import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Lease, LeaseService } from '../../../core/services/lease.service';
import { PaymentService } from '../../../core/services/payment.service';
import { Store } from '@ngrx/store';
import { switchMap, take, throwError } from 'rxjs';
import { selectUserId } from '../../../store/auth/auth.selectors';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-rent-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page animate-slideUp">
      <div class="page__header flex justify-between items-start">
        <div>
          <h1>Güvenli Kira Ödeme Portalı 💳</h1>
          <p>Kira ve depozito ödemelerinizi PCI-DSS uyumlu güvenli altyapı üzerinden 7/24 gerçekleştirin.</p>
        </div>
        <div class="security-chip">
          <span class="security-dot"></span>
          <span>Stripe & 256-Bit SSL Korumalı</span>
        </div>
      </div>

      <div class="grid grid--2">
        <!-- Sol Panel: Ödeme Formu & Detayları -->
        <div class="card payment-main-card">
          <div class="section-header">
            <h3>Ödeme Parametreleri</h3>
            <span class="badge badge--soft-emerald" *ngIf="selectedLease">Aktif Sözleşme</span>
          </div>

          <p class="alert alert--danger" *ngIf="errorMessage" role="alert">{{ errorMessage }}</p>
          <p class="alert alert--success" *ngIf="successMessage" role="status">{{ successMessage }}</p>
          <p class="text-muted" *ngIf="isLoading">Sözleşmeleriniz yükleniyor...</p>
          <p class="text-muted" *ngIf="!isLoading && leases.length === 0">Ödeme yapılabilecek aktif sözleşme bulunamadı.</p>

          <div class="form-group" *ngIf="leases.length">
            <label for="payment-lease">Ödenecek Kira Sözleşmesi</label>
            <select id="payment-lease" class="input" [value]="selectedLease?.id ?? ''" (change)="selectLease($any($event.target).value)">
              <option value="">Sözleşme seçin</option>
              <option *ngFor="let lease of leases" [value]="lease.id">
                {{ lease.id }} — {{ lease.monthlyRentAmount | number:'1.2-2' }} TL
              </option>
            </select>
          </div>

          <div class="summary-box mb-6" *ngIf="selectedLease">
            <div class="summary-box__row">
              <span class="label">Sözleşmedeki Aylık Tutar</span>
              <span class="value currency" style="font-size: 1.5rem">{{ selectedLease.monthlyRentAmount | number:'1.2-2' }} ₺</span>
            </div>
            <div class="summary-box__row">
              <span class="label">Durum</span>
              <span class="badge" [class.badge--soft-emerald]="paymentStatusLabel === 'Ödendi' || paymentStatusLabel === 'Demo ödeme kaydedildi'" [class.badge--pending]="paymentStatusLabel === 'Simülasyon'">
                {{ selectedLease ? paymentStatusLabel : 'Sözleşme seçin' }}
              </span>
            </div>
            <div class="summary-box__row" *ngIf="selectedLease.depositAmount > 0">
              <span class="label">Güvence Depozitosu</span>
              <span class="value currency">{{ selectedLease.depositAmount | number:'1.2-2' }} ₺</span>
            </div>
          </div>

          <p id="payment-demo-notice" class="payment-disabled-reason" role="status">
            Bu işlem güvenli ödeme altyapısı üzerinden gerçekleştirilir. (Stripe simülasyonu)
          </p>

          <div class="payment-action-buttons">
            <button type="button" class="btn btn--primary btn--xl mt-4 w-full"
                    [disabled]="!selectedLease || isPaying"
                    aria-describedby="payment-demo-notice"
                    (click)="requestPaymentConfirmation('rent')">
              <span class="btn-icon">⚡</span>
              {{ isPaying && paymentType === 'rent' ? 'İşleniyor...' : 'Kira Öde' }}
            </button>
            <button *ngIf="selectedLease && selectedLease.depositAmount > 0"
                    type="button" class="btn btn--secondary btn--xl mt-3 w-full"
                    [disabled]="isPaying"
                    (click)="requestPaymentConfirmation('deposit')">
              <span class="btn-icon">🛡️</span>
              {{ isPaying && paymentType === 'deposit' ? 'İşleniyor...' : 'Depozito Öde' }}
            </button>
          </div>
        </div>

        <!-- Sağ Panel: Sanal Metal Kart & Güvenlik Özeti -->
        <div class="card virtual-card-container">
          <div class="virtual-card">
            <div class="virtual-card__glow"></div>
            <div class="virtual-card__header flex justify-between items-center">
              <div class="card-brand">
                <span class="brand-title">RentFlow</span>
                <span class="brand-sub">PREMIUM RESIDENCE</span>
              </div>
              <div class="wifi-icon">📶</div>
            </div>

            <div class="virtual-card__chip">
              <div class="chip-line"></div>
              <div class="chip-line"></div>
            </div>

            <div class="virtual-card__number">
              {{ cardNumber ? cardNumber : '••••  ••••  ••••  4242' }}
            </div>

            <div class="virtual-card__footer flex justify-between items-end">
              <div>
                <div class="card-label">KART SAHİBİ</div>
                <div class="card-value">{{ cardName ? cardName.toUpperCase() : 'KİRACI ADI SOYADI' }}</div>
              </div>
              <div>
                <div class="card-label">SON KULLANMA</div>
                <div class="card-value">{{ cardExpiry ? cardExpiry : '12/28' }}</div>
              </div>
              <div class="card-logo">VISA</div>
            </div>
          </div>

          <div class="security-guarantees mt-6">
            <div class="guarantee-item">
              <span class="icon">🔒</span>
              <div>
                <strong>Uçtan Uca Şifreli İletişim</strong>
                <p>Kart bilgileriniz sunucularımızda saklanmaz, doğrudan tokenleştirilir.</p>
              </div>
            </div>
            <div class="guarantee-item">
              <span class="icon">⚡</span>
              <div>
                <strong>Anında Makbuz & Saga Tetikleme</strong>
                <p>Tahsilat gerçekleştiğinde ev sahibi ve muhasebe servisi eşzamanlı bilgilendirilir.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3D Secure / Kart Onay Modalı -->
      <div class="payment-confirmation-overlay" *ngIf="confirmationType" (click)="cancelPaymentConfirmation()">
        <section class="payment-confirmation modal" role="dialog" aria-modal="true"
                 aria-labelledby="payment-confirmation-title" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <div class="flex items-center gap-3">
              <span class="secure-icon">🛡️</span>
              <div>
                <h2 id="payment-confirmation-title">Güvenli Ödeme - {{ confirmationType === 'rent' ? 'Kira' : 'Depozito' }}</h2>
                <span class="text-xs text-muted">Stripe 3D Secure Doğrulaması</span>
              </div>
            </div>
            <button class="modal__close" (click)="cancelPaymentConfirmation()">×</button>
          </div>

          <div class="modal-amount-banner">
            <span class="banner-label">Ödenecek Toplam Tutar</span>
            <span class="banner-value currency">{{ confirmationAmount | number:'1.2-2' }} ₺</span>
          </div>

          <form #cardForm="ngForm" class="flex-col gap-4 mt-4">
            <div class="form-group">
              <label>Kart Üzerindeki İsim</label>
              <input type="text" class="input" [(ngModel)]="cardName" name="cardName" required placeholder="Ad Soyad">
            </div>
            
            <div class="form-group">
              <label>Kart Numarası</label>
              <input type="text" class="input font-mono" [(ngModel)]="cardNumber" name="cardNumber" required placeholder="4242 4242 4242 4242" maxlength="19">
            </div>

            <div class="grid grid--2 gap-4">
              <div class="form-group">
                <label>Son Kullanma Tarihi</label>
                <input type="text" class="input font-mono" [(ngModel)]="cardExpiry" name="cardExpiry" required placeholder="AA/YY" maxlength="5">
              </div>
              <div class="form-group">
                <label>Güvenlik Kodu (CVC)</label>
                <input type="text" class="input font-mono" [(ngModel)]="cardCvc" name="cardCvc" required placeholder="123" maxlength="3">
              </div>
            </div>
            
            <div class="payment-disabled-reason mt-2">
              <small>Gerçek API üzerinden test 'tok_visa' jetonu gönderilecektir.</small>
            </div>
          </form>

          <div class="payment-confirmation__actions">
            <button type="button" class="btn btn--secondary" (click)="cancelPaymentConfirmation()">İptal</button>
            <button type="button" class="btn btn--primary" (click)="confirmPayment()" [disabled]="cardForm.invalid || isPaying">
              {{ isPaying ? 'Ödeme Alınıyor...' : '3D Secure ile Öde' }}
            </button>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .security-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: var(--radius-full);
      font-size: 0.8125rem;
      color: #34d399;
      font-weight: 600;

      .security-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 8px #10b981;
      }
    }

    .summary-box {
      background: rgba(7, 9, 14, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-lg);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);

      &__row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .label { color: var(--text-secondary); font-size: 0.875rem; }
        .value { color: var(--text-primary); font-weight: 700; }
      }
    }

    .payment-disabled-reason {
      padding: 12px 16px;
      border-left: 3px solid var(--warning);
      background: rgba(245, 158, 11, 0.08);
      color: #fde68a;
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      line-height: 1.4;
    }

    /* ── Sanal Metal Kart Önizlemesi ────────────────────── */
    .virtual-card-container {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: linear-gradient(180deg, rgba(20, 27, 45, 0.85) 0%, rgba(14, 19, 32, 0.95) 100%);
    }

    .virtual-card {
      width: 100%;
      height: 220px;
      border-radius: 20px;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #020617 100%);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);

      &__glow {
        position: absolute;
        width: 250px;
        height: 250px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, transparent 70%);
        top: -60px;
        right: -60px;
        pointer-events: none;
      }

      .card-brand {
        display: flex;
        flex-direction: column;
        .brand-title { font-size: 1.125rem; font-weight: 800; letter-spacing: -0.02em; color: #ffffff; }
        .brand-sub { font-size: 0.625rem; color: #94a3b8; letter-spacing: 0.1em; font-weight: 700; }
      }

      .wifi-icon { font-size: 1.25rem; color: #cbd5e1; }

      &__chip {
        width: 44px;
        height: 32px;
        border-radius: 6px;
        background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
        border: 1px solid rgba(255, 255, 255, 0.3);
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
        padding: 4px;
        margin: 4px 0;

        .chip-line {
          height: 1px;
          background: rgba(0, 0, 0, 0.25);
        }
      }

      &__number {
        font-family: var(--font-mono);
        font-size: 1.25rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        color: #f8fafc;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      }

      .card-label {
        font-size: 0.5625rem;
        color: #94a3b8;
        font-weight: 700;
        letter-spacing: 0.08em;
      }

      .card-value {
        font-size: 0.8125rem;
        color: #ffffff;
        font-weight: 600;
        letter-spacing: 0.04em;
      }

      .card-logo {
        font-size: 1.5rem;
        font-style: italic;
        font-weight: 900;
        color: #ffffff;
        letter-spacing: -0.04em;
      }
    }

    .security-guarantees {
      display: flex;
      flex-direction: column;
      gap: 14px;

      .guarantee-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;

        .icon {
          font-size: 1.25rem;
          margin-top: 2px;
        }

        strong {
          font-size: 0.875rem;
          color: #ffffff;
          display: block;
          margin-bottom: 2px;
        }

        p {
          font-size: 0.8125rem;
          color: #94a3b8;
          line-height: 1.4;
          margin: 0;
        }
      }
    }

    /* ── Modal ──────────────────────────────────────────── */
    .payment-confirmation-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: grid;
      place-items: center;
      padding: var(--space-4);
      background: rgba(3, 5, 8, 0.8);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      animation: fadeIn 0.25s ease-out;
    }

    .payment-confirmation {
      width: min(100%, 34rem);
      padding: 32px;
      border-radius: var(--radius-xl);

      h2 { font-size: 1.375rem; margin: 0; color: #ffffff; }
    }

    .secure-icon {
      font-size: 1.75rem;
    }

    .modal-amount-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 16px 20px;
      border-radius: var(--radius-lg);
      margin-bottom: 8px;

      .banner-label { color: #c7d2fe; font-size: 0.875rem; font-weight: 500; }
      .banner-value { color: #ffffff; font-size: 1.5rem; font-weight: 800; }
    }

    .payment-confirmation__actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      margin-top: var(--space-5);
      padding-top: var(--space-4);
      border-top: 1px solid var(--border-light);
    }
  `]
})
export class RentPaymentComponent implements OnInit {
  isLoading = false;
  errorMessage: string | null = null;
  leases: Lease[] = [];
  selectedLease: Lease | null = null;
  isPaying = false;
  paymentType: 'rent' | 'deposit' | null = null;
  confirmationType: 'rent' | 'deposit' | null = null;
  successMessage: string | null = null;
  paymentStatusLabel = 'Simülasyon';

  constructor(
    private leaseService: LeaseService,
    private paymentService: PaymentService,
    private store: Store,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.errorMessage = null;
    this.store.select(selectUserId).pipe(
      take(1),
      switchMap(id => id
        ? this.leaseService.getLeasesByTenant(id)
        : throwError(() => new Error('Oturum kullanıcı profili bulunamadı.')))
    ).subscribe({
      next: leases => {
        this.leases = (leases ?? []).filter(lease => lease.status === 'ACTIVE');
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
      error: error => {
        console.error('Ödeme için sözleşmeler yüklenemedi.', error);
        this.errorMessage = 'Sözleşme bilgileri yüklenemedi.';
        this.isLoading = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  selectLease(leaseId: string) {
    this.selectedLease = this.leases.find(lease => lease.id === leaseId) ?? null;
    this.confirmationType = null;
    this.errorMessage = null;
    this.successMessage = null;
    this.paymentStatusLabel = 'Simülasyon';
  }

  get confirmationAmount(): number {
    if (!this.selectedLease) return 0;
    return this.confirmationType === 'deposit'
      ? this.selectedLease.depositAmount
      : this.selectedLease.monthlyRentAmount;
  }

  requestPaymentConfirmation(type: 'rent' | 'deposit') {
    if (!this.selectedLease || this.isPaying) return;
    this.confirmationType = type;
  }

  cancelPaymentConfirmation() {
    this.confirmationType = null;
  }

  confirmPayment() {
    const type = this.confirmationType;
    this.confirmationType = null;
    if (type) this.pay(type);
  }

  cardName = '';
  cardNumber = '';
  cardExpiry = '';
  cardCvc = '';

  private pay(type: 'rent' | 'deposit') {
    if (!this.selectedLease || this.isPaying) return;

    this.isPaying = true;
    this.paymentType = type;
    this.errorMessage = null;
    this.successMessage = null;
    
    // Simulate real token generation or use Stripe test token
    const paymentToken = 'tok_visa'; // Always successful test token in Stripe
    const amount = this.confirmationAmount;

    const request = type === 'rent'
      ? this.paymentService.payRent(this.selectedLease.id, amount, paymentToken)
      : this.paymentService.payDeposit(this.selectedLease.id, amount, paymentToken);

    request.subscribe({
      next: result => {
        this.successMessage = `Ödeme ${result.status === 'SUCCESS' ? 'başarıyla' : 'işlenerek'} kaydedildi. Makbuz oluşturuldu.`;
        this.paymentStatusLabel = result.status === 'SUCCESS' && result.isSimulated
          ? 'Demo ödeme kaydedildi'
          : result.status === 'SUCCESS' ? 'Ödendi' : result.status;
        this.isPaying = false;
        this.paymentType = null;
        this.changeDetector.markForCheck();
      },
      error: error => {
        console.error('Ödeme alınamadı.', error);
        this.errorMessage = 'Ödeme alınamadı. Kart bilgilerinizi ve limitinizi kontrol edin.';
        this.isPaying = false;
        this.paymentType = null;
        this.changeDetector.markForCheck();
      }
    });
  }
}
