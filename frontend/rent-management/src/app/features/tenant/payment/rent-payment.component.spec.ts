import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { LeaseService } from '../../../core/services/lease.service';
import { PaymentService } from '../../../core/services/payment.service';
import { RentPaymentComponent } from './rent-payment.component';

describe('RentPaymentComponent', () => {
    const leaseService = {
        getLeasesByTenant: vi.fn().mockReturnValue(of([{
            id: 'lease-1',
            tenantId: 'tenant-1',
            landlordId: 'landlord-1',
            propertyId: 'property-1',
            unitId: 'unit-1',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            monthlyRentAmount: 15000,
            depositAmount: 15000,
            status: 'ACTIVE'
        }]))
    };
    const paymentService = {
        payRent: vi.fn().mockReturnValue(of({ paymentId: 'payment-1', status: 'SUCCESS', isSimulated: true })),
        payDeposit: vi.fn().mockReturnValue(of({ paymentId: 'payment-2', status: 'SUCCESS', isSimulated: true }))
    };
    const store = { select: () => of('tenant-1') };

    beforeEach(async () => {
        leaseService.getLeasesByTenant.mockClear();
        paymentService.payRent.mockClear();
        await TestBed.configureTestingModule({
            imports: [RentPaymentComponent],
            providers: [
                { provide: LeaseService, useValue: leaseService },
                { provide: PaymentService, useValue: paymentService },
                { provide: Store, useValue: store }
            ]
        }).compileComponents();
    });

    it('simulates a rent payment via 3D Secure modal confirmation', async () => {
        const fixture = TestBed.createComponent(RentPaymentComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(fixture.componentInstance.leases).toHaveLength(1);

        const leaseSelect = fixture.nativeElement.querySelector('#payment-lease') as HTMLSelectElement;
        leaseSelect.value = 'lease-1';
        leaseSelect.dispatchEvent(new Event('change'));
        fixture.detectChanges();

        expect(fixture.componentInstance.selectedLease?.id).toBe('lease-1');
        expect(fixture.componentInstance.isPaying).toBe(false);

        const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
        const rentButton = buttons.find(button => button.textContent?.includes('Kira Öde'));
        const explanation = fixture.nativeElement.querySelector('#payment-demo-notice') as HTMLElement;

        expect(leaseService.getLeasesByTenant).toHaveBeenCalledTimes(1);
        expect(leaseService.getLeasesByTenant).toHaveBeenCalledWith('tenant-1');
        expect(rentButton).toBeDefined();
        expect(rentButton?.disabled).toBe(false);
        expect(rentButton?.getAttribute('aria-describedby')).toBe('payment-demo-notice');
        expect(explanation.textContent).toContain('Stripe simülasyonu');

        // Open modal
        rentButton?.click();
        fixture.detectChanges();

        expect(fixture.componentInstance.confirmationType).toBe('rent');
        expect(fixture.nativeElement.textContent).toContain('15,000.00 ₺');

        // Fill card details
        fixture.componentInstance.cardName = 'Ahmet Yılmaz';
        fixture.componentInstance.cardNumber = '4242 4242 4242 4242';
        fixture.componentInstance.cardExpiry = '12/28';
        fixture.componentInstance.cardCvc = '123';
        fixture.detectChanges();

        const modalButtons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
        const confirmButton = modalButtons.find(button => button.textContent?.includes('3D Secure ile Öde'));
        expect(confirmButton).toBeDefined();

        confirmButton?.click();
        fixture.detectChanges();

        expect(paymentService.payRent).toHaveBeenCalledWith('lease-1', 15000, 'tok_visa');
        expect(fixture.componentInstance.paymentStatusLabel).toBe('Demo ödeme kaydedildi');
        expect(fixture.nativeElement.textContent).toContain('Demo ödeme kaydedildi');
    });
});
