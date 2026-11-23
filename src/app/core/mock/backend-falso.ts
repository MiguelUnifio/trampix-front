import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpParams,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { delay, Observable, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Categoria } from '../models/categoria';
import {
  Contratacao,
  Endereco,
  ParteResumo,
  StatusContratacao,
} from '../models/contratacao';
import { IndicadoresDashboard } from '../models/dashboard';
import { DiaSemana, Disponibilidade } from '../models/disponibilidade';
import { ErroCampo } from '../models/erro-api';
import { Servico, TipoCobranca } from '../models/servico';
import { Usuario } from '../models/usuario';
import {
  agoraTexto,
  banco,
  ContratacaoDb,
  proximoId,
  salvarBanco,
  ServicoDb,
  somarDias,
  UsuarioDb,
} from './banco-falso';

// Back falso: responde no lugar da API do Trampix, sem rede. Faz as mesmas contas e as mesmas
// validações do back em Spring (status, conflito de agenda, preço, etc.), usando o banco do
// localStorage. Fica por último na cadeia de interceptors, então os erros passam pelo
// erroInterceptor como se tivessem vindo de um servidor de verdade.

// ------------------------------------------------------------------ erros e tipos

class ErroFalso {
  constructor(
    readonly status: number,
    readonly mensagem: string,
    readonly erros: ErroCampo[] | null = null,
  ) {}
}

const invalido = (mensagem: string, erros: ErroCampo[] | null = null) => new ErroFalso(400, mensagem, erros);
const naoAutenticado = () => new ErroFalso(401, 'e-mail ou senha inválidos');
const sessaoInvalida = () => new ErroFalso(401, 'faça login para continuar');
const proibido = (mensagem: string) => new ErroFalso(403, mensagem);
const naoEncontrado = (mensagem: string) => new ErroFalso(404, mensagem);
const regra = (mensagem: string) => new ErroFalso(409, mensagem);

interface Chamada {
  corpo: Record<string, unknown>;
  params: HttpParams;
  logado: UsuarioDb | null;
}

interface Resposta {
  status: number;
  corpo: unknown;
}

const ok = (corpo: unknown): Resposta => ({ status: 200, corpo });
const criado = (corpo: unknown): Resposta => ({ status: 201, corpo });
const semConteudo = (): Resposta => ({ status: 204, corpo: null });

type Tratador = (chamada: Chamada, p: string[]) => Resposta;

const PRAZO_RESPOSTA_DIAS = 7;

// ------------------------------------------------------------------ interceptor

export const backendFalsoInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  const caminho = req.url.slice(environment.apiUrl.length).split('?')[0];
  const chamada: Chamada = {
    corpo: (req.body ?? {}) as Record<string, unknown>,
    params: req.params,
    logado: usuarioDoToken(req),
  };

  let resposta: Resposta;
  try {
    resposta = rotear(req.method, caminho, chamada);
  } catch (erro) {
    if (erro instanceof ErroFalso) {
      return atrasar(
        throwError(
          () =>
            new HttpErrorResponse({
              status: erro.status,
              statusText: erro.mensagem,
              url: req.url,
              error: { status: erro.status, mensagem: erro.mensagem, erros: erro.erros },
            }),
        ),
      );
    }
    throw erro;
  }
  salvarBanco();
  return atrasar(
    of(new HttpResponse({ status: resposta.status, body: resposta.corpo, url: req.url })),
  );
};

// Pequena espera para a tela mostrar o "carregando" como numa chamada de verdade.
function atrasar<T>(origem: Observable<T>): Observable<T> {
  return origem.pipe(delay(120));
}

// O token do modo demonstração é "demo.<id do usuário>".
function usuarioDoToken(req: HttpRequest<unknown>): UsuarioDb | null {
  const cabecalho = req.headers.get('Authorization');
  if (!cabecalho || !cabecalho.startsWith('Bearer demo.')) {
    return null;
  }
  const id = Number(cabecalho.slice('Bearer demo.'.length));
  return banco().usuarios.find((u) => u.id === id && u.status === 'ATIVO') ?? null;
}

// ------------------------------------------------------------------ rotas

const ROTAS: { metodo: string; padrao: RegExp; tratar: Tratador }[] = [
  { metodo: 'POST', padrao: /^\/auth\/login$/, tratar: (c) => login(c) },

  { metodo: 'POST', padrao: /^\/usuarios$/, tratar: (c) => cadastrarUsuario(c) },
  { metodo: 'PUT', padrao: /^\/usuarios\/(\d+)$/, tratar: (c, p) => atualizarUsuario(c, Number(p[0])) },
  { metodo: 'DELETE', padrao: /^\/usuarios\/(\d+)$/, tratar: (c, p) => desativarUsuario(c, Number(p[0])) },
  { metodo: 'GET', padrao: /^\/usuarios\/(\d+)\/prestador$/, tratar: (c, p) => buscarPrestador(c, Number(p[0])) },
  { metodo: 'POST', padrao: /^\/usuarios\/(\d+)\/prestador$/, tratar: (c, p) => tornarPrestador(c, Number(p[0])) },
  { metodo: 'GET', padrao: /^\/usuarios\/(\d+)\/disponibilidades$/, tratar: (_c, p) => listarDisponibilidades(Number(p[0])) },
  { metodo: 'PUT', padrao: /^\/usuarios\/(\d+)\/disponibilidades$/, tratar: (c, p) => substituirDisponibilidades(c, Number(p[0])) },

  { metodo: 'GET', padrao: /^\/categorias$/, tratar: () => listarCategorias() },
  { metodo: 'POST', padrao: /^\/categorias$/, tratar: (c) => criarCategoria(c) },
  { metodo: 'PUT', padrao: /^\/categorias\/(\d+)$/, tratar: (c, p) => atualizarCategoria(c, Number(p[0])) },
  { metodo: 'DELETE', padrao: /^\/categorias\/(\d+)$/, tratar: (c, p) => inativarCategoria(c, Number(p[0])) },
  { metodo: 'POST', padrao: /^\/categorias\/(\d+)\/subcategorias$/, tratar: (c, p) => criarSubcategoria(c, Number(p[0])) },
  { metodo: 'PUT', padrao: /^\/categorias\/(\d+)\/subcategorias\/(\d+)$/, tratar: (c, p) => atualizarSubcategoria(c, Number(p[0]), Number(p[1])) },
  { metodo: 'DELETE', padrao: /^\/categorias\/(\d+)\/subcategorias\/(\d+)$/, tratar: (c, p) => inativarSubcategoria(c, Number(p[0]), Number(p[1])) },

  { metodo: 'GET', padrao: /^\/servicos$/, tratar: (c) => listarServicos(c) },
  { metodo: 'GET', padrao: /^\/servicos\/meus$/, tratar: (c) => meusServicos(c) },
  { metodo: 'GET', padrao: /^\/servicos\/(\d+)$/, tratar: (_c, p) => buscarServico(Number(p[0])) },
  { metodo: 'POST', padrao: /^\/servicos$/, tratar: (c) => criarServico(c) },
  { metodo: 'PUT', padrao: /^\/servicos\/(\d+)$/, tratar: (c, p) => atualizarServico(c, Number(p[0])) },
  { metodo: 'DELETE', padrao: /^\/servicos\/(\d+)$/, tratar: (c, p) => inativarServico(c, Number(p[0])) },

  { metodo: 'POST', padrao: /^\/contratacoes$/, tratar: (c) => criarContratacao(c) },
  { metodo: 'GET', padrao: /^\/contratacoes$/, tratar: (c) => listarContratacoes(c) },
  { metodo: 'POST', padrao: /^\/contratacoes\/(\d+)\/aceitar$/, tratar: (c, p) => aceitar(c, Number(p[0])) },
  { metodo: 'POST', padrao: /^\/contratacoes\/(\d+)\/recusar$/, tratar: (c, p) => recusar(c, Number(p[0])) },
  { metodo: 'POST', padrao: /^\/contratacoes\/(\d+)\/contraproposta$/, tratar: (c, p) => contrapropor(c, Number(p[0])) },
  { metodo: 'POST', padrao: /^\/contratacoes\/(\d+)\/aceitar-contraproposta$/, tratar: (c, p) => aceitarContraproposta(c, Number(p[0])) },
  { metodo: 'POST', padrao: /^\/contratacoes\/(\d+)\/cancelar$/, tratar: (c, p) => cancelar(c, Number(p[0])) },
  { metodo: 'POST', padrao: /^\/contratacoes\/(\d+)\/concluir$/, tratar: (c, p) => concluir(c, Number(p[0])) },

  { metodo: 'GET', padrao: /^\/dashboard$/, tratar: (c) => dashboard(c) },
];

function rotear(metodo: string, caminho: string, chamada: Chamada): Resposta {
  for (const rota of ROTAS) {
    if (rota.metodo !== metodo) {
      continue;
    }
    const encontrou = rota.padrao.exec(caminho);
    if (encontrou) {
      return rota.tratar(chamada, encontrou.slice(1));
    }
  }
  throw naoEncontrado(`rota não encontrada: ${metodo} ${caminho}`);
}

// ------------------------------------------------------------------ utilidades

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function textoOuNulo(valor: unknown): string | null {
  const t = texto(valor);
  return t === '' ? null : t;
}

function numeroOuNulo(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function soDigitos(valor: unknown): string {
  return texto(valor).replace(/\D/g, '');
}

function exigirLogado(c: Chamada): UsuarioDb {
  if (!c.logado) {
    throw sessaoInvalida();
  }
  return c.logado;
}

function exigirAdmin(c: Chamada): UsuarioDb {
  const logado = exigirLogado(c);
  if (logado.perfil !== 'ADMIN') {
    throw proibido('acesso negado: só ADMIN pode fazer isso');
  }
  return logado;
}

function exigirProprioOuAdmin(c: Chamada, usuarioId: number): UsuarioDb {
  const logado = exigirLogado(c);
  if (logado.id !== usuarioId && logado.perfil !== 'ADMIN') {
    throw proibido('você só pode acessar os próprios dados');
  }
  return logado;
}

function usuarioPublico(u: UsuarioDb): Usuario {
  const { senha: _senha, ...resto } = u;
  return resto;
}

// ------------------------------------------------------------------ login e usuários

function login(c: Chamada): Resposta {
  const email = texto(c.corpo['email']).toLowerCase();
  const senha = typeof c.corpo['senha'] === 'string' ? (c.corpo['senha'] as string) : '';
  const usuario = banco().usuarios.find((u) => u.email.toLowerCase() === email);
  if (!usuario || usuario.senha !== senha) {
    throw naoAutenticado();
  }
  if (usuario.status !== 'ATIVO') {
    throw proibido('esta conta não está ativa');
  }
  const expiraEm = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  return ok({ token: `demo.${usuario.id}`, tipo: 'Bearer', expiraEm, usuario: usuarioPublico(usuario) });
}

function cadastrarUsuario(c: Chamada): Resposta {
  const b = banco();
  const nome = texto(c.corpo['nome']);
  const email = texto(c.corpo['email']);
  const senha = typeof c.corpo['senha'] === 'string' ? (c.corpo['senha'] as string) : '';
  const documento = soDigitos(c.corpo['documento']);
  const erros: ErroCampo[] = [];
  if (!nome) erros.push({ campo: 'nome', mensagem: 'o nome é obrigatório' });
  if (!/^\S+@\S+\.\S+$/.test(email)) erros.push({ campo: 'email', mensagem: 'e-mail inválido' });
  if (senha.length < 6) erros.push({ campo: 'senha', mensagem: 'a senha deve ter pelo menos 6 caracteres' });
  if (!documento) erros.push({ campo: 'documento', mensagem: 'o documento é obrigatório' });
  if (erros.length) {
    throw invalido('dados inválidos', erros);
  }
  if (b.usuarios.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw regra('e-mail já cadastrado');
  }
  if (b.usuarios.some((u) => u.documento === documento)) {
    throw regra('documento já cadastrado');
  }
  const agora = agoraTexto();
  const novo: UsuarioDb = {
    id: proximoId(b.usuarios),
    nome,
    email,
    senha,
    documento,
    tipoDocumento: c.corpo['tipoDocumento'] === 'CNPJ' ? 'CNPJ' : 'CPF',
    dataNascimento: textoOuNulo(c.corpo['dataNascimento']),
    telefone: soDigitos(c.corpo['telefone']) || null,
    perfil: 'USUARIO',
    status: 'ATIVO',
    cep: textoOuNulo(c.corpo['cep']),
    logradouro: textoOuNulo(c.corpo['logradouro']),
    numero: textoOuNulo(c.corpo['numero']),
    complemento: textoOuNulo(c.corpo['complemento']),
    bairro: textoOuNulo(c.corpo['bairro']),
    cidade: textoOuNulo(c.corpo['cidade']),
    uf: textoOuNulo(c.corpo['uf']),
    criadoEm: agora,
    atualizadoEm: agora,
  };
  b.usuarios.push(novo);
  return criado(usuarioPublico(novo));
}

function atualizarUsuario(c: Chamada, id: number): Resposta {
  exigirProprioOuAdmin(c, id);
  const b = banco();
  const usuario = b.usuarios.find((u) => u.id === id);
  if (!usuario) {
    throw naoEncontrado('usuário não encontrado');
  }
  const nome = texto(c.corpo['nome']);
  const email = texto(c.corpo['email']);
  const erros: ErroCampo[] = [];
  if (!nome) erros.push({ campo: 'nome', mensagem: 'o nome é obrigatório' });
  if (!/^\S+@\S+\.\S+$/.test(email)) erros.push({ campo: 'email', mensagem: 'e-mail inválido' });
  if (erros.length) {
    throw invalido('dados inválidos', erros);
  }
  if (b.usuarios.some((u) => u.id !== id && u.email.toLowerCase() === email.toLowerCase())) {
    throw regra('e-mail já cadastrado');
  }
  const documento = soDigitos(c.corpo['documento']);
  if (documento && b.usuarios.some((u) => u.id !== id && u.documento === documento)) {
    throw regra('documento já cadastrado');
  }
  usuario.nome = nome;
  usuario.email = email;
  if (documento) usuario.documento = documento;
  const tipoDocumento = c.corpo['tipoDocumento'];
  if (tipoDocumento === 'CPF' || tipoDocumento === 'CNPJ') {
    usuario.tipoDocumento = tipoDocumento;
  }
  usuario.telefone = soDigitos(c.corpo['telefone']) || null;
  usuario.dataNascimento = textoOuNulo(c.corpo['dataNascimento']);
  usuario.cep = textoOuNulo(c.corpo['cep']);
  usuario.logradouro = textoOuNulo(c.corpo['logradouro']);
  usuario.numero = textoOuNulo(c.corpo['numero']);
  usuario.complemento = textoOuNulo(c.corpo['complemento']);
  usuario.bairro = textoOuNulo(c.corpo['bairro']);
  usuario.cidade = textoOuNulo(c.corpo['cidade']);
  usuario.uf = textoOuNulo(c.corpo['uf']);
  const novaSenha = typeof c.corpo['senha'] === 'string' ? (c.corpo['senha'] as string).trim() : '';
  if (novaSenha) {
    if (novaSenha.length < 6) {
      throw invalido('dados inválidos', [{ campo: 'senha', mensagem: 'a senha deve ter pelo menos 6 caracteres' }]);
    }
    usuario.senha = novaSenha;
  }
  usuario.atualizadoEm = agoraTexto();
  return ok(usuarioPublico(usuario));
}

// Exclusão lógica: a conta fica INATIVA e deixa de conseguir entrar.
function desativarUsuario(c: Chamada, id: number): Resposta {
  exigirProprioOuAdmin(c, id);
  const b = banco();
  const usuario = b.usuarios.find((u) => u.id === id);
  if (!usuario) {
    throw naoEncontrado('usuário não encontrado');
  }
  const abertas: StatusContratacao[] = ['PENDENTE', 'CONTRAPROPOSTA', 'ACEITA'];
  const emAndamento = b.contratacoes.some(
    (ct) =>
      abertas.includes(ct.status) && (ct.clienteId === id || prestadorUsuarioIdDoServico(ct.servicoId) === id),
  );
  if (emAndamento) {
    throw regra('não é possível desativar a conta com contratações em andamento');
  }
  usuario.status = 'INATIVO';
  usuario.atualizadoEm = agoraTexto();
  const perfil = b.prestadores.find((p) => p.usuarioId === id && p.ativo);
  if (perfil) {
    perfil.ativo = false;
    b.servicos.filter((s) => s.prestadorId === perfil.id).forEach((s) => (s.status = 'REMOVIDO'));
  }
  return semConteudo();
}

// ------------------------------------------------------------------ prestador e disponibilidade

function perfilAtivoDe(usuarioId: number) {
  return banco().prestadores.find((p) => p.usuarioId === usuarioId && p.ativo);
}

function buscarPrestador(c: Chamada, usuarioId: number): Resposta {
  exigirProprioOuAdmin(c, usuarioId);
  const perfil = perfilAtivoDe(usuarioId);
  if (!perfil) {
    throw naoEncontrado('perfil de prestador não encontrado');
  }
  const usuario = banco().usuarios.find((u) => u.id === usuarioId);
  return ok({
    id: perfil.id,
    usuarioId,
    nome: usuario?.nome ?? '',
    biografia: perfil.biografia,
    raioAtendimentoKm: perfil.raioAtendimentoKm,
    agendaCheia: perfil.agendaCheia,
    verificado: perfil.verificado,
    criadoEm: perfil.criadoEm,
  });
}

function tornarPrestador(c: Chamada, usuarioId: number): Resposta {
  exigirProprioOuAdmin(c, usuarioId);
  const b = banco();
  const usuario = b.usuarios.find((u) => u.id === usuarioId);
  if (!usuario) {
    throw naoEncontrado('usuário não encontrado');
  }
  if (usuario.status !== 'ATIVO') {
    throw regra('só usuário ATIVO pode virar prestador');
  }
  if (perfilAtivoDe(usuarioId)) {
    throw regra('este usuário já é prestador');
  }
  const dadosServico = (c.corpo['servico'] ?? null) as Record<string, unknown> | null;
  if (!dadosServico) {
    throw invalido('dados inválidos', [{ campo: 'servico', mensagem: 'informe o primeiro serviço' }]);
  }
  const agora = agoraTexto();
  // Se o usuário já foi prestador, reativa o perfil antigo em vez de duplicar.
  let perfil = b.prestadores.find((p) => p.usuarioId === usuarioId);
  if (perfil) {
    perfil.ativo = true;
  } else {
    perfil = {
      id: proximoId(b.prestadores),
      usuarioId,
      biografia: null,
      raioAtendimentoKm: null,
      agendaCheia: false,
      verificado: false,
      ativo: true,
      criadoEm: agora,
    };
    b.prestadores.push(perfil);
  }
  perfil.biografia = textoOuNulo(c.corpo['biografia']);
  perfil.raioAtendimentoKm = numeroOuNulo(c.corpo['raioAtendimentoKm']);
  const servico = montarServico(dadosServico, perfil.id, null);
  b.servicos.push(servico);
  return criado(servicoResposta(servico));
}

function listarDisponibilidades(usuarioId: number): Resposta {
  if (!perfilAtivoDe(usuarioId)) {
    throw naoEncontrado('perfil de prestador não encontrado');
  }
  return ok(disponibilidadesDe(usuarioId));
}

const ORDEM_DIAS: DiaSemana[] = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO'];

function disponibilidadesDe(usuarioId: number): Disponibilidade[] {
  return banco()
    .disponibilidades.filter((d) => d.usuarioId === usuarioId)
    .sort(
      (a, z) =>
        ORDEM_DIAS.indexOf(a.diaSemana) - ORDEM_DIAS.indexOf(z.diaSemana) ||
        a.horaInicio.localeCompare(z.horaInicio),
    )
    .map((d) => ({ id: d.id, diaSemana: d.diaSemana, horaInicio: d.horaInicio, horaFim: d.horaFim }));
}

function substituirDisponibilidades(c: Chamada, usuarioId: number): Resposta {
  exigirProprioOuAdmin(c, usuarioId);
  if (!perfilAtivoDe(usuarioId)) {
    throw proibido('só prestador pode informar disponibilidade');
  }
  const itens = Array.isArray(c.corpo['disponibilidades'])
    ? (c.corpo['disponibilidades'] as Record<string, unknown>[])
    : [];
  const novas = itens.map((i) => ({
    diaSemana: i['diaSemana'] as DiaSemana,
    ini: paraMinutos(texto(i['horaInicio'])),
    fim: paraMinutos(texto(i['horaFim'])),
  }));
  for (const n of novas) {
    if (!ORDEM_DIAS.includes(n.diaSemana) || Number.isNaN(n.ini) || Number.isNaN(n.fim) || n.fim <= n.ini) {
      throw invalido('horário inválido: o fim deve ser depois do início');
    }
  }
  for (let i = 0; i < novas.length; i++) {
    for (let j = i + 1; j < novas.length; j++) {
      const a = novas[i];
      const z = novas[j];
      if (a.diaSemana === z.diaSemana && a.ini < z.fim && z.ini < a.fim) {
        throw regra('os horários do mesmo dia não podem se sobrepor');
      }
    }
  }
  const b = banco();
  b.disponibilidades = b.disponibilidades.filter((d) => d.usuarioId !== usuarioId);
  for (const n of novas) {
    b.disponibilidades.push({
      id: proximoId(b.disponibilidades),
      usuarioId,
      diaSemana: n.diaSemana,
      horaInicio: deMinutos(n.ini),
      horaFim: deMinutos(n.fim),
    });
  }
  return ok(disponibilidadesDe(usuarioId));
}

// ------------------------------------------------------------------ categorias e subcategorias

function categoriaResposta(id: number): Categoria {
  const b = banco();
  const c = b.categorias.find((x) => x.id === id)!;
  return {
    id: c.id,
    nome: c.nome,
    descricao: c.descricao,
    categoriaPaiId: null,
    subcategorias: b.subcategorias
      .filter((s) => s.categoriaId === id && s.status === 'ATIVA')
      .map((s) => ({
        id: s.id,
        nome: s.nome,
        descricao: s.descricao,
        categoriaId: s.categoriaId,
        padrao: s.padrao,
        status: s.status,
      })),
  };
}

function listarCategorias(): Resposta {
  const b = banco();
  return ok(
    b.categorias
      .filter((c) => c.ativa)
      .sort((a, z) => a.nome.localeCompare(z.nome, 'pt-BR'))
      .map((c) => categoriaResposta(c.id)),
  );
}

function nomeDeCategoriaLivre(nome: string, ignorarId: number | null): void {
  const igual = banco().categorias.some(
    (c) => c.ativa && c.id !== ignorarId && c.nome.toLowerCase() === nome.toLowerCase(),
  );
  if (igual) {
    throw regra('já existe uma categoria com este nome');
  }
}

function criarCategoria(c: Chamada): Resposta {
  exigirAdmin(c);
  const nome = texto(c.corpo['nome']);
  if (!nome) {
    throw invalido('dados inválidos', [{ campo: 'nome', mensagem: 'o nome é obrigatório' }]);
  }
  nomeDeCategoriaLivre(nome, null);
  const b = banco();
  const nova = { id: proximoId(b.categorias), nome, descricao: textoOuNulo(c.corpo['descricao']), ativa: true };
  b.categorias.push(nova);
  return criado(categoriaResposta(nova.id));
}

function atualizarCategoria(c: Chamada, id: number): Resposta {
  exigirAdmin(c);
  const categoria = banco().categorias.find((x) => x.id === id && x.ativa);
  if (!categoria) {
    throw naoEncontrado('categoria não encontrada');
  }
  const nome = texto(c.corpo['nome']);
  if (!nome) {
    throw invalido('dados inválidos', [{ campo: 'nome', mensagem: 'o nome é obrigatório' }]);
  }
  nomeDeCategoriaLivre(nome, id);
  categoria.nome = nome;
  categoria.descricao = textoOuNulo(c.corpo['descricao']);
  return ok(categoriaResposta(id));
}

function inativarCategoria(c: Chamada, id: number): Resposta {
  exigirAdmin(c);
  const b = banco();
  const categoria = b.categorias.find((x) => x.id === id && x.ativa);
  if (!categoria) {
    throw naoEncontrado('categoria não encontrada');
  }
  if (b.servicos.some((s) => s.categoriaId === id && s.status === 'ATIVO')) {
    throw regra('a categoria tem serviços ativos e não pode ser inativada');
  }
  categoria.ativa = false;
  b.subcategorias.filter((s) => s.categoriaId === id).forEach((s) => (s.status = 'INATIVA'));
  return semConteudo();
}

function criarSubcategoria(c: Chamada, categoriaId: number): Resposta {
  const logado = exigirLogado(c);
  if (logado.perfil !== 'ADMIN' && !perfilAtivoDe(logado.id)) {
    throw proibido('só prestador ou ADMIN pode criar subcategoria');
  }
  const b = banco();
  if (!b.categorias.some((x) => x.id === categoriaId && x.ativa)) {
    throw naoEncontrado('categoria não encontrada');
  }
  const nome = texto(c.corpo['nome']);
  if (!nome) {
    throw invalido('dados inválidos', [{ campo: 'nome', mensagem: 'o nome é obrigatório' }]);
  }
  if (b.subcategorias.some((s) => s.categoriaId === categoriaId && s.status === 'ATIVA' && s.nome.toLowerCase() === nome.toLowerCase())) {
    throw regra('já existe uma subcategoria com este nome nesta categoria');
  }
  b.subcategorias.push({
    id: proximoId(b.subcategorias),
    categoriaId,
    nome,
    descricao: textoOuNulo(c.corpo['descricao']),
    padrao: false,
    status: 'ATIVA',
  });
  return criado(categoriaResposta(categoriaId));
}

function atualizarSubcategoria(c: Chamada, categoriaId: number, id: number): Resposta {
  exigirAdmin(c);
  const b = banco();
  const sub = b.subcategorias.find((s) => s.id === id && s.categoriaId === categoriaId);
  if (!sub) {
    throw naoEncontrado('subcategoria não encontrada');
  }
  const nome = texto(c.corpo['nome']);
  if (!nome) {
    throw invalido('dados inválidos', [{ campo: 'nome', mensagem: 'o nome é obrigatório' }]);
  }
  if (b.subcategorias.some((s) => s.id !== id && s.categoriaId === categoriaId && s.status === 'ATIVA' && s.nome.toLowerCase() === nome.toLowerCase())) {
    throw regra('já existe uma subcategoria com este nome nesta categoria');
  }
  sub.nome = nome;
  sub.descricao = textoOuNulo(c.corpo['descricao']);
  const status = c.corpo['status'];
  if (status === 'ATIVA' || status === 'INATIVA') {
    sub.status = status;
  }
  return ok(categoriaResposta(categoriaId));
}

function inativarSubcategoria(c: Chamada, categoriaId: number, id: number): Resposta {
  exigirAdmin(c);
  const b = banco();
  const sub = b.subcategorias.find((s) => s.id === id && s.categoriaId === categoriaId);
  if (!sub) {
    throw naoEncontrado('subcategoria não encontrada');
  }
  if (b.servicos.some((s) => s.subcategoriaId === id && s.status === 'ATIVO')) {
    throw regra('a subcategoria tem serviços ativos e não pode ser inativada');
  }
  sub.status = 'INATIVA';
  return semConteudo();
}

// ------------------------------------------------------------------ serviços

function servicoResposta(s: ServicoDb): Servico {
  const b = banco();
  const categoria = b.categorias.find((x) => x.id === s.categoriaId)!;
  const subcategoria = b.subcategorias.find((x) => x.id === s.subcategoriaId)!;
  const perfil = b.prestadores.find((x) => x.id === s.prestadorId)!;
  const usuario = b.usuarios.find((x) => x.id === perfil.usuarioId)!;
  return {
    id: s.id,
    titulo: s.titulo,
    descricao: s.descricao,
    preco: s.preco,
    tipoCobranca: s.tipoCobranca,
    status: s.status,
    categoria: { id: categoria.id, nome: categoria.nome },
    subcategoria: { id: subcategoria.id, nome: subcategoria.nome },
    prestador: {
      id: perfil.id,
      usuarioId: usuario.id,
      nome: usuario.nome,
      cidade: usuario.cidade ?? null,
      uf: usuario.uf ?? null,
      verificado: perfil.verificado,
    },
    criadoEm: s.criadoEm,
  };
}

function prestadorUsuarioIdDoServico(servicoId: number): number | null {
  const b = banco();
  const servico = b.servicos.find((s) => s.id === servicoId);
  const perfil = servico ? b.prestadores.find((p) => p.id === servico.prestadorId) : undefined;
  return perfil ? perfil.usuarioId : null;
}

const TIPOS_COBRANCA: TipoCobranca[] = ['POR_HORA', 'POR_DIA', 'POR_M2', 'POR_TRABALHO'];

// Valida os dados do serviço e devolve o registro (novo ou o existente, já alterado).
function montarServico(dados: Record<string, unknown>, prestadorId: number, existente: ServicoDb | null): ServicoDb {
  const b = banco();
  const titulo = texto(dados['titulo']);
  const descricao = texto(dados['descricao']);
  const preco = numeroOuNulo(dados['preco']);
  const categoriaId = numeroOuNulo(dados['categoriaId']);
  const subcategoriaId = numeroOuNulo(dados['subcategoriaId']);
  const tipo = dados['tipoCobranca'] as TipoCobranca;
  const erros: ErroCampo[] = [];
  if (!titulo) erros.push({ campo: 'titulo', mensagem: 'o título é obrigatório' });
  if (!descricao) erros.push({ campo: 'descricao', mensagem: 'a descrição é obrigatória' });
  if (preco === null || preco <= 0) erros.push({ campo: 'preco', mensagem: 'o preço deve ser maior que zero' });
  if (!TIPOS_COBRANCA.includes(tipo)) erros.push({ campo: 'tipoCobranca', mensagem: 'tipo de cobrança inválido' });
  if (erros.length) {
    throw invalido('dados inválidos', erros);
  }
  const categoria = b.categorias.find((x) => x.id === categoriaId && x.ativa);
  const sub = b.subcategorias.find((x) => x.id === subcategoriaId && x.status === 'ATIVA');
  if (!categoria || !sub || sub.categoriaId !== categoria.id) {
    throw naoEncontrado('categoria ou subcategoria não encontrada');
  }
  const duplicado = b.servicos.some(
    (s) =>
      s.prestadorId === prestadorId &&
      s.subcategoriaId === sub.id &&
      s.status === 'ATIVO' &&
      (existente === null || s.id !== existente.id),
  );
  if (duplicado) {
    throw regra(`você já tem um serviço ativo na subcategoria ${sub.nome}; edite o serviço existente`);
  }
  const agora = agoraTexto();
  if (existente) {
    existente.categoriaId = categoria.id;
    existente.subcategoriaId = sub.id;
    existente.titulo = titulo;
    existente.descricao = descricao;
    existente.preco = preco as number;
    existente.tipoCobranca = tipo;
    existente.atualizadoEm = agora;
    return existente;
  }
  return {
    id: proximoId(b.servicos),
    prestadorId,
    categoriaId: categoria.id,
    subcategoriaId: sub.id,
    titulo,
    descricao,
    preco: preco as number,
    tipoCobranca: tipo,
    status: 'ATIVO',
    criadoEm: agora,
    atualizadoEm: agora,
  };
}

function listarServicos(c: Chamada): Resposta {
  const categoriaId = numeroOuNulo(c.params.get('categoriaId'));
  const subcategoriaId = numeroOuNulo(c.params.get('subcategoriaId'));
  const lista = banco()
    .servicos.filter(
      (s) =>
        s.status === 'ATIVO' &&
        (categoriaId === null || s.categoriaId === categoriaId) &&
        (subcategoriaId === null || s.subcategoriaId === subcategoriaId),
    )
    .sort((a, z) => z.id - a.id)
    .map(servicoResposta);
  return ok(lista);
}

function meusServicos(c: Chamada): Resposta {
  const logado = exigirLogado(c);
  const perfil = perfilAtivoDe(logado.id);
  if (!perfil) {
    throw proibido('só prestador pode fazer isso; torne-se prestador e cadastre o primeiro serviço');
  }
  return ok(
    banco()
      .servicos.filter((s) => s.prestadorId === perfil.id && s.status !== 'REMOVIDO')
      .sort((a, z) => a.id - z.id)
      .map(servicoResposta),
  );
}

function buscarServico(id: number): Resposta {
  const servico = banco().servicos.find((s) => s.id === id && s.status === 'ATIVO');
  if (!servico) {
    throw naoEncontrado('serviço não encontrado');
  }
  return ok(servicoResposta(servico));
}

function criarServico(c: Chamada): Resposta {
  const logado = exigirLogado(c);
  const perfil = perfilAtivoDe(logado.id);
  if (!perfil) {
    throw proibido('só prestador pode cadastrar serviço');
  }
  const servico = montarServico(c.corpo, perfil.id, null);
  banco().servicos.push(servico);
  return criado(servicoResposta(servico));
}

function servicoDoDonoOuAdmin(c: Chamada, id: number): ServicoDb {
  const logado = exigirLogado(c);
  const servico = banco().servicos.find((s) => s.id === id);
  if (!servico) {
    throw naoEncontrado('serviço não encontrado');
  }
  const donoId = prestadorUsuarioIdDoServico(id);
  if (donoId !== logado.id && logado.perfil !== 'ADMIN') {
    throw proibido('só o dono do serviço ou um ADMIN pode fazer isso');
  }
  return servico;
}

function atualizarServico(c: Chamada, id: number): Resposta {
  const servico = servicoDoDonoOuAdmin(c, id);
  if (servico.status === 'REMOVIDO') {
    throw regra('serviço inativo não pode ser editado');
  }
  montarServico(c.corpo, servico.prestadorId, servico);
  return ok(servicoResposta(servico));
}

function inativarServico(c: Chamada, id: number): Resposta {
  const servico = servicoDoDonoOuAdmin(c, id);
  servico.status = 'REMOVIDO';
  servico.atualizadoEm = agoraTexto();
  return semConteudo();
}

// ------------------------------------------------------------------ datas e horas

function paraMinutos(hora: string): number {
  const partes = hora.split(':').map(Number);
  if (partes.length < 2 || partes.some((n) => Number.isNaN(n))) {
    return NaN;
  }
  return partes[0] * 60 + partes[1];
}

function deMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:00`;
}

function hhmm(minutos: number): string {
  return deMinutos(minutos).slice(0, 5);
}

function hojeBrasilia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function agoraEmMinutosBrasilia(): number {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
  return paraMinutos(partes);
}

function diaDaSemana(data: string): DiaSemana {
  const [a, m, d] = data.split('-').map(Number);
  const indice = new Date(Date.UTC(a, m - 1, d)).getUTCDay(); // 0 = domingo
  return ORDEM_DIAS[(indice + 6) % 7];
}

function dataValida(valor: unknown): string | null {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null;
}

// ------------------------------------------------------------------ contratações: regras

interface Periodo {
  dataInicio: string;
  dataFim: string;
  ini: number | null; // minutos desde a meia-noite (só quando o serviço é por hora)
  fim: number | null;
}

function montarPeriodo(servico: ServicoDb, d: Record<string, unknown>): Periodo {
  const dataInicio = dataValida(d['dataInicio']);
  if (!dataInicio) {
    throw invalido('dados inválidos', [{ campo: 'dataInicio', mensagem: 'informe a data de início' }]);
  }
  const dataFimInformada = dataValida(d['dataFim']);
  const horaInicio = textoOuNulo(d['horaInicio']);
  const quantidadeHoras = numeroOuNulo(d['quantidadeHoras']);

  if (servico.tipoCobranca === 'POR_HORA') {
    if (!horaInicio || quantidadeHoras === null) {
      throw invalido('serviço cobrado por hora: informe horaInicio e quantidadeHoras');
    }
    if (dataFimInformada && dataFimInformada !== dataInicio) {
      throw invalido('serviço cobrado por hora: o pedido é de um dia só');
    }
    const ini = paraMinutos(horaInicio);
    if (Number.isNaN(ini) || !Number.isInteger(quantidadeHoras) || quantidadeHoras < 1) {
      throw invalido('hora de início ou quantidade de horas inválida');
    }
    const fim = ini + quantidadeHoras * 60;
    if (fim > 24 * 60) {
      throw regra('o atendimento por hora precisa terminar no mesmo dia');
    }
    return { dataInicio, dataFim: dataInicio, ini, fim };
  }

  if (horaInicio || quantidadeHoras !== null) {
    throw invalido(`serviço cobrado ${servico.tipoCobranca}: informe só dataInicio e dataFim`);
  }
  const dataFim = dataFimInformada ?? dataInicio;
  if (dataFim < dataInicio) {
    throw regra('a data de fim não pode ser antes da data de início');
  }
  return { dataInicio, dataFim, ini: null, fim: null };
}

function periodoDe(ct: ContratacaoDb): Periodo {
  return {
    dataInicio: ct.dataInicio,
    dataFim: ct.dataFim,
    ini: ct.horaInicio ? paraMinutos(ct.horaInicio) : null,
    fim: ct.horaFim ? paraMinutos(ct.horaFim) : null,
  };
}

function aplicarPeriodo(ct: ContratacaoDb, p: Periodo): void {
  ct.dataInicio = p.dataInicio;
  ct.dataFim = p.dataFim;
  ct.horaInicio = p.ini === null ? null : deMinutos(p.ini);
  ct.horaFim = p.fim === null ? null : deMinutos(p.fim);
}

function exigirDataValida(p: Periodo): void {
  const hoje = hojeBrasilia();
  if (p.dataInicio < hoje) {
    throw regra('a data de início precisa ser hoje ou no futuro (horário de Brasília)');
  }
  if (p.ini !== null && p.dataInicio === hoje && p.ini <= agoraEmMinutosBrasilia()) {
    throw regra('o horário de início já passou (horário de Brasília)');
  }
}

// Confere se o prestador atende no período e devolve quantos dias contam.
function diasAtendidos(servico: ServicoDb, p: Periodo): number {
  const usuarioId = prestadorUsuarioIdDoServico(servico.id);
  const janelas = banco().disponibilidades.filter((d) => d.usuarioId === usuarioId);
  if (p.ini !== null && p.fim !== null) {
    const dia = diaDaSemana(p.dataInicio);
    const cabe = janelas.some(
      (d) =>
        d.diaSemana === dia &&
        (p.ini as number) >= paraMinutos(d.horaInicio) &&
        (p.fim as number) <= paraMinutos(d.horaFim),
    );
    if (!cabe) {
      throw regra(
        `o prestador não atende neste horário: ${hhmm(p.ini)}-${hhmm(p.fim)} precisa caber numa disponibilidade de ${dia}`,
      );
    }
    return 1;
  }
  const diasComJanela = new Set(janelas.map((d) => d.diaSemana));
  let dias = 0;
  let data = p.dataInicio;
  for (let i = 0; i < 400 && data <= p.dataFim; i++) {
    if (diasComJanela.has(diaDaSemana(data))) {
      dias++;
    }
    data = somarDias(data, 1);
  }
  if (dias === 0) {
    throw regra(
      `o prestador não atende em nenhum dia do período de ${p.dataInicio} a ${p.dataFim}; escolha datas em que ele tenha disponibilidade`,
    );
  }
  return dias;
}

function calcularPreco(servico: ServicoDb, p: Periodo, dias: number): number {
  switch (servico.tipoCobranca) {
    case 'POR_HORA':
      return servico.preco * (((p.fim as number) - (p.ini as number)) / 60);
    case 'POR_DIA':
      return servico.preco * dias;
    default:
      return servico.preco;
  }
}

// Regra central: o prestador não aceita duas contratações no mesmo intervalo.
function exigirSemConflito(servico: ServicoDb, p: Periodo, idIgnorado: number): void {
  const b = banco();
  const usuarioId = prestadorUsuarioIdDoServico(servico.id);
  for (const outra of b.contratacoes) {
    if (outra.id === idIgnorado || outra.status !== 'ACEITA') continue;
    if (prestadorUsuarioIdDoServico(outra.servicoId) !== usuarioId) continue;
    if (outra.dataInicio > p.dataFim || outra.dataFim < p.dataInicio) continue;
    const outraIni = outra.horaInicio ? paraMinutos(outra.horaInicio) : null;
    const outraFim = outra.horaFim ? paraMinutos(outra.horaFim) : null;
    const conflita =
      p.ini === null ||
      p.fim === null ||
      outraIni === null ||
      outraFim === null ||
      (p.ini < outraFim && outraIni < p.fim);
    if (conflita) {
      throw regra(`o prestador já tem uma contratação aceita que conflita com estas datas (contratação ${outra.id})`);
    }
  }
}

function servicoDaContratacao(ct: ContratacaoDb): ServicoDb {
  return banco().servicos.find((s) => s.id === ct.servicoId)!;
}

function ehCliente(ct: ContratacaoDb, u: UsuarioDb): boolean {
  return ct.clienteId === u.id;
}

function ehPrestador(ct: ContratacaoDb, u: UsuarioDb): boolean {
  return prestadorUsuarioIdDoServico(ct.servicoId) === u.id;
}

function exigirStatus(ct: ContratacaoDb, acao: string, permitidos: StatusContratacao[]): void {
  if (!permitidos.includes(ct.status)) {
    throw regra(
      `não é possível ${acao} uma contratação ${ct.status}: só é permitido a partir de ${permitidos.join(' ou ')}`,
    );
  }
}

function buscarContratacao(id: number): ContratacaoDb {
  expirarVencidas();
  const ct = banco().contratacoes.find((x) => x.id === id);
  if (!ct) {
    throw naoEncontrado('contratação não encontrada');
  }
  return ct;
}

function mudarStatus(ct: ContratacaoDb, novo: StatusContratacao, logado: UsuarioDb): Resposta {
  ct.status = novo;
  ct.atualizadoEm = agoraTexto();
  return ok(contratacaoResposta(ct, logado));
}

// Pedido ou contraproposta sem resposta em 7 dias expira.
function expirarVencidas(): void {
  const limite = somarDias(agoraTexto().slice(0, 10), -PRAZO_RESPOSTA_DIAS);
  for (const ct of banco().contratacoes) {
    if (ct.status === 'PENDENTE' && ct.criadoEm.slice(0, 10) <= limite) {
      ct.status = 'EXPIRADA';
    } else if (
      ct.status === 'CONTRAPROPOSTA' &&
      ct.contrapropostaEm !== null &&
      ct.contrapropostaEm.slice(0, 10) <= limite
    ) {
      ct.status = 'EXPIRADA';
    }
  }
}

// ------------------------------------------------------------------ contratações: resposta

function parte(u: UsuarioDb, mostrarTelefone: boolean, mostrarEndereco: boolean): ParteResumo {
  const endereco: Endereco | null = mostrarEndereco
    ? {
        logradouro: u.logradouro ?? null,
        numero: u.numero ?? null,
        complemento: u.complemento ?? null,
        bairro: u.bairro ?? null,
        cidade: u.cidade ?? null,
        uf: u.uf ?? null,
        cep: u.cep ?? null,
      }
    : null;
  return {
    id: u.id,
    nome: u.nome,
    cidade: u.cidade ?? null,
    uf: u.uf ?? null,
    telefone: mostrarTelefone ? (u.telefone ?? null) : null,
    endereco,
  };
}

function expiraEm(ct: ContratacaoDb): string | null {
  const base =
    ct.status === 'PENDENTE' ? ct.criadoEm : ct.status === 'CONTRAPROPOSTA' ? ct.contrapropostaEm : null;
  if (!base) {
    return null;
  }
  return `${somarDias(base.slice(0, 10), PRAZO_RESPOSTA_DIAS)}${base.slice(10)}`;
}

function contratacaoResposta(ct: ContratacaoDb, logado: UsuarioDb): Contratacao {
  const b = banco();
  const servico = servicoDaContratacao(ct);
  const categoria = b.categorias.find((x) => x.id === servico.categoriaId)!;
  const subcategoria = b.subcategorias.find((x) => x.id === servico.subcategoriaId)!;
  const cliente = b.usuarios.find((u) => u.id === ct.clienteId)!;
  const prestador = b.usuarios.find((u) => u.id === prestadorUsuarioIdDoServico(servico.id))!;
  const aceita = ct.status === 'ACEITA' || ct.status === 'CONCLUIDA';
  const logadoEhCliente = logado.id === cliente.id;
  const logadoEhPrestador = logado.id === prestador.id;
  return {
    id: ct.id,
    status: ct.status,
    dataInicio: ct.dataInicio,
    dataFim: ct.dataFim,
    horaInicio: ct.horaInicio,
    horaFim: ct.horaFim,
    observacao: ct.observacao,
    precoCombinado: ct.precoCombinado,
    motivoContraproposta: ct.motivoContraproposta,
    contrapropostaEm: ct.contrapropostaEm,
    motivoRecusa: ct.motivoRecusa,
    expiraEm: expiraEm(ct),
    servico: {
      id: servico.id,
      titulo: servico.titulo,
      tipoCobranca: servico.tipoCobranca,
      categoria: { id: categoria.id, nome: categoria.nome },
      subcategoria: { id: subcategoria.id, nome: subcategoria.nome },
    },
    cliente: parte(cliente, aceita && logadoEhPrestador, aceita && logadoEhPrestador),
    prestador: parte(prestador, aceita && logadoEhCliente, false),
    criadoEm: ct.criadoEm,
    atualizadoEm: ct.atualizadoEm,
  };
}

// ------------------------------------------------------------------ contratações: ações

function criarContratacao(c: Chamada): Resposta {
  const logado = exigirLogado(c);
  const b = banco();
  const servicoId = numeroOuNulo(c.corpo['servicoId']);
  const servico = b.servicos.find((s) => s.id === servicoId);
  if (!servico) {
    throw naoEncontrado('serviço não encontrado');
  }
  if (servico.status !== 'ATIVO') {
    throw regra(`este serviço não está disponível para contratação (status ${servico.status})`);
  }
  const prestadorUsuario = prestadorUsuarioIdDoServico(servico.id);
  if (prestadorUsuario === logado.id) {
    throw regra('você não pode contratar o seu próprio serviço');
  }
  const perfil = b.prestadores.find((p) => p.id === servico.prestadorId);
  if (!perfil || !perfil.ativo) {
    throw regra('o prestador deste serviço encerrou o perfil profissional');
  }
  const periodo = montarPeriodo(servico, c.corpo);
  exigirDataValida(periodo);
  const dias = diasAtendidos(servico, periodo);
  exigirSemConflito(servico, periodo, 0);

  const agora = agoraTexto();
  const ct: ContratacaoDb = {
    id: proximoId(b.contratacoes),
    status: 'PENDENTE',
    servicoId: servico.id,
    clienteId: logado.id,
    dataInicio: periodo.dataInicio,
    dataFim: periodo.dataFim,
    horaInicio: null,
    horaFim: null,
    observacao: textoOuNulo(c.corpo['observacao']),
    precoCombinado: calcularPreco(servico, periodo, dias),
    motivoContraproposta: null,
    contrapropostaEm: null,
    motivoRecusa: null,
    criadoEm: agora,
    atualizadoEm: agora,
  };
  aplicarPeriodo(ct, periodo);
  b.contratacoes.push(ct);
  return criado(contratacaoResposta(ct, logado));
}

function listarContratacoes(c: Chamada): Resposta {
  const logado = exigirLogado(c);
  expirarVencidas();
  const papel = c.params.get('papel');
  let comoCliente = true;
  let comoPrestador = true;
  if (papel) {
    if (papel === 'cliente') comoPrestador = false;
    else if (papel === 'prestador') comoCliente = false;
    else throw invalido('papel inválido: use cliente ou prestador');
  }
  const lista = banco()
    .contratacoes.filter(
      (ct) => (comoCliente && ehCliente(ct, logado)) || (comoPrestador && ehPrestador(ct, logado)),
    )
    .sort((a, z) => z.id - a.id)
    .map((ct) => contratacaoResposta(ct, logado));
  return ok(lista);
}

function aceitar(c: Chamada, id: number): Resposta {
  const logado = exigirLogado(c);
  const ct = buscarContratacao(id);
  if (!ehPrestador(ct, logado)) {
    throw proibido('só o prestador do serviço pode aceitar');
  }
  exigirStatus(ct, 'aceitar', ['PENDENTE']);
  const periodo = periodoDe(ct);
  exigirDataValida(periodo);
  exigirSemConflito(servicoDaContratacao(ct), periodo, ct.id);
  return mudarStatus(ct, 'ACEITA', logado);
}

function contrapropor(c: Chamada, id: number): Resposta {
  const logado = exigirLogado(c);
  const ct = buscarContratacao(id);
  if (!ehPrestador(ct, logado)) {
    throw proibido('só o prestador do serviço pode fazer contraproposta');
  }
  if (ct.contrapropostaEm !== null) {
    throw regra('o prestador já fez uma contraproposta neste pedido');
  }
  exigirStatus(ct, 'fazer contraproposta em', ['PENDENTE']);
  const motivo = texto(c.corpo['motivo']);
  if (!motivo) {
    throw invalido('dados inválidos', [{ campo: 'motivo', mensagem: 'informe o motivo da contraproposta' }]);
  }
  const servico = servicoDaContratacao(ct);
  const periodo = montarPeriodo(servico, c.corpo);
  exigirDataValida(periodo);
  const dias = diasAtendidos(servico, periodo);
  exigirSemConflito(servico, periodo, ct.id);
  const preco = numeroOuNulo(c.corpo['precoCombinado']);
  aplicarPeriodo(ct, periodo);
  ct.precoCombinado = preco !== null && preco > 0 ? preco : calcularPreco(servico, periodo, dias);
  ct.motivoContraproposta = motivo;
  ct.contrapropostaEm = agoraTexto();
  return mudarStatus(ct, 'CONTRAPROPOSTA', logado);
}

function aceitarContraproposta(c: Chamada, id: number): Resposta {
  const logado = exigirLogado(c);
  const ct = buscarContratacao(id);
  if (!ehCliente(ct, logado)) {
    throw proibido('só o cliente pode aceitar a contraproposta');
  }
  exigirStatus(ct, 'aceitar a contraproposta de', ['CONTRAPROPOSTA']);
  const periodo = periodoDe(ct);
  exigirDataValida(periodo);
  diasAtendidos(servicoDaContratacao(ct), periodo);
  exigirSemConflito(servicoDaContratacao(ct), periodo, ct.id);
  return mudarStatus(ct, 'ACEITA', logado);
}

// Prestador recusa o pedido; cliente recusa a contraproposta.
function recusar(c: Chamada, id: number): Resposta {
  const logado = exigirLogado(c);
  const ct = buscarContratacao(id);
  if (ehPrestador(ct, logado)) {
    exigirStatus(ct, 'recusar (como prestador)', ['PENDENTE']);
  } else if (ehCliente(ct, logado)) {
    exigirStatus(ct, 'recusar (como cliente)', ['CONTRAPROPOSTA']);
  } else {
    throw proibido('só o cliente ou o prestador podem recusar esta contratação');
  }
  ct.motivoRecusa = textoOuNulo(c.corpo['motivo']);
  return mudarStatus(ct, 'RECUSADA', logado);
}

function cancelar(c: Chamada, id: number): Resposta {
  const logado = exigirLogado(c);
  const ct = buscarContratacao(id);
  if (!ehCliente(ct, logado) && !ehPrestador(ct, logado)) {
    throw proibido('só o cliente ou o prestador podem cancelar esta contratação');
  }
  exigirStatus(ct, 'cancelar', ['PENDENTE', 'CONTRAPROPOSTA', 'ACEITA']);
  return mudarStatus(ct, 'CANCELADA', logado);
}

function concluir(c: Chamada, id: number): Resposta {
  const logado = exigirLogado(c);
  const ct = buscarContratacao(id);
  if (!ehPrestador(ct, logado)) {
    throw proibido('só o prestador do serviço pode concluir');
  }
  exigirStatus(ct, 'concluir', ['ACEITA']);
  if (hojeBrasilia() < ct.dataInicio) {
    throw regra(`a contratação só pode ser concluída a partir da data de início (${ct.dataInicio})`);
  }
  return mudarStatus(ct, 'CONCLUIDA', logado);
}

// ------------------------------------------------------------------ dashboard

function dashboard(c: Chamada): Resposta {
  exigirLogado(c);
  expirarVencidas();
  const b = banco();
  const indicadores: IndicadoresDashboard = {
    totalUsuarios: b.usuarios.length,
    totalPrestadores: b.prestadores.filter((p) => p.ativo).length,
    servicosAtivos: b.servicos.filter((s) => s.status === 'ATIVO').length,
    pedidosPendentes: b.contratacoes.filter((ct) => ct.status === 'PENDENTE').length,
    contratacoesConcluidas: b.contratacoes.filter((ct) => ct.status === 'CONCLUIDA').length,
  };
  return ok(indicadores);
}
