import { StatusSubcategoria } from '../models/categoria';
import { StatusContratacao } from '../models/contratacao';
import { DiaSemana } from '../models/disponibilidade';
import { StatusServico, TipoCobranca } from '../models/servico';
import { Usuario } from '../models/usuario';

// "Banco de dados" do modo demonstração. Tudo fica no localStorage do navegador, então o que o
// usuário cadastra continua lá ao recarregar a página. Não existe nenhum servidor por trás.

const CHAVE_BANCO = 'trampix.demo.banco';
const CHAVE_SESSAO = 'trampix.sessao';
const VERSAO = 1;

export interface UsuarioDb extends Usuario {
  senha: string;
}

export interface PrestadorDb {
  id: number;
  usuarioId: number;
  biografia: string | null;
  raioAtendimentoKm: number | null;
  agendaCheia: boolean;
  verificado: boolean;
  ativo: boolean;
  criadoEm: string;
}

export interface CategoriaDb {
  id: number;
  nome: string;
  descricao: string | null;
  ativa: boolean;
}

export interface SubcategoriaDb {
  id: number;
  categoriaId: number;
  nome: string;
  descricao: string | null;
  padrao: boolean;
  status: StatusSubcategoria;
}

export interface ServicoDb {
  id: number;
  prestadorId: number;
  categoriaId: number;
  subcategoriaId: number;
  titulo: string;
  descricao: string;
  preco: number;
  tipoCobranca: TipoCobranca;
  status: StatusServico;
  criadoEm: string;
  atualizadoEm: string;
}

export interface DisponibilidadeDb {
  id: number;
  usuarioId: number;
  diaSemana: DiaSemana;
  horaInicio: string; // HH:mm:ss
  horaFim: string; // HH:mm:ss
}

export interface ContratacaoDb {
  id: number;
  status: StatusContratacao;
  servicoId: number;
  clienteId: number;
  dataInicio: string; // yyyy-MM-dd
  dataFim: string;
  horaInicio: string | null; // HH:mm:ss
  horaFim: string | null;
  observacao: string | null;
  precoCombinado: number;
  motivoContraproposta: string | null;
  contrapropostaEm: string | null;
  motivoRecusa: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Banco {
  versao: number;
  usuarios: UsuarioDb[];
  prestadores: PrestadorDb[];
  categorias: CategoriaDb[];
  subcategorias: SubcategoriaDb[];
  servicos: ServicoDb[];
  disponibilidades: DisponibilidadeDb[];
  contratacoes: ContratacaoDb[];
}

// ------------------------------------------------------------------ datas (sem fuso: texto puro)

function dois(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function agoraTexto(): string {
  const d = new Date();
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}:${dois(d.getSeconds())}`;
}

// Soma dias a uma data "yyyy-MM-dd" sem passar pelo fuso do navegador.
export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split('-').map(Number);
  const nova = new Date(Date.UTC(a, m - 1, d + dias));
  return `${nova.getUTCFullYear()}-${dois(nova.getUTCMonth() + 1)}-${dois(nova.getUTCDate())}`;
}

function hojeTexto(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

// ------------------------------------------------------------------ dados iniciais

const CATEGORIAS: { nome: string; subs: [string, string][] }[] = [
  {
    nome: 'Pedreiro',
    subs: [
      ['Fundação', 'Sapata, bloco, alicerce, viga e pilar.'],
      ['Alvenaria', 'Levantamento de paredes, muros e divisórias.'],
      ['Revestimento', 'Assentamento de cerâmica, porcelanato e azulejo.'],
      ['Telhado', 'Construção, reforma de coberturas e calhas.'],
      ['Demolição', 'Quebra de paredes, remoção de entulho e abertura de vãos.'],
      ['Reparos', 'Pequenos remendos, reboco, contrapiso e infiltrações.'],
    ],
  },
  {
    nome: 'Pintor',
    subs: [
      ['Paredes', 'Pintura lisa interna, externa e tetos.'],
      ['Massa', 'Aplicação de massa corrida, acrílica e lixamento.'],
      ['Textura', 'Grafiato, cimento queimado, marmorato e texturas projetadas.'],
      ['Madeira', 'Verniz, seladora e laqueação em portas ou decks.'],
      ['Ferro', 'Pintura anticorrosiva em portões, grades e esquadrias.'],
    ],
  },
  {
    nome: 'Encanador',
    subs: [
      ['Instalação', 'Tubulações de água fria, água quente e esgoto (obras).'],
      ['Vazamento', 'Troca de torneira, registro, sifão e reparo de descarga.'],
      ['Caça-vazamento', 'Localização eletrônica de vazamento oculto (geofone).'],
      ['Desentupimento', 'Desentupir pia, ralo, vaso, esgoto e caixa de gordura.'],
      ['Gás', 'Instalação de aquecedor e teste de estanqueidade de gás.'],
    ],
  },
  {
    nome: 'Eletricista',
    subs: [
      ['Fiação', 'Troca de cabos, enfiação geral e balanceamento de carga.'],
      ['Quadro', 'Montagem de disjuntores, DR, DPS e caixa de luz.'],
      ['Iluminação', 'Instalação de fitas LED, spots, lustres e luminárias.'],
      ['Tomadas', 'Troca e instalação de tomadas, interruptores e chuveiros.'],
      ['Manutenção', 'Conserto de curtos-circuitos e tomadas queimadas.'],
    ],
  },
  {
    nome: 'Marceneiro e Carpinteiro',
    subs: [
      ['Móveis', 'Reparo e ajuste de portas de armários e gavetas.'],
      ['Instalação', 'Montagem de painéis, prateleiras e nichos personalizados.'],
      ['Estruturas', 'Telhados de madeira, decks, pergolados e escadas.'],
      ['Esquadrias', 'Instalação de portas de madeira, batentes e fechaduras.'],
    ],
  },
  {
    nome: 'Marido de Aluguel',
    subs: [
      ['Suportes', 'Instalação de suporte de TV, quadros, cortinas e varais.'],
      ['Ajustes', 'Troca de puxadores, dobradiças e trincos de portas.'],
      ['Montagem', 'Montagem de móveis comprados na internet (guarda-roupas, mesas).'],
      ['Instalações rápidas', 'Troca de lâmpadas, instalação de filtro de água e acessórios de banheiro.'],
    ],
  },
  {
    nome: 'Gesseiro e Drywall',
    subs: [
      ['Forro', 'Instalação de teto de gesso acartonado ou placas.'],
      ['Drywall', 'Paredes divisórias e nichos em gesso acartonado.'],
      ['Decoração', 'Sancas, molduras, cortineiros e iluminação embutida.'],
    ],
  },
  {
    nome: 'Climatização',
    subs: [
      ['Instalação', 'Fixação, furação e conexão do sistema split.'],
      ['Limpeza', 'Higienização química de filtros, evaporadora e condensadora.'],
      ['Carga de gás', 'Identificação de vazamento de fluido e recarga.'],
    ],
  },
  {
    nome: 'Vidraceiro e Serralheiro',
    subs: [
      ['Vidros', 'Box de banheiro, janelas de vidro temperado e espelhos.'],
      ['Estruturas metálicas', 'Solda, fabricação e reparo de portões, grades e corrimão.'],
    ],
  },
];

interface PessoaSeed {
  nome: string;
  email: string;
  senha: string;
  perfil: 'USUARIO' | 'ADMIN';
  cidade: string;
  uf: string;
  bairro: string;
  rua: string;
}

const SENHA_PADRAO = 'Trampix123!';

const PESSOAS: PessoaSeed[] = [
  { nome: 'Administrador Trampix', email: 'admin@trampix.local', senha: 'AdminTrampix123!', perfil: 'ADMIN', cidade: 'Ourinhos', uf: 'SP', bairro: 'Centro', rua: 'Rua Principal' },
  { nome: 'Usuário Demonstração', email: 'usuario@trampix.local', senha: 'UsuarioTrampix123!', perfil: 'USUARIO', cidade: 'Ourinhos', uf: 'SP', bairro: 'Jardim Matilde', rua: 'Rua das Flores' },
  // 3 a 11: prestadores
  { nome: 'Carlos Mendes', email: 'carlos@trampix.com', senha: SENHA_PADRAO, perfil: 'USUARIO', cidade: 'Ourinhos', uf: 'SP', bairro: 'Vila Sá', rua: 'Rua Goiás' },
  { nome: 'Roberto Almeida', email: 'roberto@trampix.com', senha: SENHA_PADRAO, perfil: 'USUARIO', cidade: 'Ourinhos', uf: 'SP', bairro: 'Centro', rua: 'Rua Paraná' },
  { nome: 'André Oliveira', email: 'andre@trampix.com', senha: SENHA_PADRAO, perfil: 'USUARIO', cidade: 'Ourinhos', uf: 'SP', bairro: 'Vila Odilon', rua: 'Rua Minas Gerais' },
  { nome: 'Fernando Costa', email: 'fernando@trampix.com', senha: SENHA_PADRAO, perfil: 'USUARIO', cidade: 'Jacarezinho', uf: 'PR', bairro: 'Centro', rua: 'Rua XV de Novembro' },
  { nome: 'Marcos Ferreira', email: 'marcos@trampix.com', senha: SENHA_PADRAO, perfil: 'USUARIO', cidade: 'Ourinhos', uf: 'SP', bairro: 'Jardim Paulista', rua: 'Rua Bahia' },
  { nome: 'Lucas Santos', email: 'lucas@trampix.com', senha: SENHA_PADRAO, perfil: 'USUARIO', cidade: 'Salto Grande', uf: 'SP', bairro: 'Centro', rua: 'Rua Sete de Setembro' },
  { nome: 'Paulo Ribeiro', email: 'paulo@trampix.com', senha: SENHA_PADRAO, perfil: 'USUARIO', cidade: 'Ourinhos', uf: 'SP', bairro: 'Vila Margarida', rua: 'Rua Santa Catarina' },
  { nome: 'Ricardo Lima', email: 'ricardo@trampix.com', senha: SENHA_PADRAO, perfil: 'USUARIO', cidade: 'Ourinhos', uf: 'SP', bairro: 'Centro', rua: 'Rua Rio Branco' },
  { nome: 'Marina Souza', email: 'marina@trampix.com', senha: SENHA_PADRAO, perfil: 'USUARIO', cidade: 'Ourinhos', uf: 'SP', bairro: 'Jardim Anhanguera', rua: 'Rua Pernambuco' },
  // 12 e 13: só clientes
  { nome: 'Ana Paula Ramos', email: 'ana@trampix.com', senha: SENHA_PADRAO, perfil: 'USUARIO', cidade: 'Ourinhos', uf: 'SP', bairro: 'Vila Recreio', rua: 'Rua Ceará' },
  { nome: 'João Pedro Silva', email: 'joao@trampix.com', senha: SENHA_PADRAO, perfil: 'USUARIO', cidade: 'Ourinhos', uf: 'SP', bairro: 'Vila Brasil', rua: 'Rua Amazonas' },
];

interface ServicoSeed {
  prestadorUsuarioId: number;
  cat: string;
  sub: string;
  titulo: string;
  descricao: string;
  preco: number;
  tipo: TipoCobranca;
}

const SERVICOS: ServicoSeed[] = [
  { prestadorUsuarioId: 3, cat: 'Pedreiro', sub: 'Fundação', titulo: 'Construção de fundações', descricao: 'Execução de fundações, sapatas, vigas e pilares com acompanhamento de obra.', preco: 1800, tipo: 'POR_TRABALHO' },
  { prestadorUsuarioId: 3, cat: 'Pedreiro', sub: 'Alvenaria', titulo: 'Serviços de alvenaria', descricao: 'Construção de paredes, muros e divisórias com acabamento limpo.', preco: 85, tipo: 'POR_M2' },
  { prestadorUsuarioId: 4, cat: 'Pintor', sub: 'Paredes', titulo: 'Pintura de paredes', descricao: 'Pintura interna e externa com acabamento profissional.', preco: 25, tipo: 'POR_M2' },
  { prestadorUsuarioId: 4, cat: 'Pintor', sub: 'Massa', titulo: 'Aplicação de massa corrida', descricao: 'Preparação e nivelamento de paredes antes da pintura.', preco: 18, tipo: 'POR_M2' },
  { prestadorUsuarioId: 5, cat: 'Encanador', sub: 'Instalação', titulo: 'Instalação hidráulica', descricao: 'Instalação e manutenção de tubulações de água e esgoto.', preco: 90, tipo: 'POR_HORA' },
  { prestadorUsuarioId: 5, cat: 'Encanador', sub: 'Vazamento', titulo: 'Reparo de vazamentos', descricao: 'Reparo de torneiras, registros, sifões e descargas.', preco: 120, tipo: 'POR_TRABALHO' },
  { prestadorUsuarioId: 6, cat: 'Eletricista', sub: 'Fiação', titulo: 'Instalação elétrica', descricao: 'Instalação e manutenção de fiação elétrica residencial.', preco: 100, tipo: 'POR_HORA' },
  { prestadorUsuarioId: 6, cat: 'Eletricista', sub: 'Quadro', titulo: 'Montagem de quadro elétrico', descricao: 'Instalação de disjuntores e organização de quadros de distribuição.', preco: 450, tipo: 'POR_TRABALHO' },
  { prestadorUsuarioId: 7, cat: 'Marceneiro e Carpinteiro', sub: 'Móveis', titulo: 'Reparo de móveis', descricao: 'Manutenção de armários, portas e gavetas.', preco: 80, tipo: 'POR_HORA' },
  { prestadorUsuarioId: 7, cat: 'Marceneiro e Carpinteiro', sub: 'Instalação', titulo: 'Montagem de painéis e prateleiras', descricao: 'Montagem e instalação de painéis, prateleiras e nichos sob medida.', preco: 180, tipo: 'POR_TRABALHO' },
  { prestadorUsuarioId: 8, cat: 'Marido de Aluguel', sub: 'Suportes', titulo: 'Instalação de suporte de TV', descricao: 'Instalação de suportes de TV, quadros, cortinas e varais.', preco: 100, tipo: 'POR_TRABALHO' },
  { prestadorUsuarioId: 8, cat: 'Marido de Aluguel', sub: 'Ajustes', titulo: 'Pequenos ajustes residenciais', descricao: 'Troca de puxadores, dobradiças e trincos.', preco: 70, tipo: 'POR_TRABALHO' },
  { prestadorUsuarioId: 9, cat: 'Gesseiro e Drywall', sub: 'Forro', titulo: 'Instalação de forro de gesso', descricao: 'Instalação de forros de gesso e acabamento.', preco: 95, tipo: 'POR_M2' },
  { prestadorUsuarioId: 9, cat: 'Gesseiro e Drywall', sub: 'Drywall', titulo: 'Instalação de drywall', descricao: 'Construção de paredes e divisórias em drywall.', preco: 110, tipo: 'POR_M2' },
  { prestadorUsuarioId: 10, cat: 'Climatização', sub: 'Instalação', titulo: 'Instalação de ar-condicionado split', descricao: 'Fixação, furação e conexão do sistema split.', preco: 350, tipo: 'POR_TRABALHO' },
  { prestadorUsuarioId: 10, cat: 'Climatização', sub: 'Limpeza', titulo: 'Limpeza de ar-condicionado', descricao: 'Higienização química de filtros, evaporadora e condensadora.', preco: 150, tipo: 'POR_TRABALHO' },
  { prestadorUsuarioId: 11, cat: 'Vidraceiro e Serralheiro', sub: 'Vidros', titulo: 'Box de banheiro em vidro temperado', descricao: 'Medição, fabricação e instalação de box de banheiro.', preco: 480, tipo: 'POR_TRABALHO' },
  { prestadorUsuarioId: 11, cat: 'Vidraceiro e Serralheiro', sub: 'Estruturas metálicas', titulo: 'Serralheria: portões e grades', descricao: 'Solda, fabricação e reparo de portões, grades e corrimãos. Diária de trabalho.', preco: 400, tipo: 'POR_DIA' },
];

const BIOGRAFIAS: Record<number, string> = {
  3: 'Pedreiro profissional, especializado em fundações e alvenaria.',
  4: 'Pintor residencial e comercial.',
  5: 'Encanador com experiência em instalações hidráulicas.',
  6: 'Eletricista especializado em instalações residenciais.',
  7: 'Marceneiro especializado em móveis e montagem.',
  8: 'Profissional de pequenos reparos e instalações.',
  9: 'Gesseiro especializado em forros e drywall.',
  10: 'Técnico especializado em climatização.',
  11: 'Vidraceira e serralheira, com box e estruturas metálicas sob medida.',
};

export function criarBancoInicial(): Banco {
  const agora = agoraTexto();
  const hoje = hojeTexto();

  const usuarios: UsuarioDb[] = PESSOAS.map((p, i) => ({
    id: i + 1,
    nome: p.nome,
    email: p.email,
    senha: p.senha,
    documento: String(11144477700 + i * 3).padStart(11, '0'),
    tipoDocumento: 'CPF',
    dataNascimento: '1990-05-1' + (i % 9),
    telefone: '1499' + String(990000 + i * 111).padStart(7, '0'),
    perfil: p.perfil,
    status: 'ATIVO',
    cep: '19900000',
    logradouro: p.rua,
    numero: String(100 + i * 7),
    complemento: null,
    bairro: p.bairro,
    cidade: p.cidade,
    uf: p.uf,
    criadoEm: agora,
    atualizadoEm: agora,
  }));

  const categorias: CategoriaDb[] = [];
  const subcategorias: SubcategoriaDb[] = [];
  for (const c of CATEGORIAS) {
    const categoriaId = categorias.length + 1;
    categorias.push({ id: categoriaId, nome: c.nome, descricao: null, ativa: true });
    for (const [nome, descricao] of c.subs) {
      subcategorias.push({
        id: subcategorias.length + 1,
        categoriaId,
        nome,
        descricao,
        padrao: true,
        status: 'ATIVA',
      });
    }
  }

  // Usuários 3 a 11 são prestadores (perfil id = usuarioId - 2).
  const prestadores: PrestadorDb[] = [];
  for (let usuarioId = 3; usuarioId <= 11; usuarioId++) {
    prestadores.push({
      id: prestadores.length + 1,
      usuarioId,
      biografia: BIOGRAFIAS[usuarioId] ?? null,
      raioAtendimentoKm: 30,
      agendaCheia: false,
      verificado: usuarioId % 2 === 1,
      ativo: true,
      criadoEm: agora,
    });
  }

  const servicos: ServicoDb[] = SERVICOS.map((s, i) => {
    const categoria = categorias.find((c) => c.nome === s.cat)!;
    const subcategoria = subcategorias.find(
      (x) => x.categoriaId === categoria.id && x.nome === s.sub,
    )!;
    const prestador = prestadores.find((p) => p.usuarioId === s.prestadorUsuarioId)!;
    return {
      id: i + 1,
      prestadorId: prestador.id,
      categoriaId: categoria.id,
      subcategoriaId: subcategoria.id,
      titulo: s.titulo,
      descricao: s.descricao,
      preco: s.preco,
      tipoCobranca: s.tipo,
      status: 'ATIVO',
      criadoEm: agora,
      atualizadoEm: agora,
    };
  });

  // Segunda a sexta, 08h às 18h; sábado, 08h às 12h.
  const disponibilidades: DisponibilidadeDb[] = [];
  const semana: { dia: DiaSemana; fim: string }[] = [
    { dia: 'SEGUNDA', fim: '18:00:00' },
    { dia: 'TERCA', fim: '18:00:00' },
    { dia: 'QUARTA', fim: '18:00:00' },
    { dia: 'QUINTA', fim: '18:00:00' },
    { dia: 'SEXTA', fim: '18:00:00' },
    { dia: 'SABADO', fim: '12:00:00' },
  ];
  for (const p of prestadores) {
    for (const s of semana) {
      disponibilidades.push({
        id: disponibilidades.length + 1,
        usuarioId: p.usuarioId,
        diaSemana: s.dia,
        horaInicio: '08:00:00',
        horaFim: s.fim,
      });
    }
  }

  const contratacoes: ContratacaoDb[] = [];
  const novaContratacao = (
    servicoId: number,
    clienteId: number,
    status: StatusContratacao,
    inicioEmDias: number,
    fimEmDias: number,
    extra: Partial<ContratacaoDb> = {},
  ): void => {
    const servico = servicos.find((s) => s.id === servicoId)!;
    contratacoes.push({
      id: contratacoes.length + 1,
      status,
      servicoId,
      clienteId,
      dataInicio: somarDias(hoje, inicioEmDias),
      dataFim: somarDias(hoje, fimEmDias),
      horaInicio: null,
      horaFim: null,
      observacao: null,
      precoCombinado: servico.preco,
      motivoContraproposta: null,
      contrapropostaEm: null,
      motivoRecusa: null,
      criadoEm: agora,
      atualizadoEm: agora,
      ...extra,
    });
  };

  // Serviços (ids): 1 Fundações, 2 Alvenaria, 3 Pintura, 5 Hidráulica (por hora), 6 Vazamentos,
  // 7 Elétrica (por hora), 8 Quadro, 12 Ajustes, 17 Box.
  novaContratacao(1, 2, 'PENDENTE', 5, 7, { observacao: 'Terreno plano, 8 x 12 metros.' });
  novaContratacao(5, 2, 'ACEITA', 3, 3, { horaInicio: '09:00:00', horaFim: '12:00:00', precoCombinado: 270 });
  novaContratacao(3, 2, 'CONTRAPROPOSTA', 8, 10, {
    precoCombinado: 480,
    motivoContraproposta: 'A área é maior que a informada; o valor considera 2 demãos de tinta.',
    contrapropostaEm: agora,
  });
  novaContratacao(8, 2, 'CONCLUIDA', -10, -10);
  novaContratacao(12, 2, 'RECUSADA', 4, 4, { motivoRecusa: 'Agenda fechada nesta semana.' });
  novaContratacao(17, 2, 'CONCLUIDA', -30, -30);
  novaContratacao(2, 12, 'PENDENTE', 6, 6, { observacao: 'Muro de 20 m².' });
  novaContratacao(1, 13, 'CONCLUIDA', -20, -18);
  novaContratacao(6, 12, 'CANCELADA', 2, 2);
  novaContratacao(7, 13, 'ACEITA', 6, 6, { horaInicio: '14:00:00', horaFim: '16:00:00', precoCombinado: 200 });

  return {
    versao: VERSAO,
    usuarios,
    prestadores,
    categorias,
    subcategorias,
    servicos,
    disponibilidades,
    contratacoes,
  };
}

// ------------------------------------------------------------------ acesso e persistência

let cache: Banco | null = null;

export function banco(): Banco {
  if (cache) {
    return cache;
  }
  try {
    const texto = localStorage.getItem(CHAVE_BANCO);
    if (texto) {
      const lido = JSON.parse(texto) as Banco;
      if (lido.versao === VERSAO) {
        cache = lido;
        return cache;
      }
    }
  } catch {
    // localStorage indisponível ou corrompido: recomeça com os dados iniciais.
  }
  cache = criarBancoInicial();
  salvarBanco();
  return cache;
}

export function salvarBanco(): void {
  if (!cache) {
    return;
  }
  try {
    localStorage.setItem(CHAVE_BANCO, JSON.stringify(cache));
  } catch {
    // Sem localStorage os dados valem só até recarregar a página.
  }
}

export function proximoId(lista: { id: number }[]): number {
  return lista.reduce((maior, item) => Math.max(maior, item.id), 0) + 1;
}

// Apaga tudo o que foi cadastrado e volta aos dados iniciais.
export function restaurarDadosDemo(): void {
  cache = null;
  try {
    localStorage.removeItem(CHAVE_BANCO);
    localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // nada a limpar
  }
  if (typeof window !== 'undefined') {
    window.location.assign('/login');
  }
}
