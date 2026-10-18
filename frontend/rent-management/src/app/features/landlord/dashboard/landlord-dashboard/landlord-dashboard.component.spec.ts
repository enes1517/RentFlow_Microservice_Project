import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { LeaseService } from '../../../../core/services/lease.service';
import { PaymentService, PaymentRecord } from '../../../../core/services/payment.service';
import { PropertyService } from '../../../../core/services/property.service';
import { selectUserId } from '../../../../store/auth/auth.selectors';
import { LandlordDashboardComponent } from './landlord-dashboard.component';

describe('LandlordDashboardComponent', () => {
  it('starts without sample chart data and includes PAID records in collected totals', () => {
    const currentMonth = new Date().toISOString();
    const payments: PaymentRecord[] = [
      {
        id: 'payment-success',
        leaseId: 'lease-1',
        tenantId: 'tenant-1',
        amount: 12000,
        status: 'SUCCESS',
        paymentType: 'RENT',
        currency: 'TRY',
        createdAt: currentMonth
      },
      {
        id: 'payment-paid',
        leaseId: 'lease-1',
        tenantId: 'tenant-1',
        amount: 8000,
        status: 'PAID',
        paymentType: 'RENT',
        currency: 'TRY',
        createdAt: currentMonth
      }
    ];
    const store = {
      select: (selector: unknown) => of(selector === selectUserId ? 'landlord-1' : 'Test Landlord')
    };
    const leaseService = {
      getLeasesByLandlord: () => of([{
        id: 'lease-1',
        tenantId: 'tenant-1',
        landlordId: 'landlord-1',
        propertyId: 'property-1',
        unitId: 'unit-1',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        monthlyRentAmount: 20000,
        depositAmount: 20000,
        status: 'ACTIVE'
      }])
    };
    const paymentService = { getPaymentsByLease: () => of(payments) };
    const propertyService = {
      getProperties: () => of([{ id: 'property-1', units: [] }])
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
        { provide: Store, useValue: store },
        { provide: LeaseService, useValue: leaseService },
        { provide: PaymentService, useValue: paymentService },
        { provide: PropertyService, useValue: propertyService }
      ]
    });
    const component = TestBed.runInInjectionContext(() => new LandlordDashboardComponent());

    expect(component.barChartData.labels).toEqual([]);
    expect(component.barChartData.datasets[0].data).toEqual([]);

    component.ngOnInit();

    expect(component.collectedThisMonth).toBe(20000);
    expect(component.outstandingAmount).toBe(0);
    expect(component.barChartData.datasets[0].data.at(-1)).toBe(20000);
  });
});
