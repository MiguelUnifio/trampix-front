import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IndicadoresDashboard } from '../models/dashboard';

@Service()
export class DashboardApi {
  private readonly http = inject(HttpClient);
  consultar(): Observable<IndicadoresDashboard> {
    return this.http.get<IndicadoresDashboard>(`${environment.apiUrl}/dashboard`);
  }
}
