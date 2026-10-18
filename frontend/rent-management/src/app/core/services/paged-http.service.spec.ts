import { TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpRequest } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PagedHttpService } from './paged-http.service';

describe('PagedHttpService', () => {
  let service: PagedHttpService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PagedHttpService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads every page using the server pagination headers', () => {
    let result: { id: number }[] | undefined;
    service.getAll<{ id: number }>('/api/items').subscribe(items => result = items);

    const first = http.expectOne(request => hasPage(request, 1));
    first.flush([{ id: 1 }], {
      headers: new HttpHeaders({ 'X-Page': '1', 'X-Total-Pages': '2' }),
    });

    const second = http.expectOne(request => hasPage(request, 2));
    second.flush([{ id: 2 }], {
      headers: new HttpHeaders({ 'X-Page': '2', 'X-Total-Pages': '2' }),
    });

    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('rejects malformed pagination metadata rather than silently dropping records', () => {
    let error: unknown;
    service.getAll('/api/items').subscribe({ error: value => error = value });

    http.expectOne(request => hasPage(request, 1)).flush([], {
      headers: new HttpHeaders({ 'X-Page': '1', 'X-Total-Pages': 'many' }),
    });

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('X-Total-Pages');
  });
});

function hasPage(request: HttpRequest<unknown>, page: number): boolean {
  return request.url === '/api/items' &&
    request.params.get('page') === String(page) &&
    request.params.get('pageSize') === '100';
}
