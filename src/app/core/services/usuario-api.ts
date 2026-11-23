import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NovoUsuario, Usuario } from '../models/usuario';

@Service()
export class UsuarioApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/usuarios`;

  cadastrar(usuario: NovoUsuario): Observable<Usuario> { return this.http.post<Usuario>(this.url, usuario); }
  atualizar(id: number, usuario: Partial<NovoUsuario> & { nome: string; email: string }): Observable<Usuario> { return this.http.put<Usuario>(`${this.url}/${id}`, usuario); }
  excluir(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
}
