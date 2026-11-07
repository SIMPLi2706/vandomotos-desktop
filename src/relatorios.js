import { db, utils } from './db.js';
import { showAlert, showConfirm } from './modal.js';
import { showLoading, hideLoading } from './loading.js';
import { getUser } from './session.js';
import { exportCSV } from './csvUtils.js';
import { sincronizarFinanceiroComContratos } from './financeiroSync.js';
import { abrirVisualizadorPDF, salvarPDFNoDisco, imprimirPDFDireto } from './pdfViewer.js';

let chartLucro = null;
let chartCategorias = null;
let chartVeiculos = null;
let chartClientes = null;

// Armazena o estado atual apurado para geração de PDF e impressão
let dadosRelatorioAtual = null;

function formatYMD(d) {
    if (!d || isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function renderRelatorios(container) {
    container.innerHTML = `
        <div class="fade-enter space-y-6 pb-12">
            <!-- CABEÇALHO & BOTÕES DE AÇÃO -->
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 border border-gray-200 shadow-soft">
                <div>
                    <h2 class="text-xl font-black text-gray-900 flex items-center gap-2">
                        <i class="ph-bold ph-chart-line-up text-brand-hover text-2xl"></i> Relatórios Gerenciais & Financeiros
                    </h2>
                    <p class="text-xs text-gray-500 mt-1">
                        Auditoria de receitas, despesas, rentabilidade real por veículo e balanço patrimonial da frota.
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button id="btn-sync-relatorio" class="flex-1 sm:flex-none justify-center bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 text-xs font-bold uppercase transition flex items-center gap-1.5 border border-gray-300 shadow-sm" title="Reconciliar contratos e manutenções com o livro caixa">
                        <i class="ph-bold ph-arrows-clockwise text-sm text-blue-600"></i> Sincronizar
                    </button>
                    <button id="btn-csv-relatorio" class="flex-1 sm:flex-none justify-center bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 text-xs font-bold uppercase transition flex items-center gap-1.5 border border-gray-300 shadow-sm">
                        <i class="ph-bold ph-file-csv text-sm text-emerald-600"></i> CSV
                    </button>
                    <button id="btn-pdf-relatorio" class="flex-1 sm:flex-none justify-center bg-brand-dark hover:bg-black text-white px-4 py-2 text-xs font-black uppercase transition flex items-center gap-2 border border-gray-800 shadow-hard">
                        <i class="ph-bold ph-file-pdf text-brand-main text-base"></i> Exportar PDF
                    </button>
                    <button id="btn-imprimir-relatorio" class="flex-1 sm:flex-none justify-center bg-brand-main hover:bg-brand-hover text-brand-dark px-4 py-2 text-xs font-black uppercase transition flex items-center gap-2 border border-brand-dark shadow-sm">
                        <i class="ph-bold ph-printer text-base"></i> Imprimir
                    </button>
                </div>
            </div>

            <!-- PÍLULAS DE PERÍODO RÁPIDO & FILTROS -->
            <div class="bg-white p-5 border border-gray-200 shadow-soft space-y-4">
                <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3">
                    <span class="text-[11px] font-black uppercase text-gray-400 mr-2 flex items-center gap-1">
                        <i class="ph-bold ph-calendar text-sm"></i> Período Rápido:
                    </span>
                    <button type="button" class="btn-pilula-periodo px-2.5 py-1 text-xs font-bold bg-brand-main text-brand-dark border border-brand-dark rounded-sm transition shadow-xs" data-tipo="todos">
                        Todo o Histórico
                    </button>
                    <button type="button" class="btn-pilula-periodo px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-sm transition shadow-xs" data-tipo="este-mes">
                        Este Mês
                    </button>
                    <button type="button" class="btn-pilula-periodo px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-sm transition shadow-xs" data-tipo="mes-anterior">
                        Mês Anterior
                    </button>
                    <button type="button" class="btn-pilula-periodo px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-sm transition shadow-xs" data-tipo="ultimos-30">
                        Últimos 30 Dias
                    </button>
                    <button type="button" class="btn-pilula-periodo px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-sm transition shadow-xs" data-tipo="este-ano">
                        Este Ano
                    </button>
                    <button type="button" class="btn-pilula-periodo px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-sm transition shadow-xs" data-tipo="hoje">
                        Hoje
                    </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase mb-1 text-gray-700">Data Início</label>
                        <input type="date" id="rel-inicio" class="w-full p-2 border border-gray-300 text-sm outline-none bg-white font-mono">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase mb-1 text-gray-700">Data Fim</label>
                        <input type="date" id="rel-fim" class="w-full p-2 border border-gray-300 text-sm outline-none bg-white font-mono">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase mb-1 text-gray-700">Tipo de Caixa</label>
                        <select id="rel-tipo" class="w-full p-2 border border-gray-300 text-sm bg-white font-bold outline-none">
                            <option value="todos">Todos (Entradas e Saídas)</option>
                            <option value="entrada">Apenas Receitas (Entradas)</option>
                            <option value="saida">Apenas Despesas (Saídas)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase mb-1 text-gray-700">Categoria</label>
                        <select id="rel-categoria" class="w-full p-2 border border-gray-300 text-sm bg-white outline-none">
                            <option value="todas">Todas as Categorias</option>
                            <option value="Locação Semanal">Locação Semanal</option>
                            <option value="Entrada Aquisição">Entrada Aquisição</option>
                            <option value="Parcela Aquisição">Parcela Aquisição</option>
                            <option value="Caução">Caução</option>
                            <option value="Manutenção de Frota">Manutenção de Frota (Oficina)</option>
                            <option value="Impostos e Taxas">Impostos e Taxas</option>
                            <option value="Infraestrutura">Infraestrutura</option>
                            <option value="Serviços Terceirizados">Serviços Terceirizados</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    <div class="flex items-end">
                        <button id="btn-filtrar-rel" class="w-full bg-brand-dark hover:bg-black text-brand-main px-4 py-2.5 font-bold shadow-hard border border-gray-900 uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition">
                            <i class="ph-bold ph-funnel"></i> Aplicar Filtro
                        </button>
                    </div>
                </div>
            </div>

            <!-- CARDS DE INDICADORES EXECUTIVOS (KPIS) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-white p-5 border border-emerald-200 border-l-4 border-l-emerald-500 shadow-soft">
                    <p class="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <i class="ph-bold ph-trend-up text-base text-emerald-600"></i> Faturamento Bruto (Entradas)
                    </p>
                    <h3 class="text-2xl md:text-3xl font-black text-emerald-700 font-mono" id="kpi-entradas">R$ 0,00</h3>
                    <div class="text-[11px] text-gray-500 mt-2 font-medium" id="kpi-entradas-sub">
                        Locações: R$ 0,00 | Cauções: R$ 0,00
                    </div>
                </div>

                <div class="bg-white p-5 border border-red-200 border-l-4 border-l-red-500 shadow-soft">
                    <p class="text-[10px] font-bold text-red-800 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <i class="ph-bold ph-trend-down text-base text-red-600"></i> Total de Despesas (Saídas)
                    </p>
                    <h3 class="text-2xl md:text-3xl font-black text-red-600 font-mono" id="kpi-saidas">R$ 0,00</h3>
                    <div class="text-[11px] text-gray-500 mt-2 font-medium" id="kpi-saidas-sub">
                        Oficina: R$ 0,00 | Outras: R$ 0,00
                    </div>
                </div>

                <div class="bg-white p-5 border border-blue-200 border-l-4 border-l-blue-600 shadow-soft">
                    <p class="text-[10px] font-bold text-blue-800 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <i class="ph-bold ph-scales text-base text-blue-600"></i> Lucro Líquido Real (Balanço)
                    </p>
                    <h3 class="text-2xl md:text-3xl font-black text-gray-900 font-mono" id="kpi-lucro">R$ 0,00</h3>
                    <div class="text-[11px] text-gray-500 mt-2 flex items-center gap-2 font-medium">
                        Margem Operacional: <strong id="kpi-margem" class="text-gray-900 font-mono font-bold">0%</strong>
                    </div>
                </div>

                <div class="bg-white p-5 border border-purple-200 border-l-4 border-l-purple-600 shadow-soft">
                    <p class="text-[10px] font-bold text-purple-800 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <i class="ph-bold ph-motorcycle text-base text-purple-600"></i> Gestão da Frota
                    </p>
                    <h3 class="text-2xl md:text-3xl font-black text-purple-900 font-mono" id="kpi-frota-ativa">0 Locações</h3>
                    <div class="text-[11px] text-gray-500 mt-2 font-medium" id="kpi-frota-sub">
                        Frota Total: 0 veículos | Oficina: 0
                    </div>
                </div>
            </div>

            <!-- GRÁFICOS GERENCIAIS -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white p-5 border border-gray-200 shadow-soft">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-xs font-black uppercase tracking-widest text-gray-800 flex items-center gap-2">
                            <i class="ph-bold ph-chart-bar text-brand-hover text-base"></i> Balanço Financeiro do Período
                        </h3>
                        <span class="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold font-mono" id="badge-periodo-balanco">Período</span>
                    </div>
                    <div class="relative h-[220px] w-full">
                        <canvas id="chart-lucro"></canvas>
                    </div>
                </div>

                <div class="bg-white p-5 border border-gray-200 shadow-soft">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-xs font-black uppercase tracking-widest text-gray-800 flex items-center gap-2">
                            <i class="ph-bold ph-chart-pie-slice text-brand-hover text-base"></i> Distribuição por Categorias
                        </h3>
                        <span class="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold font-mono">Receitas vs Despesas</span>
                    </div>
                    <div class="relative h-[220px] w-full">
                        <canvas id="chart-categorias"></canvas>
                    </div>
                </div>

                <div class="bg-white p-5 border border-gray-200 shadow-soft">
                    <h3 class="text-xs font-black uppercase tracking-widest text-gray-800 mb-3 flex items-center gap-2">
                        <i class="ph-bold ph-motorcycle text-brand-hover text-base"></i> Veículos com Maior Rentabilidade / Faturamento
                    </h3>
                    <div class="relative h-[200px] w-full">
                        <canvas id="chart-veiculos-top"></canvas>
                    </div>
                </div>

                <div class="bg-white p-5 border border-gray-200 shadow-soft">
                    <h3 class="text-xs font-black uppercase tracking-widest text-gray-800 mb-3 flex items-center gap-2">
                        <i class="ph-bold ph-users text-brand-hover text-base"></i> Principais Clientes por Faturamento / Contratos
                    </h3>
                    <div class="relative h-[200px] w-full">
                        <canvas id="chart-clientes-top"></canvas>
                    </div>
                </div>
            </div>

            <!-- TABELA DE RENTABILIDADE POR VEÍCULO -->
            <div class="bg-white border border-gray-200 shadow-soft overflow-hidden">
                <div class="p-5 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h3 class="text-xs font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
                            <i class="ph-bold ph-calculator text-base text-brand-hover"></i> Rentabilidade e Lucro Líquido Real por Veículo
                        </h3>
                        <p class="text-[11px] text-gray-500 mt-0.5">
                            Demonstrativo analítico de faturamento bruto vs despesas de manutenção e peças gastas por veículo no período.
                        </p>
                    </div>
                    <span class="text-xs font-bold text-gray-600 bg-white border border-gray-300 px-3 py-1 font-mono rounded-sm shadow-xs" id="rent-total-veiculos-tag">
                        0 veículos apurados
                    </span>
                </div>
                <div class="overflow-x-auto custom-scroll">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-gray-100 border-b border-gray-300 font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                                <th class="p-3">Veículo / Placa</th>
                                <th class="p-3 text-center">Tipo</th>
                                <th class="p-3 text-center">Status</th>
                                <th class="p-3 text-center">Contratos</th>
                                <th class="p-3 text-right text-blue-700">Receita Locação</th>
                                <th class="p-3 text-right text-gray-600">Caução</th>
                                <th class="p-3 text-right text-emerald-700 font-bold">Total Receita</th>
                                <th class="p-3 text-right text-red-600 font-bold">Oficina / Peças</th>
                                <th class="p-3 text-right font-black">Lucro Líquido Real</th>
                                <th class="p-3 text-right">Margem</th>
                            </tr>
                        </thead>
                        <tbody id="tb-rentabilidade-veiculos" class="divide-y divide-gray-100 font-mono">
                            <!-- Preenchido via JS -->
                        </tbody>
                        <tfoot id="tf-rentabilidade-veiculos" class="bg-gray-100 font-mono font-bold border-t-2 border-gray-300">
                            <!-- Linha de totais -->
                        </tfoot>
                    </table>
                </div>
            </div>

            <!-- EXTRATO DETALHADO DE MOVIMENTAÇÕES (AUDITORIA / CONFERÊNCIA COM CADERNO) -->
            <div class="bg-white border border-gray-200 shadow-soft overflow-hidden">
                <div class="p-5 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                        <h3 class="text-xs font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
                            <i class="ph-bold ph-list-numbers text-base text-brand-hover"></i> Extrato Detalhado de Movimentações Financeiras
                        </h3>
                        <p class="text-[11px] text-gray-500 mt-0.5">
                            Conferência detalhada linha a linha para validação direta com o caderno de anotações físicas.
                        </p>
                    </div>
                    <div class="w-full md:w-72">
                        <input type="text" id="busca-extrato-rel" placeholder="Filtrar por descrição, cliente ou placa..." class="w-full px-3 py-1.5 border border-gray-300 text-xs outline-none bg-white font-sans focus:border-brand-main">
                    </div>
                </div>
                <div class="overflow-x-auto custom-scroll max-h-96 overflow-y-auto">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead class="sticky top-0 bg-gray-100 border-b border-gray-300 font-bold text-gray-700 uppercase tracking-wider text-[11px] z-10">
                            <tr>
                                <th class="p-3">Data</th>
                                <th class="p-3 text-center">Tipo</th>
                                <th class="p-3">Categoria</th>
                                <th class="p-3">Descrição / Detalhes</th>
                                <th class="p-3 text-right">Valor (R$)</th>
                            </tr>
                        </thead>
                        <tbody id="tb-extrato-movimentacoes" class="divide-y divide-gray-100 font-mono">
                            <!-- Preenchido via JS -->
                        </tbody>
                    </table>
                </div>
                <div class="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center text-xs font-bold gap-3 font-mono">
                    <span id="txt-extrato-contador" class="text-gray-600">0 lançamentos exibidos</span>
                    <div class="flex items-center gap-4">
                        <span class="text-emerald-700">Entradas: <strong id="extrato-total-entradas">R$ 0,00</strong></span>
                        <span class="text-red-600">Saídas: <strong id="extrato-total-saidas">R$ 0,00</strong></span>
                        <span class="text-gray-900">Saldo: <strong id="extrato-saldo-final">R$ 0,00</strong></span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Função central de carregamento e apuração do relatório
    function carregarRelatorios(inicio, fim, tipo, categoria) {
        // Reconciliação em memória garantida
        let lancamentos = db.financeiro || [];

        // Filtro de data seguro (sem problemas de fuso horário UTC)
        let filtrados = lancamentos.filter(f => {
            if (!f.data) return false;
            const dataIso = f.data.slice(0, 10);
            if (inicio && dataIso < inicio) return false;
            if (fim && dataIso > fim) return false;
            if (tipo && tipo !== 'todos' && f.tipo !== tipo) return false;
            if (categoria && categoria !== 'todas' && f.categoria !== categoria) return false;
            return true;
        });

        // Ordenar do mais recente para o mais antigo
        filtrados.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0) || b.id - a.id);

        // Separação de entradas e saídas
        const entradas = filtrados.filter(f => f.tipo === 'entrada');
        const saidas = filtrados.filter(f => f.tipo === 'saida');

        const totalEntradas = entradas.reduce((acc, f) => acc + (Number(f.valor) || 0), 0);
        const totalSaidas = saidas.reduce((acc, f) => acc + (Number(f.valor) || 0), 0);
        const lucro = totalEntradas - totalSaidas;
        const margemPct = totalEntradas > 0 ? ((lucro / totalEntradas) * 100).toFixed(1) : '0.0';

        // Detalhamento de Entradas (Locação vs Caução)
        const totalLocacoes = entradas.filter(f => f.categoria !== 'Caução').reduce((acc, f) => acc + (Number(f.valor) || 0), 0);
        const totalCaucoes = entradas.filter(f => f.categoria === 'Caução').reduce((acc, f) => acc + (Number(f.valor) || 0), 0);

        // Detalhamento de Saídas (Oficina vs Outras)
        const totalOficina = saidas.filter(f => f.categoria === 'Manutenção de Frota').reduce((acc, f) => acc + (Number(f.valor) || 0), 0);
        const totalOutrasDespesas = totalSaidas - totalOficina;

        // Atualização dos Cards de KPIs
        document.getElementById('kpi-entradas').innerText = utils.formatMoney(totalEntradas);
        document.getElementById('kpi-entradas-sub').innerText = `Locações: ${utils.formatMoney(totalLocacoes)} | Cauções: ${utils.formatMoney(totalCaucoes)}`;

        document.getElementById('kpi-saidas').innerText = utils.formatMoney(totalSaidas);
        document.getElementById('kpi-saidas-sub').innerText = `Oficina: ${utils.formatMoney(totalOficina)} | Outras: ${utils.formatMoney(totalOutrasDespesas)}`;

        const kpiLucroEl = document.getElementById('kpi-lucro');
        kpiLucroEl.innerText = utils.formatMoney(lucro);
        if (lucro < 0) {
            kpiLucroEl.className = "text-2xl md:text-3xl font-black text-red-600 font-mono";
        } else {
            kpiLucroEl.className = "text-2xl md:text-3xl font-black text-emerald-600 font-mono";
        }
        document.getElementById('kpi-margem').innerText = `${margemPct}%`;

        const totalVeiculos = db.veiculos ? db.veiculos.length : 0;
        const contratosAtivos = (db.contratos || []).filter(c => c.status === 'ativo').length;
        const veiculosOficina = (db.veiculos || []).filter(v => v.status === 'manutencao').length;
        document.getElementById('kpi-frota-ativa').innerText = `${contratosAtivos} Locações`;
        document.getElementById('kpi-frota-sub').innerText = `Frota Total: ${totalVeiculos} veículos | Oficina: ${veiculosOficina}`;

        const badgeBal = document.getElementById('badge-periodo-balanco');
        if (badgeBal) {
            const dtIniFmt = inicio ? new Date(`${inicio}T12:00:00`).toLocaleDateString('pt-BR') : 'Início';
            const dtFimFmt = fim ? new Date(`${fim}T12:00:00`).toLocaleDateString('pt-BR') : 'Hoje';
            badgeBal.innerText = `${dtIniFmt} a ${dtFimFmt}`;
        }

        // ================= GRÁFICOS (CHART.JS) =================
        if (chartLucro) chartLucro.destroy();
        if (chartCategorias) chartCategorias.destroy();
        if (chartVeiculos) chartVeiculos.destroy();
        if (chartClientes) chartClientes.destroy();

        // 1. Gráfico de Balanço
        const ctxLucro = document.getElementById('chart-lucro').getContext('2d');
        chartLucro = new Chart(ctxLucro, {
            type: 'bar',
            data: {
                labels: ['Entradas (Receitas)', 'Saídas (Despesas)', 'Lucro Líquido Real'],
                datasets: [{
                    data: [totalEntradas, totalSaidas, lucro],
                    backgroundColor: ['#10b981', '#ef4444', lucro >= 0 ? '#facc15' : '#b91c1c'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { 
                        beginAtZero: true,
                        ticks: {
                            callback: (val) => 'R$ ' + Number(val).toLocaleString('pt-BR')
                        }
                    } 
                }
            }
        });

        // 2. Gráfico por Categorias (Doughnut)
        const catMap = {};
        filtrados.forEach(f => {
            const cat = f.categoria || 'Outros';
            catMap[cat] = (catMap[cat] || 0) + Number(f.valor || 0);
        });
        const catLabels = Object.keys(catMap);
        const catValores = Object.values(catMap);

        const ctxCat = document.getElementById('chart-categorias').getContext('2d');
        chartCategorias = new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: catLabels.length > 0 ? catLabels : ['Sem dados'],
                datasets: [{
                    data: catValores.length > 0 ? catValores : [1],
                    backgroundColor: [
                        '#10b981', '#3b82f6', '#f59e0b', '#ec4899', 
                        '#8b5cf6', '#ef4444', '#14b8a6', '#64748b'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } }
                }
            }
        });

        // 3. Apuração da Rentabilidade por Veículo
        const tbRent = document.getElementById('tb-rentabilidade-veiculos');
        const tfRent = document.getElementById('tf-rentabilidade-veiculos');
        const listaRentabilidade = [];

        let somaTotalLocacao = 0;
        let somaTotalCaucao = 0;
        let somaTotalReceita = 0;
        let somaTotalManutencao = 0;
        let somaTotalLucroReal = 0;

        if (tbRent) {
            tbRent.innerHTML = '';
            const veiculos = db.veiculos || [];

            veiculos.forEach(v => {
                const contratosDoV = (db.contratos || []).filter(c => c.veiculo_id === v.id);
                const idsContratos = contratosDoV.map(c => c.id);

                // Filtrar entradas associadas a este veículo no período
                const entradasDoV = entradas.filter(f => 
                    (f.contrato_id && idsContratos.includes(f.contrato_id)) ||
                    (f.descricao && f.descricao.toLowerCase().includes(v.placa.toLowerCase()))
                );

                const recLocacao = entradasDoV.filter(f => f.categoria !== 'Caução').reduce((acc, f) => acc + Number(f.valor || 0), 0);
                const recCaucao = entradasDoV.filter(f => f.categoria === 'Caução').reduce((acc, f) => acc + Number(f.valor || 0), 0);
                const recTotal = recLocacao + recCaucao;

                // Filtrar despesas de manutenção associadas a este veículo no período
                const saidasDoV = saidas.filter(f => 
                    (f.categoria === 'Manutenção de Frota' && f.descricao && f.descricao.toLowerCase().includes(v.placa.toLowerCase()))
                );
                const gastoOficina = saidasDoV.reduce((acc, f) => acc + Number(f.valor || 0), 0);

                const lucroReal = recTotal - gastoOficina;
                const margemVeic = recTotal > 0 ? ((lucroReal / recTotal) * 100).toFixed(1) : '0.0';

                // Contratos no período
                const qtdContratosPeriodo = contratosDoV.filter(c => {
                    const dtC = c.data_inicio ? c.data_inicio.slice(0, 10) : '';
                    if (inicio && dtC && dtC < inicio) return false;
                    if (fim && dtC && dtC > fim) return false;
                    return true;
                }).length;

                listaRentabilidade.push({
                    veiculo: v,
                    modelo: v.modelo,
                    placa: v.placa,
                    categoria: v.categoria || 'moto',
                    status: v.status || 'disponivel',
                    qtdContratos: qtdContratosPeriodo || contratosDoV.length,
                    recLocacao,
                    recCaucao,
                    recTotal,
                    gastoOficina,
                    lucroReal,
                    margemVeic
                });

                somaTotalLocacao += recLocacao;
                somaTotalCaucao += recCaucao;
                somaTotalReceita += recTotal;
                somaTotalManutencao += gastoOficina;
                somaTotalLucroReal += lucroReal;
            });

            // Ordenar por faturamento / lucro real decrescente
            listaRentabilidade.sort((a, b) => b.recTotal - a.recTotal || b.lucroReal - a.lucroReal);

            const tagTotalV = document.getElementById('rent-total-veiculos-tag');
            if (tagTotalV) tagTotalV.innerText = `${listaRentabilidade.length} veículos apurados`;

            if (listaRentabilidade.length === 0) {
                tbRent.innerHTML = '<tr><td colspan="10" class="p-6 text-center text-gray-400 font-sans">Nenhum veículo registrado na frota.</td></tr>';
            } else {
                listaRentabilidade.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.className = "hover:bg-gray-50 border-b border-gray-100 transition-colors";

                    const badgeTipo = item.categoria === 'carro'
                        ? '<span class="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">🚗 Carro</span>'
                        : '<span class="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">🏍️ Moto</span>';

                    let statusTag = '<span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded uppercase">Livre</span>';
                    if (item.status === 'locado') {
                        statusTag = '<span class="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded uppercase">Locado</span>';
                    } else if (item.status === 'manutencao') {
                        statusTag = '<span class="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded uppercase">Oficina</span>';
                    }

                    const lucroClass = item.lucroReal >= 0 ? 'text-emerald-700 font-black' : 'text-red-600 font-black';

                    tr.innerHTML = `
                        <td class="p-3">
                            <span class="font-bold text-gray-900 font-sans text-xs">${item.modelo}</span>
                            <span class="bg-gray-200 border border-gray-300 text-gray-900 px-1.5 py-0.2 text-[10px] font-bold ml-1">${item.placa}</span>
                        </td>
                        <td class="p-3 text-center">${badgeTipo}</td>
                        <td class="p-3 text-center">${statusTag}</td>
                        <td class="p-3 text-center text-gray-700 font-bold">${item.qtdContratos}</td>
                        <td class="p-3 text-right text-blue-800">${utils.formatMoney(item.recLocacao)}</td>
                        <td class="p-3 text-right text-gray-600">${utils.formatMoney(item.recCaucao)}</td>
                        <td class="p-3 text-right text-emerald-700 font-bold">${utils.formatMoney(item.recTotal)}</td>
                        <td class="p-3 text-right text-red-600 font-bold">${utils.formatMoney(item.gastoOficina)}</td>
                        <td class="p-3 text-right ${lucroClass}">${utils.formatMoney(item.lucroReal)}</td>
                        <td class="p-3 text-right text-gray-600">${item.margemVeic}%</td>
                    `;
                    tbRent.appendChild(tr);
                });

                const margemTotalGeral = somaTotalReceita > 0 ? ((somaTotalLucroReal / somaTotalReceita) * 100).toFixed(1) : '0.0';
                tfRent.innerHTML = `
                    <tr class="text-xs">
                        <td colspan="4" class="p-3 uppercase tracking-wider font-black text-gray-900">TOTAL GERAL APURADO:</td>
                        <td class="p-3 text-right text-blue-900 font-black">${utils.formatMoney(somaTotalLocacao)}</td>
                        <td class="p-3 text-right text-gray-700 font-black">${utils.formatMoney(somaTotalCaucao)}</td>
                        <td class="p-3 text-right text-emerald-800 font-black">${utils.formatMoney(somaTotalReceita)}</td>
                        <td class="p-3 text-right text-red-700 font-black">${utils.formatMoney(somaTotalManutencao)}</td>
                        <td class="p-3 text-right ${somaTotalLucroReal >= 0 ? 'text-emerald-800' : 'text-red-700'} font-black text-sm">${utils.formatMoney(somaTotalLucroReal)}</td>
                        <td class="p-3 text-right text-gray-900 font-black">${margemTotalGeral}%</td>
                    </tr>
                `;
            }
        }

        // 4. Gráfico Top Veículos mais rentáveis
        const topRentaveis = listaRentabilidade.slice(0, 5);
        const ctxTopV = document.getElementById('chart-veiculos-top').getContext('2d');
        chartVeiculos = new Chart(ctxTopV, {
            type: 'bar',
            data: {
                labels: topRentaveis.map(v => `${v.modelo.split(' ')[0]} (${v.placa})`),
                datasets: [{
                    label: 'Faturamento Bruto',
                    data: topRentaveis.map(v => v.recTotal),
                    backgroundColor: '#3b82f6',
                    borderRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { 
                        beginAtZero: true,
                        ticks: { callback: (val) => 'R$ ' + Number(val).toLocaleString('pt-BR') }
                    } 
                }
            }
        });

        // 5. Gráfico Top Clientes por Faturamento
        const clienteFat = {};
        entradas.forEach(f => {
            const cli = (db.clientes || []).find(c => (f.contrato_id && (db.contratos || []).some(x => x.id === f.contrato_id && x.cliente_id === c.id)) || (f.descricao && f.descricao.toLowerCase().includes(c.nome.toLowerCase().split(' ')[0])));
            const nomeCli = cli ? cli.nome.split(' ')[0] : 'Avulso';
            clienteFat[nomeCli] = (clienteFat[nomeCli] || 0) + Number(f.valor || 0);
        });
        const topClientes = Object.entries(clienteFat).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const ctxCli = document.getElementById('chart-clientes-top').getContext('2d');
        chartClientes = new Chart(ctxCli, {
            type: 'bar',
            data: {
                labels: topClientes.map(c => c[0]),
                datasets: [{
                    label: 'Receita Gerada',
                    data: topClientes.map(c => c[1]),
                    backgroundColor: '#f97316',
                    borderRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { 
                        beginAtZero: true,
                        ticks: { callback: (val) => 'R$ ' + Number(val).toLocaleString('pt-BR') }
                    } 
                }
            }
        });

        // 6. Preenchimento do Extrato Detalhado de Movimentações (Auditoria com o caderno)
        renderExtratoDetalhado(filtrados);

        // Salvar estado atual apurado para geração de PDF e impressão
        dadosRelatorioAtual = {
            inicio,
            fim,
            tipo,
            categoria,
            filtrados,
            entradas,
            saidas,
            totalEntradas,
            totalSaidas,
            lucro,
            margemPct,
            totalLocacoes,
            totalCaucoes,
            totalOficina,
            totalOutrasDespesas,
            listaRentabilidade,
            somaTotalLocacao,
            somaTotalCaucao,
            somaTotalReceita,
            somaTotalManutencao,
            somaTotalLucroReal,
            catMap
        };
    }

    function renderExtratoDetalhado(lista) {
        const tbExtrato = document.getElementById('tb-extrato-movimentacoes');
        const termoBusca = (document.getElementById('busca-extrato-rel')?.value || '').toLowerCase().trim();

        let itensExibir = lista;
        if (termoBusca) {
            itensExibir = itensExibir.filter(f => 
                (f.descricao && f.descricao.toLowerCase().includes(termoBusca)) ||
                (f.categoria && f.categoria.toLowerCase().includes(termoBusca)) ||
                (f.data && f.data.includes(termoBusca))
            );
        }

        if (!tbExtrato) return;
        tbExtrato.innerHTML = '';

        let subEntradas = 0;
        let subSaidas = 0;

        if (itensExibir.length === 0) {
            tbExtrato.innerHTML = `
                <tr>
                    <td colspan="5" class="p-8 text-center text-gray-400 font-sans">
                        <i class="ph-bold ph-receipt text-3xl mb-2 text-gray-300 block"></i>
                        Nenhuma movimentação registrada no livro caixa para os filtros atuais.
                    </td>
                </tr>
            `;
        } else {
            itensExibir.forEach(f => {
                const isEntrada = f.tipo === 'entrada';
                const v = Number(f.valor || 0);
                if (isEntrada) subEntradas += v;
                else subSaidas += v;

                const tr = document.createElement('tr');
                tr.className = "hover:bg-gray-50 border-b border-gray-100 transition-colors";

                const badgeTipo = isEntrada
                    ? '<span class="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded font-mono uppercase">+ ENTRADA</span>'
                    : '<span class="text-[9px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded font-mono uppercase">- SAÍDA</span>';

                const valorClass = isEntrada ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold';
                const sinal = isEntrada ? '+' : '-';

                const dtFmt = f.data ? new Date(f.data.includes('T') ? f.data : `${f.data}T12:00:00`).toLocaleDateString('pt-BR') : '--/--/----';

                tr.innerHTML = `
                    <td class="p-3 text-gray-600">${dtFmt}</td>
                    <td class="p-3 text-center">${badgeTipo}</td>
                    <td class="p-3 text-gray-800 font-bold">${f.categoria || 'Outros'}</td>
                    <td class="p-3 text-gray-700 font-sans text-xs">${f.descricao || '---'}</td>
                    <td class="p-3 text-right ${valorClass}">${sinal} ${utils.formatMoney(v)}</td>
                `;
                tbExtrato.appendChild(tr);
            });
        }

        const cnt = document.getElementById('txt-extrato-contador');
        if (cnt) cnt.innerText = `${itensExibir.length} lançamentos exibidos`;

        const tEnt = document.getElementById('extrato-total-entradas');
        const tSai = document.getElementById('extrato-total-saidas');
        const sFin = document.getElementById('extrato-saldo-final');

        if (tEnt) tEnt.innerText = utils.formatMoney(subEntradas);
        if (tSai) tSai.innerText = utils.formatMoney(subSaidas);
        if (sFin) {
            const saldoExt = subEntradas - subSaidas;
            sFin.innerText = utils.formatMoney(saldoExt);
            sFin.className = saldoExt >= 0 ? 'text-emerald-700 font-black' : 'text-red-600 font-black';
        }
    }

    // Busca rápida em tempo real dentro do extrato detalhado
    const inputBuscaExtrato = document.getElementById('busca-extrato-rel');
    if (inputBuscaExtrato) {
        inputBuscaExtrato.addEventListener('input', () => {
            if (dadosRelatorioAtual && dadosRelatorioAtual.filtrados) {
                renderExtratoDetalhado(dadosRelatorioAtual.filtrados);
            }
        });
    }

    // Botão Filtrar
    document.getElementById('btn-filtrar-rel').addEventListener('click', () => {
        const inicio = document.getElementById('rel-inicio').value;
        const fim = document.getElementById('rel-fim').value;
        const tipo = document.getElementById('rel-tipo').value;
        const categoria = document.getElementById('rel-categoria').value;
        carregarRelatorios(inicio, fim, tipo, categoria);
    });

    // Pílulas de período rápido
    document.querySelectorAll('.btn-pilula-periodo').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-pilula-periodo').forEach(b => {
                b.className = "btn-pilula-periodo px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-sm transition shadow-xs";
            });
            btn.className = "btn-pilula-periodo px-2.5 py-1 text-xs font-bold bg-brand-main text-brand-dark border border-brand-dark rounded-sm transition shadow-xs";

            const tipo = btn.getAttribute('data-tipo');
            const hoje = new Date();
            let ini = '';
            let fim = formatYMD(hoje);

            if (tipo === 'todos') {
                ini = '';
                fim = '';
            } else if (tipo === 'este-mes') {
                ini = formatYMD(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
            } else if (tipo === 'mes-anterior') {
                const primeiroDiaMesAnt = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
                const ultimoDiaMesAnt = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
                ini = formatYMD(primeiroDiaMesAnt);
                fim = formatYMD(ultimoDiaMesAnt);
            } else if (tipo === 'ultimos-30') {
                const trintaDias = new Date(hoje);
                trintaDias.setDate(trintaDias.getDate() - 30);
                ini = formatYMD(trintaDias);
            } else if (tipo === 'este-ano') {
                ini = formatYMD(new Date(hoje.getFullYear(), 0, 1));
            } else if (tipo === 'hoje') {
                ini = formatYMD(hoje);
            }

            document.getElementById('rel-inicio').value = ini;
            document.getElementById('rel-fim').value = fim;

            const tipoCaixa = document.getElementById('rel-tipo').value;
            const cat = document.getElementById('rel-categoria').value;
            carregarRelatorios(ini, fim, tipoCaixa, cat);
        });
    });

    // Botão Sincronizar Dados (reconciliação forçada manual com feedback ao usuário)
    document.getElementById('btn-sync-relatorio').addEventListener('click', async () => {
        showLoading('Reconciliando contratos com o livro caixa...');
        try {
            const res = await sincronizarFinanceiroComContratos();
            hideLoading();
            if (res.sincronizados > 0) {
                await showAlert(`✅ Sincronização realizada com sucesso!\n${res.sincronizados} novos lançamentos inseridos e reconciliados.`);
            } else {
                await showAlert('✅ Todos os contratos e manutenções já estão 100% sincronizados com o livro caixa.');
            }
            const inicio = document.getElementById('rel-inicio').value;
            const fim = document.getElementById('rel-fim').value;
            carregarRelatorios(inicio, fim, document.getElementById('rel-tipo').value, document.getElementById('rel-categoria').value);
        } catch (err) {
            hideLoading();
            await showAlert('Erro na sincronização: ' + err.message);
        }
    });

    // Botão Exportar CSV
    document.getElementById('btn-csv-relatorio').addEventListener('click', () => {
        if (!dadosRelatorioAtual || dadosRelatorioAtual.filtrados.length === 0) {
            showAlert('Não há dados apurados no período para exportar.');
            return;
        }
        const dataCSV = dadosRelatorioAtual.filtrados.map(f => ({
            ID: f.id,
            Data: f.data,
            Tipo: f.tipo === 'entrada' ? 'RECEITA' : 'DESPESA',
            Categoria: f.categoria || 'Geral',
            Descricao: f.descricao || '',
            Valor_R$: f.valor
        }));
        exportCSV(dataCSV, `Relatorio_Financeiro_VandoMotos_${dadosRelatorioAtual.inicio || 'Inicio'}_a_${dadosRelatorioAtual.fim || 'Atual'}`);
    });

    // =========================================================================
    // GERADOR EXECUTIVO DE PDF & IMPRESSÃO
    // =========================================================================
    async function compilarHTMLRelatorioPDF(dados) {
        const loggedUser = getUser();
        const emitidoPor = loggedUser ? (loggedUser.cpf ? `${loggedUser.nome} - (${loggedUser.cpf})` : loggedUser.nome) : 'Diretoria';
        const dataAtual = new Date();
        const dataAtualFmt = dataAtual.toLocaleDateString('pt-BR', { dateStyle: 'long' });
        const horaAtual = dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const dtIniFmt = dados.inicio ? new Date(`${dados.inicio}T12:00:00`).toLocaleDateString('pt-BR') : 'Início do Histórico';
        const dtFimFmt = dados.fim ? new Date(`${dados.fim}T12:00:00`).toLocaleDateString('pt-BR') : 'Data Atual';

        const fmtMoeda = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Tabela demonstrativa por categorias
        let linhasCategorias = '';
        const catArray = Object.entries(dados.catMap || {}).sort((a, b) => b[1] - a[1]);
        catArray.forEach(([catNome, catVal]) => {
            const pct = dados.totalEntradas > 0 ? ((catVal / (dados.totalEntradas + dados.totalSaidas)) * 100).toFixed(1) : '0.0';
            linhasCategorias += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 4px 6px;"><strong>${catNome}</strong></td>
                    <td style="padding: 4px 6px; text-align: right; font-family: monospace;">${fmtMoeda(catVal)}</td>
                    <td style="padding: 4px 6px; text-align: right; font-family: monospace; color: #555;">${pct}%</td>
                </tr>
            `;
        });

        // Tabela de rentabilidade por veículo
        let linhasVeiculos = '';
        (dados.listaRentabilidade || []).forEach(item => {
            const catStr = item.categoria === 'carro' ? 'Carro' : 'Moto';
            const statusStr = item.status === 'locado' ? 'Locado' : (item.status === 'manutencao' ? 'Oficina' : 'Livre');
            linhasVeiculos += `
                <tr style="border-bottom: 1px solid #ddd; font-size: 8.5px;">
                    <td style="padding: 4px 6px;"><strong>${item.modelo}</strong> (${item.placa})</td>
                    <td style="padding: 4px 6px; text-align: center;">${catStr}</td>
                    <td style="padding: 4px 6px; text-align: center;">${statusStr}</td>
                    <td style="padding: 4px 6px; text-align: center;">${item.qtdContratos}</td>
                    <td style="padding: 4px 6px; text-align: right; font-family: monospace;">${fmtMoeda(item.recLocacao)}</td>
                    <td style="padding: 4px 6px; text-align: right; font-family: monospace;">${fmtMoeda(item.recCaucao)}</td>
                    <td style="padding: 4px 6px; text-align: right; font-family: monospace; font-weight: bold; color: #047857;">${fmtMoeda(item.recTotal)}</td>
                    <td style="padding: 4px 6px; text-align: right; font-family: monospace; color: #b91c1c;">${fmtMoeda(item.gastoOficina)}</td>
                    <td style="padding: 4px 6px; text-align: right; font-family: monospace; font-weight: bold;">${fmtMoeda(item.lucroReal)}</td>
                    <td style="padding: 4px 6px; text-align: right; font-family: monospace;">${item.margemVeic}%</td>
                </tr>
            `;
        });

        // Extrato detalhado de movimentações
        let linhasMov = '';
        (dados.filtrados || []).forEach(f => {
            const isEnt = f.tipo === 'entrada';
            const sinal = isEnt ? '+' : '-';
            const cor = isEnt ? '#047857' : '#b91c1c';
            const dt = f.data ? new Date(f.data.includes('T') ? f.data : `${f.data}T12:00:00`).toLocaleDateString('pt-BR') : '';
            linhasMov += `
                <tr style="border-bottom: 1px solid #eee; font-size: 8px;">
                    <td style="padding: 3px 5px; font-family: monospace;">${dt}</td>
                    <td style="padding: 3px 5px; text-align: center; font-weight: bold; color: ${cor};">${isEnt ? 'RECEITA' : 'DESPESA'}</td>
                    <td style="padding: 3px 5px;">${f.categoria || 'Geral'}</td>
                    <td style="padding: 3px 5px;">${f.descricao || '---'}</td>
                    <td style="padding: 3px 5px; text-align: right; font-family: monospace; font-weight: bold; color: ${cor};">${sinal} ${fmtMoeda(f.valor)}</td>
                </tr>
            `;
        });

        const margemGeral = dados.totalEntradas > 0 ? ((dados.lucro / dados.totalEntradas) * 100).toFixed(1) : '0.0';

        const html = `
            <div style="font-family: Arial, sans-serif; color: #000; font-size: 9px; line-height: 1.4; padding: 8mm; max-width: 100%; background: #fff;">
                <!-- CABEÇALHO INSTITUCIONAL -->
                <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px;">
                    <h1 style="margin: 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">VANDO MOTOS LOCADORA LTDA</h1>
                    <p style="margin: 2px 0 0; font-size: 8px; color: #333;">
                        CNPJ: 28.623.431/0001-23 | Rua Algodoeiro, 4581 - Caladinho, Porto Velho/RO | Telefone: (69) 99222-2722
                    </p>
                    <h2 style="margin: 6px 0 0; font-size: 11px; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
                        RELATÓRIO FINANCEIRO GERENCIAL & BALANÇO DE FROTA
                    </h2>
                </div>

                <!-- METADADOS DO PERÍODO -->
                <div style="background: #f3f4f6; border: 1px solid #d1d5db; padding: 6px 10px; margin-bottom: 12px; font-size: 8.5px; display: flex; justify-content: space-between;">
                    <div>
                        <strong>Período Apurado:</strong> ${dtIniFmt} até ${dtFimFmt}<br>
                        <strong>Filtro de Caixa:</strong> ${dados.tipo === 'entrada' ? 'Apenas Receitas' : (dados.tipo === 'saida' ? 'Apenas Despesas' : 'Geral (Entradas e Saídas)')} | 
                        <strong>Categoria:</strong> ${dados.categoria === 'todas' ? 'Todas' : dados.categoria}
                    </div>
                    <div style="text-align: right;">
                        <strong>Emissão:</strong> ${dataAtual.toLocaleDateString('pt-BR')} às ${horaAtual}<br>
                        <strong>Emitido por:</strong> ${emitidoPor}
                    </div>
                </div>

                <!-- QUADRO RESUMO EXECUTIVO (KPIS) -->
                <div style="margin-bottom: 14px;">
                    <h3 style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; background: #e5e7eb; padding: 3px 6px; margin: 0 0 4px; border-left: 3px solid #000;">
                        1. DEMONSTRATIVO DE RESULTADOS CONSOLIDADO (DRE)
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 9px; border: 1px solid #ccc; background: #fafafa;">
                        <tr>
                            <td style="padding: 6px; border: 1px solid #e5e7eb; width: 25%;">
                                <span style="font-size: 8px; color: #555; text-transform: uppercase; display: block;">Total de Receitas (Entradas):</span>
                                <strong style="font-size: 12px; color: #047857; font-family: monospace;">${fmtMoeda(dados.totalEntradas)}</strong>
                                <span style="font-size: 7.5px; color: #666; display: block; margin-top: 2px;">Locação: ${fmtMoeda(dados.totalLocacoes)} | Caução: ${fmtMoeda(dados.totalCaucoes)}</span>
                            </td>
                            <td style="padding: 6px; border: 1px solid #e5e7eb; width: 25%;">
                                <span style="font-size: 8px; color: #555; text-transform: uppercase; display: block;">Total de Despesas (Saídas):</span>
                                <strong style="font-size: 12px; color: #b91c1c; font-family: monospace;">${fmtMoeda(dados.totalSaidas)}</strong>
                                <span style="font-size: 7.5px; color: #666; display: block; margin-top: 2px;">Oficina: ${fmtMoeda(dados.totalOficina)} | Outras: ${fmtMoeda(dados.totalOutrasDespesas)}</span>
                            </td>
                            <td style="padding: 6px; border: 1px solid #e5e7eb; width: 25%; background: #fefce8;">
                                <span style="font-size: 8px; color: #555; text-transform: uppercase; display: block;">Lucro Líquido Real (Balanço):</span>
                                <strong style="font-size: 13px; color: ${dados.lucro >= 0 ? '#047857' : '#b91c1c'}; font-family: monospace;">${fmtMoeda(dados.lucro)}</strong>
                                <span style="font-size: 7.5px; color: #666; display: block; margin-top: 2px;">Margem Operacional: <strong>${margemGeral}%</strong></span>
                            </td>
                            <td style="padding: 6px; border: 1px solid #e5e7eb; width: 25%;">
                                <span style="font-size: 8px; color: #555; text-transform: uppercase; display: block;">Operação da Frota:</span>
                                <strong style="font-size: 11px; color: #1e3a8a;">${(db.contratos || []).filter(c => c.status === 'ativo').length} Locações Ativas</strong>
                                <span style="font-size: 7.5px; color: #666; display: block; margin-top: 2px;">Total Frota: ${(db.veiculos || []).length} veículos cadastrados</span>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- QUADRO DE CATEGORIAS -->
                <div style="margin-bottom: 14px;">
                    <h3 style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; background: #e5e7eb; padding: 3px 6px; margin: 0 0 4px; border-left: 3px solid #000;">
                        2. DISTRIBUIÇÃO FINANCEIRA POR CATEGORIA
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 8.5px; border: 1px solid #ddd;">
                        <thead style="background: #f3f4f6;">
                            <tr>
                                <th style="padding: 4px 6px; text-align: left;">Categoria</th>
                                <th style="padding: 4px 6px; text-align: right;">Volume Financeiro</th>
                                <th style="padding: 4px 6px; text-align: right;">Participação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${linhasCategorias}
                        </tbody>
                    </table>
                </div>

                <!-- TABELA ANALÍTICA DE VEÍCULOS -->
                <div style="margin-bottom: 14px; page-break-inside: avoid;">
                    <h3 style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; background: #e5e7eb; padding: 3px 6px; margin: 0 0 4px; border-left: 3px solid #000;">
                        3. RENTABILIDADE E DESEMPENHO REAL POR VEÍCULO
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 8px; border: 1px solid #ccc;">
                        <thead style="background: #f3f4f6; text-transform: uppercase;">
                            <tr>
                                <th style="padding: 4px 6px; text-align: left;">Veículo / Placa</th>
                                <th style="padding: 4px 6px; text-align: center;">Tipo</th>
                                <th style="padding: 4px 6px; text-align: center;">Status</th>
                                <th style="padding: 4px 6px; text-align: center;">Contratos</th>
                                <th style="padding: 4px 6px; text-align: right;">Locações</th>
                                <th style="padding: 4px 6px; text-align: right;">Caução</th>
                                <th style="padding: 4px 6px; text-align: right;">Faturamento</th>
                                <th style="padding: 4px 6px; text-align: right;">Oficina/Peças</th>
                                <th style="padding: 4px 6px; text-align: right;">Lucro Real</th>
                                <th style="padding: 4px 6px; text-align: right;">Margem</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${linhasVeiculos}
                        </tbody>
                        <tfoot style="background: #e5e7eb; font-weight: bold;">
                            <tr>
                                <td colspan="4" style="padding: 4px 6px; text-transform: uppercase;">TOTAL GERAL:</td>
                                <td style="padding: 4px 6px; text-align: right; font-family: monospace;">${fmtMoeda(dados.somaTotalLocacao)}</td>
                                <td style="padding: 4px 6px; text-align: right; font-family: monospace;">${fmtMoeda(dados.somaTotalCaucao)}</td>
                                <td style="padding: 4px 6px; text-align: right; font-family: monospace; color: #047857;">${fmtMoeda(dados.somaTotalReceita)}</td>
                                <td style="padding: 4px 6px; text-align: right; font-family: monospace; color: #b91c1c;">${fmtMoeda(dados.somaTotalManutencao)}</td>
                                <td style="padding: 4px 6px; text-align: right; font-family: monospace;">${fmtMoeda(dados.somaTotalLucroReal)}</td>
                                <td style="padding: 4px 6px; text-align: right; font-family: monospace;">${margemGeral}%</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <!-- EXTRATO DETALHADO -->
                <div style="margin-bottom: 14px;">
                    <h3 style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; background: #e5e7eb; padding: 3px 6px; margin: 0 0 4px; border-left: 3px solid #000;">
                        4. EXTRATO ANALÍTICO DE MOVIMENTAÇÕES DO PERÍODO
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 8px; border: 1px solid #ddd;">
                        <thead style="background: #f3f4f6; text-transform: uppercase;">
                            <tr>
                                <th style="padding: 3px 5px; text-align: left;">Data</th>
                                <th style="padding: 3px 5px; text-align: center;">Tipo</th>
                                <th style="padding: 3px 5px; text-align: left;">Categoria</th>
                                <th style="padding: 3px 5px; text-align: left;">Descrição</th>
                                <th style="padding: 3px 5px; text-align: right;">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${linhasMov}
                        </tbody>
                        <tfoot style="background: #f3f4f6; font-weight: bold;">
                            <tr>
                                <td colspan="4" style="padding: 4px 5px; text-align: right;">SALDO CONSOLIDADO DO EXTRATO:</td>
                                <td style="padding: 4px 5px; text-align: right; font-family: monospace; color: ${dados.lucro >= 0 ? '#047857' : '#b91c1c'};">${fmtMoeda(dados.lucro)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <!-- ENCERRAMENTO & ASSINATURAS -->
                <div style="margin-top: 25px; page-break-inside: avoid;">
                    <p style="margin: 0 0 20px; text-align: right; font-size: 8.5px;">
                        Porto Velho/RO, ${dataAtualFmt}.
                    </p>
                    
                    <div style="display: flex; justify-content: space-between; margin-top: 30px;">
                        <div style="text-align: center; width: 45%;">
                            <div style="border-top: 1px solid #000; padding-top: 4px;">
                                <strong>VANDO MOTOS LOCADORA LTDA</strong><br>
                                <span style="font-size: 7.5px; color: #555;">Diretoria Executiva / Representante Legal</span>
                            </div>
                        </div>
                        <div style="text-align: center; width: 45%;">
                            <div style="border-top: 1px solid #000; padding-top: 4px;">
                                <strong>${emitidoPor}</strong><br>
                                <span style="font-size: 7.5px; color: #555;">Responsável Financeiro / Emissor</span>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 15px; text-align: center; font-size: 7px; color: #777; border-top: 1px dashed #ddd; padding-top: 4px;">
                        Documento gerado eletronicamente pelo Sistema Vando Motos ERP Enterprise. Todos os direitos reservados.
                    </div>
                </div>
            </div>
        `;
        return html;
    }

    async function processarPDFRelatorio(paraImpressao = false) {
        if (!dadosRelatorioAtual || dadosRelatorioAtual.filtrados.length === 0) {
            await showAlert('Não existem dados filtrados para gerar o relatório em PDF.');
            return;
        }

        showLoading(paraImpressao ? 'Preparando documento para impressão...' : 'Gerando relatório oficial em PDF...');
        try {
            const htmlConteudo = await compilarHTMLRelatorioPDF(dadosRelatorioAtual);
            const containerTemporario = document.createElement('div');
            containerTemporario.style.width = '100%';
            containerTemporario.style.background = '#fff';
            containerTemporario.innerHTML = htmlConteudo;

            const opt = {
                margin: 6,
                filename: `Relatorio_VandoMotos_${dadosRelatorioAtual.inicio || 'Inicio'}_a_${dadosRelatorioAtual.fim || 'Atual'}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            const pdfWorker = html2pdf().set(opt).from(containerTemporario);
            const pdf = await pdfWorker.toPdf().get('pdf');
            const pdfBlob = pdf.output('blob');

            const nomeArquivo = `Relatorio_Financeiro_VandoMotos_${dadosRelatorioAtual.inicio || 'Inicio'}_a_${dadosRelatorioAtual.fim || 'Atual'}_${Date.now()}.pdf`;
            await salvarPDFNoDisco(pdfBlob, nomeArquivo, 'relatorios_pdf');

            hideLoading();

            if (paraImpressao) {
                imprimirPDFDireto(pdfBlob);
                abrirVisualizadorPDF(pdfBlob, 'Imprimir Relatório Gerencial - Vando Motos');
            } else {
                abrirVisualizadorPDF(pdfBlob, 'Relatório Financeiro & Gerencial - Vando Motos');
            }
        } catch (error) {
            hideLoading();
            console.error('Erro ao gerar PDF do relatório:', error);
            await showAlert('Erro ao gerar relatório em PDF: ' + error.message);
        }
    }

    // Ação do Botão Exportar PDF
    document.getElementById('btn-pdf-relatorio').addEventListener('click', () => {
        processarPDFRelatorio(false);
    });

    // Ação do Botão Imprimir
    document.getElementById('btn-imprimir-relatorio').addEventListener('click', () => {
        processarPDFRelatorio(true);
    });

    // Inicialização segura: executa reconciliação de dados ao abrir e carrega o período adequado
    sincronizarFinanceiroComContratos().then(() => {
        // Se houver lançamentos no mês atual, usa o mês atual; caso contrário, abre com "Todo o Histórico"
        const hoje = new Date();
        const inicioMesAtual = formatYMD(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
        const hojeFormatado = formatYMD(hoje);

        const temMovimentosNoMes = (db.financeiro || []).some(f => f.data && f.data.slice(0, 10) >= inicioMesAtual);

        if (temMovimentosNoMes) {
            document.getElementById('rel-inicio').value = inicioMesAtual;
            document.getElementById('rel-fim').value = hojeFormatado;
            carregarRelatorios(inicioMesAtual, hojeFormatado, 'todos', 'todas');
        } else {
            // Abre com todo o histórico para que Seu Vando nunca veja zeros ao abrir o sistema
            document.getElementById('rel-inicio').value = '';
            document.getElementById('rel-fim').value = '';
            carregarRelatorios('', '', 'todos', 'todas');
        }
    }).catch(err => {
        console.error('Erro na inicialização de relatórios:', err);
        carregarRelatorios('', '', 'todos', 'todas');
    });
}
