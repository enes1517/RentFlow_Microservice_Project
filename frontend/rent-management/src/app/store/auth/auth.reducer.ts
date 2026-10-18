import { createReducer, on } from '@ngrx/store';
import { initialAuthState } from './auth.state';
import * as AuthActions from './auth.actions';

export const authReducer = createReducer(
  initialAuthState,

  on(AuthActions.loginSuccess, (state, { userId, keycloakId, email, firstName, lastName, roles }) => ({
    ...state,
    isLoggedIn: true,
    userId,
    keycloakId,
    email,
    firstName,
    lastName,
    roles,
    error: null,
  })),

  on(AuthActions.logout, () => ({
    ...initialAuthState,
  })),

  on(AuthActions.loadUserProfile, (state) => ({
    ...state,
    isLoading: true,
  })),

  on(AuthActions.loadUserProfileSuccess, (state, { userId }) => ({
    ...state,
    isLoading: false,
    userId,
  })),

  on(AuthActions.loadUserProfileFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  }))
);
