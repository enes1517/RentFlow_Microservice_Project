import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SagaState {
  id: string;
  type: string;
  status: string;
  steps: { label: string; status: string }[];
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SagaService {
  private apiUrl = '/api/sagas';

  constructor(private http: HttpClient) {}

  getSagas(): Observable<SagaState[]> {
    return this.http.get<SagaState[]>(this.apiUrl);
  }
}
