import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly apiUrl = '/api/documents';

  constructor(private http: HttpClient) {}

  generateLeaseContract(leaseId: string): Observable<{ documentId: string }> {
    return this.http.post<{ documentId: string }>(`${this.apiUrl}/generate-lease`, {
      leaseId
    });
  }

  download(documentId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${encodeURIComponent(documentId)}/download`, { responseType: 'blob' });
  }
}
