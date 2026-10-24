export const db = {
  clientes: [],
  veiculos: [],
  contratos: [],
  financeiro: [],
  espera: []
};

export const utils = {
  formatMoney: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0),
  formatDate: (isoDate) => {
    if (!isoDate) return '--';
    const dataObjeto = new Date(isoDate);
    dataObjeto.setMinutes(dataObjeto.getMinutes() + dataObjeto.getTimezoneOffset());
    return dataObjeto.toLocaleDateString('pt-BR');
  }
};
