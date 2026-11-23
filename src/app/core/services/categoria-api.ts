import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Categoria } from '../models/categoria';

@Service()
export class CategoriaApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/categorias`;

  listar(): Observable<Categoria[]> { return this.http.get<Categoria[]>(this.url); }
  criar(dados: { nome: string; descricao?: string }): Observable<Categoria> { return this.http.post<Categoria>(this.url, dados); }
  atualizar(id: number, dados: { nome: string; descricao?: string }): Observable<Categoria> { return this.http.put<Categoria>(`${this.url}/${id}`, dados); }
  excluir(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
  criarSubcategoria(categoriaId: number, dados: { nome: string; descricao?: string }): Observable<unknown> { return this.http.post(`${this.url}/${categoriaId}/subcategorias`, dados); }
  atualizarSubcategoria(categoriaId: number, id: number, dados: { nome: string; descricao?: string; status?: 'ATIVA' | 'INATIVA' }): Observable<unknown> { return this.http.put(`${this.url}/${categoriaId}/subcategorias/${id}`, dados); }
  excluirSubcategoria(categoriaId: number, id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${categoriaId}/subcategorias/${id}`); }
}
