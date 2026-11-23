import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SEM_AVISO_DE_ERRO } from '../interceptors/erro-interceptor';
import { Disponibilidade } from '../models/disponibilidade';

@Service()
export class DisponibilidadeApi {
  private readonly http = inject(HttpClient);

  // GET /usuarios/{usuarioId}/disponibilidades (público). É informação extra: sem snackbar se falhar.
  substituir(usuarioId: number, disponibilidades: { diaSemana: Disponibilidade['diaSemana']; horaInicio: string; horaFim: string }[]): Observable<Disponibilidade[]> { return this.http.put<Disponibilidade[]>(`${environment.apiUrl}/usuarios/${usuarioId}/disponibilidades`, { disponibilidades }); }

  listar(usuarioId: number): Observable<Disponibilidade[]> {
    return this.http.get<Disponibilidade[]>(
      `${environment.apiUrl}/usuarios/${usuarioId}/disponibilidades`,
      { context: new HttpContext().set(SEM_AVISO_DE_ERRO, true) },
    );
  }
}
