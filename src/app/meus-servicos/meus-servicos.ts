import { Component, inject, OnInit, signal } from '@angular/core';
import { Categoria } from '../core/models/categoria';
import { Servico, TipoCobranca } from '../core/models/servico';
import { CategoriaApi } from '../core/services/categoria-api';
import { ServicoApi, ServicoRequisicao } from '../core/services/servico-api';

@Component({ selector: 'app-meus-servicos', standalone: false, templateUrl: './meus-servicos.html', styleUrl: './meus-servicos.scss' })
export class MeusServicos implements OnInit {
  private readonly api = inject(ServicoApi);
  private readonly categoriaApi = inject(CategoriaApi);
  protected readonly servicos = signal<Servico[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly erro = signal('');
  protected readonly editando = signal<number | null>(null);
  protected titulo = ''; protected descricao = ''; protected preco: number | null = null;
  protected categoriaId: number | null = null; protected subcategoriaId: number | null = null;
  protected tipoCobranca: TipoCobranca = 'POR_TRABALHO';
  protected readonly tipos: { valor: TipoCobranca; texto: string }[] = [
    { valor: 'POR_HORA', texto: 'Por hora' }, { valor: 'POR_DIA', texto: 'Por dia' },
    { valor: 'POR_M2', texto: 'Por m²' }, { valor: 'POR_TRABALHO', texto: 'Por trabalho' },
  ];
  protected get subcategorias() { return this.categorias().find(c => c.id === this.categoriaId)?.subcategorias ?? []; }
  ngOnInit(): void { this.categoriaApi.listar().subscribe({ next: c => this.categorias.set(c) }); this.carregar(); }
  carregar(): void { this.api.meus().subscribe({ next: s => this.servicos.set(s), error: () => this.erro.set('Não foi possível carregar seus serviços.') }); }
  prepararEdicao(s: Servico): void { this.editando.set(s.id); this.titulo=s.titulo; this.descricao=s.descricao ?? ''; this.preco=s.preco; this.categoriaId=s.categoria.id; this.subcategoriaId=s.subcategoria.id; this.tipoCobranca=s.tipoCobranca; }
  novo(): void { this.editando.set(null); this.titulo=''; this.descricao=''; this.preco=null; this.categoriaId=null; this.subcategoriaId=null; this.tipoCobranca='POR_TRABALHO'; }
  salvar(): void {
    this.erro.set('');
    if (!this.categoriaId || !this.subcategoriaId || !this.titulo.trim() || !this.descricao.trim() || !this.preco || this.preco <= 0) { this.erro.set('Preencha todos os campos e informe preço maior que zero.'); return; }
    const dados: ServicoRequisicao = { categoriaId:this.categoriaId, subcategoriaId:this.subcategoriaId, titulo:this.titulo.trim(), descricao:this.descricao.trim(), preco:this.preco, tipoCobranca:this.tipoCobranca };
    const id=this.editando(); const chamada=id ? this.api.atualizar(id,dados) : this.api.criar(dados);
    chamada.subscribe({ next: () => { this.novo(); this.carregar(); }, error: () => this.erro.set('Não foi possível salvar. Verifique se a categoria e subcategoria estão válidas.') });
  }
  excluir(id:number): void { if (!confirm('Deseja realmente inativar este serviço?')) return; this.api.excluir(id).subscribe({ next:()=>this.carregar(), error:()=>this.erro.set('Não foi possível excluir o serviço.') }); }
}
