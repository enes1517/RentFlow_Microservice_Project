import { createAction, props } from '@ngrx/store';

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{
    userId: string;
    keycloakId: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  }>()
);

export const logout = createAction('[Auth] Logout');

export const loadUserProfile = createAction('[Auth] Load User Profile');

export const loadUserProfileSuccess = createAction(
  '[Auth] Load User Profile Success',
  props<{ userId: string }>()
);

export const loadUserProfileFailure = createAction(
  '[Auth] Load User Profile Failure',
  props<{ error: string }>()
);
