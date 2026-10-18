import { Injectable } from '@angular/core';

interface RuntimeConfig {
  identity: {
    issuer: string;
  };
}

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private config: RuntimeConfig | null = null;

  async load(): Promise<void> {
    const response = await fetch('/assets/app-config.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Runtime configuration request failed with status ${response.status}.`);
    }

    const value: unknown = await response.json();
    if (!this.isRuntimeConfig(value)) {
      throw new Error('Runtime configuration is invalid. Configure identity.issuer with an HTTP(S) URL.');
    }
    this.config = value;
  }

  get identityIssuer(): string {
    if (!this.config) {
      throw new Error('Runtime configuration has not been loaded.');
    }
    return this.config.identity.issuer.replace(/\/+$/, '');
  }

  private isRuntimeConfig(value: unknown): value is RuntimeConfig {
    if (typeof value !== 'object' || value === null || !('identity' in value)) return false;
    const identity = value.identity;
    if (typeof identity !== 'object' || identity === null || !('issuer' in identity)) return false;
    if (typeof identity.issuer !== 'string') return false;

    try {
      const issuer = new URL(identity.issuer);
      return issuer.protocol === 'http:' || issuer.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
