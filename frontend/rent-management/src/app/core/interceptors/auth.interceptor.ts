import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { catchError, throwError, timeout } from 'rxjs';

/// HTTP isteklerine JWT token ekler.
/// 401/403 hatalarında uygun yönlendirme yapar.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const oauth = inject(OAuthService);
  const router = inject(Router);

  const token = oauth.getAccessToken();

  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  const response = next(authReq);
  const apiResponse = req.url.startsWith('/api/')
    ? response.pipe(timeout({ first: 20_000 }))
    : response;

  return apiResponse.pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token süresi dolmuş → Login'e yönlendir
        oauth.logOut();
        router.navigate(['/auth/login']);
      } else if (error.status === 403) {
        // Yetkisiz erişim
        router.navigate(['/auth/unauthorized']);
      }
      return throwError(() => error);
    })
  );
};
