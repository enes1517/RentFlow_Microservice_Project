import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, UserProfile } from '../../../../core/services/user.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  template: `
    <div class="page animate-slideUp relative">
      
      <!-- Sayfa Başlığı -->
      <div class="page__header flex justify-between items-center mb-6">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="page-title">Kullanıcı & Kimlik Yönetimi 👥</h1>
            <span class="badge badge--soft-emerald">Keycloak OIDC Aktif</span>
          </div>
          <p class="text-sm text-muted mt-1">
            Merkezi kimlik sağlayıcı (Keycloak) üzerinden senkronize edilen kiracı, ev sahibi ve sistem yöneticisi hesap havuzu.
          </p>
        </div>
        <button class="btn btn--primary" (click)="loadUsers()" [disabled]="isLoading">
          <span class="icon" [class.icon--spin]="isLoading">🔄</span>
          {{ isLoading ? 'Senkronize Ediliyor...' : 'Kullanıcıları Yenile' }}
        </button>
      </div>

      <!-- 4 Temel Yönetici KPI Kartı -->
      <div class="grid grid--4 mb-6">
        <div class="kpi-card kpi-card--blue">
          <div class="kpi-card__top flex justify-between items-center">
            <span class="kpi-label">Toplam Hesap</span>
            <div class="kpi-icon-badge">👥</div>
          </div>
          <div class="kpi-value">{{ isLoading ? '…' : users.length }}</div>
          <div class="kpi-footer flex items-center justify-between mt-3">
            <span class="text-xs text-muted">Kayıtlı Profil Havuzu</span>
            <span class="kpi-tag">{{ activeCount }} Aktif</span>
          </div>
        </div>

        <div class="kpi-card kpi-card--purple">
          <div class="kpi-card__top flex justify-between items-center">
            <span class="kpi-label">Sistem Yöneticileri</span>
            <div class="kpi-icon-badge">🛡️</div>
          </div>
          <div class="kpi-value text-indigo">{{ isLoading ? '…' : adminCount }}</div>
          <div class="kpi-footer flex items-center justify-between mt-3">
            <span class="text-xs text-muted">Tam Sistem Yetkisi</span>
            <span class="kpi-tag kpi-tag--indigo">ROLE_ADMIN</span>
          </div>
        </div>

        <div class="kpi-card kpi-card--cyan">
          <div class="kpi-card__top flex justify-between items-center">
            <span class="kpi-label">Mülk Sahipleri</span>
            <div class="kpi-icon-badge">🏢</div>
          </div>
          <div class="kpi-value text-cyan">{{ isLoading ? '…' : landlordCount }}</div>
          <div class="kpi-footer flex items-center justify-between mt-3">
            <span class="text-xs text-muted">Portföy Yöneticileri</span>
            <span class="kpi-tag kpi-tag--cyan">ROLE_LANDLORD</span>
          </div>
        </div>

        <div class="kpi-card kpi-card--emerald">
          <div class="kpi-card__top flex justify-between items-center">
            <span class="kpi-label">Kiracılar</span>
            <div class="kpi-icon-badge">🔑</div>
          </div>
          <div class="kpi-value text-emerald">{{ isLoading ? '…' : tenantCount }}</div>
          <div class="kpi-footer flex items-center justify-between mt-3">
            <span class="text-xs text-muted">Sözleşme & Ödeme Tarafı</span>
            <span class="kpi-tag kpi-tag--emerald">ROLE_TENANT</span>
          </div>
        </div>
      </div>

      <!-- Filtreleme ve Arama Çubuğu -->
      <div class="filter-bar flex justify-between items-center mb-6">
        <div class="tabs flex gap-2">
          <button 
            class="tab-btn" 
            [class.tab-btn--active]="selectedRoleFilter === 'ALL'" 
            (click)="selectedRoleFilter = 'ALL'">
            Tümü ({{ users.length }})
          </button>
          <button 
            class="tab-btn" 
            [class.tab-btn--active]="selectedRoleFilter === 'ADMIN'" 
            (click)="selectedRoleFilter = 'ADMIN'">
            🛡️ Admin ({{ adminCount }})
          </button>
          <button 
            class="tab-btn" 
            [class.tab-btn--active]="selectedRoleFilter === 'LANDLORD'" 
            (click)="selectedRoleFilter = 'LANDLORD'">
            🏢 Ev Sahibi ({{ landlordCount }})
          </button>
          <button 
            class="tab-btn" 
            [class.tab-btn--active]="selectedRoleFilter === 'TENANT'" 
            (click)="selectedRoleFilter = 'TENANT'">
            🔑 Kiracı ({{ tenantCount }})
          </button>
        </div>

        <div class="search-box">
          <input
            type="text"
            class="search-input"
            placeholder="İsim, e-posta veya telefon ile ara..."
            [(ngModel)]="searchQuery"
          />
        </div>
      </div>

      <p class="alert alert--danger mb-6" *ngIf="errorMessage">{{ errorMessage }}</p>
      
      <!-- Boş Durum -->
      <div class="empty-state" *ngIf="!isLoading && !errorMessage && filteredUsers.length === 0">
        <div class="empty-state__icon">👥</div>
        <h3>Kullanıcı kaydı bulunamadı</h3>
        <p class="text-muted">Arama kriterlerinize uygun profil bulunamadı veya henüz kullanıcı kaydı yapılmamış.</p>
      </div>
      
      <!-- Kullanıcılar Tablosu -->
      <div class="table-wrapper" *ngIf="!isLoading && filteredUsers.length > 0">
        <table class="table">
          <thead>
            <tr>
              <th>Kullanıcı Profili</th>
              <th>Sistem Rolü</th>
              <th>Hesap Durumu</th>
              <th>Telefon No</th>
              <th>Kayıt Tarihi</th>
              <th style="text-align: right;">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of filteredUsers">
              <td>
                <div class="user-cell">
                  <div class="user-cell__avatar" [ngClass]="getRoleClass(user.role)">
                    {{ (user.firstName ? user.firstName.charAt(0) : user.email.charAt(0)) | uppercase }}
                  </div>
                  <div class="user-cell__info">
                    <span class="name">{{ user.firstName }} {{ user.lastName }}</span>
                    <span class="email font-mono">{{ user.email }}</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge" [ngClass]="getRoleBadgeClass(user.role)">
                  <span class="role-dot"></span>
                  {{ formatRole(user.role) }}
                </span>
              </td>
              <td>
                <span class="badge" [class.badge--soft-emerald]="user.isActive" [class.badge--danger]="!user.isActive">
                  <span class="status-dot" [class.status-dot--green]="user.isActive" [class.status-dot--red]="!user.isActive"></span>
                  {{ user.isActive ? 'Aktif Hesap' : 'Pasif Hesap' }}
                </span>
              </td>
              <td class="font-mono text-sm text-secondary">
                {{ user.phoneNumber || '—' }}
              </td>
              <td class="text-muted font-mono" style="font-size: 0.8125rem;">
                {{ user.createdAt | date:'mediumDate' }}
              </td>
              <td style="text-align: right;">
                <button class="btn btn--secondary btn--sm" (click)="openUser(user)">
                  <span>🔍</span> Profil Detayı
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Kullanıcı Detay Modalı (Luxury Glassmorphic Dialog) -->
      <div class="modal modal--open" *ngIf="selectedUser">
        <div class="modal__overlay" (click)="selectedUser = null"></div>
        <div class="modal__content user-detail-modal">
          <div class="modal__header">
            <div class="flex items-center gap-2">
              <span class="text-xl">👤</span>
              <h3 class="modal__title">Kullanıcı & Hesap Kartı</h3>
            </div>
            <button class="modal__close" (click)="selectedUser = null">✕</button>
          </div>
          
          <div class="modal__body flex-col gap-4">
            <div class="user-detail-header flex items-center gap-4 p-4 rounded-xl">
              <div class="user-cell__avatar large" [ngClass]="getRoleClass(selectedUser.role)">
                {{ (selectedUser.firstName ? selectedUser.firstName.charAt(0) : selectedUser.email.charAt(0)) | uppercase }}
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h4 class="text-xl text-white font-bold">{{ selectedUser.firstName }} {{ selectedUser.lastName }}</h4>
                  <span class="badge badge--soft-emerald">Doğrulanmış</span>
                </div>
                <div class="flex items-center gap-2 mt-2">
                  <span class="badge" [ngClass]="getRoleBadgeClass(selectedUser.role)">{{ formatRole(selectedUser.role) }}</span>
                  <span class="badge" [class.badge--soft-emerald]="selectedUser.isActive" [class.badge--danger]="!selectedUser.isActive">
                    {{ selectedUser.isActive ? 'Aktif Hesap' : 'Pasif Hesap' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Sistem ID</span>
                <span class="val font-mono text-xs">{{ selectedUser.id }}</span>
              </div>
              <div class="detail-item">
                <span class="label">E-posta Adresi</span>
                <span class="val font-mono text-white">{{ selectedUser.email }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Telefon Numarası</span>
                <span class="val text-white">{{ selectedUser.phoneNumber || 'Belirtilmemiş' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Kayıt Tarihi</span>
                <span class="val text-muted">{{ selectedUser.createdAt | date:'medium' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">OIDC Sağlayıcı</span>
                <span class="val text-cyan font-mono">Keycloak SSO (rentflow realm)</span>
              </div>
              <div class="detail-item">
                <span class="label">Yetki Seviyesi</span>
                <span class="val text-emerald font-semibold">{{ formatRole(selectedUser.role) }} Standart İzinleri</span>
              </div>
            </div>

            <div class="sso-notice flex items-center gap-3">
              <span class="text-lg">🛡️</span>
              <div class="text-xs text-muted">
                Kullanıcı şifre sıfırlama, MFA ve oturum iptalleri doğrudan Keycloak Admin Console üzerinden yönetilir.
              </div>
            </div>
          </div>

          <div class="modal__footer flex justify-between items-center">
            <span class="text-xs text-muted font-mono">Hesap Durumu: {{ selectedUser.isActive ? 'AKTİF' : 'PASİF' }}</span>
            <button class="btn btn--primary" (click)="selectedUser = null">Pencereyi Kapat</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .page-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
    }

    .kpi-card {
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 22px;
      backdrop-filter: blur(16px);
      transition: all 0.22s ease;

      &:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.16);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
      }

      &--blue { border-left: 4px solid #3b82f6; }
      &--purple { border-left: 4px solid #8b5cf6; }
      &--cyan { border-left: 4px solid #06b6d4; }
      &--emerald { border-left: 4px solid #10b981; }

      &__top {
        margin-bottom: 8px;
      }

      .kpi-label {
        font-size: 0.75rem;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .kpi-icon-badge {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.125rem;
      }

      .kpi-value {
        font-size: 2.125rem;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: -0.03em;
        line-height: 1.1;
      }

      .kpi-tag {
        font-size: 0.6875rem;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.06);
        color: #cbd5e1;

        &--indigo { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
        &--cyan { background: rgba(6, 182, 212, 0.15); color: #22d3ee; }
        &--emerald { background: rgba(16, 185, 129, 0.15); color: #34d399; }
      }
    }

    .filter-bar {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 12px 18px;
      flex-wrap: wrap;
      gap: 12px;
      backdrop-filter: blur(16px);
    }

    .tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: #94a3b8;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 500;

      &:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.06);
      }

      &--active {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: #ffffff !important;
        font-weight: 700;
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);
      }
    }

    .search-box .search-input {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 0.8125rem;
      min-width: 280px;
      outline: none;
      transition: all 0.2s ease;

      &:focus {
        border-color: #6366f1;
        box-shadow: 0 0 12px rgba(99, 102, 241, 0.25);
      }
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 14px;
      
      &__avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        color: white;
        font-size: 1rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        flex-shrink: 0;

        &.large {
          width: 60px;
          height: 60px;
          font-size: 1.5rem;
        }
      }
      
      &__info {
        display: flex;
        flex-direction: column;
        
        .name { color: #ffffff; font-weight: 700; font-size: 0.9375rem; }
        .email { font-size: 0.8125rem; color: #94a3b8; }
      }
    }
    
    .role-tenant { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
    .role-landlord { background: linear-gradient(135deg, #10b981, #06b6d4); }
    .role-admin { background: linear-gradient(135deg, #ec4899, #ef4444); }
    
    .role-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      display: inline-block;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 2px;
      
      &--green {
        background: #10b981;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
      }
      &--red {
        background: #ef4444;
      }
    }

    .badge--role-tenant { 
      background: rgba(99, 102, 241, 0.15); 
      color: #818cf8; 
      border: 1px solid rgba(99, 102, 241, 0.35); 
    }
    .badge--role-landlord { 
      background: rgba(16, 185, 129, 0.15); 
      color: #34d399; 
      border: 1px solid rgba(16, 185, 129, 0.35); 
    }
    .badge--role-admin { 
      background: rgba(239, 68, 68, 0.15); 
      color: #f87171; 
      border: 1px solid rgba(239, 68, 68, 0.35); 
    }

    .user-detail-modal {
      max-width: 580px;
      width: 100%;
    }

    .user-detail-header {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .detail-item {
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;

      .label {
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #94a3b8;
        letter-spacing: 0.04em;
      }

      .val {
        font-size: 0.875rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .sso-notice {
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 12px;
      padding: 12px 16px;
    }

    .empty-state {
      background: rgba(15, 23, 42, 0.4);
      border: 1px dashed rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 48px;
      text-align: center;
      &__icon { font-size: 3rem; margin-bottom: 12px; opacity: 0.5; }
      h3 { font-size: 1.125rem; font-weight: 600; color: #ffffff; margin-bottom: 4px; }
    }

    .icon--spin {
      animation: spin 1s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class UsersComponent implements OnInit {
  users: UserProfile[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  selectedUser: UserProfile | null = null;
  searchQuery = '';
  selectedRoleFilter: 'ALL' | 'ADMIN' | 'LANDLORD' | 'TENANT' = 'ALL';

  constructor(
    private changeDetector: ChangeDetectorRef,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  get adminCount(): number {
    return this.users.filter(u => this.isRole(u.role, 'ADMIN')).length;
  }

  get landlordCount(): number {
    return this.users.filter(u => this.isRole(u.role, 'LANDLORD')).length;
  }

  get tenantCount(): number {
    return this.users.filter(u => this.isRole(u.role, 'TENANT')).length;
  }

  get activeCount(): number {
    return this.users.filter(u => u.isActive).length;
  }

  private isRole(role: string, target: 'ADMIN' | 'LANDLORD' | 'TENANT'): boolean {
    const r = (role || '').toUpperCase();
    if (target === 'ADMIN') return r === 'ADMIN' || r === 'ROLE_ADMIN';
    if (target === 'LANDLORD') return r === 'LANDLORD' || r === 'ROLE_LANDLORD';
    if (target === 'TENANT') return r === 'TENANT' || r === 'ROLE_TENANT' || r === 'USER' || r === 'ROLE_USER';
    return false;
  }

  get filteredUsers(): UserProfile[] {
    let list = this.users;

    if (this.selectedRoleFilter !== 'ALL') {
      list = list.filter(u => this.isRole(u.role, this.selectedRoleFilter as any));
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(u =>
        (u.firstName && u.firstName.toLowerCase().includes(q)) ||
        (u.lastName && u.lastName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phoneNumber && u.phoneNumber.toLowerCase().includes(q)) ||
        this.formatRole(u.role).toLowerCase().includes(q)
      );
    }

    return list;
  }

  loadUsers() {
    this.isLoading = true;
    this.errorMessage = null;
    this.userService.getUsers().subscribe({
      next: users => {
        this.users = users ?? [];
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
      error: error => {
        console.error('Kullanıcı listesi yüklenemedi.', error);
        this.errorMessage = 'Kullanıcı listesi yüklenemedi. Yönetici yetkinizi ve API bağlantısını kontrol edin.';
        this.isLoading = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  formatRole(role: string): string {
    const r = role?.toUpperCase();
    if (r === 'ADMIN' || r === 'ROLE_ADMIN') return 'Admin';
    if (r === 'LANDLORD' || r === 'ROLE_LANDLORD') return 'Ev Sahibi';
    if (r === 'TENANT' || r === 'ROLE_TENANT') return 'Kiracı';
    if (r === 'USER' || r === 'ROLE_USER') return 'Kiracı';
    return role || 'Kullanıcı';
  }

  getRoleClass(role: string) {
    const r = role?.toUpperCase();
    if (r === 'ADMIN' || r === 'ROLE_ADMIN') return 'role-admin';
    if (r === 'LANDLORD' || r === 'ROLE_LANDLORD') return 'role-landlord';
    return 'role-tenant';
  }

  getRoleBadgeClass(role: string) {
    const r = role?.toUpperCase();
    if (r === 'ADMIN' || r === 'ROLE_ADMIN') return 'badge--role-admin';
    if (r === 'LANDLORD' || r === 'ROLE_LANDLORD') return 'badge--role-landlord';
    return 'badge--role-tenant';
  }

  openUser(user: UserProfile) {
    this.selectedUser = user;
  }
}
