import { ApplicationConfig, inject, isDevMode, provideAppInitializer } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { OAuthModule } from 'angular-oauth2-oidc';
import { importProvidersFrom } from '@angular/core';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { routes } from './app.routes';
import { authReducer } from './store/auth/auth.reducer';
import { AuthEffects } from './store/auth/auth.effects';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { RuntimeConfigService } from './core/services/runtime-config.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions()),
    provideAppInitializer(() => inject(RuntimeConfigService).load()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),

    // NgRx Store
    provideStore({
      auth: authReducer,
    }),
    provideEffects([AuthEffects]),
    provideCharts(withDefaultRegisterables()),
    ...(isDevMode()
      ? [provideStoreDevtools({
          maxAge: 25,
          logOnly: true,
          name: 'RentFlow DevTools',
        })]
      : []),

    importProvidersFrom(OAuthModule.forRoot()),
  ],
};
