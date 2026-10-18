import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserNotification {
  id: string;
  userId: string;
  type: string;
  subject: string;
  content: string;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly apiUrl = '/api/notifications';

  constructor(private http: HttpClient) {}

  getForUser(userId: string): Observable<UserNotification[]> {
    return this.http.get<UserNotification[]>(`${this.apiUrl}/user/${encodeURIComponent(userId)}`);
  }

  sendEmail(userId: string, toEmail: string, subject: string, content: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.apiUrl}/send`, {
      userId,
      toEmail,
      type: 'EMAIL',
      subject,
      content
    });
  }
}
