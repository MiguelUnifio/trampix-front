import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Servico, TipoCobranca } from '../models/servico';

export interface ServicoRequisicao { categoriaId: number; subcategoriaId: number; titulo: string; descricao: string; preco: number; tipoCobranca: TipoCobranca; }

export interface FiltroServicos {
  categoriaId?: number | null;
  subcategoriaId?: number | null;
}

@Service()
export class ServicoApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/servicos`;

  // GET /servicos, com ?categoriaId= e ?subcategoriaId= opcionais.
  listar(filtro: FiltroServicos = {}): Observable<Servico[]> {
    let params = new HttpParams();
    if (filtro.categoriaId != null) {
      params = params.set('categoriaId', filtro.categoriaId);
    }
    if (filtro.subcategoriaId != null) {
      params = params.set('subcategoriaId', filtro.subcategoriaId);
    }
    return this.http.get<Servico[]>(this.url, { params });
  }

  meus(): Observable<Servico[]> { return this.http.get<Servico[]>(`${this.url}/meus`); }

  criar(dados: ServicoRequisicao): Observable<Servico> { return this.http.post<Servico>(this.url, dados); }

  atualizar(id: number, dados: ServicoRequisicao): Observable<Servico> { return this.http.put<Servico>(`${this.url}/${id}`, dados); }

  excluir(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }

  // GET /servicos/{id}: só serviço ATIVO (senão 404).
  buscar(id: number): Observable<Servico> {
    return this.http.get<Servico>(`${this.url}/${id}`);
  }
}
