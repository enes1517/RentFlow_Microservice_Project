import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { OAuthService } from 'angular-oauth2-oidc';
import { AuthSessionService } from '../../../core/services/auth-session.service';

@Component({
  imports: [CommonModule],
  selector: 'app-select-role',
  styleUrl: './select-role.component.scss',
  templateUrl: './select-role.component.html',
})
export class SelectRoleComponent {
  isSubmitting = false;

  constructor(
    private http: HttpClient,
    private oauth: OAuthService,
    private authSession: AuthSessionService
  ) {}

  selectRole(role: string) {
    this.isSubmitting = true;
    this.http.post('/api/users/select-role', { role }).subscribe({
      next: async () => {
        try {
          // Force token refresh by logging out and logging back in silently or simply clearing token
          // Since angular-oauth2-oidc doesn't have a simple "refresh token now and get new claims" 
          // that updates our ngrx store automatically without side effects, 
          // the most reliable way is to re-authenticate or refresh.
          await this.oauth.refreshToken();
          // After token refresh, reload the app so the auth guard re-runs and reads new claims
          window.location.href = '/';
        } catch (e) {
          // If refresh fails (e.g. no refresh token), just redirect to login
          this.oauth.logOut(true);
          window.location.href = '/auth/login';
        }
      },
      error: (err) => {
        console.error(err);
        this.isSubmitting = false;
        alert('Rol seçimi sırasında bir hata oluştu.');
      }
    });
  }
}
