import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedHttpService } from './paged-http.service';

export interface PaymentRecord {
  id: string;
  leaseId: string;
  tenantId: string;
  amount: number;
  status: 'SUCCESS' | 'PAID' | 'PENDING' | 'LATE' | 'FAILED';
  paymentType: string;
  currency: string;
  createdAt: string;
  receiptUrl?: string;
  failureReason?: string;
}

export interface PaymentResult {
  paymentId: string;
  status: string;
  reason?: string | null;
  isSimulated: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = '/api/payments';

  constructor(private http: HttpClient, private pagedHttp: PagedHttpService) {}

  getPaymentsByTenant(tenantId: string): Observable<PaymentRecord[]> {
    return this.pagedHttp.getAll<PaymentRecord>(`${this.apiUrl}/tenant/${encodeURIComponent(tenantId)}`);
  }

  getPaymentsByLease(leaseId: string): Observable<PaymentRecord[]> {
    return this.pagedHttp.getAll<PaymentRecord>(`${this.apiUrl}/lease/${encodeURIComponent(leaseId)}`);
  }

  getAllPayments(): Observable<PaymentRecord[]> {
    return this.pagedHttp.getAll<PaymentRecord>(this.apiUrl);
  }

  payRent(leaseId: string, amount: number, paymentToken: string): Observable<PaymentResult> {
    return this.http.post<PaymentResult>(`${this.apiUrl}/rent`, { leaseId, amount, currency: 'TRY', paymentToken });
  }

  payDeposit(leaseId: string, amount: number, paymentToken: string): Observable<PaymentResult> {
    return this.http.post<PaymentResult>(`${this.apiUrl}/deposit`, { leaseId, amount, currency: 'TRY', paymentToken });
  }
}
