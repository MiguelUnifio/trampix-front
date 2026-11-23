// Modo demonstração: não existe servidor. As chamadas "/api/..." são respondidas pelo back falso
// (src/app/core/mock), que guarda os dados no localStorage do navegador.
export const environment = {
  production: true,
  apiUrl: '/api',
};
