const IMAGENS: Record<string, string> = {
  pedreiro:
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80',
  pintor:
    'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=80',
  encanador:
    'https://images.unsplash.com/photo-1607472586893-2e9c4b9c5b2e?auto=format&fit=crop&w=900&q=80',
  eletricista:
    'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=900&q=80',
  marceneiro:
    'https://images.unsplash.com/photo-1601058268499-e52658b8bb88?auto=format&fit=crop&w=900&q=80',
  'marido de aluguel':
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80',
  gesseiro:
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80',
  climatizacao:
    'https://images.unsplash.com/photo-1631545806609-7f7b5a8f6f0a?auto=format&fit=crop&w=900&q=80',
  vidraceiro:
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
};

export const IMAGEM_PADRAO =
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80';

export function imagemDaCategoria(categoria: string): string {
  const nome = categoria
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  for (const [chave, imagem] of Object.entries(IMAGENS)) {
    if (nome.includes(chave)) {
      return imagem;
    }
  }

  return IMAGEM_PADRAO;
}
