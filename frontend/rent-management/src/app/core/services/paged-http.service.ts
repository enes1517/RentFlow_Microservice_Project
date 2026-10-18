import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PagedHttpService {
  private readonly http = inject(HttpClient);

  getAll<T>(url: string, filters = new HttpParams()): Observable<T[]> {
    const pageSize = '100';
    const getPage = (page: number) => this.http.get<T[]>(url, {
      params: filters.set('page', String(page)).set('pageSize', pageSize),
      observe: 'response',
    });

    return getPage(1).pipe(
      expand(response => {
        const page = this.readHeader(response, 'X-Page', 1);
        const totalPages = this.readHeader(response, 'X-Total-Pages', 0);
        if (page >= totalPages) return EMPTY;
        return getPage(page + 1);
      }),
      map(response => response.body ?? []),
      reduce((items, page) => items.concat(page), [] as T[]),
    );
  }

  private readHeader<T>(response: HttpResponse<T>, name: string, fallback: number): number {
    const value = response.headers.get(name);
    if (value === null) return fallback;

    const parsed = Number(value);
    const minimum = name === 'X-Page' ? 1 : 0;
    if (!Number.isInteger(parsed) || parsed < minimum) {
      throw new Error(`Invalid pagination response header: ${name}.`);
    }
    return parsed;
  }
}
