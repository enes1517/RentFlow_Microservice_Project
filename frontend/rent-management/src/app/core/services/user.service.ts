import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { PagedHttpService } from './paged-http.service';

export interface UserProfile {
  id: string;
  identityId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phoneNumber?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface UserSyncResult {
  id: string;
  status: string;
}

export interface TenantLookup {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = '/api/users';

  constructor(private http: HttpClient, private pagedHttp: PagedHttpService) {}

  getUsers(): Observable<UserProfile[]> {
    return this.pagedHttp.getAll<UserProfile>(this.apiUrl);
  }

  getUser(id: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/${encodeURIComponent(id)}`);
  }

  getTenants(search = ''): Observable<TenantLookup[]> {
    const params = new HttpParams().set('search', search);
    return this.pagedHttp.getAll<TenantLookup>(`${this.apiUrl}/tenants`, params);
  }

  getTenantsByIds(ids: string[]): Observable<TenantLookup[]> {
    let params = new HttpParams();
    for (const id of ids) params = params.append('ids', id);
    return this.http.get<TenantLookup[]>(`${this.apiUrl}/tenants/by-ids`, { params });
  }

  syncCurrentUser(): Observable<UserSyncResult> {
    return this.http.post<UserSyncResult>(`${this.apiUrl}/sync`, {});
  }
}
