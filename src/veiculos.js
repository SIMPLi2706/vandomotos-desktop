import { db, utils } from './db.js';
import { showAlert, showConfirm } from './modal.js';
import { showLoading, hideLoading } from './loading.js';
import { handleFileUpload, showLightbox } from './fileUtils.js';
import { exportCSV } from './csvUtils.js';

export function renderVeiculos(container, exportCSV) {
    container.innerHTML = `
        <div class="flex flex-col h-full fade-enter">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div class="relative w-full md:max-w-md flex gap-2">
                    <input type="text" id="busca-veiculos" placeholder="Buscar por placa, modelo ou RENAVAM..." class="w-full pl-10 pr-4 py-2 border border-gray-200 text-sm focus:ring-0 outline-none transition shadow-sm">
                    <button id="btn-export-csv-veiculos" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 text-xs font-bold uppercase transition flex items-center gap-1 shadow-sm whitespace-nowrap">
                        <i class="ph-bold ph-file-csv text-sm"></i> CSV
                    </button>
                </div>
                <button id="btn-novo-veiculo" class="w-full md:w-auto justify-center bg-brand-dark hover:bg-black text-white px-5 py-3 md:py-2.5 font-bold text-sm flex items-center gap-2 border border-gray-800 transition-all shadow-hard">
                    <i class="ph-bold ph-motorcycle text-brand-main text-lg"></i> Adicionar Veículo
                </button>
            </div>

            <div class="bg-white border border-gray-200 shadow-soft flex-1 overflow-hidden flex flex-col">
                <div class="overflow-x-auto flex-1 custom-scroll">
                    <table class="w-full text-left border-collapse whitespace-nowrap text-sm">
                        <thead>
                            <tr class="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider font-mono">
                                <th class="px-6 py-4 font-bold">Placa / Modelo</th>
                                <th class="px-6 py-4 font-bold">Documentação Legal</th>
                                <th class="px-6 py-4 font-bold">Odômetro / Óleo</th>
                                <th class="px-6 py-4 font-bold">Combustível</th>
                                <th class="px-6 py-4 font-bold">Status Pátio</th>
                                <th class="px-6 py-4 font-bold text-right">Painel de Controle</th>
                            </tr>
                        </thead>
                        <tbody id="tb-veiculos" class="divide-y divide-gray-100"></tbody>
                    </table>
                </div>
                <div id="veiculos-empty" class="hidden flex-col items-center justify-center py-16 text-center">
                    <i class="ph ph-motorcycle text-5xl text-gray-300 mb-3"></i>
                    <p class="text-sm text-gray-500 font-bold uppercase tracking-wider">Frota vazia na Nuvem</p>
                </div>
            </div>
        </div>

        <!-- MODAL VEÍCULO -->
        <div id="modal-veiculo" class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4 transition-opacity opacity-0">
            <div class="bg-white border border-gray-900 w-full max-w-4xl shadow-2xl overflow-hidden transform scale-95 transition-transform flex flex-col max-h-[90vh]" id="modal-veiculo-panel">
                <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 class="text-lg font-black text-gray-900 uppercase tracking-tight" id="modal-veiculo-title">Ficha Técnica do Patrimônio</h2>
                        <p class="text-xs text-gray-500 font-mono mt-0.5">Gestão de Ativos e Vistoria Operacional</p>
                    </div>
                    <button id="btn-fechar-modal-v" class="text-gray-400 hover:text-red-600 transition p-1"><i class="ph ph-x text-2xl"></i></button>
                </div>

                <div class="bg-gray-100 px-6 border-b border-gray-200 flex gap-2">
                    <button id="tab-dados-v" class="px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-brand-dark text-brand-dark bg-white mt-1">1. Registro e Documentos</button>
                    <button id="tab-vistoria-v" class="px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent text-gray-500 hover:text-gray-800 mt-1">2. Painel de Vistoria Atual</button>
                    <button id="tab-manutencoes-v" class="px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent text-gray-500 hover:text-gray-800 mt-1">3. Histórico de Manutenções</button>
                </div>

                <form id="form-veiculo" class="overflow-y-auto flex-1 p-6 space-y-6 custom-scroll bg-white">
                    <input type="hidden" id="v-id">

                    <div id="conteudo-tab-dados-v" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Categoria *</label>
                                <select id="v-categoria" required class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-bold bg-white">
                                    <option value="moto">🏍️ Moto</option>
                                    <option value="carro">🚗 Carro</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Placa *</label>
                                <input type="text" id="v-placa" required placeholder="ABC1D23" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none uppercase font-mono font-bold">
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Modelo Comercial / Cor *</label>
                                <input type="text" id="v-modelo" required placeholder="Ex: Honda Titan 160 EX / Fiat Uno" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Ano / Modelo</label>
                                <input type="number" id="v-ano" placeholder="2023" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                            </div>
                        </div>

                        <div class="border-t border-gray-200 pt-4">
                            <h3 class="text-xs font-extrabold text-brand-hover uppercase tracking-widest mb-4 flex items-center gap-2">
                                <i class="ph ph-identification-card text-base"></i> Registros Legais e Valores
                            </h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">RENAVAM</label>
                                    <input type="text" id="v-renavam" placeholder="Apenas números" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-mono">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Chassi</label>
                                    <input type="text" id="v-chassi" placeholder="Apenas números/letras" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-mono uppercase">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Valor Tabela FIPE (R$)</label>
                                    <input type="number" id="v-fipe" placeholder="15000" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                                </div>
                            </div>
                        </div>

                        <div class="border-t border-gray-200 pt-4">
                            <h3 class="text-xs font-extrabold text-gray-900 uppercase tracking-widest mb-3">
                                Licenciamento e CRLV Digital
                            </h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                <div class="bg-gray-50 border border-gray-200 p-4 relative">
                                    <div class="absolute top-4 right-4" id="badge-validacao-doc">
                                        <span class="text-[10px] font-bold px-2 py-1 bg-gray-200 text-gray-500 uppercase">Pendente</span>
                                    </div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Vencimento do Documento</label>
                                    <input type="date" id="v-doc" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none text-gray-800 font-bold mt-2">
                                    <p class="text-[10px] text-gray-500 mt-2">O sistema fará a auditoria automática desta data.</p>
                                </div>

                                <div class="border border-dashed border-gray-300 p-4 flex flex-col justify-between bg-white">
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Anexar Documento (CRLV/Verdinho)</label>
                                        <input type="file" id="file-doc-moto" accept="image/*,.pdf" class="text-xs text-gray-500 file:mr-4 file:py-1 file:px-2 file:border-0 file:bg-brand-dark file:text-brand-main file:font-bold hover:file:bg-black w-full">
                                    </div>
                                    <div id="preview-doc-box" class="mt-3 hidden text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 p-2 border border-emerald-200">
                                        <i class="ph-fill ph-check-circle text-base"></i> Arquivo na Nuvem! <button type="button" id="btn-ver-doc" class="text-emerald-800 underline ml-2 font-bold hover:text-black">Visualizar</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="conteudo-tab-vistoria-v" class="hidden space-y-6">
                        <div class="bg-gray-50 border border-gray-200 p-5">
                            <h3 class="text-xs font-extrabold text-brand-hover uppercase tracking-widest mb-4 flex items-center gap-2">
                                <i class="ph ph-sliders text-base"></i> Vistoria de Saída / Chegada
                            </h3>
                            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label id="lbl-status-veiculo" class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Situação do Veículo</label>
                                    <select id="v-status" class="w-full px-3 py-2 border border-gray-300 text-sm bg-white focus:border-brand-main outline-none font-bold">
                                        <option value="disponivel">Livre (No Pátio)</option>
                                        <option value="manutencao">Oficina / Quebrada</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">KM Atual no Painel</label>
                                    <input type="number" id="v-km-atual" placeholder="0" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-mono">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">KM Próx. Óleo</label>
                                    <input type="number" id="v-km-oleo" placeholder="0" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-mono text-gray-500">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Traços de Gasolina</label>
                                    <select id="v-combustivel" class="w-full px-3 py-2 border border-gray-300 text-sm bg-white focus:border-brand-main outline-none">
                                        <option value="0">0 Traços (Reserva Seca)</option>
                                        <option value="1">1 Traço</option>
                                        <option value="2">2 Traços</option>
                                        <option value="3">3 Traços (Meio Tanque)</option>
                                        <option value="4">4 Traços</option>
                                        <option value="5">5 Traços</option>
                                        <option value="6" selected>6 Traços (Tanque Cheio)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="border border-dashed border-gray-300 p-6 flex flex-col justify-center items-center bg-gray-50 text-center relative overflow-hidden">
                            <i class="ph ph-camera text-4xl text-gray-400 mb-2"></i>
                            <h4 class="text-sm font-bold text-gray-700 uppercase mb-1">Foto do Estado Físico (Vistoria)</h4>
                            <p id="desc-foto-vistoria" class="text-xs text-gray-500 mb-4 max-w-sm">Tire uma foto para atestar ranhuras, pneus e lataria do veículo antes de entregar a chave.</p>
                            <label class="bg-gray-900 text-white px-4 py-2 text-xs font-bold cursor-pointer hover:bg-black transition border border-gray-700 shadow-hard relative z-10">
                                Subir Foto da Vistoria
                                <input type="file" id="file-foto-moto" accept="image/*" class="hidden">
                            </label>
                            <div id="preview-moto-box" class="mt-4 hidden w-full relative z-10">
                                <div class="p-3 bg-brand-light border border-brand-main text-brand-hover text-xs font-bold flex justify-between items-center">
                                    <span class="flex items-center gap-2"><i class="ph-fill ph-check-circle text-base"></i> Vistoria Registrada!</span>
                                    <button type="button" id="btn-ver-moto" class="underline text-black hover:text-brand-main">Ver Imagem</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="conteudo-tab-manutencoes-v" class="hidden space-y-6">
                        <div class="flex justify-between items-center bg-gray-50 border border-gray-200 p-4 rounded-sm">
                            <div>
                                <h3 class="text-xs font-extrabold text-brand-hover uppercase tracking-widest">Manutenções e Revisões Preventivas</h3>
                                <p class="text-[10px] text-gray-500 font-mono mt-0.5">Controle de Óleo, Freios, Pneus e Consertos da Frota</p>
                            </div>
                            <button type="button" id="btn-adicionar-manutencao" class="bg-brand-dark hover:bg-black text-white px-3 py-1.5 rounded-sm font-bold text-xs uppercase flex items-center gap-1 shadow-sm transition">
                                <i class="ph-bold ph-plus text-xs"></i> Registrar
                            </button>
                        </div>
                        
                        <div class="overflow-x-auto max-h-[300px] border border-gray-200 rounded custom-scroll">
                            <table class="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr class="bg-gray-50 border-b border-gray-200 font-bold uppercase text-[9px] text-gray-500 font-mono tracking-wider">
                                        <th class="px-4 py-3">Data</th>
                                        <th class="px-4 py-3">Tipo</th>
                                        <th class="px-4 py-3">KM</th>
                                        <th class="px-4 py-3">Custo</th>
                                        <th class="px-4 py-3">Descrição / Peças</th>
                                        <th class="px-4 py-3 text-right">Excluir</th>
                                    </tr>
                                </thead>
                                <tbody id="tb-manutencoes-veiculo" class="divide-y divide-gray-100"></tbody>
                            </table>
                        </div>
                        
                        <div id="form-nova-manutencao" class="hidden border border-dashed border-brand-dark bg-gray-50 p-4 rounded-sm space-y-4">
                            <h4 class="text-xs font-black text-gray-900 uppercase">Registo de Manutenção Operacional</h4>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                    <label class="block text-[9px] font-black text-gray-500 uppercase mb-0.5">Data da Revisão *</label>
                                    <input type="date" id="m-data" class="w-full px-2 py-1 border border-gray-300 text-xs bg-white">
                                </div>
                                <div>
                                    <label class="block text-[9px] font-black text-gray-500 uppercase mb-0.5">Tipo de Serviço *</label>
                                    <select id="m-tipo" class="w-full px-2 py-1 border border-gray-300 text-xs bg-white font-bold">
                                        <option value="oleo">Troca de Óleo / Filtros</option>
                                        <option value="freio">Freios (Pastilhas/Discos/Lonas)</option>
                                        <option value="pneu">Pneus / Alinhamento / Balanceamento</option>
                                        <option value="relacao">Kit Relação / Corrente (Moto)</option>
                                        <option value="arrefecimento">Sistema de Arrefecimento / Água (Carro)</option>
                                        <option value="suspensao">Amortecedores / Suspensão</option>
                                        <option value="velas">Velas / Injeção / Correia</option>
                                        <option value="revisao">Revisão Geral Preventiva</option>
                                        <option value="outro">Outros / Consertos / Funilaria</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[9px] font-black text-gray-500 uppercase mb-0.5">Quilometragem (KM) *</label>
                                    <input type="number" id="m-km" class="w-full px-2 py-1 border border-gray-300 text-xs font-bold font-mono">
                                </div>
                                <div>
                                    <label class="block text-[9px] font-black text-gray-500 uppercase mb-0.5">Custo Total (R$) *</label>
                                    <input type="number" step="0.01" id="m-valor" class="w-full px-2 py-1 border border-gray-300 text-xs font-bold font-mono">
                                </div>
                            </div>
                            <div>
                                <label class="block text-[9px] font-black text-gray-500 uppercase mb-0.5">Peças Utilizadas & Descrição Detalhada</label>
                                <input type="text" id="m-descricao" placeholder="Ex: Troca de Óleo, pastilhas, filtros ou manutenção geral" class="w-full px-2 py-1 border border-gray-300 text-xs">
                            </div>
                            <div class="flex gap-2 justify-end">
                                <button type="button" id="btn-cancelar-manutencao" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-sm font-bold text-xs uppercase transition">Cancelar</button>
                                <button type="button" id="btn-salvar-manutencao" class="bg-brand-dark hover:bg-black text-white px-3 py-1 rounded-sm font-bold text-xs uppercase transition">Salvar Serviço</button>
                            </div>
                        </div>
                    </div>

                    <div class="pt-4 border-t border-gray-100 flex gap-3 bg-white" id="modal-actions-footer-v">
                        <button type="button" id="btn-cancelar-v" class="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition">Cancelar</button>
                        <button type="submit" class="flex-1 px-4 py-3 bg-brand-dark text-brand-main font-black hover:bg-black shadow-hard border border-gray-900 transition">Salvar Patrimônio</button>
                    </div>
                </form>
            </div>
        </div>

        <div id="lightbox-viewer-v" class="fixed inset-0 bg-black/90 z-[60] hidden flex flex-col items-center justify-center p-4">
            <button id="btn-fechar-lightbox-v" class="absolute top-5 right-5 text-white bg-gray-950 px-4 py-2 border border-gray-700 font-bold flex items-center gap-2 hover:bg-gray-800 transition"><i class="ph ph-x"></i> Fechar Imagem</button>
            <img id="img-lightbox-src-v" src="" alt="Inspeção Visual" class="max-w-full max-h-[85vh] object-contain border-4 border-white shadow-2xl bg-gray-900">
        </div>
    `;

    const tbody = document.getElementById('tb-veiculos');
    const emptyState = document.getElementById('veiculos-empty');
    const modal = document.getElementById('modal-veiculo');
    const modalPanel = document.getElementById('modal-veiculo-panel');
    const form = document.getElementById('form-veiculo');
    const inputBusca = document.getElementById('busca-veiculos');

    const tabDados = document.getElementById('tab-dados-v');
    const tabVistoria = document.getElementById('tab-vistoria-v');
    const tabManutencoes = document.getElementById('tab-manutencoes-v');
    const conTabDados = document.getElementById('conteudo-tab-dados-v');
    const conTabVistoria = document.getElementById('conteudo-tab-vistoria-v');
    const conTabManutencoes = document.getElementById('conteudo-tab-manutencoes-v');

    const fileFoto = document.getElementById('file-foto-moto');
    const boxFoto = document.getElementById('preview-moto-box');
    const fileDoc = document.getElementById('file-doc-moto');
    const boxDoc = document.getElementById('preview-doc-box');
    
    const inputDocDate = document.getElementById('v-doc');
    const badgeVencimento = document.getElementById('badge-validacao-doc');

    let imgMotoBase64 = "";
    let imgDocBase64 = "";

    function auditarVencimento(dataString) {
        if (!dataString) return { status: 'PENDENTE', classe: 'bg-gray-200 text-gray-600' };
        const dataVenc = new Date(dataString);
        dataVenc.setMinutes(dataVenc.getMinutes() + dataVenc.getTimezoneOffset());
        dataVenc.setHours(0,0,0,0);
        const hoje = new Date();
        hoje.setHours(0,0,0,0);
        if (dataVenc < hoje) {
            return { status: 'VENCIDO', classe: 'bg-red-100 text-red-700 border border-red-200 shadow-sm' };
        } else if (dataVenc.getTime() === hoje.getTime()) {
            return { status: 'VENCE HOJE', classe: 'bg-orange-100 text-orange-700 border border-orange-200 shadow-sm' };
        } else {
            return { status: 'REGULAR', classe: 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm' };
        }
    }

    inputDocDate.addEventListener('change', (e) => {
        const auditoria = auditarVencimento(e.target.value);
        badgeVencimento.innerHTML = `<span class="text-[10px] font-bold px-2 py-1 uppercase rounded-sm ${auditoria.classe}"><i class="ph-fill ph-warning-circle"></i> Auditoria: ${auditoria.status}</span>`;
    });

    tabDados.addEventListener('click', () => alternarAbas('dados'));
    tabVistoria.addEventListener('click', () => alternarAbas('vistoria'));
    tabManutencoes.addEventListener('click', () => alternarAbas('manutencoes'));

    function alternarAbas(aba) {
        tabDados.className = "px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent text-gray-500 hover:text-gray-800 mt-1";
        tabVistoria.className = "px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent text-gray-500 hover:text-gray-800 mt-1";
        tabManutencoes.className = "px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent text-gray-500 hover:text-gray-800 mt-1";
        
        conTabDados.classList.add('hidden');
        conTabVistoria.classList.add('hidden');
        conTabManutencoes.classList.add('hidden');
        
        if (aba === 'dados') {
            tabDados.className = "px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-brand-dark text-brand-dark bg-white mt-1";
            conTabDados.classList.remove('hidden');
        } else if (aba === 'vistoria') {
            tabVistoria.className = "px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-brand-dark text-brand-dark bg-white mt-1";
            conTabVistoria.classList.remove('hidden');
        } else if (aba === 'manutencoes') {
            tabManutencoes.className = "px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-brand-dark text-brand-dark bg-white mt-1";
            conTabManutencoes.classList.remove('hidden');
            renderManutencoesLista();
        }
    }

    function renderManutencoesLista() {
        const tb = document.getElementById('tb-manutencoes-veiculo');
        tb.innerHTML = '';
        const vId = document.getElementById('v-id').value;
        if (!vId) {
            tb.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-400 font-bold uppercase tracking-wider">Salve o veículo primeiro para gerenciar as manutenções.</td></tr>';
            document.getElementById('btn-adicionar-manutencao').classList.add('hidden');
            return;
        }
        document.getElementById('btn-adicionar-manutencao').classList.remove('hidden');
        
        const v = db.veiculos.find(x => x.id === Number(vId));
        if (!v) return;
        
        let manutList = [];
        try {
            manutList = typeof v.manutencoes === 'string' ? JSON.parse(v.manutencoes) : (v.manutencoes || []);
        } catch {
            manutList = [];
        }
        
        if (manutList.length === 0) {
            tb.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-400 font-bold uppercase tracking-wider">Nenhuma manutenção registrada para este veículo.</td></tr>';
            return;
        }
        
        // Ordenar por data descrescente
        manutList.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        manutList.forEach((m, idx) => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50 transition-colors";
            
            const tipoMap = {
                oleo: 'Troca de Óleo / Filtros',
                freio: 'Freios (Pastilhas/Discos/Lonas)',
                pneu: 'Pneus / Alinhamento / Balanceamento',
                relacao: 'Kit Relação / Corrente (Moto)',
                arrefecimento: 'Sistema de Arrefecimento (Carro)',
                suspensao: 'Amortecedores / Suspensão',
                velas: 'Velas / Injeção / Correia',
                revisao: 'Revisão Geral',
                outro: 'Outros / Consertos / Funilaria'
            };
            const tipoLabel = tipoMap[m.tipo] || 'Outros';
            
            tr.innerHTML = `
                <td class="px-4 py-3 font-mono font-bold">${utils.formatDate(m.data)}</td>
                <td class="px-4 py-3"><span class="bg-gray-100 text-gray-800 font-bold px-1.5 py-0.5 rounded-sm text-[10px] uppercase tracking-wider">${tipoLabel}</span></td>
                <td class="px-4 py-3 font-mono font-bold">${m.km ? m.km + ' km' : '--'}</td>
                <td class="px-4 py-3 font-mono font-bold text-gray-900">${utils.formatMoney(m.valor || 0)}</td>
                <td class="px-4 py-3 truncate max-w-[200px]" title="${m.descricao || ''}">${m.descricao || '--'}</td>
                <td class="px-4 py-3 text-right">
                    <button type="button" class="btn-excluir-manutencao text-gray-400 hover:text-red-500 transition px-1" data-idx="${idx}" title="Excluir Manutenção"><i class="ph-fill ph-trash text-base"></i></button>
                </td>
            `;
            tb.appendChild(tr);
        });
    }

    // Formulário de nova manutenção e exclusão
    const btnAddM = document.getElementById('btn-adicionar-manutencao');
    const formNewM = document.getElementById('form-nova-manutencao');
    const btnCancelM = document.getElementById('btn-cancelar-manutencao');
    const btnSaveM = document.getElementById('btn-salvar-manutencao');
    
    btnAddM.addEventListener('click', () => {
        formNewM.classList.remove('hidden');
        document.getElementById('m-data').value = new Date().toISOString().split('T')[0];
        document.getElementById('m-km').value = '';
        document.getElementById('m-valor').value = '';
        document.getElementById('m-descricao').value = '';
    });
    
    btnCancelM.addEventListener('click', () => {
        formNewM.classList.add('hidden');
    });
    
    btnSaveM.addEventListener('click', async () => {
        const data = document.getElementById('m-data').value;
        const tipo = document.getElementById('m-tipo').value;
        const km = Number(document.getElementById('m-km').value) || 0;
        const valor = Number(document.getElementById('m-valor').value) || 0;
        const descricao = document.getElementById('m-descricao').value;
        
        if (!data) return showAlert("A data da manutenção é obrigatória.");
        
        const vId = document.getElementById('v-id').value;
        const v = db.veiculos.find(x => x.id === Number(vId));
        if (!v) return;
        
        let manutList = [];
        try {
            manutList = typeof v.manutencoes === 'string' ? JSON.parse(v.manutencoes) : (v.manutencoes || []);
        } catch {
            manutList = [];
        }
        
        const novaM = {
            id: Date.now(),
            data,
            tipo,
            km,
            valor,
            descricao
        };
        manutList.push(novaM);
        v.manutencoes = JSON.stringify(manutList);
        
        if (tipo === 'oleo' && km > 0) {
            v.km_oleo = km + 1000;
            document.getElementById('v-km-oleo').value = v.km_oleo;
        }
        
        if (km > (v.km_atual || 0)) {
            v.km_atual = km;
            document.getElementById('v-km-atual').value = km;
        }
        
        db.financeiro.push({
            id: Date.now(),
            data,
            tipo: 'saida',
            categoria: 'Manutenção de Frota',
            descricao: `Manutenção: ${tipo === 'oleo' ? 'Troca de Óleo' : tipo === 'freio' ? 'Freios' : tipo === 'pneu' ? 'Pneus' : tipo === 'revisao' ? 'Revisão' : 'Conserto'} - ${v.modelo} (${v.placa})`,
            valor,
            contrato_id: null
        });
        
        await window.electronAPI.saveData('veiculos', db.veiculos);
        await window.electronAPI.saveData('financeiro', db.financeiro);
        
        formNewM.classList.add('hidden');
        renderManutencoesLista();
        atualizarTabela();
        await showAlert("Manutenção registrada com sucesso e lançada no livro Caixa!");
    });
    
    document.getElementById('tb-manutencoes-veiculo').addEventListener('click', async (e) => {
        const btnEx = e.target.closest('.btn-excluir-manutencao');
        if (btnEx) {
            const idx = Number(btnEx.getAttribute('data-idx'));
            const confirmado = await showConfirm("Confirma a exclusão deste registro de manutenção?");
            if (confirmado) {
                const vId = document.getElementById('v-id').value;
                const v = db.veiculos.find(x => x.id === Number(vId));
                if (!v) return;
                
                let manutList = [];
                try {
                    manutList = typeof v.manutencoes === 'string' ? JSON.parse(v.manutencoes) : (v.manutencoes || []);
                } catch {
                    manutList = [];
                }
                
                manutList.splice(idx, 1);
                v.manutencoes = JSON.stringify(manutList);
                
                await window.electronAPI.saveData('veiculos', db.veiculos);
                renderManutencoesLista();
            }
        }
    });

    handleFileUpload(fileFoto, (base64) => {
        imgMotoBase64 = base64;
        boxFoto.classList.remove('hidden');
    });
    handleFileUpload(fileDoc, (base64) => {
        imgDocBase64 = base64;
        boxDoc.classList.remove('hidden');
    });

    document.getElementById('btn-ver-moto').addEventListener('click', async () => {
        if (!imgMotoBase64) return;
        let base64ToShow = imgMotoBase64;
        if (!imgMotoBase64.startsWith('data:')) {
            showLoading('Carregando imagem...');
            base64ToShow = await window.electronAPI.readFile(imgMotoBase64);
            hideLoading();
        }
        if (base64ToShow) {
            showLightbox(base64ToShow);
        } else {
            await showAlert('Não foi possível ler o arquivo da vistoria.');
        }
    });
    document.getElementById('btn-ver-doc').addEventListener('click', async () => {
        if (!imgDocBase64) return;
        let base64ToShow = imgDocBase64;
        if (!imgDocBase64.startsWith('data:')) {
            showLoading('Carregando documento...');
            base64ToShow = await window.electronAPI.readFile(imgDocBase64);
            hideLoading();
        }
        if (base64ToShow) {
            showLightbox(base64ToShow);
        } else {
            await showAlert('Não foi possível ler o arquivo do documento.');
        }
    });
    document.getElementById('btn-fechar-lightbox-v').addEventListener('click', () => {
        document.getElementById('lightbox-viewer-v').classList.add('hidden');
    });

    function atualizarTabela() {
        const termo = inputBusca.value.toLowerCase();
        tbody.innerHTML = '';
        const filtrados = db.veiculos.filter(v => 
            v.placa.toLowerCase().includes(termo) || 
            v.modelo.toLowerCase().includes(termo) ||
            (v.renavam && v.renavam.includes(termo))
        );

        if (filtrados.length === 0) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('flex');
        } else {
            emptyState.classList.add('hidden');
            emptyState.classList.remove('flex');
            filtrados.forEach(v => {
                const isLocado = db.contratos.some(c => c.veiculo_id === v.id && c.status === 'ativo');
                const statusReal = isLocado ? 'locado' : v.status;
                const statusConfig = {
                    'disponivel': '<span class="inline-block px-2 py-1 text-[10px] font-black bg-gray-900 text-white uppercase tracking-widest border-l-2 border-brand-main">Livre no Pátio</span>',
                    'locado': '<span class="inline-block px-2 py-1 text-[10px] font-black bg-blue-600 text-white uppercase tracking-widest border-l-2 border-blue-900">Alugada</span>',
                    'manutencao': '<span class="inline-block px-2 py-1 text-[10px] font-black bg-orange-600 text-white uppercase tracking-widest border-l-2 border-orange-900">Oficina</span>'
                };
                const auditoria = auditarVencimento(v.doc);
                const badgeDocFile = v.img_doc ? `<a href="#" class="text-[10px] text-emerald-600 font-bold ml-2 underline"><i class="ph-fill ph-file-pdf"></i> Arquivo Salvo</a>` : '';
                const kmAtual = Number(v.km_atual) || 0;
                const kmOleo = Number(v.km_oleo) || 0;
                const restanteOleo = kmOleo - kmAtual;
                let alertaOleo = '';
                if (kmOleo > 0) {
                    if (restanteOleo <= 0) {
                        alertaOleo = '<span class="text-[9px] font-black tracking-wider bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-sm ml-1.5"><i class="ph-bold ph-warning-circle text-[10px]"></i> ÓLEO VENCIDO</span>';
                    } else if (restanteOleo <= 100) {
                        alertaOleo = '<span class="text-[9px] font-black tracking-wider bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-sm ml-1.5"><i class="ph-bold ph-warning text-[10px]"></i> ÓLEO PRÓXIMO</span>';
                    }
                }
                const traços = Number(v.combustivel) || 0;
                const corGasolina = traços <= 1 ? 'text-red-500' : 'text-gray-800';
                const isCarro = (v.categoria === 'carro');
                const badgeCat = isCarro 
                    ? `<span class="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider inline-flex items-center gap-1"><i class="ph-fill ph-car text-xs"></i> Carro</span>` 
                    : `<span class="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider inline-flex items-center gap-1"><i class="ph-fill ph-motorcycle text-xs"></i> Moto</span>`;

                const tr = document.createElement('tr');
                tr.className = "hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors";
                tr.innerHTML = `
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-2 mb-1">
                            ${badgeCat}
                            <span class="font-bold text-gray-900">${v.modelo}</span>
                            <span class="text-xs font-normal text-gray-400">${v.ano || ''}</span>
                        </div>
                        <div class="text-xs bg-white border border-gray-300 text-gray-800 px-1.5 py-0.5 inline-block font-mono font-bold shadow-sm">${v.placa}</div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-[10px] font-bold px-1.5 py-0.5 uppercase ${auditoria.classe}">${auditoria.status}</span>
                        <div class="text-[11px] text-gray-500 mt-1 font-mono">Venc: ${utils.formatDate(v.doc)} ${badgeDocFile}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-mono text-gray-800 font-medium">${kmAtual.toLocaleString('pt-BR')} km ${alertaOleo}</div>
                        <div class="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Óleo em: ${kmOleo > 0 ? kmOleo.toLocaleString('pt-BR') : '--'}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="font-bold text-sm flex items-center gap-1 ${corGasolina}">
                            <i class="ph-fill ph-gas-pump text-base"></i> ${traços}/6 Traços
                        </div>
                        <div class="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                            ${v.img_moto ? '<i class="ph-fill ph-check-circle text-emerald-500"></i> Vistoriada' : '<span class="text-red-400">Sem Vistoria Digital</span>'}
                        </div>
                    </td>
                    <td class="px-6 py-4">${statusConfig[statusReal]}</td>
                    <td class="px-6 py-4 text-right">
                        <button class="btn-editar-v text-white bg-brand-dark hover:bg-black px-3 py-1.5 text-xs font-bold shadow-sm transition mr-2" data-id="${v.id}">Vistoriar / Editar</button>
                        ${!isLocado ? `<button class="btn-deletar-v text-gray-400 hover:text-red-600 px-2 py-1.5 text-xs font-bold transition" data-id="${v.id}">Remover</button>` : ``}
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    function atualizarLabelsCategoria(categoria) {
        const isCarro = (categoria === 'carro');
        const lblStatus = document.getElementById('lbl-status-veiculo');
        const descFoto = document.getElementById('desc-foto-vistoria');
        if (lblStatus) {
            lblStatus.innerText = isCarro ? "Situação do Carro" : "Situação da Moto";
        }
        if (descFoto) {
            descFoto.innerText = isCarro 
                ? "Tire uma foto para atestar ranhuras, pneus, lataria e funilaria do carro antes de entregar a chave." 
                : "Tire uma foto para atestar ranhuras, pneus e lataria da moto antes de entregar a chave.";
        }
    }

    document.getElementById('v-categoria').addEventListener('change', (e) => {
        atualizarLabelsCategoria(e.target.value);
    });

    function toggleModal(abrir = true) {
        if (abrir) {
            alternarAbas('dados');
            atualizarLabelsCategoria(document.getElementById('v-categoria').value || 'moto');
            modal.classList.remove('hidden');
            setTimeout(() => { modal.classList.remove('opacity-0'); modalPanel.classList.remove('scale-95'); }, 10);
        } else {
            modal.classList.add('opacity-0');
            modalPanel.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                form.reset();
                document.getElementById('v-id').value = '';
                document.getElementById('modal-veiculo-title').innerText = "Ficha Técnica do Patrimônio";
                imgMotoBase64 = "";
                imgDocBase64 = "";
                boxFoto.classList.add('hidden');
                boxDoc.classList.add('hidden');
                badgeVencimento.innerHTML = `<span class="text-[10px] font-bold px-2 py-1 bg-gray-200 text-gray-500 uppercase">Pendente</span>`;
            }, 200);
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading('Salvando veículo...');
        try {
            const id = document.getElementById('v-id').value;
            const idVeiculo = id ? Number(id) : Date.now();

            let finalFoto = imgMotoBase64;
            let finalDoc = imgDocBase64;

            if (imgMotoBase64 && imgMotoBase64.startsWith('data:')) {
                const userDataPath = await window.electronAPI.getUserDataPath();
                const uploadsPath = `${userDataPath}/uploads`;
                await window.electronAPI.createFolder(uploadsPath);
                const ext = imgMotoBase64.split(';')[0].split('/')[1] || 'png';
                const fileName = `moto_${idVeiculo}.${ext}`;
                const filePath = `${uploadsPath}/${fileName}`;
                await window.electronAPI.saveFile(filePath, imgMotoBase64);
                finalFoto = filePath;
            } else if (id) {
                const prev = db.veiculos.find(v => v.id === idVeiculo);
                finalFoto = prev ? prev.img_moto : '';
            }

            if (imgDocBase64 && imgDocBase64.startsWith('data:')) {
                const userDataPath = await window.electronAPI.getUserDataPath();
                const uploadsPath = `${userDataPath}/uploads`;
                await window.electronAPI.createFolder(uploadsPath);
                const ext = imgDocBase64.split(';')[0].split('/')[1] || 'png';
                const fileName = `doc_moto_${idVeiculo}.${ext}`;
                const filePath = `${uploadsPath}/${fileName}`;
                await window.electronAPI.saveFile(filePath, imgDocBase64);
                finalDoc = filePath;
            } else if (id) {
                const prev = db.veiculos.find(v => v.id === idVeiculo);
                finalDoc = prev ? prev.img_doc : '';
            }

            const dados = {
                id: idVeiculo,
                categoria: document.getElementById('v-categoria').value || 'moto',
                placa: document.getElementById('v-placa').value.toUpperCase(),
                modelo: document.getElementById('v-modelo').value,
                ano: document.getElementById('v-ano').value,
                renavam: document.getElementById('v-renavam').value,
                chassi: document.getElementById('v-chassi').value.toUpperCase(),
                fipe: document.getElementById('v-fipe').value,
                status: document.getElementById('v-status').value,
                doc: document.getElementById('v-doc').value,
                km_atual: document.getElementById('v-km-atual').value,
                km_oleo: document.getElementById('v-km-oleo').value,
                combustivel: document.getElementById('v-combustivel').value,
                img_moto: finalFoto,
                img_doc: finalDoc
            };

            if (id) {
                const index = db.veiculos.findIndex(v => v.id === dados.id);
                db.veiculos[index] = dados;
            } else {
                db.veiculos.push(dados);
            }

            await window.electronAPI.saveData('veiculos', db.veiculos);
            atualizarTabela();
            toggleModal(false);
            await showAlert('Veículo salvo com sucesso!');
        } catch (error) {
            await showAlert('Erro ao salvar veículo: ' + error.message);
        } finally {
            hideLoading();
        }
    });

    tbody.addEventListener('click', async (e) => {
        const id = Number(e.target.getAttribute('data-id'));
        if (!id) return;

        if (e.target.classList.contains('btn-deletar-v')) {
            const isLocado = db.contratos.some(c => c.veiculo_id === id && c.status === 'ativo');
            if (isLocado) {
                await showAlert("❌ Bloqueado: Este veículo possui um contrato de locação ativo e não pode ser removido.");
                return;
            }
            const confirmado = await showConfirm("Alerta: Excluir a ficha deste patrimônio apagará definitivamente as fotos de vistoria e CRLV. Continuar?");
            if (confirmado) {
                showLoading('Removendo veículo...');
                try {
                    db.veiculos = db.veiculos.filter(v => v.id !== id);
                    await window.electronAPI.deleteData('veiculos', [id]);
                    atualizarTabela();
                } catch (error) {
                    await showAlert('Erro ao remover: ' + error.message);
                } finally {
                    hideLoading();
                }
            }
        }
        
        if (e.target.classList.contains('btn-editar-v')) {
            const v = db.veiculos.find(v => v.id === id);
            document.getElementById('v-id').value = v.id;
            document.getElementById('v-categoria').value = v.categoria || 'moto';
            atualizarLabelsCategoria(v.categoria || 'moto');
            document.getElementById('v-placa').value = v.placa;
            document.getElementById('v-modelo').value = v.modelo;
            document.getElementById('v-ano').value = v.ano || '';
            document.getElementById('v-renavam').value = v.renavam || '';
            document.getElementById('v-chassi').value = v.chassi || '';
            document.getElementById('v-fipe').value = v.fipe || '';
            document.getElementById('v-doc').value = v.doc || '';
            const auditoria = auditarVencimento(v.doc);
            badgeVencimento.innerHTML = `<span class="text-[10px] font-bold px-2 py-1 uppercase rounded-sm ${auditoria.classe}"><i class="ph-fill ph-warning-circle"></i> Auditoria: ${auditoria.status}</span>`;
            document.getElementById('v-status').value = v.status;
            document.getElementById('v-km-atual').value = v.km_atual || '';
            document.getElementById('v-km-oleo').value = v.km_oleo || '';
            document.getElementById('v-combustivel').value = v.combustivel || '6';
            imgMotoBase64 = v.img_moto || "";
            imgDocBase64 = v.img_doc || "";
            if (imgMotoBase64) boxFoto.classList.remove('hidden');
            if (imgDocBase64) boxDoc.classList.remove('hidden');
            document.getElementById('modal-veiculo-title').innerText = "Vistoria e Atualização Cadastral";
            toggleModal(true);
        }
    });

    document.getElementById('btn-novo-veiculo').addEventListener('click', () => toggleModal(true));
    document.getElementById('btn-fechar-modal-v').addEventListener('click', () => toggleModal(false));
    document.getElementById('btn-cancelar-v').addEventListener('click', () => toggleModal(false));
    inputBusca.addEventListener('input', atualizarTabela);

    atualizarTabela();

    document.getElementById('btn-export-csv-veiculos').addEventListener('click', () => {
        const data = db.veiculos.map(v => ({
            ID: v.id,
            Placa: v.placa,
            Modelo: v.modelo,
            Ano: v.ano,
            RENAVAM: v.renavam,
            Status: v.status,
            KM_Atual: v.km_atual,
            Combustível: v.combustivel
        }));
        exportCSV(data, 'veiculos');
    });
}
