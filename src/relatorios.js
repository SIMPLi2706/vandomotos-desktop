import { db, utils } from './db.js';
import { showAlert } from './modal.js';

let chartLucro = null;
let chartVeiculos = null;
let chartClientes = null;

export function renderRelatorios(container) {
    container.innerHTML = `
        <div class="fade-enter">
            <h2 class="text-lg font-black mb-4">📊 Relatórios Gerenciais</h2>
            <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 bg-white p-4 border border-gray-200 shadow-soft">
                <div>
                    <label class="block text-xs font-bold uppercase mb-1">Data Início</label>
                    <input type="date" id="rel-inicio" class="w-full p-2 border text-sm outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase mb-1">Data Fim</label>
                    <input type="date" id="rel-fim" class="w-full p-2 border text-sm outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase mb-1">Tipo de Caixa</label>
                    <select id="rel-tipo" class="w-full p-2 border text-sm bg-white font-bold outline-none">
                        <option value="todos">Todos (Entradas e Saídas)</option>
                        <option value="entrada">Apenas Receitas (Entradas)</option>
                        <option value="saida">Apenas Despesas (Saídas)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase mb-1">Categoria</label>
                    <select id="rel-categoria" class="w-full p-2 border text-sm bg-white outline-none">
                        <option value="todas">Todas as Categorias</option>
                        <option value="Locação Semanal">Locação Semanal</option>
                        <option value="Caução">Caução</option>
                        <option value="Manutenção de Frota">Manutenção de Frota</option>
                        <option value="Impostos e Taxas">Impostos e Taxas</option>
                        <option value="Infraestrutura">Infraestrutura</option>
                        <option value="Serviços Terceirizados">Serviços Terceirizados</option>
                        <option value="Outros">Outros</option>
                    </select>
                </div>
                <div class="flex items-end">
                    <button id="btn-filtrar-rel" class="w-full bg-brand-dark hover:bg-black text-brand-main px-4 py-2.5 font-bold shadow-hard border border-gray-900 uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition"><i class="ph ph-funnel"></i> Filtrar</button>
                </div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white p-4 border border-gray-200 shadow-soft">
                    <h3 class="text-xs font-black uppercase tracking-widest mb-2">📈 Lucro por Período</h3>
                    <div class="relative h-[200px] w-full">
                        <canvas id="chart-lucro"></canvas>
                    </div>
                    <div class="mt-2 text-sm font-bold">Total Balanço: <span id="total-lucro" class="text-emerald-600 font-mono text-base font-black">R$ 0,00</span></div>
                </div>
                <div class="bg-white p-4 border border-gray-200 shadow-soft">
                    <h3 class="text-xs font-black uppercase tracking-widest mb-2">🏍️ Veículos Mais Alugados</h3>
                    <div class="relative h-[200px] w-full">
                        <canvas id="chart-veiculos-top"></canvas>
                    </div>
                </div>
                <div class="bg-white p-4 border border-gray-200 shadow-soft lg:col-span-2">
                    <h3 class="text-xs font-black uppercase tracking-widest mb-2">👤 Clientes com Mais Contratos</h3>
                    <div class="relative h-[150px] w-full">
                        <canvas id="chart-clientes-top"></canvas>
                    </div>
                </div>
                <div class="bg-white p-4 border border-gray-200 shadow-soft lg:col-span-2">
                    <h3 class="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 text-gray-900">
                        <i class="ph-bold ph-calculator text-base text-brand-main"></i> Rentabilidade e Lucro Líquido Real por Veículo (Faturamento vs Oficina)
                    </h3>
                    <div class="overflow-x-auto custom-scroll">
                        <table class="w-full text-left text-xs font-mono border-collapse">
                            <thead>
                                <tr class="bg-gray-100 border-b border-gray-300 font-bold text-gray-700 uppercase">
                                    <th class="p-2">Veículo / Placa</th>
                                    <th class="p-2">Categoria</th>
                                    <th class="p-2 text-right text-emerald-700">Total Receita</th>
                                    <th class="p-2 text-right text-red-700">Total Manutenções</th>
                                    <th class="p-2 text-right">Lucro Líquido Real</th>
                                </tr>
                            </thead>
                            <tbody id="tb-rentabilidade-veiculos" class="divide-y divide-gray-100"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    function carregarRelatorios(inicio, fim, tipo, categoria) {
        // Destruir gráficos antigos
        if (chartLucro) chartLucro.destroy();
        if (chartVeiculos) chartVeiculos.destroy();
        if (chartClientes) chartClientes.destroy();

        // Filtrar financeiro com filtros avançados
        let filtrados = db.financeiro;
        if (inicio && fim) {
            filtrados = filtrados.filter(f => f.data >= inicio && f.data <= fim);
        }
        if (tipo && tipo !== 'todos') {
            filtrados = filtrados.filter(f => f.tipo === tipo);
        }
        if (categoria && categoria !== 'todas') {
            filtrados = filtrados.filter(f => f.categoria === categoria);
        }

        let entradas = filtrados.filter(f => f.tipo === 'entrada');
        let saidas = filtrados.filter(f => f.tipo === 'saida');
        
        const totalEntradas = entradas.reduce((acc, f) => acc + Number(f.valor), 0);
        const totalSaidas = saidas.reduce((acc, f) => acc + Number(f.valor), 0);
        const lucro = totalEntradas - totalSaidas;
        
        const totalLucroLabel = document.getElementById('total-lucro');
        totalLucroLabel.innerText = utils.formatMoney(lucro);
        if (lucro < 0) {
            totalLucroLabel.className = "text-red-600 font-mono text-base font-black";
        } else {
            totalLucroLabel.className = "text-emerald-600 font-mono text-base font-black";
        }

        // Gráfico de lucro
        const ctxLucro = document.getElementById('chart-lucro').getContext('2d');
        chartLucro = new Chart(ctxLucro, {
            type: 'bar',
            data: {
                labels: ['Entradas', 'Saídas', 'Lucro'],
                datasets: [{
                    label: 'Valores',
                    data: [totalEntradas, totalSaidas, lucro],
                    backgroundColor: ['#10b981', '#ef4444', '#facc15'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });

        // Veículos mais alugados
        const contratos = db.contratos;
        const veiculoCount = {};
        contratos.forEach(c => {
            const vei = db.veiculos.find(v => v.id === c.veiculo_id);
            if (vei) {
                const key = `${vei.modelo} (${vei.placa})`;
                veiculoCount[key] = (veiculoCount[key] || 0) + 1;
            }
        });
        const topVeiculos = Object.entries(veiculoCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const ctxVeiculos = document.getElementById('chart-veiculos-top').getContext('2d');
        chartVeiculos = new Chart(ctxVeiculos, {
            type: 'bar',
            data: {
                labels: topVeiculos.map(v => v[0]),
                datasets: [{
                    label: 'Quantidade de Contratos',
                    data: topVeiculos.map(v => v[1]),
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, stepSize: 1 } }
            }
        });

        // Clientes com mais contratos
        const clienteCount = {};
        contratos.forEach(c => {
            const cli = db.clientes.find(cl => cl.id === c.cliente_id);
            if (cli) {
                clienteCount[cli.nome] = (clienteCount[cli.nome] || 0) + 1;
            }
        });
        const topClientes = Object.entries(clienteCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const ctxClientes = document.getElementById('chart-clientes-top').getContext('2d');
        chartClientes = new Chart(ctxClientes, {
            type: 'bar',
            data: {
                labels: topClientes.map(c => c[0]),
                datasets: [{
                    label: 'Contratos',
                    data: topClientes.map(c => c[1]),
                    backgroundColor: '#f97316'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, stepSize: 1 } }
            }
        });

        // Rentabilidade por Veículo (Faturamento Bruto vs Oficina/Manutenção)
        const tbRent = document.getElementById('tb-rentabilidade-veiculos');
        if (tbRent) {
            tbRent.innerHTML = '';
            if (db.veiculos.length === 0) {
                tbRent.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-gray-400">Nenhum veículo cadastrado na frota.</td></tr>';
            } else {
                db.veiculos.forEach(v => {
                    const contratosDoV = db.contratos.filter(c => c.veiculo_id === v.id);
                    const idsContratos = contratosDoV.map(c => c.id);
                    
                    // Soma de entradas financeiras para este veículo
                    const receita = db.financeiro
                        .filter(f => f.tipo === 'entrada' && (f.descricao.includes(v.placa) || (f.contrato_id && idsContratos.includes(f.contrato_id))))
                        .reduce((acc, f) => acc + Number(f.valor), 0);

                    // Soma de manutenções registradas para este veículo
                    let gastoManutencao = 0;
                    try {
                        const mList = typeof v.manutencoes === 'string' ? JSON.parse(v.manutencoes) : (v.manutencoes || []);
                        gastoManutencao = mList.reduce((acc, m) => acc + Number(m.valor || 0), 0);
                    } catch {
                        gastoManutencao = 0;
                    }

                    const lucroReal = receita - gastoManutencao;
                    const catTag = v.categoria === 'carro' ? '🚗 Carro' : '🏍️ Moto';
                    const lucroClass = lucroReal >= 0 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold';

                    const tr = document.createElement('tr');
                    tr.className = "hover:bg-gray-50 border-b border-gray-100";
                    tr.innerHTML = `
                        <td class="p-2 font-bold text-gray-900">${v.modelo} <span class="bg-gray-200 px-1 text-[10px]">${v.placa}</span></td>
                        <td class="p-2 text-gray-600">${catTag}</td>
                        <td class="p-2 text-right text-emerald-700 font-bold">${utils.formatMoney(receita)}</td>
                        <td class="p-2 text-right text-red-600 font-bold">${utils.formatMoney(gastoManutencao)}</td>
                        <td class="p-2 text-right ${lucroClass}">${utils.formatMoney(lucroReal)}</td>
                    `;
                    tbRent.appendChild(tr);
                });
            }
        }
    }

    document.getElementById('btn-filtrar-rel').addEventListener('click', () => {
        const inicio = document.getElementById('rel-inicio').value;
        const fim = document.getElementById('rel-fim').value;
        const tipo = document.getElementById('rel-tipo').value;
        const categoria = document.getElementById('rel-categoria').value;
        carregarRelatorios(inicio, fim, tipo, categoria);
    });

    // Carregar com mês atual
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    document.getElementById('rel-inicio').value = inicioMes.toISOString().split('T')[0];
    document.getElementById('rel-fim').value = hoje.toISOString().split('T')[0];
    carregarRelatorios(document.getElementById('rel-inicio').value, document.getElementById('rel-fim').value, 'todos', 'todas');
}
