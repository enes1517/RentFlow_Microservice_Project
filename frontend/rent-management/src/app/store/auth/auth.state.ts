// Auth store — State tanımı
export interface AuthState {
  isLoggedIn: boolean;
  userId: string | null;
  keycloakId: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
  isLoading: boolean;
  error: string | null;
}

export const initialAuthState: AuthState = {
  isLoggedIn: false,
  userId: null,
  keycloakId: null,
  email: null,
  firstName: null,
  lastName: null,
  roles: [],
  isLoading: false,
  error: null,
};
