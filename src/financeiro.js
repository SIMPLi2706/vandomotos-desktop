import { db, utils } from './db.js';
import { showAlert, showConfirm } from './modal.js';
import { showLoading, hideLoading } from './loading.js';
import { getUser } from './session.js';
import { exportCSV } from './csvUtils.js';

export function renderFinanceiro(container, exportCSV) {
    container.innerHTML = `
        <div class="flex flex-col min-h-full fade-enter">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 shrink-0">
                <div class="bg-white p-5 border border-gray-200 shadow-soft relative overflow-hidden group">
                    <div class="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full group-hover:scale-150 transition-transform"></div>
                    <p class="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 relative z-10"><i class="ph ph-wallet"></i> Saldo em Caixa</p>
                    <h3 class="text-2xl md:text-3xl font-black text-gray-900 relative z-10" id="dash-saldo">R$ 0,00</h3>
                </div>
                <div class="bg-emerald-50 border border-emerald-200 p-5 shadow-soft relative overflow-hidden group">
                    <div class="absolute -right-4 -top-4 w-16 h-16 bg-emerald-100 rounded-full group-hover:scale-150 transition-transform"></div>
                    <p class="text-[10px] md:text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1 relative z-10"><i class="ph ph-trend-up"></i> Entradas (Receitas)</p>
                    <h3 class="text-2xl md:text-3xl font-black text-emerald-600 relative z-10" id="dash-entradas">R$ 0,00</h3>
                </div>
                <div class="bg-red-50 border border-red-200 p-5 shadow-soft relative overflow-hidden group">
                    <div class="absolute -right-4 -top-4 w-16 h-16 bg-red-100 rounded-full group-hover:scale-150 transition-transform"></div>
                    <p class="text-[10px] md:text-xs font-bold text-red-700 uppercase tracking-widest mb-1 relative z-10"><i class="ph ph-trend-down"></i> Saídas (Despesas)</p>
                    <h3 class="text-2xl md:text-3xl font-black text-red-600 relative z-10" id="dash-saidas">R$ 0,00</h3>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 lg:overflow-hidden pb-4 lg:pb-0">
                <div class="bg-white border border-gray-200 shadow-soft flex flex-col overflow-hidden h-[450px] lg:h-auto">
                    <div class="bg-gray-50 border-b border-gray-200 px-4 py-4 flex justify-between items-center shrink-0">
                        <h3 class="font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wider text-xs"><i class="ph-fill ph-bell-ringing text-brand-hover text-base"></i> Painel de Cobranças</h3>
                        <span class="text-[10px] bg-gray-900 text-white px-2 py-1 font-bold tracking-widest uppercase" id="qtd-cobrancas">0 ATIVAS</span>
                    </div>
                    <div class="p-3 md:p-5 flex-1 overflow-y-auto space-y-3 bg-white custom-scroll" id="lista-receber"></div>
                </div>

                <div class="bg-white border border-gray-200 shadow-soft flex flex-col overflow-hidden h-[450px] lg:h-auto">
                    <div class="bg-gray-50 border-b border-gray-200 px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                        <h3 class="font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wider text-xs"><i class="ph-fill ph-list-numbers text-gray-400 text-base"></i> Livro Caixa</h3>
                        <div class="flex gap-2 w-full sm:w-auto">
                            <button id="btn-exportar-excel" class="flex-1 sm:flex-none justify-center text-[10px] bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white px-3 py-2 sm:py-1.5 font-bold transition-colors uppercase tracking-widest flex items-center gap-1 border border-emerald-200 shadow-sm rounded-sm">
                                <i class="ph-bold ph-microsoft-excel text-sm"></i> Exportar
                            </button>
                            <button id="btn-export-csv-financeiro" class="flex-1 sm:flex-none justify-center text-[10px] bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 sm:py-1.5 font-bold transition-colors uppercase tracking-widest flex items-center gap-1 border border-gray-300 rounded-sm">
                                <i class="ph-bold ph-file-csv text-sm"></i> CSV
                            </button>
                            <button id="btn-novo-lancamento" class="flex-1 sm:flex-none justify-center text-[10px] bg-gray-200 hover:bg-brand-main hover:text-brand-dark text-gray-700 px-3 py-2 sm:py-1.5 font-bold transition-colors uppercase tracking-widest flex items-center gap-1 border border-gray-300 rounded-sm">
                                <i class="ph-bold ph-plus text-sm"></i> Manual
                            </button>
                        </div>
                    </div>
                    <div class="flex-1 overflow-y-auto custom-scroll p-0">
                        <table class="w-full text-left whitespace-nowrap text-sm">
                            <tbody id="tb-historico" class="divide-y divide-gray-100"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <div id="modal-baixa" class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4 transition-opacity opacity-0">
            <div class="bg-white border border-gray-900 w-full max-w-md shadow-2xl overflow-hidden transform scale-95 transition-transform" id="modal-baixa-panel">
                <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h2 class="text-sm font-black text-gray-900 uppercase tracking-wider">Liquidação de Semanalidade</h2>
                    <button id="btn-fechar-baixa" class="text-gray-400 hover:text-red-600 transition"><i class="ph ph-x text-xl"></i></button>
                </div>
                <form id="form-baixa" class="p-6">
                    <input type="hidden" id="bx-id-contrato">
                    <input type="hidden" id="bx-valor-base">
                    <div class="mb-4">
                        <p class="text-xs text-gray-500 uppercase tracking-widest font-bold">Cliente</p>
                        <p class="text-lg font-black text-gray-900" id="bx-nome-cliente">---</p>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Semanalidade Base (R$)</label>
                            <input type="text" id="bx-display-base" disabled class="w-full px-3 py-2 border border-gray-200 bg-gray-100 text-sm font-mono font-bold text-gray-500 cursor-not-allowed">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1 flex justify-between">
                                <span>Multas / Acréscimos (R$)</span>
                                <span class="text-[10px] text-gray-400 font-normal">Atraso, Lavagem, Óleo</span>
                            </label>
                            <input type="number" id="bx-valor-extra" value="0" min="0" class="w-full px-3 py-2 border border-brand-main/50 text-sm focus:border-brand-main outline-none font-mono text-red-600 font-bold bg-red-50/30">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Motivo do Acréscimo (Se houver)</label>
                            <input type="text" id="bx-motivo-extra" placeholder="Ex: Multa de atraso (1h) + Lavagem Simples" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Dias para renovar</label>
                            <input type="number" id="bx-dias-renovacao" value="7" min="1" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                        </div>
                    </div>
                    <div class="mt-6 p-4 bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                        <span class="text-xs font-black text-emerald-800 uppercase tracking-widest">Total a Receber</span>
                        <span class="text-2xl font-black text-emerald-600 font-mono" id="bx-display-total">R$ 0,00</span>
                    </div>
                    <div class="mt-6">
                        <button type="submit" class="w-full px-4 py-3 bg-brand-dark text-brand-main font-black hover:bg-black shadow-hard border border-gray-900 transition flex items-center justify-center gap-2 uppercase tracking-wider text-xs">
                            <i class="ph-fill ph-check-circle text-lg"></i> Receber e Renovar
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <div id="modal-lancamento" class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4 transition-opacity opacity-0">
            <div class="bg-white border border-gray-900 w-full max-w-md shadow-2xl overflow-hidden transform scale-95 transition-transform" id="modal-lancamento-panel">
                <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h2 class="text-sm font-black text-gray-900 uppercase tracking-wider">Registo de Movimento</h2>
                    <button id="btn-fechar-lancamento" class="text-gray-400 hover:text-red-600 transition"><i class="ph ph-x text-xl"></i></button>
                </div>
                <form id="form-lancamento" class="p-6 space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Tipo de Movimento *</label>
                        <select id="lan-tipo" class="w-full px-3 py-2 border border-gray-300 text-sm bg-white focus:border-brand-main outline-none font-bold">
                            <option value="saida">Saída (Despesa / Manutenção / Custos)</option>
                            <option value="entrada">Entrada (Receita Avulsa / Venda)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Categoria *</label>
                        <select id="lan-categoria" class="w-full px-3 py-2 border border-gray-300 text-sm bg-white focus:border-brand-main outline-none">
                            <option value="Manutenção de Frota">Manutenção de Frota (Oficina)</option>
                            <option value="Impostos e Taxas">Impostos, Taxas e Despachante</option>
                            <option value="Infraestrutura">Infraestrutura da Loja</option>
                            <option value="Serviços Terceirizados">Serviços Terceirizados (Lavagem, etc)</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Descrição do Movimento *</label>
                        <input type="text" id="lan-descricao" required placeholder="Ex: Troca de óleo da Titan Placa ABC" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Data *</label>
                            <input type="date" id="lan-data" required class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none bg-white">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Valor (R$) *</label>
                            <input type="number" step="0.01" id="lan-valor" required placeholder="Ex: 150.00" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-mono font-bold">
                        </div>
                    </div>
                    <div class="pt-4 mt-2 border-t border-gray-100 flex gap-3">
                        <button type="submit" class="flex-1 px-4 py-3 bg-brand-dark text-brand-main font-black hover:bg-black shadow-hard border border-gray-900 transition flex items-center justify-center gap-2 uppercase tracking-wider text-xs">
                            <i class="ph-fill ph-floppy-disk text-lg"></i> Gravar Registo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const listaReceber = document.getElementById('lista-receber');
    const tbHistorico = document.getElementById('tb-historico');
    const qtdCobrancas = document.getElementById('qtd-cobrancas');
    const dashSaldo = document.getElementById('dash-saldo');
    const dashEntradas = document.getElementById('dash-entradas');
    const dashSaidas = document.getElementById('dash-saidas');
    const modalBaixa = document.getElementById('modal-baixa');
    const modalBaixaPanel = document.getElementById('modal-baixa-panel');
    const formBaixa = document.getElementById('form-baixa');
    const modalLan = document.getElementById('modal-lancamento');
    const modalLanPanel = document.getElementById('modal-lancamento-panel');
    const formLan = document.getElementById('form-lancamento');
    const bxValorExtra = document.getElementById('bx-valor-extra');
    const bxDisplayTotal = document.getElementById('bx-display-total');

    function atualizarTela() {
        listaReceber.innerHTML = '';
        tbHistorico.innerHTML = '';

        // O(1) Maps optimization
        const clientesMap = {};
        db.clientes.forEach(cli => {
            clientesMap[cli.id] = cli;
        });

        const veiculosMap = {};
        db.veiculos.forEach(vei => {
            veiculosMap[vei.id] = vei;
        });

        const contratosAtivos = db.contratos.filter(c => c.status === 'ativo');
        contratosAtivos.sort((a, b) => new Date(a.vencimento || a.data_fim) - new Date(b.vencimento || b.data_fim));
        qtdCobrancas.innerText = `${contratosAtivos.length} ATIVAS`;

        if (contratosAtivos.length === 0) {
            listaReceber.innerHTML = `
                <div class="text-center py-10">
                    <i class="ph ph-check-circle text-5xl text-gray-200 mb-2"></i>
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nenhuma cobrança ativa no momento.</p>
                </div>
            `;
        } else {
            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            const htmlReceber = [];
            contratosAtivos.forEach(c => {
                const cli = clientesMap[c.cliente_id] || { nome: 'Desconhecido' };
                const vei = veiculosMap[c.veiculo_id] || { placa: '---' };
                const dataCobrar = c.vencimento ? c.vencimento : c.data_fim;
                const dataVenc = new Date(dataCobrar);
                dataVenc.setMinutes(dataVenc.getMinutes() + dataVenc.getTimezoneOffset());
                dataVenc.setHours(0,0,0,0);
                let statusCor = 'border-gray-200 bg-white';
                let iconeStatus = '<i class="ph-fill ph-clock text-gray-400 text-xl"></i>';
                let tagStatus = `<span class="text-[10px] text-gray-500 font-bold">Vence: ${utils.formatDate(dataCobrar)}</span>`;
                if (dataVenc < hoje) {
                    statusCor = 'border-red-500 bg-red-50/50';
                    iconeStatus = '<i class="ph-fill ph-warning-circle text-red-500 text-xl"></i>';
                    tagStatus = `<span class="text-[9px] bg-red-600 text-white px-1.5 py-0.5 font-bold uppercase tracking-wider shadow-sm rounded-sm">Atrasado (${utils.formatDate(dataCobrar)})</span>`;
                } else if (dataVenc.getTime() === hoje.getTime()) {
                    statusCor = 'border-brand-main bg-brand-light';
                    iconeStatus = '<i class="ph-fill ph-warning text-brand-hover text-xl"></i>';
                    tagStatus = `<span class="text-[9px] bg-brand-hover text-black px-1.5 py-0.5 font-bold uppercase tracking-wider shadow-sm rounded-sm">Vence Hoje</span>`;
                }
                const isFidelidade = (c.tipo_plano === 'fidelidade');
                const isAquisicao = (c.tipo_plano === 'aquisicao');
                const valorCobrar = isFidelidade
                    ? (Number(c.valor_semanal) || (Number(c.valor) > 1000 ? Number(c.valor) / 12 : Number(c.valor)) || 350)
                    : (isAquisicao ? (Number(c.valor_semanal) || Number(c.valor_parcela) || 375) : c.valor);
                const subTextoPlano = isFidelidade
                    ? `<div class="text-[10px] text-blue-700 font-bold">Semana ${c.semanas_pagas || 1} de 12 (Abatimento)</div>`
                    : (isAquisicao ? `<div class="text-[10px] text-purple-700 font-bold">Semana ${c.semanas_pagas || 1} de 104 (Aquisição)</div>` : '');
                const labelBtnBaixa = isFidelidade ? 'Abater' : (isAquisicao ? 'Pagar Parcela' : 'Liquidar');

                htmlReceber.push(`
                    <div class="border ${statusCor} p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all hover:shadow-soft group">
                        <div class="flex items-start gap-3 w-full sm:w-auto">
                            <div class="mt-0.5 shrink-0">${iconeStatus}</div>
                            <div class="flex-1">
                                <div class="font-bold text-gray-900 text-sm uppercase tracking-tight flex flex-wrap items-center gap-2">
                                    ${cli.nome.split(' ')[0]} ${cli.nome.split(' ')[1] || ''}
                                    <div class="mt-0.5 sm:mt-0">${tagStatus}</div>
                                </div>
                                <div class="text-[11px] text-gray-500 mt-1 flex items-center gap-2">
                                    <span class="bg-white border border-gray-300 px-1 font-mono font-bold text-gray-800 shadow-sm">${vei.placa}</span>
                                    <span>Doc: VM-${c.id.toString().slice(-5)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t border-gray-200/50 sm:border-0 mt-1 sm:mt-0 gap-2">
                            <div class="text-right">
                                <span class="font-black text-gray-900 font-mono text-lg sm:text-base">${utils.formatMoney(valorCobrar)}</span>
                                ${subTextoPlano}
                            </div>
                            <div class="flex gap-2 w-full sm:w-auto justify-end">
                                <button class="btn-wpp-cobranca flex-1 sm:flex-none justify-center text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white px-2 sm:px-3 py-2 sm:py-1.5 transition border border-emerald-200 shadow-sm flex items-center gap-1 rounded-sm" data-id="${c.id}" title="Cobrar via WhatsApp">
                                    <i class="ph-bold ph-whatsapp text-sm"></i> WPP
                                </button>
                                <button class="btn-abrir-baixa flex-1 sm:flex-none justify-center text-[10px] font-black uppercase tracking-widest bg-gray-900 text-white px-3 sm:px-4 py-2 sm:py-1.5 hover:bg-black transition shadow-hard border border-gray-900 rounded-sm" data-id="${c.id}" data-valor="${valorCobrar}" data-nome="${cli.nome}">
                                    ${labelBtnBaixa}
                                </button>
                            </div>
                        </div>
                    </div>
                `);
            });
            listaReceber.innerHTML = htmlReceber.join('');
        }

        const historico = [...db.financeiro].sort((a, b) => b.id - a.id);
        let totalEntradas = 0;
        let totalSaidas = 0;
        if (historico.length === 0) {
            tbHistorico.innerHTML = `<tr><td class="p-6 text-center text-gray-400 text-xs uppercase tracking-widest font-bold">O livro de registos está vazio.</td></tr>`;
        } else {
            const htmlHistorico = [];
            historico.forEach(f => {
                const tipoReal = f.tipo || 'entrada';
                const valorNum = Number(f.valor);
                let corValor = '';
                let iconeSeta = '';
                if (tipoReal === 'entrada') {
                    totalEntradas += valorNum;
                    corValor = 'text-emerald-600';
                    iconeSeta = '<i class="ph-bold ph-arrow-down-left text-emerald-500"></i>';
                } else {
                    totalSaidas += valorNum;
                    corValor = 'text-red-600';
                    iconeSeta = '<i class="ph-bold ph-arrow-up-right text-red-500"></i>';
                }
                htmlHistorico.push(`
                    <tr class="hover:bg-gray-50 transition-colors group">
                        <td class="px-4 py-3 w-8 text-center shrink-0">${iconeSeta}</td>
                        <td class="px-2 py-3">
                            <div class="text-[10px] text-gray-400 font-mono font-bold uppercase">${utils.formatDate(f.data)}</div>
                        </td>
                        <td class="px-2 py-3">
                            <div class="text-xs font-bold text-gray-800 uppercase truncate max-w-[120px] md:max-w-none" title="${f.descricao}">${f.descricao}</div>
                            <div class="text-[9px] text-gray-500 mt-0.5 tracking-wider truncate max-w-[120px] md:max-w-none">${f.categoria || 'Locação Semanal'}</div>
                        </td>
                        <td class="px-4 py-3 text-right">
                            <div class="text-sm font-black font-mono ${corValor}">${tipoReal === 'entrada' ? '+' : '-'} ${utils.formatMoney(valorNum)}</div>
                        </td>
                        <td class="px-4 py-3 text-right">
                            <div class="flex gap-2 justify-end">
                                ${tipoReal === 'entrada' ? `
                                    <button class="btn-recibo text-gray-300 hover:text-brand-dark transition px-1" data-id="${f.id}" title="Gerar Recibo PDF"><i class="ph-bold ph-receipt text-base"></i></button>
                                ` : ''}
                                <button class="btn-deletar-registo text-gray-300 hover:text-red-500 transition px-1" data-id="${f.id}" title="Eliminar Registo"><i class="ph-fill ph-trash text-base"></i></button>
                            </div>
                        </td>
                    </tr>
                `);
            });
            tbHistorico.innerHTML = htmlHistorico.join('');
        }

        dashEntradas.innerText = utils.formatMoney(totalEntradas);
        dashSaidas.innerText = utils.formatMoney(totalSaidas);
        const saldoGeral = totalEntradas - totalSaidas;
        dashSaldo.innerText = utils.formatMoney(saldoGeral);
        if(saldoGeral < 0) {
            dashSaldo.classList.remove('text-gray-900');
            dashSaldo.classList.add('text-red-600');
        } else {
            dashSaldo.classList.remove('text-red-600');
            dashSaldo.classList.add('text-gray-900');
        }
    }
    
    function calcularTotalBaixa() {
        const base = Number(document.getElementById('bx-valor-base').value) || 0;
        const extra = Number(bxValorExtra.value) || 0;
        bxDisplayTotal.innerText = utils.formatMoney(base + extra);
    }

    bxValorExtra.addEventListener('input', calcularTotalBaixa);

    listaReceber.addEventListener('click', (e) => {
        const btnBaixa = e.target.closest('.btn-abrir-baixa');
        const btnWpp = e.target.closest('.btn-wpp-cobranca');

        if (btnWpp) {
            const idContrato = Number(btnWpp.getAttribute('data-id'));
            const c = db.contratos.find(x => x.id === idContrato);
            const cli = db.clientes.find(x => x.id === c.cliente_id) || {nome: '', wpp: ''};
            const vei = db.veiculos.find(x => x.id === c.veiculo_id) || {placa: '', modelo: '', categoria: 'moto'};
            const isCarro = (vei.categoria === 'carro');
            const tipoStr = isCarro ? 'do seu carro' : 'da sua moto';
            const emoji = isCarro ? '🚗' : '🏍️';
            const isFidelidade = (c.tipo_plano === 'fidelidade');
            const isAquisicao = (c.tipo_plano === 'aquisicao');
            const valorCobrar = isFidelidade
                ? (Number(c.valor_semanal) || (Number(c.valor) > 1000 ? Number(c.valor) / 12 : Number(c.valor)) || 350)
                : (isAquisicao ? (Number(c.valor_semanal) || Number(c.valor_parcela) || 375) : c.valor);
            const valorFormatado = utils.formatMoney(valorCobrar);
            let texto = `Olá *${cli.nome.trim()}*, tudo bem? 👋\n\n`;
            texto += `Aqui é da *VANDO LOCADORA*.\n`;
            if (isFidelidade) {
                const semNum = c.semanas_pagas || 1;
                texto += `Consta no nosso sistema que a parcela semanal de abatimento (${semNum}ª semana de 12) ${tipoStr} (Placa: *${vei.placa}*) no valor de *${valorFormatado}* encontra-se disponível para liquidação.\n\n`;
            } else if (isAquisicao) {
                const semNum = c.semanas_pagas || 1;
                texto += `Consta no nosso sistema que a parcela semanal (${semNum}ª semana de 104) do seu Contrato de Aquisição ${tipoStr} (Placa: *${vei.placa}*) no valor de *${valorFormatado}* encontra-se disponível para pagamento.\n\n`;
            } else {
                texto += `Consta no nosso sistema que a semanalidade ${tipoStr} (Placa: *${vei.placa}*) no valor de *${valorFormatado}* encontra-se disponível para liquidação.\n\n`;
            }
            texto += `Poderia nos enviar o comprovante Pix por aqui assim que efetuar o pagamento? Obrigado! ${emoji}`;
            const fone = cli.wpp.replace(/\D/g, '');
            if (fone.length >= 10) {
                if (window.enviarMensagemWhatsapp) {
                    window.enviarMensagemWhatsapp(fone, texto);
                } else {
                    window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(texto)}`, '_blank');
                }
            } else {
                showAlert("O número de WhatsApp cadastrado para este cliente é inválido.");
            }
        }

        if (btnBaixa) {
            const idContrato = Number(btnBaixa.getAttribute('data-id'));
            const valorSugerido = Number(btnBaixa.getAttribute('data-valor'));
            const nomeCliente = btnBaixa.getAttribute('data-nome');
            document.getElementById('bx-id-contrato').value = idContrato;
            document.getElementById('bx-nome-cliente').innerText = nomeCliente;
            document.getElementById('bx-valor-base').value = valorSugerido;
            document.getElementById('bx-display-base').value = utils.formatMoney(valorSugerido);
            bxValorExtra.value = "0";
            document.getElementById('bx-motivo-extra').value = "";
            document.getElementById('bx-dias-renovacao').value = "7";
            calcularTotalBaixa();
            modalBaixa.classList.remove('hidden');
            setTimeout(() => { modalBaixa.classList.remove('opacity-0'); modalBaixaPanel.classList.remove('scale-95'); }, 10);
        }
    });

    document.getElementById('btn-fechar-baixa').addEventListener('click', () => {
        modalBaixa.classList.add('opacity-0');
        modalBaixaPanel.classList.add('scale-95');
        setTimeout(() => modalBaixa.classList.add('hidden'), 200);
    });

    // ========== GERAR RECIBO ==========
    function gerarRecibo(nomeCliente, modelo, placa, valorTotal, proximoVencimento) {
        const logoUrl = new URL('./assets/img/logo.png', document.baseURI).href;
        const dataAtual = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
        const div = document.createElement('div');
        div.style.width = '300px';
        div.style.padding = '10mm';
        div.style.fontFamily = 'Courier New, Courier, monospace';
        div.style.fontSize = '12px';
        div.style.color = '#000';
        div.style.background = '#FFF';
        div.innerHTML = `
            <div style="text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
                <img src="${logoUrl}" style="width: 80px; margin-bottom: 8px;">
                <br><strong style="font-size: 14px;">VANDO MOTOS</strong>
                <br><span style="font-size: 10px;">CNPJ: 28.623.431/0001-23</span>
            </div>
            <h3 style="text-align: center; margin: 10px 0; font-size: 14px; font-weight: bold;">RECIBO DE PAGAMENTO</h3>
            <div style="margin-bottom: 15px;">
                <p style="margin: 3px 0;"><strong>DATA:</strong> ${dataAtual}</p>
                <p style="margin: 3px 0;"><strong>CLIENTE:</strong> ${nomeCliente}</p>
                <p style="margin: 3px 0;"><strong>VEÍCULO:</strong> ${modelo} (${placa})</p>
            </div>
            <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin-bottom: 15px; display: flex; justify-content: space-between;">
                <strong>VALOR PAGO:</strong>
                <strong>R$ ${Number(valorTotal).toFixed(2).replace('.',',')}</strong>
            </div>
            <div style="text-align: center; margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; font-size: 10px;">PRÓXIMO VENCIMENTO</p>
                <p style="margin: 0; font-size: 16px; font-weight: bold;">${proximoVencimento}</p>
            </div>
            <div style="text-align: center; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px;">
                Obrigado pela preferência!
            </div>
        `;
        const opt = {
            margin: 0,
            filename: `Recibo_${nomeCliente.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: [80, 150], orientation: 'portrait' }
        };
        html2pdf().set(opt).from(div).save();
    }

    // ===== FORM BAIXA =====
    formBaixa.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading('Processando pagamento...');
        try {
            const idContrato = Number(document.getElementById('bx-id-contrato').value);
            const valorBase = Number(document.getElementById('bx-valor-base').value);
            const valorExtra = Number(bxValorExtra.value) || 0;
            const motivoExtra = document.getElementById('bx-motivo-extra').value;
            const diasRenovar = Number(document.getElementById('bx-dias-renovacao').value) || 7;
            const valorTotal = valorBase + valorExtra;
            const c = db.contratos.find(x => x.id === idContrato);
            if(!c) throw new Error('Contrato não encontrado.');
            const vei = db.veiculos.find(x => x.id === c.veiculo_id) || { placa: '' };
            const cli = db.clientes.find(x => x.id === c.cliente_id) || { nome: 'Cliente' };
            let desc = c.tipo_plano === 'fidelidade'
                ? `Abatimento Semanal (${(c.semanas_pagas || 1) + 1}ª semana de 12) - ${cli.nome.split(' ')[0]} (${vei.placa})`
                : (c.tipo_plano === 'aquisicao'
                    ? `Parcela Semanal (${(c.semanas_pagas || 0) + 1}ª semana de 104) - Aquisição - ${cli.nome.split(' ')[0]} (${vei.placa})`
                    : `Recebimento Semanal - ${cli.nome.split(' ')[0]} (${vei.placa})`);
            if (valorExtra > 0) {
                desc += ` [+ R$ ${valorExtra} : ${motivoExtra || 'Taxas adicionais'}]`;
            }
            db.financeiro.push({
                id: Date.now(),
                data: new Date().toISOString().split('T')[0],
                tipo: 'entrada',
                categoria: c.tipo_plano === 'aquisicao' ? 'Parcela Aquisição' : 'Locação Semanal',
                descricao: desc,
                valor: valorTotal,
                contrato_id: c.id
            });

            if (c.tipo_plano === 'aquisicao' || c.tipo_plano === 'fidelidade') {
                c.semanas_pagas = (c.semanas_pagas || (c.tipo_plano === 'fidelidade' ? 1 : 0)) + 1;
            }

            const dataAntigaStr = c.vencimento ? c.vencimento : c.data_fim;
            const dataAntiga = new Date(dataAntigaStr);
            dataAntiga.setMinutes(dataAntiga.getMinutes() + dataAntiga.getTimezoneOffset());
            dataAntiga.setDate(dataAntiga.getDate() + diasRenovar);
            const novaDataVencimentoStr = dataAntiga.toISOString().split('T')[0];
            c.vencimento = novaDataVencimentoStr;
            if(c.data_fim && c.tipo_plano !== 'fidelidade' && c.tipo_plano !== 'aquisicao') {
                const dataFimAtual = new Date(c.data_fim);
                dataFimAtual.setDate(dataFimAtual.getDate() + diasRenovar);
                c.data_fim = new Date(dataFimAtual.getTime() - (dataFimAtual.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            }

            await window.electronAPI.saveData('financeiro', db.financeiro);
            await window.electronAPI.saveData('contratos', db.contratos);
            atualizarTela();
            document.getElementById('btn-fechar-baixa').click();

            const dataFormatada = utils.formatDate(novaDataVencimentoStr);
            await showAlert("Pagamento recebido com sucesso!");
            const querRecibo = await showConfirm("Deseja gerar o Recibo Eletrônico em PDF?");
            if (querRecibo) {
                // Obter o último registro adicionado no db.financeiro para este contrato
                const ultimoReg = db.financeiro.find(f => f.contrato_id === c.id && f.tipo === 'entrada' && f.categoria === 'Locação Semanal');
                if (ultimoReg) {
                    showLoading('Gerando Recibo PDF...');
                    try {
                        await gerarPDFRecibo(ultimoReg);
                    } catch (err) {
                        await showAlert('Erro ao gerar recibo: ' + err.message);
                    } finally {
                        hideLoading();
                    }
                }
            }
        } catch (error) {
            await showAlert('Erro: ' + error.message);
        } finally {
            hideLoading();
        }
    });

    // ===== NOVO LANÇAMENTO =====
    document.getElementById('btn-novo-lancamento').addEventListener('click', () => {
        const agora = new Date();
        agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
        document.getElementById('lan-data').value = agora.toISOString().split('T')[0];
        modalLan.classList.remove('hidden');
        setTimeout(() => { modalLan.classList.remove('opacity-0'); modalLanPanel.classList.remove('scale-95'); }, 10);
    });

    document.getElementById('btn-fechar-lancamento').addEventListener('click', () => {
        modalLan.classList.add('opacity-0');
        modalLanPanel.classList.add('scale-95');
        setTimeout(() => { modalLan.classList.add('hidden'); formLan.reset(); }, 200);
    });

    // ===== FORM LANÇAMENTO =====
    formLan.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading('Salvando lançamento...');
        try {
            db.financeiro.push({
                id: Date.now(),
                data: document.getElementById('lan-data').value,
                tipo: document.getElementById('lan-tipo').value,
                categoria: document.getElementById('lan-categoria').value,
                descricao: document.getElementById('lan-descricao').value,
                valor: Number(document.getElementById('lan-valor').value)
            });
            await window.electronAPI.saveData('financeiro', db.financeiro);
            atualizarTela();
            document.getElementById('btn-fechar-lancamento').click();
            await showAlert('Lançamento registrado com sucesso!');
        } catch (error) {
            await showAlert('Erro: ' + error.message);
        } finally {
            hideLoading();
        }
    });

    // ===== EXCLUIR REGISTO / GERAR RECIBO =====
    tbHistorico.addEventListener('click', async (e) => {
        const btnDel = e.target.closest('.btn-deletar-registo');
        const btnRec = e.target.closest('.btn-recibo');

        if (btnRec) {
            const id = Number(btnRec.getAttribute('data-id'));
            const f = db.financeiro.find(x => x.id === id);
            if (f) {
                showLoading('Gerando Recibo PDF...');
                try {
                    await gerarPDFRecibo(f);
                } catch (error) {
                    await showAlert('Erro ao gerar recibo: ' + error.message);
                } finally {
                    hideLoading();
                }
            }
            return;
        }

        if(btnDel) {
            const id = Number(btnDel.getAttribute('data-id'));
            const confirmado = await showConfirm("Aviso: Eliminar este registo alterará o Saldo em Caixa atual. Confirma a exclusão?");
            if (confirmado) {
                showLoading('Removendo registro...');
                try {
                    db.financeiro = db.financeiro.filter(f => f.id !== id);
                    await window.electronAPI.saveData('financeiro', db.financeiro);
                    atualizarTela();
                } catch (error) {
                    await showAlert('Erro: ' + error.message);
                } finally {
                    hideLoading();
                }
            }
        }
    });

    // ===== EXPORTAR EXCEL =====
    document.getElementById('btn-exportar-excel').addEventListener('click', () => {
        if (db.financeiro.length === 0) return showAlert("Não existem movimentos no livro caixa para exportar.");
        const cabecalhos = ["Nº Documento", "Data do Registo", "Tipo de Movimento", "Categoria", "Descrição", "Valor(R$)"];
        const linhasCSV = [cabecalhos.join(",")];
        db.financeiro.forEach(f => {
            linhasCSV.push([f.id, utils.formatDate(f.data), f.tipo === 'entrada' ? 'RECEITA' : 'DESPESA', `"${f.categoria || 'N/A'}"`, `"${f.descricao || 'N/A'}"`, f.tipo === 'entrada' ? f.valor : `-${f.valor}`].join(","));
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([linhasCSV.join("\n")], { type: 'text/csv;charset=utf-8;' }));
        link.download = `Balanco_Caixa_VandoMotos_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    atualizarTela();

    async function salvarPDFNoDisco(pdfBlob, nomeArquivo) {
        try {
            const userDataPath = await window.electronAPI.getUserDataPath();
            const pastaRecibos = `${userDataPath}/recibos_pdf`;
            await window.electronAPI.createFolder(pastaRecibos);
            const caminhoCompleto = `${pastaRecibos}/${nomeArquivo}`;
            
            const reader = new FileReader();
            const base64Data = await new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(pdfBlob);
            });
            await window.electronAPI.saveFile(caminhoCompleto, base64Data);
            return caminhoCompleto;
        } catch (error) {
            console.error('Erro ao salvar Recibo no disco:', error);
            return null;
        }
    }

    async function gerarPDFRecibo(movimento) {
        let clienteNome = "Cliente Avulso";
        let clienteCPF = "--";
        let clienteWpp = "";
        let veiculoModelo = "Veículo";
        let veiculoPlaca = "--";
        
        if (movimento.contrato_id) {
            const c = db.contratos.find(x => x.id === movimento.contrato_id);
            if (c) {
                const cli = db.clientes.find(x => x.id === c.cliente_id);
                if (cli) {
                    clienteNome = cli.nome;
                    clienteCPF = cli.cpf || "--";
                    clienteWpp = cli.wpp || "";
                }
                const vei = db.veiculos.find(x => x.id === c.veiculo_id);
                if (vei) {
                    veiculoModelo = vei.modelo;
                    veiculoPlaca = vei.placa;
                }
            }
        }
        
        const valorFormatado = utils.formatMoney(movimento.valor);
        const dataFormatada = utils.formatDate(movimento.data);
        const dataEmissaoFmt = new Date().toLocaleString('pt-BR');
        
        const pdfContainer = document.createElement('div');
        pdfContainer.style.width = '100%';
        pdfContainer.style.background = '#fff';
        
        const html = `
            <div style="padding: 40px; font-family: 'Inter', sans-serif; color: #111827; background-color: #fff; border: 1px solid #e5e7eb; border-radius: 4px; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 24px;">
                    <div>
                        <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #111827; text-transform: uppercase;">Vando Motos Locadora</h1>
                        <p style="margin: 2px 0 0; font-size: 10px; color: #6b7280; font-weight: bold; text-transform: uppercase; tracking: 0.1em;">Locação de Veículos & Serviços</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: inline-block; padding: 4px 8px; background-color: #111827; font-size: 10px; font-weight: 800; color: #fff; text-transform: uppercase;">Recibo Eletrônico</span>
                        <p style="margin: 4px 0 0; font-size: 9px; font-family: monospace; color: #6b7280;">Nº R-${movimento.id.toString().slice(-6)}</p>
                    </div>
                </div>
                
                <div style="margin-bottom: 32px; font-size: 13px; line-height: 1.7; color: #374151;">
                    <p style="margin: 0 0 16px;">Recebemos de <strong>${clienteNome}</strong>, CPF: <strong>${clienteCPF}</strong>, a importância de <span style="font-size: 15px; font-weight: 900; color: #111827;">${valorFormatado}</span> referente à liquidação de:</p>
                    
                    <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 4px; padding: 16px; margin-bottom: 20px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 6px 0; color: #6b7280; text-transform: uppercase; font-weight: bold;">Categoria</td>
                                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #111827;">${movimento.categoria || 'Locação Semanal'}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 6px 0; color: #6b7280; text-transform: uppercase; font-weight: bold;">Descrição</td>
                                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #111827;">${movimento.descricao}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 6px 0; color: #6b7280; text-transform: uppercase; font-weight: bold;">Veículo</td>
                                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #111827;">${veiculoModelo} (${veiculoPlaca})</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #6b7280; text-transform: uppercase; font-weight: bold;">Data de Pagamento</td>
                                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #111827;">${dataFormatada}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="margin: 0;">Para maior clareza, firmamos o presente comprovante digital de pagamento.</p>
                </div>
                
                <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">Emitido eletronicamente em: ${dataEmissaoFmt}</p>
                    </div>
                    <div style="text-align: center; width: 220px;">
                        <div style="border-top: 1px solid #111827; padding-top: 6px;">
                            <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #111827;">Vando Motos Locadora</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        pdfContainer.innerHTML = html;
        
        const opt = {
            margin: 10,
            filename: `Recibo_${movimento.id.toString().slice(-6)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        return new Promise((resolve, reject) => {
            html2pdf()
                .set(opt)
                .from(pdfContainer)
                .toPdf()
                .get('pdf')
                .then(async function(pdf) {
                    const pdfBlob = pdf.output('blob');
                    const nomeArquivo = `Recibo_${movimento.id.toString().slice(-6)}_${clienteNome.replace(/\s+/g, '_')}_${movimento.data}.pdf`;
                    
                    const caminhoCompleto = await salvarPDFNoDisco(pdfBlob, nomeArquivo);
                    
                    const pdfUrl = URL.createObjectURL(pdfBlob);
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.src = pdfUrl;
                    document.body.appendChild(iframe);
                    iframe.onload = () => {
                        setTimeout(() => {
                            iframe.contentWindow.focus();
                            iframe.contentWindow.print();
                            setTimeout(() => { document.body.removeChild(iframe); }, 1000);
                        }, 500);
                    };
                    
                    if (caminhoCompleto && window.electronAPI.openPath) {
                        await window.electronAPI.openPath(caminhoCompleto);
                    }
                    
                    if (clienteWpp && clienteWpp.replace(/\D/g, '').length >= 10) {
                        const fone = clienteWpp.replace(/\D/g, '');
                        const texto = `Olá *${clienteNome.trim()}*! 👋\nSegunda via do seu *Comprovante de Recebimento* de valor *${valorFormatado}* (Pago em: *${dataFormatada}*).\nObrigado pela preferência! 🏍️`;
                        const querEnviar = await showConfirm("Deseja enviar o comprovante via WhatsApp?");
                        if (querEnviar) {
                            if (window.enviarMensagemWhatsapp) {
                                window.enviarMensagemWhatsapp(fone, texto);
                            } else {
                                window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(texto)}`, '_blank');
                            }
                        }
                    }
                    
                    resolve(caminhoCompleto);
                })
                .catch(reject);
        });
    }

    document.getElementById('btn-export-csv-financeiro').addEventListener('click', () => {
        const data = db.financeiro.map(f => ({
            ID: f.id,
            Data: f.data,
            Tipo: f.tipo === 'entrada' ? 'Receita' : 'Despesa',
            Categoria: f.categoria,
            Descrição: f.descricao,
            Valor: f.valor
        }));
        exportCSV(data, 'financeiro');
    });
}
