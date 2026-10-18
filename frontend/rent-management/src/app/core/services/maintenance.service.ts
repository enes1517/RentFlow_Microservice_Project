import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MaintenanceRequest {
  id?: string;
  title: string;
  description: string;
  createdAt?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  estimatedCost?: number | null;
  updatedAt?: string | null;
  tenantId: string;
  propertyId: string;
  unitId: string;
}

@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {
  private apiUrl = '/api/maintenancerequests';

  constructor(private http: HttpClient) {}

  getRequestsForTenant(tenantId: string): Observable<MaintenanceRequest[]> {
    return this.http.get<MaintenanceRequest[]>(`${this.apiUrl}/tenant/${encodeURIComponent(tenantId)}`);
  }

  getRequestsForProperty(propertyId: string): Observable<MaintenanceRequest[]> {
    return this.http.get<MaintenanceRequest[]>(`${this.apiUrl}/property/${encodeURIComponent(propertyId)}`);
  }

  createRequest(request: MaintenanceRequest): Observable<{ id: string; status: string }> {
    return this.http.post<{ id: string; status: string }>(this.apiUrl, request);
  }

  updateStatus(id: string, status: NonNullable<MaintenanceRequest['status']>, estimatedCost?: number): Observable<{ id: string; status: NonNullable<MaintenanceRequest['status']> }> {
    return this.http.put<{ id: string; status: NonNullable<MaintenanceRequest['status']> }>(
      `${this.apiUrl}/${encodeURIComponent(id)}/status`,
      { status, estimatedCost }
    );
  }
}
