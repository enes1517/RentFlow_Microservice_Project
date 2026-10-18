import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedHttpService } from './paged-http.service';

export interface Property {
  id: string;
  name: string;
  description: string;
  landlordId: string;
  street: string;
  city: string;
  units: PropertyUnit[];
}

export interface PropertyUnit {
  id: string;
  unitNumber: string;
  floor: number;
  squareMeters: number;
  rentAmount: number;
  currency: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private apiUrl = '/api/properties';

  constructor(private http: HttpClient, private pagedHttp: PagedHttpService) {}

  getProperties(landlordId: string): Observable<Property[]> {
    return this.pagedHttp.getAll<Property>(`${this.apiUrl}/landlord/${encodeURIComponent(landlordId)}`);
  }

  getAllProperties(): Observable<Property[]> {
    return this.pagedHttp.getAll<Property>(this.apiUrl);
  }

  getProperty(id: string): Observable<Property> {
    return this.http.get<Property>(`${this.apiUrl}/${encodeURIComponent(id)}`);
  }

  createProperty(property: {
    name: string;
    description: string;
    landlordId: string;
    address: { street: string; city: string; state: string; zipCode: string; country: string };
  }): Observable<{ id: string; status: string }> {
    return this.http.post<{ id: string; status: string }>(this.apiUrl, property);
  }

  addUnit(propertyId: string, unit: {
    unitNumber: string;
    floor: number;
    squareMeters: number;
    rentAmount: number;
    currency: string;
  }): Observable<{ id: string; status: string }> {
    return this.http.post<{ id: string; status: string }>(`${this.apiUrl}/${encodeURIComponent(propertyId)}/units`, unit);
  }

}
