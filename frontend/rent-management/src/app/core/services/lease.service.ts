import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedHttpService } from './paged-http.service';

export interface Lease {
  id: string;
  tenantId: string;
  landlordId: string;
  propertyId: string;
  unitId: string;
  startDate: string;
  endDate: string;
  monthlyRentAmount: number;
  depositAmount: number;
  status: string;
}

export interface CreateLeaseRequest {
  tenantId: string;
  landlordId: string;
  propertyId: string;
  unitId: string;
  startDate: string;
  endDate: string;
  monthlyRentAmount: number;
  depositAmount: number;
}

@Injectable({
  providedIn: 'root'
})
export class LeaseService {
  private apiUrl = '/api/leases';

  constructor(private http: HttpClient, private pagedHttp: PagedHttpService) {}

  getLeases(): Observable<Lease[]> {
    return this.pagedHttp.getAll<Lease>(this.apiUrl);
  }

  getLeasesByLandlord(landlordId: string): Observable<Lease[]> {
    return this.pagedHttp.getAll<Lease>(`${this.apiUrl}/landlord/${encodeURIComponent(landlordId)}`);
  }

  getLeasesByTenant(tenantId: string): Observable<Lease[]> {
    return this.pagedHttp.getAll<Lease>(`${this.apiUrl}/tenant/${encodeURIComponent(tenantId)}`);
  }

  createLease(payload: CreateLeaseRequest): Observable<{ message: string; leaseId: string; status: string }> {
    return this.http.post<{ message: string; leaseId: string; status: string }>(this.apiUrl, payload);
  }

  cancelLease(id: string): Observable<{ id: string; status: string }> {
    return this.http.put<{ id: string; status: string }>(`${this.apiUrl}/${encodeURIComponent(id)}/cancel`, {});
  }
}
