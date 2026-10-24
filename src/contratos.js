import { db, utils } from './db.js';
import { showAlert, showConfirm } from './modal.js';
import { showLoading, hideLoading } from './loading.js';
import { getUser } from './session.js';
import { exportCSV } from './csvUtils.js';
import { showPrompt } from './promptModal.js';

export function renderContratos(container) {
    if (!db.espera) db.espera = [];

    container.innerHTML = `
        <div class="flex flex-col h-full fade-enter">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div class="relative w-full md:max-w-md flex gap-2">
                    <input type="text" id="busca-contratos" placeholder="Buscar por cliente, placa ou número do contrato..." class="w-full pl-10 pr-4 py-2 border border-gray-200 text-sm focus:ring-0 outline-none transition shadow-sm">
                    <button id="btn-export-csv-contratos" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 text-xs font-bold uppercase transition flex items-center gap-1 shadow-sm whitespace-nowrap">
                        <i class="ph-bold ph-file-csv text-sm"></i> CSV
                    </button>
                </div>
                <div class="flex gap-2 w-full md:w-auto">
                    <button id="btn-fila-espera" class="flex-1 md:flex-none justify-center bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-3 md:py-2.5 font-bold text-sm flex items-center gap-2 transition-all shadow-sm">
                        <i class="ph-bold ph-users-three text-brand-hover text-lg"></i> Reservas <span id="badge-fila" class="bg-brand-dark text-brand-main text-[10px] px-1.5 py-0.5 rounded-sm font-black">0</span>
                    </button>
                    <button id="btn-novo-contrato" class="flex-1 md:flex-none justify-center bg-brand-dark hover:bg-black text-white px-5 py-3 md:py-2.5 font-bold text-sm flex items-center gap-2 border border-gray-800 transition-all shadow-hard">
                        <i class="ph-bold ph-handshake text-brand-main text-lg"></i> Novo Contrato
                    </button>
                </div>
            </div>

            <div class="bg-white border border-gray-200 shadow-soft flex-1 overflow-hidden flex flex-col">
                <div class="overflow-x-auto flex-1 custom-scroll">
                    <table class="w-full text-left border-collapse whitespace-nowrap text-sm">
                        <thead>
                            <tr class="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider font-mono">
                                <th class="px-6 py-4 font-bold">Nº Contrato</th>
                                <th class="px-6 py-4 font-bold">Cliente</th>
                                <th class="px-6 py-4 font-bold">Veículo / Placa</th>
                                <th class="px-6 py-4 font-bold">Período</th>
                                <th class="px-6 py-4 font-bold">Plano</th>
                                <th class="px-6 py-4 font-bold">Status</th>
                                <th class="px-6 py-4 font-bold">Emitido por</th>
                                <th class="px-6 py-4 font-bold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="tb-contratos" class="divide-y divide-gray-100"></tbody>
                    </table>
                </div>
                <div id="contratos-empty" class="hidden flex-col items-center justify-center py-16 text-center">
                    <i class="ph ph-folder-open text-5xl text-gray-300 mb-3"></i>
                    <p class="text-sm text-gray-500 font-bold uppercase tracking-wider">Nenhum contrato registado na base de dados</p>
                </div>
                <!-- PAGINAÇÃO -->
                <div id="contratos-paginacao" class="bg-gray-50 border-t border-gray-200 px-6 py-3 flex justify-between items-center gap-4 text-xs font-bold text-gray-500 uppercase font-mono">
                    <button type="button" id="btn-page-prev-c" class="bg-white hover:bg-gray-100 text-gray-700 px-3 py-1.5 border border-gray-200 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer">
                        <i class="ph ph-caret-left"></i> Anterior
                    </button>
                    <span id="page-indicator-c">Página 1 de 1</span>
                    <button type="button" id="btn-page-next-c" class="bg-white hover:bg-gray-100 text-gray-700 px-3 py-1.5 border border-gray-200 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer">
                        Próximo <i class="ph ph-caret-right"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- MODAL FILA DE ESPERA -->
        <div id="modal-fila" class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4 transition-opacity opacity-0">
            <div class="bg-white border border-gray-900 w-full max-w-lg shadow-2xl overflow-hidden transform scale-95 transition-transform flex flex-col max-h-[80vh]" id="modal-fila-panel">
                <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h2 class="text-sm font-black text-gray-900 uppercase tracking-wider">Fila de Espera (Reservas)</h2>
                    <button id="btn-fechar-fila" class="text-gray-400 hover:text-red-600 transition"><i class="ph ph-x text-xl"></i></button>
                </div>
                
                <form id="form-fila" class="p-4 border-b border-gray-200 bg-brand-light/30">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                            <input type="text" id="fila-nome" placeholder="Nome do Cliente" class="w-full px-3 py-2 border border-brand-main/50 text-sm focus:border-brand-main outline-none font-bold">
                        </div>
                        <div>
                            <input type="text" id="fila-wpp" placeholder="WhatsApp (Ex: 6999...)" class="w-full px-3 py-2 border border-brand-main/50 text-sm focus:border-brand-main outline-none">
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <input type="text" id="fila-pref" placeholder="Preferência (Ex: Honda Fan 160)" class="w-full px-3 py-2 border border-brand-main/50 text-sm focus:border-brand-main outline-none">
                        <button type="submit" class="bg-brand-dark hover:bg-black text-brand-main font-bold px-4 text-xs uppercase tracking-widest transition shadow-sm whitespace-nowrap">Adicionar</button>
                    </div>
                </form>

                <div class="flex-1 overflow-y-auto p-0 bg-gray-50 custom-scroll min-h-[250px]">
                    <table class="w-full text-left text-sm">
                        <tbody id="tb-fila" class="divide-y divide-gray-200"></tbody>
                    </table>
                    <div id="fila-vazia" class="hidden flex-col items-center justify-center py-10 text-center">
                        <i class="ph-fill ph-users-three text-4xl text-gray-300 mb-2"></i>
                        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">A fila de espera está vazia.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL CONTRATO (NOVO) -->
        <div id="modal-contrato" class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] hidden flex items-center justify-center p-4 transition-opacity opacity-0">
            <div class="bg-white border border-gray-900 w-full max-w-4xl shadow-2xl overflow-hidden transform scale-95 transition-transform flex flex-col" id="modal-contrato-panel">
                <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 class="text-lg font-black text-gray-900 uppercase tracking-tight" id="modal-contrato-title">Emissão de Contrato de Locação</h2>
                        <p class="text-xs text-gray-500 font-mono mt-0.5" id="modal-contrato-subtitle">Preencha os dados e selecione o plano</p>
                    </div>
                    <button id="btn-fechar-modal-c" class="text-gray-400 hover:text-red-600 transition p-1"><i class="ph ph-x text-2xl"></i></button>
                </div>

                <form id="form-contrato" class="p-6 space-y-6 bg-white overflow-y-auto max-h-[70vh] custom-scroll">
                    <input type="hidden" id="c-id-edit">
                    <input type="hidden" id="c-contrato-original-id">
                    <input type="hidden" id="c-numero-aditivo">

                    <div class="bg-brand-light border border-brand-main p-4 flex flex-col md:flex-row gap-4 mb-2">
                        <div class="flex-1 relative">
                            <label class="block text-xs font-extrabold text-brand-hover uppercase tracking-wider mb-1"><i class="ph-fill ph-user"></i> Cliente *</label>
                            <div class="relative">
                                <input type="text" id="loc-cliente-busca" placeholder="Digite nome, CPF ou código..." autocomplete="off" class="w-full px-3 py-2 border border-brand-main/50 text-sm bg-white focus:border-brand-main outline-none font-bold text-gray-800 shadow-sm pr-8">
                                <input type="hidden" id="loc-cliente" value="">
                                <button type="button" id="loc-cliente-limpar" class="absolute right-2.5 top-2.5 text-gray-400 hover:text-red-500 hidden transition-colors duration-150"><i class="ph-bold ph-x text-sm"></i></button>
                            </div>
                            <div id="loc-cliente-resultados" class="absolute left-0 right-0 z-[100] mt-1 bg-white border border-gray-300 shadow-lg max-h-60 overflow-y-auto hidden custom-scroll"></div>
                        </div>
                        <div class="flex-1">
                            <label class="block text-xs font-extrabold text-brand-hover uppercase tracking-wider mb-1"><i class="ph-fill ph-motorcycle"></i> Veículo *</label>
                            <select id="loc-veiculo" class="w-full px-3 py-2 border border-brand-main/50 text-sm bg-white focus:border-brand-main outline-none font-bold text-gray-800 shadow-sm"></select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Plano *</label>
                            <select id="loc-plano" class="w-full px-3 py-2 border border-gray-300 text-sm bg-white focus:border-brand-main outline-none font-bold">
                                <option value="simples">Sem Fidelidade</option>
                                <option value="fidelidade">3 Meses com Fidelidade</option>
                                <option value="aquisicao">Contrato de Aquisição</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Data e Hora da Saída *</label>
                            <input type="datetime-local" id="loc-data-inicio" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none bg-white">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Data de Devolução (Fim) *</label>
                            <input type="datetime-local" id="loc-data-fim" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none bg-white">
                        </div>
                    </div>

                    <div id="campos-simples-fidelidade" class="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-200 pt-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" id="lbl-loc-valor">Valor Total (R$) *</label>
                            <input type="number" id="loc-valor" placeholder="Ex: 450" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-mono font-bold text-emerald-700">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Tipo de Caução *</label>
                            <select id="loc-caucao-tipo" class="w-full px-3 py-2 border border-gray-300 text-sm bg-white focus:border-brand-main outline-none font-bold">
                                <option value="dinheiro">Dinheiro</option>
                                <option value="pix">PIX</option>
                                <option value="debito">Cartão de Débito</option>
                                <option value="credito">Cartão de Crédito</option>
                                <option value="penhora">Penhora de Bem (Pátio)</option>
                                <option value="sem_caucao">Sem Caução</option>
                            </select>
                        </div>
                        <div id="container-loc-caucao-valor">
                            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Garantia / Caução (R$) *</label>
                            <input type="number" id="loc-caucao" placeholder="Ex: 1000" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-mono">
                        </div>
                    </div>

                    <div id="container-caucao-penhora" class="hidden border-t border-gray-150 pt-3">
                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Descrição do Bem Deixado (Ex: Carro ou Moto, Placa, Modelo, Estado) *</label>
                        <textarea id="loc-caucao-penhora-detalhes" rows="2" placeholder="Ex: Moto Honda Titan 160, Placa XYZ-1234, cor preta, deixada como garantia de caução no pátio." class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none"></textarea>
                    </div>

                    <div id="campos-fidelidade" class="hidden border-t border-gray-200 pt-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Periodicidade de Pagamento</label>
                                <select id="loc-periodicidade" class="w-full px-3 py-2 border border-gray-300 text-sm bg-white focus:border-brand-main outline-none">
                                    <option value="semanal">Semanal</option>
                                    <option value="mensal">Mensal</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Data da Próxima Manutenção Obrigatória</label>
                                <input type="date" id="loc-prox-manutencao" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                            </div>
                        </div>
                        <div class="mt-3 bg-emerald-50 border border-emerald-300 p-3 rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                                <div class="text-xs font-black text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                                    <i class="ph-bold ph-calculator text-base text-emerald-600"></i>
                                    Valor Integral do Contrato (3 Meses / 12 Semanas)
                                </div>
                                <div class="text-[11px] text-emerald-700 mt-0.5">
                                    12 parcelas semanais de <span id="fidelidade-valor-semanal-display" class="font-bold">R$ 0,00</span>
                                </div>
                            </div>
                            <div class="text-right">
                                <span id="fidelidade-valor-total-display" class="font-mono text-xl font-black text-emerald-800">R$ 0,00</span>
                            </div>
                        </div>
                        <div class="mt-2 text-xs text-gray-600 bg-yellow-50 p-3 border border-yellow-200 rounded-sm">
                            <i class="ph-fill ph-warning text-yellow-600"></i> Fidelidade de 3 meses. Devolução antecipada gera multa de R$ 2.000,00 e bloqueio da carteira do cliente.
                        </div>
                    </div>

                    <div id="campos-aquisicao" class="hidden border-t border-gray-200 pt-4">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Valor de Entrada (R$) *</label>
                                <input type="number" id="loc-valor-entrada" placeholder="2000" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-mono">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nº de Parcelas *</label>
                                <input type="number" id="loc-num-parcelas" placeholder="104" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Valor da Parcela Semanal (R$) *</label>
                                <input type="number" id="loc-valor-parcela" placeholder="375" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-mono font-bold text-emerald-700">
                            </div>
                        </div>
                        <div class="mt-2 text-xs text-gray-600 bg-blue-50 p-3 border border-blue-200 rounded-sm">
                            <i class="ph-fill ph-info text-blue-600"></i> <strong>Contrato de Aquisição (2 anos / 104 semanas)</strong>: Parcela semanal de <strong>R$ 375,00</strong>. Ao final das 104 semanas pagas pontualmente e entrada quitada, o veículo é transferido em definitivo para o cliente.
                        </div>
                        <div class="mt-2 text-right text-xs font-bold text-gray-800">
                            Total Geral da Operação: <span id="loc-total-aquisicao" class="font-mono text-lg text-emerald-700">R$ 0,00</span>
                        </div>
                    </div>

                    <div class="border-t border-gray-200 pt-4">
                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                            <i class="ph-fill ph-note-pencil text-brand-hover"></i> Observações do Contrato (Constam no contrato impresso)
                        </label>
                        <textarea id="loc-observacoes" rows="3" placeholder="Digite observações especiais sobre este contrato (ex: detalhes da entrega, acordos de manutenção, acessórios inclusos, etc.)" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-sans"></textarea>
                    </div>

                    <div class="pt-4 border-t border-gray-100 flex gap-3">
                        <button type="button" id="btn-cancelar-c" class="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition uppercase tracking-wider text-xs">Cancelar</button>
                        <button type="submit" class="flex-1 px-4 py-3 bg-brand-dark text-brand-main font-black hover:bg-black shadow-hard border border-gray-900 transition flex items-center justify-center gap-2 uppercase tracking-wider text-xs">
                            <i class="ph-fill ph-file-pdf text-lg"></i> Gerar e Emitir Contrato
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL DE SENHA ADMIN -->
        <div id="modal-senha-admin" class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[70] hidden flex items-center justify-center p-4">
            <div class="bg-white border border-gray-900 w-full max-w-md shadow-2xl overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 class="text-sm font-black text-gray-900 uppercase tracking-wider">⚠️ Ação Restrita</h3>
                </div>
                <div class="p-6">
                    <p class="text-sm text-gray-700 mb-4">Digite a senha administrativa para confirmar a exclusão permanente deste contrato:</p>
                    <input type="password" id="input-senha-admin" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none" placeholder="Senha administrativa">
                    <div id="erro-senha-admin" class="text-red-500 text-xs mt-1 hidden">Senha incorreta. Tente novamente.</div>
                </div>
                <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
                    <button id="btn-cancelar-senha" class="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition">Cancelar</button>
                    <button id="btn-confirmar-senha" class="px-4 py-2 bg-brand-dark text-brand-main font-black hover:bg-black shadow-hard border border-gray-900 transition">Confirmar</button>
                </div>
            </div>
        </div>

        <!-- MODAL DE ADITIVO (RENOVAÇÃO) -->
        <div id="modal-aditivo" class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[80] hidden flex items-center justify-center p-4 transition-opacity opacity-0">
            <div class="bg-white border border-gray-900 w-full max-w-lg shadow-2xl overflow-hidden transform scale-95 transition-transform" id="modal-aditivo-panel">
                <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h2 class="text-sm font-black text-gray-900 uppercase tracking-wider" id="modal-aditivo-title">📄 Renovação de Contrato</h2>
                    <button id="btn-fechar-aditivo" class="text-gray-400 hover:text-red-600 transition"><i class="ph ph-x text-xl"></i></button>
                </div>
                <form id="form-aditivo" class="p-6 space-y-4">
                    <input type="hidden" id="adt-contrato-id">

                    <!-- BANNER ESPECÍFICO PARA PLANO FIDELIDADE 3 MESES / AQUISIÇÃO -->
                    <div id="adt-banner-fidelidade" class="hidden bg-blue-50 border border-blue-200 p-3 rounded-sm text-xs space-y-1">
                        <div class="flex justify-between items-center">
                            <strong id="adt-banner-titulo-plano" class="text-blue-900 font-bold uppercase flex items-center gap-1">
                                <i class="ph-bold ph-shield-check text-blue-600 text-sm"></i> Plano Fidelidade 3 Meses
                            </strong>
                            <span id="adt-badge-semana" class="bg-blue-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-sm">Semana 2 de 12</span>
                        </div>
                        <div class="text-gray-700 mt-1">
                            Total do Contrato: <strong id="adt-txt-total-contrato" class="text-gray-900 font-mono">R$ 4.200,00</strong>
                        </div>
                        <div class="text-gray-700">
                            Total já abatido: <strong id="adt-txt-total-abatido" class="text-emerald-700 font-mono">R$ 350,00</strong> | Saldo restante: <strong id="adt-txt-saldo-restante" class="text-blue-800 font-mono">R$ 3.850,00</strong>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" id="lbl-adt-data-inicio">Data de Início da Renovação *</label>
                            <input type="datetime-local" id="adt-data-inicio" required class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" id="lbl-adt-data-fim">Nova Data de Término *</label>
                            <input type="datetime-local" id="adt-nova-data-fim" required class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" id="lbl-adt-novo-valor">Novo Valor (R$) *</label>
                            <input type="number" id="adt-novo-valor" placeholder="0,00" required class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-mono">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">KM Atual no Painel *</label>
                            <input type="number" id="adt-km-atual" placeholder="Ex: 42000" required class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-mono font-bold text-blue-800">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Observações (opcional)</label>
                            <input type="text" id="adt-obs" placeholder="Ex: Renovação por mais 7 dias" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                        </div>
                    </div>
                    <div class="pt-4 border-t border-gray-100 flex gap-3">
                        <button type="button" id="btn-cancelar-aditivo" class="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition">Cancelar</button>
                        <button type="submit" id="btn-submit-aditivo" class="flex-1 px-4 py-2.5 bg-brand-dark text-brand-main font-black hover:bg-black shadow-hard border border-gray-900 transition flex items-center justify-center gap-2">
                            <i class="ph-fill ph-file-pdf text-lg"></i> Gerar Renovação
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL DE REIMPRESSÃO DE TERMOS ADITIVOS -->
        <div id="modal-reimprimir-aditivo" class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[80] hidden flex items-center justify-center p-4 transition-opacity opacity-0">
            <div class="bg-white border border-gray-900 w-full max-w-xl shadow-2xl overflow-hidden transform scale-95 transition-transform" id="modal-reimprimir-aditivo-panel">
                <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div>
                        <h2 class="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                            <i class="ph-bold ph-printer text-purple-600 text-lg"></i> Reimprimir Termo Aditivo
                        </h2>
                        <p class="text-[11px] text-gray-500 font-sans" id="reimp-subtitulo">Selecione qual termo aditivo deseja visualizar / imprimir</p>
                    </div>
                    <button id="btn-fechar-reimprimir" class="text-gray-400 hover:text-red-600 transition"><i class="ph ph-x text-xl"></i></button>
                </div>
                <div class="p-6 space-y-4">
                    <div class="bg-purple-50 border border-purple-200 p-3 text-xs space-y-1">
                        <div><strong class="text-purple-900">Cliente:</strong> <span id="reimp-info-cliente" class="text-gray-900 font-bold"></span></div>
                        <div><strong class="text-purple-900">Veículo:</strong> <span id="reimp-info-veiculo" class="text-gray-900 font-bold"></span></div>
                        <div><strong class="text-purple-900">Contrato:</strong> <span id="reimp-info-contrato" class="font-mono text-gray-900 font-bold"></span></div>
                    </div>

                    <div class="max-h-80 overflow-y-auto space-y-2 border border-gray-200 p-2 bg-gray-50/50" id="reimp-lista-aditivos">
                        <!-- Itens injetados via JS -->
                    </div>

                    <div class="pt-4 border-t border-gray-100 flex justify-end gap-3">
                        <button type="button" id="btn-cancelar-reimprimir" class="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold text-xs uppercase hover:bg-gray-50 transition">Fechar</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL DE DEVOLUÇÃO (BAIXA DE CONTRATO) -->
        <div id="modal-devolucao" class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[80] hidden flex items-center justify-center p-4 transition-opacity opacity-0">
            <div class="bg-white border border-gray-900 w-full max-w-lg shadow-2xl overflow-hidden transform scale-95 transition-transform" id="modal-devolucao-panel">
                <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h2 class="text-sm font-black text-gray-900 uppercase tracking-wider">🏁 Devolução do Veículo & Baixa de Contrato</h2>
                    <button id="btn-fechar-devolucao" class="text-gray-400 hover:text-red-600 transition"><i class="ph ph-x text-xl"></i></button>
                </div>
                <form id="form-devolucao" class="p-6 space-y-4">
                    <input type="hidden" id="dev-contrato-id">
                    
                    <div class="bg-blue-50 border border-blue-200 p-3 text-xs space-y-1">
                        <div><strong class="text-blue-900">Cliente:</strong> <span id="dev-info-cliente" class="text-gray-900 font-bold"></span></div>
                        <div><strong class="text-blue-900">Veículo:</strong> <span id="dev-info-veiculo" class="text-gray-900 font-bold"></span></div>
                        <div><strong class="text-blue-900">KM no Início (Saída):</strong> <span id="dev-km-saida-display" class="font-mono text-gray-900 font-bold"></span> km</div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Quilometragem de Retorno (KM Atual no Painel) *</label>
                        <input type="number" id="dev-km-retorno" required placeholder="Ex: 45000" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-mono font-bold text-blue-800">
                        <p class="text-[11px] text-gray-500 mt-1">Informe a quilometragem com a qual o veículo retornou no ato da devolução.</p>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Observações da Devolução (opcional)</label>
                        <input type="text" id="dev-obs" placeholder="Ex: Devolvido limpo, sem avarias e com combustível conforme entrega." class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                    </div>

                    <div class="pt-4 border-t border-gray-100 flex gap-3">
                        <button type="button" id="btn-cancelar-devolucao" class="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition">Cancelar</button>
                        <button type="submit" class="flex-1 px-4 py-2.5 bg-brand-dark text-brand-main font-black hover:bg-black shadow-hard border border-gray-900 transition flex items-center justify-center gap-2">
                            <i class="ph-bold ph-check text-lg"></i> Confirmar Devolução
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // ========== LÓGICA DA FILA DE ESPERA ==========
    const modalFila = document.getElementById('modal-fila');
    const modalFilaPanel = document.getElementById('modal-fila-panel');
    const tbFila = document.getElementById('tb-fila');
    const filaVazia = document.getElementById('fila-vazia');
    const badgeFila = document.getElementById('badge-fila');

    function atualizarFila() {
        tbFila.innerHTML = '';
        badgeFila.innerText = db.espera.length;
        if (db.espera.length === 0) {
            filaVazia.classList.remove('hidden');
            filaVazia.classList.add('flex');
        } else {
            filaVazia.classList.add('hidden');
            filaVazia.classList.remove('flex');
            db.espera.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-gray-100 transition-colors";
                tr.innerHTML = `
                    <td class="px-4 py-3 w-10 text-center"><span class="bg-gray-200 text-gray-600 font-bold px-2 py-0.5 rounded-sm text-xs">${index + 1}º</span></td>
                    <td class="px-4 py-3">
                        <div class="font-bold text-gray-800">${item.nome}</div>
                        <div class="text-[10px] text-gray-500 uppercase">${item.preferencia || 'Qualquer Veículo'}</div>
                    </td>
                    <td class="px-4 py-3 text-right">
                        <div class="flex gap-2 justify-end">
                            <button class="btn-wpp-fila bg-emerald-50 text-emerald-600 border border-emerald-200 p-1.5 rounded-sm hover:bg-emerald-500 hover:text-white transition" data-wpp="${item.telefone}" data-nome="${item.nome}" data-pref="${item.preferencia || ''}"><i class="ph-bold ph-whatsapp-logo text-lg"></i></button>
                            <button class="btn-remover-fila bg-red-50 text-red-600 border border-red-200 p-1.5 rounded-sm hover:bg-red-600 hover:text-white transition" data-id="${item.id}"><i class="ph-bold ph-trash text-lg"></i></button>
                        </div>
                    </td>
                `;
                tbFila.appendChild(tr);
            });
        }
    }

    document.getElementById('btn-fila-espera').addEventListener('click', () => {
        atualizarFila();
        modalFila.classList.remove('hidden');
        setTimeout(() => { modalFila.classList.remove('opacity-0'); modalFilaPanel.classList.remove('scale-95'); }, 10);
    });

    document.getElementById('btn-fechar-fila').addEventListener('click', () => {
        modalFila.classList.add('opacity-0');
        modalFilaPanel.classList.add('scale-95');
        setTimeout(() => modalFila.classList.add('hidden'), 200);
    });

    document.getElementById('form-fila').addEventListener('submit', async (e) => {
        e.preventDefault();
        db.espera.push({
            id: Date.now(),
            nome: document.getElementById('fila-nome').value,
            telefone: document.getElementById('fila-wpp').value,
            preferencia: document.getElementById('fila-pref').value,
            data: new Date().toISOString()
        });
        await window.electronAPI.saveData('espera', db.espera);
        atualizarFila();
        document.getElementById('form-fila').reset();
    });

    tbFila.addEventListener('click', async (e) => {
        const btnDel = e.target.closest('.btn-remover-fila');
        const btnWpp = e.target.closest('.btn-wpp-fila');
        if (btnDel) {
            const id = Number(btnDel.getAttribute('data-id'));
            db.espera = db.espera.filter(x => x.id !== id);
            await window.electronAPI.saveData('espera', db.espera);
            atualizarFila();
        }
        if (btnWpp) {
            const fone = btnWpp.getAttribute('data-wpp').replace(/\D/g, '');
            const nome = btnWpp.getAttribute('data-nome');
            const pref = btnWpp.getAttribute('data-pref') || '';
            const isCarroPref = pref.toLowerCase().includes('carro');
            const termoVeiculo = isCarroPref ? 'Um carro' : 'Uma moto';
            const emoji = isCarroPref ? '🚗' : '🏍️';
            let txt = `Olá *${nome.trim()}*! Tudo bem? 👋\n\nAqui é da *VANDO LOCADORA*.\n${termoVeiculo} acabou de ficar disponível no nosso pátio!\n\nVocê ainda tem interesse em alugar conosco? Responda o mais rápido possível para segurarmos a sua reserva! ${emoji}`;
            if (window.enviarMensagemWhatsapp) {
                window.enviarMensagemWhatsapp(fone, txt);
            } else {
                window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(txt)}`, '_blank');
            }
        }
    });

    // ========== LÓGICA DO CONTRATO ==========
    let watermarkBase64 = null;
    window.electronAPI.getLogoBase64().then(b64 => {
        if (b64) {
            const preImg = new Image();
            preImg.src = b64;
            preImg.onload = () => {
                const cvs = document.createElement('canvas');
                const size = Math.max(preImg.width, preImg.height);
                cvs.width = size; cvs.height = size;
                const ctx = cvs.getContext('2d');
                ctx.globalAlpha = 0.06; // Suave opacidade
                const dx = (size - preImg.width) / 2;
                const dy = (size - preImg.height) / 2;
                ctx.drawImage(preImg, dx, dy);
                watermarkBase64 = cvs.toDataURL('image/png');
            };
        }
    }).catch(err => console.error("Erro ao carregar marca d'água:", err));

    let paginaAtual = 1;
    const itensPorPagina = 50;

    const tbody = document.getElementById('tb-contratos');
    const emptyState = document.getElementById('contratos-empty');
    const modal = document.getElementById('modal-contrato');
    const modalPanel = document.getElementById('modal-contrato-panel');
    const form = document.getElementById('form-contrato');
    const inputBusca = document.getElementById('busca-contratos');

    const btnPagePrev = document.getElementById('btn-page-prev-c');
    const btnPageNext = document.getElementById('btn-page-next-c');
    const pageIndicator = document.getElementById('page-indicator-c');
    const containerPaginacao = document.getElementById('contratos-paginacao');
    const selCliente = document.getElementById('loc-cliente');
    const inputClienteBusca = document.getElementById('loc-cliente-busca');
    const containerResultados = document.getElementById('loc-cliente-resultados');
    const btnClienteLimpar = document.getElementById('loc-cliente-limpar');
    const selVeiculo = document.getElementById('loc-veiculo');
    const selPlano = document.getElementById('loc-plano');
    const inputInicio = document.getElementById('loc-data-inicio');
    const inputFim = document.getElementById('loc-data-fim');
    const inputValor = document.getElementById('loc-valor');
    const inputCaucao = document.getElementById('loc-caucao');
    const selCaucaoTipo = document.getElementById('loc-caucao-tipo');
    const containerLocCaucaoValor = document.getElementById('container-loc-caucao-valor');
    const containerCaucaoPenhora = document.getElementById('container-caucao-penhora');
    const inputCaucaoPenhoraDetalhes = document.getElementById('loc-caucao-penhora-detalhes');
    const inputValorEntrada = document.getElementById('loc-valor-entrada');
    const inputNumParcelas = document.getElementById('loc-num-parcelas');
    const inputValorParcela = document.getElementById('loc-valor-parcela');
    const inputPeriodicidade = document.getElementById('loc-periodicidade');
    const inputProxManutencao = document.getElementById('loc-prox-manutencao');
    const camposSimplesFidelidade = document.getElementById('campos-simples-fidelidade');
    const camposFidelidade = document.getElementById('campos-fidelidade');
    const camposAquisicao = document.getElementById('campos-aquisicao');

    // Modal Aditivo
    const modalAditivo = document.getElementById('modal-aditivo');
    const modalAditivoPanel = document.getElementById('modal-aditivo-panel');
    const formAditivo = document.getElementById('form-aditivo');
    const inputAdtContratoId = document.getElementById('adt-contrato-id');
    const inputAdtDataInicio = document.getElementById('adt-data-inicio');
    const inputAdtNovaDataFim = document.getElementById('adt-nova-data-fim');
    const inputAdtNovoValor = document.getElementById('adt-novo-valor');
    const inputAdtKmAtual = document.getElementById('adt-km-atual');
    const inputAdtObs = document.getElementById('adt-obs');

    // Modal Reimprimir Aditivo
    const modalReimprimir = document.getElementById('modal-reimprimir-aditivo');
    const modalReimprimirPanel = document.getElementById('modal-reimprimir-aditivo-panel');
    const btnFecharReimprimir = document.getElementById('btn-fechar-reimprimir');
    const btnCancelarReimprimir = document.getElementById('btn-cancelar-reimprimir');
    const reimpInfoCliente = document.getElementById('reimp-info-cliente');
    const reimpInfoVeiculo = document.getElementById('reimp-info-veiculo');
    const reimpInfoContrato = document.getElementById('reimp-info-contrato');
    const reimpListaAditivos = document.getElementById('reimp-lista-aditivos');

    function getHistoricoAditivos(contrato) {
        if (!contrato) return [];
        if (Array.isArray(contrato.historico_aditivos)) {
            return contrato.historico_aditivos;
        }
        if (typeof contrato.historico_aditivos === 'string' && contrato.historico_aditivos.trim()) {
            try {
                const parsed = JSON.parse(contrato.historico_aditivos);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                console.warn('Erro ao parsear historico_aditivos:', e);
            }
        }
        return [];
    }

    function getUltimoAditivo(contrato) {
        if (!contrato) return null;
        if (contrato.ultimo_aditivo && typeof contrato.ultimo_aditivo === 'object') {
            return contrato.ultimo_aditivo;
        }
        if (typeof contrato.ultimo_aditivo === 'string' && contrato.ultimo_aditivo.trim()) {
            try {
                const parsed = JSON.parse(contrato.ultimo_aditivo);
                if (parsed && typeof parsed === 'object') return parsed;
            } catch (e) {
                console.warn('Erro ao parsear ultimo_aditivo:', e);
            }
        }
        const hist = getHistoricoAditivos(contrato);
        if (hist.length > 0) {
            return hist[hist.length - 1];
        }
        return null;
    }

    function obterOuSintetizarAditivos(c) {
        let lista = getHistoricoAditivos(c);
        if (lista && lista.length > 0) {
            return lista;
        }
        const ult = getUltimoAditivo(c);
        if (ult) {
            return [ult];
        }
        const numAdt = Number(c.numero_aditivo) || 0;
        const isFid = c.tipo_plano === 'fidelidade';
        const isAqui = c.tipo_plano === 'aquisicao';
        const semanasPagas = Number(c.semanas_pagas) || (isFid ? (numAdt > 0 ? numAdt + 1 : 1) : numAdt);

        if (numAdt > 0 || (isFid && semanasPagas > 1) || (isAqui && semanasPagas > 0)) {
            const totalAditivos = numAdt > 0 ? numAdt : (isFid ? (semanasPagas - 1) : semanasPagas);
            const resultado = [];
            for (let i = 1; i <= totalAditivos; i++) {
                const semNum = isFid ? (i + 1) : i;
                const valSem = isFid 
                    ? (Number(c.valor_semanal) || (Number(c.valor) > 1000 ? Number(c.valor)/12 : Number(c.valor)) || 350)
                    : (isAqui ? (Number(c.valor_semanal) || Number(c.valor_parcela) || 375) : Number(c.valor));
                resultado.push({
                    id: `legado-${c.id}-${i}`,
                    numero_aditivo: i,
                    semanas_pagas: semNum,
                    data_inicio: c.data_inicio,
                    data_fim: c.data_fim,
                    valor: valSem,
                    km_atual: c.km_retorno || c.km_saida || 0,
                    observacoes: c.observacoes || '',
                    criado_em: c.criado_em || new Date().toISOString()
                });
            }
            return resultado;
        }
        return [];
    }

    // Modal Devolução (Baixa)
    const modalDevolucao = document.getElementById('modal-devolucao');
    const modalDevolucaoPanel = document.getElementById('modal-devolucao-panel');
    const formDevolucao = document.getElementById('form-devolucao');
    const inputDevContratoId = document.getElementById('dev-contrato-id');
    const devInfoCliente = document.getElementById('dev-info-cliente');
    const devInfoVeiculo = document.getElementById('dev-info-veiculo');
    const devKmSaidaDisplay = document.getElementById('dev-km-saida-display');
    const inputDevKmRetorno = document.getElementById('dev-km-retorno');
    const inputDevObs = document.getElementById('dev-obs');
    const btnFecharDevolucao = document.getElementById('btn-fechar-devolucao');
    const btnCancelarDevolucao = document.getElementById('btn-cancelar-devolucao');

    function calcularTotalFidelidade() {
        const sem = Number(inputValor.value) || 0;
        const total = sem * 12;
        const dispSem = document.getElementById('fidelidade-valor-semanal-display');
        const dispTot = document.getElementById('fidelidade-valor-total-display');
        if (dispSem) dispSem.innerText = utils.formatMoney(sem);
        if (dispTot) dispTot.innerText = utils.formatMoney(total);
    }

    // Mostrar/esconder campos conforme plano
    function toggleCamposPlano() {
        const plano = selPlano.value;
        const lblValor = document.getElementById('lbl-loc-valor');
        camposSimplesFidelidade.style.display = 'grid';
        if (plano === 'simples') {
            if (lblValor) lblValor.innerText = 'Valor Total da Locação (R$) *';
            inputValor.placeholder = 'Ex: 450';
            camposFidelidade.classList.add('hidden');
            camposAquisicao.classList.add('hidden');
            document.getElementById('modal-contrato-subtitle').innerText = 'Contrato Sem Fidelidade';
        } else if (plano === 'fidelidade') {
            if (lblValor) lblValor.innerText = 'Valor Semanal (R$) *';
            inputValor.placeholder = 'Ex: 350';
            if (!inputValor.value || inputValor.value === '375') inputValor.value = '350';
            camposFidelidade.classList.remove('hidden');
            camposAquisicao.classList.add('hidden');
            document.getElementById('modal-contrato-subtitle').innerText = 'Plano Fidelidade – 3 meses (12 semanas)';

            // Auto-preencher término para 12 semanas (84 dias / 3 meses) a partir do início
            if (inputInicio.value) {
                const dIni = new Date(inputInicio.value);
                if (!isNaN(dIni.getTime())) {
                    const dFim = new Date(dIni.getTime());
                    dFim.setDate(dFim.getDate() + 84);
                    const dtFimLocal = new Date(dFim.getTime() - (dFim.getTimezoneOffset() * 60000));
                    inputFim.value = dtFimLocal.toISOString().slice(0, 16);
                }
            }
            if (!inputProxManutencao.value && inputInicio.value) {
                const dManut = new Date(inputInicio.value);
                dManut.setDate(dManut.getDate() + 30);
                inputProxManutencao.value = dManut.toISOString().split('T')[0];
            }
            calcularTotalFidelidade();
        } else if (plano === 'aquisicao') {
            if (lblValor) lblValor.innerText = 'Valor Semanal da Parcela (R$) *';
            inputValor.placeholder = 'Ex: 375';
            if (!inputValor.value || inputValor.value === '350') inputValor.value = '375';
            if (!inputValorEntrada.value) inputValorEntrada.value = '2000';
            if (!inputNumParcelas.value) inputNumParcelas.value = '104';
            if (!inputValorParcela.value || inputValorParcela.value === '350') inputValorParcela.value = '375';

            camposFidelidade.classList.add('hidden');
            camposAquisicao.classList.remove('hidden');
            document.getElementById('modal-contrato-subtitle').innerText = 'Contrato de Aquisição (Opção de Compra – 104 semanas)';

            // Auto-preencher término para 104 semanas (728 dias / 2 anos) a partir do início
            if (inputInicio.value) {
                const dIni = new Date(inputInicio.value);
                if (!isNaN(dIni.getTime())) {
                    const dFim = new Date(dIni.getTime());
                    dFim.setDate(dFim.getDate() + (104 * 7));
                    const dtFimLocal = new Date(dFim.getTime() - (dFim.getTimezoneOffset() * 60000));
                    inputFim.value = dtFimLocal.toISOString().slice(0, 16);
                }
            }
            calcularTotalAquisicao();
        }
    }

    inputValor.addEventListener('input', () => {
        if (selPlano.value === 'fidelidade') {
            calcularTotalFidelidade();
        } else if (selPlano.value === 'aquisicao') {
            inputValorParcela.value = inputValor.value;
            calcularTotalAquisicao();
        }
    });

    function calcularTotalAquisicao() {
        const entrada = Number(inputValorEntrada.value) || 0;
        const parcelas = Number(inputNumParcelas.value) || 0;
        const valorParcela = Number(inputValorParcela.value) || Number(inputValor.value) || 375;
        const total = entrada + (parcelas * valorParcela);
        const dispTotal = document.getElementById('loc-total-aquisicao');
        if (dispTotal) dispTotal.innerText = utils.formatMoney(total);
    }

    inputValorEntrada.addEventListener('input', calcularTotalAquisicao);
    inputNumParcelas.addEventListener('input', calcularTotalAquisicao);
    inputValorParcela.addEventListener('input', () => {
        inputValor.value = inputValorParcela.value;
        calcularTotalAquisicao();
    });

    selPlano.addEventListener('change', toggleCamposPlano);

    if (selCaucaoTipo && containerCaucaoPenhora) {
        selCaucaoTipo.addEventListener('change', () => {
            const val = selCaucaoTipo.value;
            if (val === 'sem_caucao') {
                if (containerLocCaucaoValor) containerLocCaucaoValor.classList.add('hidden');
                if (inputCaucao) {
                    inputCaucao.value = '0';
                    inputCaucao.required = false;
                }
                containerCaucaoPenhora.classList.add('hidden');
                if (inputCaucaoPenhoraDetalhes) inputCaucaoPenhoraDetalhes.required = false;
            } else if (val === 'penhora') {
                if (containerLocCaucaoValor) containerLocCaucaoValor.classList.remove('hidden');
                if (inputCaucao) inputCaucao.required = false;
                containerCaucaoPenhora.classList.remove('hidden');
                if (inputCaucaoPenhoraDetalhes) inputCaucaoPenhoraDetalhes.required = true;
            } else {
                if (containerLocCaucaoValor) containerLocCaucaoValor.classList.remove('hidden');
                if (inputCaucao) inputCaucao.required = true;
                containerCaucaoPenhora.classList.add('hidden');
                if (inputCaucaoPenhoraDetalhes) {
                    inputCaucaoPenhoraDetalhes.required = false;
                    inputCaucaoPenhoraDetalhes.value = '';
                }
            }
        });
    }

    function showPasswordModal() {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-senha-admin');
            const input = document.getElementById('input-senha-admin');
            const confirmBtn = document.getElementById('btn-confirmar-senha');
            const cancelBtn = document.getElementById('btn-cancelar-senha');
            const erro = document.getElementById('erro-senha-admin');

            modal.classList.remove('hidden');
            input.value = '';
            erro.classList.add('hidden');
            setTimeout(() => input.focus(), 100);

            function cleanup() {
                modal.classList.add('hidden');
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                input.removeEventListener('keydown', onKeydown);
            }

            function onConfirm() {
                const senha = input.value.trim();
                if (senha === '') {
                    erro.classList.remove('hidden');
                    return;
                }
                cleanup();
                resolve(senha);
            }

            function onCancel() {
                cleanup();
                resolve(null);
            }

            function onKeydown(e) {
                if (e.key === 'Enter') onConfirm();
                if (e.key === 'Escape') onCancel();
            }

            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
            input.addEventListener('keydown', onKeydown);
        });
    }

    function carregarSelects() {
        const options = ['<option value="">-- Selecione o Veículo --</option>'];
        db.veiculos.filter(v => v.status === 'disponivel').forEach(v => {
            const tagCat = (v.categoria === 'carro') ? '[🚗 CARRO]' : '[🏍️ MOTO]';
            const kmText = Number(v.km_atual || 0).toLocaleString('pt-BR');
            options.push(`<option value="${v.id}">${tagCat} ${v.placa} - ${v.modelo} [KM: ${kmText} | ${v.combustivel || 0} Traços]</option>`);
        });
        selVeiculo.innerHTML = options.join('');
    }

    function atualizarTabela() {
        const termo = inputBusca.value.toLowerCase();
        tbody.innerHTML = '';
        badgeFila.innerText = db.espera.length;

        // Criar mapas de busca O(1) para evitar loops O(N * M) pesados
        const clientesMap = {};
        db.clientes.forEach(cli => {
            clientesMap[cli.id] = cli;
        });

        const veiculosMap = {};
        db.veiculos.forEach(vei => {
            veiculosMap[vei.id] = vei;
        });

        const filtrados = db.contratos.filter(c => {
            const cli = clientesMap[c.cliente_id] || { nome: '' };
            const vei = veiculosMap[c.veiculo_id] || { placa: '' };
            return cli.nome.toLowerCase().includes(termo) || vei.placa.toLowerCase().includes(termo) || c.id.toString().includes(termo);
        });

        filtrados.sort((a, b) => {
            if (a.status === 'ativo' && b.status !== 'ativo') return -1;
            if (a.status !== 'ativo' && b.status === 'ativo') return 1;
            return b.id - a.id;
        });

        // Configuração de Paginação
        const totalPaginas = Math.ceil(filtrados.length / itensPorPagina) || 1;
        if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
        if (paginaAtual < 1) paginaAtual = 1;

        const inicio = (paginaAtual - 1) * itensPorPagina;
        const fim = inicio + itensPorPagina;
        const paginados = filtrados.slice(inicio, fim);

        // Atualizar botões e texto da paginação
        btnPagePrev.disabled = (paginaAtual === 1);
        btnPageNext.disabled = (paginaAtual === totalPaginas);
        pageIndicator.innerText = `Página ${paginaAtual} de ${totalPaginas} (${filtrados.length} contratos)`;

        if (filtrados.length === 0) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('flex');
            containerPaginacao.classList.add('hidden');
        } else {
            emptyState.classList.add('hidden');
            emptyState.classList.remove('flex');
            containerPaginacao.classList.remove('hidden');
            
            paginados.forEach(c => {
                const cli = clientesMap[c.cliente_id] || { nome: 'Cliente Apagado', wpp: '---' };
                const vei = veiculosMap[c.veiculo_id] || { modelo: 'Veículo Apagado', placa: '---' };
                const isRecorrente = (c.tipo_plano === 'fidelidade' || c.tipo_plano === 'aquisicao');
                const dataCobrarRef = (isRecorrente && c.vencimento) ? `${c.vencimento}T23:59:59` : c.data_fim;
                const dataFimObj = new Date(dataCobrarRef);
                const isAtrasado = c.status === 'ativo' && dataFimObj < new Date();
                let badgeStatus = '';
                if (c.status === 'ativo') {
                    badgeStatus = isAtrasado 
                        ? `<span class="bg-red-100 text-red-700 px-2 py-1 text-[10px] font-black uppercase tracking-widest border border-red-200"><i class="ph-fill ph-warning-circle"></i> Atraso</span>` 
                        : `<span class="bg-blue-100 text-blue-700 px-2 py-1 text-[10px] font-black uppercase tracking-widest border border-blue-200"><i class="ph-fill ph-play-circle"></i> Ativo</span>`;
                } else {
                    badgeStatus = `<span class="bg-gray-100 text-gray-500 px-2 py-1 text-[10px] font-black uppercase tracking-widest border border-gray-300"><i class="ph-fill ph-check-circle"></i> Encerrado</span>`;
                }
                const planoLabel = c.tipo_plano === 'simples' ? 'Sem Fidelidade' : c.tipo_plano === 'fidelidade' ? 'Fidelidade 3M' : 'Contrato de Aquisição';
                let planoDisplay = `<span class="text-xs font-bold bg-gray-200 px-1.5 py-0.5 rounded-sm">${planoLabel}</span>`;
                if (c.tipo_plano === 'fidelidade') {
                    const pagas = c.semanas_pagas || 1;
                    const total = c.numero_parcelas || 12;
                    const pct = Math.min(100, Math.round((pagas / total) * 100));
                    const semVal = Number(c.valor_semanal || c.valor_parcela) || (Number(c.valor) > 1000 ? Number(c.valor) / 12 : Number(c.valor)) || 350;
                    const totalVal = Number(c.valor_integral) || (Number(c.valor) > 1000 ? Number(c.valor) : semVal * 12);
                    planoDisplay += `
                        <div class="mt-2 w-32 bg-gray-50 border border-gray-200 p-1.5 rounded shadow-sm text-left">
                            <div class="flex justify-between items-center text-[9px] font-black text-gray-500 mb-1">
                                <span>${pagas}/${total} sem</span>
                                <span class="text-blue-600 font-bold">${pct}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                                <div class="bg-blue-600 h-1 rounded-full" style="width: ${pct}%"></div>
                            </div>
                            <div class="text-[8px] text-gray-600 font-bold mt-1">
                                ${utils.formatMoney(semVal)}/sem
                            </div>
                            <div class="flex gap-1 mt-1.5 justify-end">
                                <button class="btn-dec-semana bg-white hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200 text-gray-700 px-1 py-0.5 rounded-sm text-[8px] font-black shadow-sm transition" data-id="${c.id}" title="Remover semana">-1 sem</button>
                                <button class="btn-inc-semana bg-white hover:bg-emerald-50 hover:text-emerald-600 border border-gray-200 hover:border-emerald-200 text-gray-700 px-1 py-0.5 rounded-sm text-[8px] font-black shadow-sm transition" data-id="${c.id}" title="Adicionar semana">+1 sem</button>
                            </div>
                        </div>
                    `;
                } else if (c.tipo_plano === 'aquisicao') {
                    const pagas = c.semanas_pagas || 0;
                    const total = c.numero_parcelas || 104;
                    const pct = Math.min(100, Math.round((pagas / total) * 100));
                    const semVal = Number(c.valor_parcela || c.valor_semanal) || 375;
                    planoDisplay += `
                        <div class="mt-2 w-32 bg-gray-50 border border-gray-200 p-1.5 rounded shadow-sm text-left">
                            <div class="flex justify-between items-center text-[9px] font-black text-gray-500 mb-1">
                                <span>${pagas}/${total} sem</span>
                                <span class="text-emerald-600 font-bold">${pct}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                                <div class="bg-emerald-500 h-1 rounded-full" style="width: ${pct}%"></div>
                            </div>
                            <div class="text-[8px] text-gray-600 font-bold mt-1">
                                ${utils.formatMoney(semVal)}/sem
                            </div>
                            <div class="flex gap-1 mt-1.5 justify-end">
                                <button class="btn-dec-semana bg-white hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200 text-gray-700 px-1 py-0.5 rounded-sm text-[8px] font-black shadow-sm transition" data-id="${c.id}" title="Remover semana">-1 sem</button>
                                <button class="btn-inc-semana bg-white hover:bg-emerald-50 hover:text-emerald-600 border border-gray-200 hover:border-emerald-200 text-gray-700 px-1 py-0.5 rounded-sm text-[8px] font-black shadow-sm transition" data-id="${c.id}" title="Adicionar semana">+1 sem</button>
                            </div>
                        </div>
                    `;
                }
                const dtInicio = new Date(c.data_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                const dtFim = new Date(c.data_fim).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                const emitidoPor = c.usuario_nome || 'Sistema';
                const temAditivo = Boolean(
                    (c.numero_aditivo && Number(c.numero_aditivo) > 0) ||
                    (c.tipo_plano === 'fidelidade' && Number(c.semanas_pagas) > 1) ||
                    (c.tipo_plano === 'aquisicao' && Number(c.semanas_pagas) > 0) ||
                    (Array.isArray(c.historico_aditivos) && c.historico_aditivos.length > 0) ||
                    (typeof c.historico_aditivos === 'string' && c.historico_aditivos.length > 2 && c.historico_aditivos !== '[]') ||
                    c.ultimo_aditivo
                );
                const tr = document.createElement('tr');
                tr.className = `border-b border-gray-100 last:border-0 transition-colors ${c.status === 'encerrado' ? 'bg-gray-50/50 opacity-80' : 'hover:bg-gray-50'}`;
                tr.innerHTML = `
                    <td class="px-6 py-4 text-xs font-mono font-bold text-gray-500">#VM-${c.id.toString().slice(-5)}</td>
                    <td class="px-6 py-4">
                        <div class="font-bold text-gray-900">${cli.nome}</div>
                        <div class="text-[10px] text-gray-500 mt-1 uppercase"><i class="ph-fill ph-whatsapp-logo text-emerald-500"></i> ${cli.wpp}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-bold text-gray-800">${vei.modelo}</div>
                        <div class="text-xs bg-white border border-gray-300 inline-block px-1.5 py-0.5 shadow-sm font-mono text-gray-900 mt-1 font-bold">${vei.placa}</div>
                    </td>
                    <td class="px-6 py-4 text-xs">
                        <div class="text-gray-500 mb-1">Início: <span class="font-bold text-gray-800">${dtInicio}</span></div>
                        <div class="${isAtrasado ? 'text-red-600 font-bold' : 'text-gray-500'}">
                            ${isRecorrente ? 'Próx. Venc: ' : 'Fim: '}
                            <span class="font-bold">${isRecorrente && c.vencimento ? new Date(c.vencimento.includes('T') ? c.vencimento : `${c.vencimento}T12:00:00`).toLocaleDateString('pt-BR') : dtFim}</span>
                        </div>
                        ${c.tipo_plano === 'fidelidade' ? `<div class="text-[10px] text-gray-400 mt-0.5">Término 3M: ${dtFim}</div>` : (c.tipo_plano === 'aquisicao' ? `<div class="text-[10px] text-emerald-700 mt-0.5">Previsão 2 Anos: ${dtFim}</div>` : '')}
                    </td>
                    <td class="px-6 py-4">${planoDisplay}</td>
                    <td class="px-6 py-4">${badgeStatus}</td>
                    <td class="px-6 py-4 text-xs text-gray-600">${emitidoPor}</td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex flex-col gap-1.5 items-end justify-center h-full w-full">
                        <div class="flex gap-1 w-full justify-end">
                            <button class="btn-wpp bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 px-2 py-1 text-[10px] uppercase tracking-wider font-black transition rounded-sm flex items-center gap-1 shadow-sm" data-id="${c.id}">
                                <i class="ph-bold ph-whatsapp-logo text-sm"></i> WPP
                            </button>
                                <button class="btn-pdf bg-brand-main hover:bg-brand-hover text-brand-dark px-2 py-1 text-[10px] uppercase tracking-wider font-black transition border border-brand-dark rounded-sm flex items-center gap-1 shadow-sm" data-id="${c.id}">
                                    <i class="ph-bold ph-printer text-sm"></i> PDF
                                </button>
                                ${c.tipo_plano === 'fidelidade' ? `
                                <button class="btn-aditivo bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 px-2 py-1 text-[10px] uppercase tracking-wider font-black transition rounded-sm flex items-center gap-1 shadow-sm" data-id="${c.id}" title="Abater Semanalidade de R$ 350 do Contrato de 3 Meses">
                                    <i class="ph-bold ph-receipt text-sm"></i> Abater Semanal
                                </button>
                                ` : c.tipo_plano === 'aquisicao' ? `
                                <button class="btn-aditivo bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 px-2 py-1 text-[10px] uppercase tracking-wider font-black transition rounded-sm flex items-center gap-1 shadow-sm" data-id="${c.id}" title="Pagar Parcela Semanal de Aquisição (R$ 375)">
                                    <i class="ph-bold ph-receipt text-sm"></i> Pagar Parcela (R$ 375)
                                </button>
                                ` : `
                                <button class="btn-aditivo bg-blue-50 hover:bg-blue-500 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 px-2 py-1 text-[10px] uppercase tracking-wider font-black transition rounded-sm flex items-center gap-1 shadow-sm" data-id="${c.id}">
                                    <i class="ph-bold ph-arrows-clockwise text-sm"></i> Renovar
                                </button>
                                `}
                            </div>
                            <div class="flex gap-1 w-full justify-end">
                                ${temAditivo ? `
                                <button class="btn-reimprimir-aditivo bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 hover:border-purple-600 px-2 py-1 text-[10px] uppercase tracking-wider font-black transition rounded-sm flex items-center gap-1 shadow-sm" data-id="${c.id}" title="Reimprimir Termo Aditivo / Comprovante">
                                    <i class="ph-bold ph-printer text-sm"></i> Reimprimir Aditivo
                                </button>
                                ` : ''}
                                ${c.status === 'ativo' ? `
                                <button class="btn-encerrar bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-600 hover:text-white hover:border-orange-700 px-2 py-1 text-[10px] font-black uppercase tracking-wider transition rounded-sm flex items-center gap-1 shadow-sm" data-id="${c.id}">
                                    <i class="ph-bold ph-stop text-sm"></i> Baixa
                                </button>
                                ` : ``}
                                <button class="btn-excluir-contrato bg-red-50 text-red-700 border border-red-200 hover:bg-red-700 hover:text-white hover:border-red-800 px-2 py-1 text-[10px] font-black uppercase tracking-wider transition rounded-sm flex items-center gap-1 shadow-sm" data-id="${c.id}">
                                    <i class="ph-bold ph-trash text-sm"></i> Apagar
                                </button>
                            </div>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // ========== FUNÇÃO PARA SALVAR PDF NO DISCO ==========
    async function salvarPDFNoDisco(pdfBlob, nomeArquivo) {
        try {
            const userDataPath = await window.electronAPI.getUserDataPath();
            const pastaContratos = `${userDataPath}/contratos_pdf`;
            
            await window.electronAPI.createFolder(pastaContratos);
            
            const caminhoCompleto = `${pastaContratos}/${nomeArquivo}`;
            
            const reader = new FileReader();
            const base64Data = await new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(pdfBlob);
            });
            
            await window.electronAPI.saveFile(caminhoCompleto, base64Data);
            
            console.log(`✅ PDF salvo em: ${caminhoCompleto}`);
            return caminhoCompleto;
        } catch (error) {
            console.error('Erro ao salvar PDF no disco:', error);
            return null;
        }
    }

    window.abrirVisualizadorPDF = function(pdfBlob, titulo = 'Visualizar Contrato') {
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        let modal = document.getElementById('modal-pdf-viewer');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-pdf-viewer';
            modal.className = 'fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-2 md:p-6 transition-all duration-300';
            modal.innerHTML = `
                <div class="w-full max-w-5xl bg-gray-900 border border-gray-800 rounded shadow-2xl flex flex-col h-[92vh] overflow-hidden">
                    <div class="flex items-center justify-between px-6 py-4 bg-brand-dark border-b border-gray-800 text-white shrink-0">
                        <div class="flex items-center gap-3">
                            <i class="ph-bold ph-file-pdf text-brand-main text-2xl"></i>
                            <h3 id="pdf-viewer-title" class="text-sm font-bold uppercase tracking-wide">Visualizar Contrato</h3>
                        </div>
                        <button id="btn-fechar-pdf-viewer" class="bg-gray-800 hover:bg-red-900/40 text-gray-300 hover:text-red-400 px-4 py-2 text-xs font-bold uppercase rounded tracking-wider flex items-center gap-2 border border-gray-700 hover:border-red-800 transition-colors">
                            <i class="ph-bold ph-x text-base"></i> Fechar Visualizador
                        </button>
                    </div>
                    <div class="flex-1 bg-gray-800 relative w-full h-full">
                        <iframe id="pdf-viewer-iframe" class="w-full h-full border-none" src=""></iframe>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('btn-fechar-pdf-viewer').addEventListener('click', () => {
                modal.classList.add('hidden');
                const iframe = document.getElementById('pdf-viewer-iframe');
                if (iframe && iframe.dataset.blobUrl) {
                    URL.revokeObjectURL(iframe.dataset.blobUrl);
                    iframe.dataset.blobUrl = '';
                }
            });
        }

        const iframe = document.getElementById('pdf-viewer-iframe');
        const titleEl = document.getElementById('pdf-viewer-title');
        if (titleEl) titleEl.innerText = titulo;
        if (iframe) {
            iframe.dataset.blobUrl = pdfUrl;
            iframe.src = pdfUrl;
        }
        modal.classList.remove('hidden');
    };

    // ========== GERAR PDF CONTRATO ==========
    function gerarPDFContrato(contratoId) {
        return new Promise((resolve, reject) => {
            try {
                const c = db.contratos.find(x => x.id === contratoId);
                if (!c) return reject(new Error('Contrato não encontrado.'));
                const cli = db.clientes.find(x => x.id === c.cliente_id) || {};
                const vei = db.veiculos.find(x => x.id === c.veiculo_id) || {};

                // Preparar dados dinâmicos
                const dataAtual = new Date();
                const dataAtualExtenso = dataAtual.toLocaleDateString('pt-BR', { dateStyle: 'long' });
                const horaAtual = dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const loggedUser = getUser();
                const emitidoPor = c.usuario_nome || (loggedUser ? (loggedUser.cpf ? `${loggedUser.nome} - (${loggedUser.cpf})` : loggedUser.nome) : 'Sistema');

                const pdfContainer = document.createElement('div');
                pdfContainer.style.width = '100%';
                pdfContainer.style.background = '#fff';

                const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '___/___/_____';
                const fmtDataHora = (d) => d ? new Date(d).toLocaleString('pt-BR') : '___/___/_____ __:__';
                const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                const nivelCombustivelLabel = (val) => {
                    const map = ['Vazio', '1/4', '2/4 (Meio)', '3/4', 'Cheio'];
                    return map[val] || 'Não informado';
                };

                const enderecoCliente = () => {
                    let p = cli.logradouro || "";
                    if (cli.numero) p += `, Nº ${cli.numero}`;
                    if (cli.complemento) p += ` (${cli.complemento})`;
                    if (cli.bairro) p += `, Bairro: ${cli.bairro}`;
                    return p;
                };

                const dias = Math.max(1, Math.round((new Date(c.data_fim).getTime() - new Date(c.data_inicio).getTime()) / 86400000));
                const plano = c.tipo_plano || 'simples';

                const isCarro = Boolean(
                    (vei.categoria && vei.categoria.toLowerCase().trim() === 'carro') ||
                    (vei.tipo && vei.tipo.toLowerCase().trim() === 'carro') ||
                    (c.categoria && c.categoria.toLowerCase().trim() === 'carro') ||
                    (vei.modelo && (
                        vei.modelo.toLowerCase().includes('gol') || vei.modelo.toLowerCase().includes('uno') || 
                        vei.modelo.toLowerCase().includes('palio') || vei.modelo.toLowerCase().includes('onix') || 
                        vei.modelo.toLowerCase().includes('hb20') || vei.modelo.toLowerCase().includes('carro') || 
                        vei.modelo.toLowerCase().includes('fiat') || vei.modelo.toLowerCase().includes('chevrolet') || 
                        vei.modelo.toLowerCase().includes('volkswagen') || vei.modelo.toLowerCase().includes('ford') || 
                        vei.modelo.toLowerCase().includes('renault') || vei.modelo.toLowerCase().includes('toyota') || 
                        vei.modelo.toLowerCase().includes('honda civic') || vei.modelo.toLowerCase().includes('fit')
                    ))
                );
                const tipoVeiculoTexto = isCarro ? 'automóvel (carro)' : 'motocicleta';
                const tituloContrato = plano === 'aquisicao'
                    ? `CONTRATO DE LOCAÇÃO COM OPÇÃO DE AQUISIÇÃO (COMPRA) DE VEÍCULO AUTOMOTOR (${tipoVeiculoTexto.toUpperCase()})`
                    : (isCarro 
                        ? 'CONTRATO DE LOCAÇÃO DE VEÍCULO AUTOMOTOR (AUTOMÓVEL)' 
                        : 'CONTRATO DE LOCAÇÃO DE VEÍCULO AUTOMOTOR (MOTOCICLETA)');

                const clausula83 = isCarro
                    ? '8.3. O locatário deverá conferir habitualmente o nível do óleo do motor, fluido de freio, água do radiador e realizar a calibração de pneus do automóvel, sob pena de indenizar eventuais avarias decorrentes do mau uso.'
                    : '8.3. O locatário deverá realizar o aperto de corrente a cada 02 dias, devendo, também, no mesmo realizar engraxamento e calibração de pneus da motocicleta, sob pena de indenizar eventuais avarias decorrentes do mau uso.';

                const clausula84 = isCarro
                    ? '8.4. O locatário deverá conferir com habitualidade as pastilhas e discos de freio, realizar alinhamento/balanceamento dos pneus e semanalmente apresentar o automóvel, pelo menos 01 vez, devidamente lavado na loja da locadora.'
                    : '8.4. O locatário deverá conferir com habitualidade as pastilhas de freio, realizar calibração dos pneus com frequência e semanalmente apresentar a motocicleta, pelo menos 01 vez, devidamente lavada na loja da locadora.';

                const clausula85 = isCarro
                    ? '8.5. A cada 5.000km rodados deverá o locatário realizar a troca de óleo e filtros do automóvel, comprovando a troca à locadora.'
                    : '8.5. A cada 1.500km rodados deverá o locatário realizar a troca de óleo da motocicleta, comprovando a troca à locadora.';

                let html = `
                    <div style="font-family: Arial, sans-serif; color: #000; font-size: 9.5px; line-height: 1.45; padding: 6mm; max-width: 100%; text-align: justify;">
                        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px;">
                            <h2 style="margin:0; font-size: 12px; font-weight: bold; text-transform: uppercase;">VANDO MOTOS LOCADORA LTDA – VANDO MOTOS</h2>
                            <p style="margin:2px 0 0; font-size: 8.5px; color: #333;">CNPJ: 28.623.431/0001-23 | Rua Algodoeiro, nº 4581, Bairro Caladinho, CEP 76.808-252, Porto Velho/RO</p>
                            <p style="margin:0; font-size: 8.5px; color: #333;">Telefone: (69) 99222-2722 | E-mail: VANDO_PVH@HOTMAIL.COM</p>
                        </div>

                        <h1 style="text-align: center; font-size: 11px; font-weight: bold; text-decoration: underline; margin-bottom: 10px; text-transform: uppercase;">
                            ${tituloContrato}
                        </h1>

                        <p style="margin: 0 0 8px;">Pelo presente instrumento particular de Contrato de Locação de Veículo Automotor (${tipoVeiculoTexto}), as partes abaixo qualificadas têm, entre si, justo e acertado o presente contrato, que se regerá pelas cláusulas e condições a seguir estipuladas, bem como pela legislação civil aplicável, notadamente o disposto nos artigos 565 e seguintes do Código Civil Brasileiro:</p>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">DAS PARTES</h3>
                            <p style="margin: 0 0 4px;"><strong>LOCADORA:</strong> <strong>VANDO MOTOS LOCADORA LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 28.623.431/0001-23, nome fantasia “VANDO MOTOS”, com endereço comercial na Rua Algodoeiro, nº 4581, Bairro Caladinho, CEP 76.808-252, Porto Velho/RO, telefone (69) 99222-2722, e-mail VANDO_PVH@HOTMAIL.COM, neste ato representada na forma de seus atos constitutivos, doravante denominada simplesmente LOCADORA.</p>
                            <p style="margin: 0;"><strong>LOCATÁRIO(A):</strong> <strong style="text-transform:uppercase;">${cli.nome || '___________________________'}</strong>, nacionalidade: ${cli.nacionalidade || 'Brasileira'}, profissão: ${cli.profissao || 'Não informada'}, estado civil: ${cli.estado_civil || 'Solteiro(a)'}, inscrito(a) no CPF/CNPJ nº ${cli.cpf_cnpj || cli.cpf || '___________'}, RG/Identidade nº ${cli.rg_identidade || cli.rg || '___________'}, CNH nº ${cli.num_cnh || '___________'}, residente e domiciliado(a) à ${enderecoCliente()}, CEP: ${cli.cep || '76800-000'}, na cidade de ${cli.cidade || 'Porto Velho'}/${cli.uf || 'RO'}, e-mail: ${cli.email || '___________'}, telefone: ${cli.wpp || cli.telefone || '___________'}, doravante denominado(a) simplesmente LOCATÁRIO.</p>
                        </div>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA PRIMEIRA – DO OBJETO</h3>
                            <p style="margin: 0 0 4px;">1.1. O objeto do presente contrato é a locação${plano === 'aquisicao' ? ', com expressa opção irretratável de aquisição/compra definitiva pelo LOCATÁRIO ao término das parcelas acordadas,' : ''}, pela LOCADORA ao LOCATÁRIO, do veículo automotor tipo ${tipoVeiculoTexto}, com as seguintes características:</p>
                            <ul style="margin: 2px 0 4px; padding-left: 20px;">
                                <li><strong>Marca/Modelo:</strong> ${vei.modelo || 'Não informado'} | <strong>Cor:</strong> ${vei.cor || 'Preta/Não informada'} | <strong>Placa:</strong> ${vei.placa || '---'} | <strong>Chassi:</strong> ${vei.chassi || 'não informado'} | <strong>KM de Saída:</strong> ${(c.km_saida !== undefined && c.km_saida !== null ? c.km_saida : (vei.km_atual || 0)).toLocaleString('pt-BR')} km</li>
                                <li><strong>Valor de mercado aproximado (referência Tabela FIPE):</strong> ${fmtMoeda(vei.fipe || 0)}</li>
                            </ul>
                            <p style="margin: 0 0 4px;">1.2. O veículo é entregue ao LOCATÁRIO acompanhado de laudo de vistoria descritivo do seu estado de conservação no momento da entrega, documento que passa a integrar este contrato para todos os fins de direito.</p>
                            <p style="margin: 0 0 4px;">1.3. A locação destina-se exclusivamente ao uso urbano no Município de Porto Velho/RO, sem restrição de horário, sendo vedada a utilização do veículo fora dos limites territoriais aqui estabelecidos sem autorização prévia e expressa da LOCADORA.</p>
                            <p style="margin: 0;">1.4. O uso do veículo é pessoal e exclusivo do LOCATÁRIO, sendo vedadas a cessão, sublocação, o empréstimo ou a transferência da posse a terceiros, ainda que a título gratuito, sob as penalidades previstas na Cláusula Nona deste contrato.</p>
                        </div>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA SEGUNDA – DO PRAZO DA LOCAÇÃO</h3>
                            ${plano === 'aquisicao' ? `
                            <p style="margin: 0 0 4px;">2.1. O presente contrato vigorará pelo prazo determinado de <strong>104 (cento e quatro) semanas consecutivas (aproximadamente 2 anos)</strong>, com início em <strong>${fmtDataHora(c.data_inicio)}</strong> e término previsto para <strong>${fmtDataHora(c.data_fim)}</strong>.</p>
                            <p style="margin: 0 0 4px;">2.2. Findo o prazo contratual e adimplidas com pontualidade todas as parcelas e encargos ajustados, consumar-se-á a opção de compra em favor do LOCATÁRIO na forma da Cláusula Terceira.</p>
                            <p style="margin: 0;">2.3. Em caso de desistência ou devolução do veículo antes do prazo, a posse do veículo reverterá imediatamente à LOCADORA, com perda das parcelas pagas a título de fruição do bem.</p>
                            ` : plano === 'fidelidade' ? `
                            <p style="margin: 0 0 4px;">2.1. A locação vigorará pelo prazo determinado de <strong>3 (três) meses (12 semanas)</strong> (início em <strong>${fmtDataHora(c.data_inicio)}</strong> e término em <strong>${fmtDataHora(c.data_fim)}</strong>), sob compromisso irretratável de permanência e fidelidade locatícia.</p>
                            <p style="margin: 0 0 4px;">2.2. Findo o prazo contratual sem que tenha havido prorrogação ou renovação por novo período mediante termo aditivo, o LOCATÁRIO obriga-se a devolver o veículo imediatamente à LOCADORA no mesmo estado em que o recebeu.</p>
                            <p style="margin: 0;">2.3. Não devolvido o veículo no prazo estipulado, incidirá multa diária de R$ 50,00 (cinquenta reais), sem prejuízo do valor proporcional do aluguel calculado pelos dias de atraso, além das medidas cabíveis previstas na Cláusula Quinta.</p>
                            ` : `
                            <p style="margin: 0 0 4px;">2.1. A locação vigorará pelo prazo de <strong>${dias} dia(s)</strong> (início em <strong>${fmtDataHora(c.data_inicio)}</strong> e término em <strong>${fmtDataHora(c.data_fim)}</strong>).</p>
                            <p style="margin: 0 0 4px;">2.2. Findo o prazo contratual sem que tenha havido renovação na forma da Cláusula Sexta, o LOCATÁRIO obriga-se a devolver o veículo imediatamente à LOCADORA.</p>
                            <p style="margin: 0;">2.3. Não devolvido o veículo no prazo estipulado, incidirá multa diária de R$ 50,00 (cinquenta reais), sem prejuízo do valor proporcional do aluguel calculado pelos dias de atraso, além das medidas cabíveis previstas na Cláusula Quinta.</p>
                            `}
                        </div>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA TERCEIRA – DO VALOR E DA FORMA DE PAGAMENTO</h3>
                            ${plano === 'aquisicao' ? `
                            <p style="margin: 0 0 4px;">3.1. O valor total global da operação de locação com opção de aquisição é de <strong>${fmtMoeda(c.valor_integral || c.valor_total_aquisicao || 41000)}</strong>, composto da seguinte forma:</p>
                            <ul style="margin: 2px 0 4px; padding-left: 20px;">
                                <li><strong>a) Entrada Inicial:</strong> <strong>${fmtMoeda(c.valor_entrada || 2000)}</strong>, quitada pelo LOCATÁRIO no ato da assinatura deste instrumento;</li>
                                <li><strong>b) Parcelas Semanais de Aquisição:</strong> O saldo remanescente será quitado em <strong>${c.numero_parcelas || 104} (cento e quatro) parcelas semanais sucessivas no valor de ${fmtMoeda(c.valor_semanal || c.valor_parcela || 375)}</strong> cada uma.</li>
                            </ul>
                            <p style="margin: 0 0 4px;">3.2. Os pagamentos semanais de <strong>${fmtMoeda(c.valor_semanal || c.valor_parcela || 375)}</strong> vencerão sucessivamente a cada 7 (sete) dias a contar da data de início, devendo ser quitados exclusivamente via PIX para a chave informada no item 3.5. A cada quitação semanal, será emitido o respectivo Termo Aditivo com o abatimento e atualização do saldo devedor.</p>
                            <p style="margin: 0 0 4px;">3.3. <strong>DA TRANSFERÊNCIA DA PROPRIEDADE (DUT / ATPV-e):</strong> Quitadas integralmente as 104 (cento e quatro) parcelas semanais no valor de R$ 375,00 e a entrada pactuada, a LOCADORA compromete-se de forma irrevogável e irretratável a providenciar, em até 10 (dez) dias úteis, a assinatura e entrega do Documento Único de Transferência (DUT / ATPV-e) em nome do LOCATÁRIO, correndo por conta exclusiva deste todas as taxas de transferência, vistorias e encargos perante o DETRAN.</p>
                            <p style="margin: 0 0 4px;">3.4. <strong>DA INADIMPLÊNCIA E CANCELAMENTO DA OPÇÃO DE COMPRA:</strong> O atraso reiterado no pagamento semanal superior a 15 (quinze) dias ou o acúmulo de 3 (três) parcelas semanais inadimplidas ensejará a rescisão automática deste contrato por justa causa e a perda imediata da opção de compra, tornando ilegítima a posse do veículo pelo LOCATÁRIO e autorizando a busca e apreensão do bem pela LOCADORA. Neste caso, todos os valores pagos até então (entrada e parcelas semanais) serão convertidos integralmente em pagamento de aluguel e depreciação pelo tempo de fruição, sem direito a qualquer ressarcimento ou devolução ao LOCATÁRIO.</p>
                            <p style="margin: 0;">3.5. O pagamento das parcelas semanais será efetuado exclusivamente mediante transferência bancária via PIX, para a chave <strong>vandomotolocadora@gmail.com</strong>, titularidade de <strong>Vanderlei Ferreira da Cruz</strong>, Banco <strong>Nubank</strong>.</p>
                            ` : plano === 'fidelidade' ? `
                            <p style="margin: 0 0 4px;">3.1. O presente contrato de locação com fidelidade de 3 (três) meses possui o valor total integral de <strong>${fmtMoeda(c.valor_integral || (c.valor > 1000 ? c.valor : (c.valor_semanal ? c.valor_semanal * 12 : c.valor * 12)))}</strong>, correspondente a <strong>12 (doze) parcelas semanais sucessivas no valor de ${fmtMoeda(c.valor_semanal || (c.valor > 1000 ? c.valor / 12 : c.valor))}</strong> cada.</p>
                            <p style="margin: 0 0 4px;">3.2. No ato da celebração deste contrato, o LOCATÁRIO efetua o pagamento antecipado da 1ª parcela semanal no valor de <strong>${fmtMoeda(c.valor_semanal || (c.valor > 1000 ? c.valor / 12 : c.valor))}</strong>, acrescido da caução estipulada na Cláusula Quarta.</p>
                            <p style="margin: 0 0 4px;">3.3. As 11 (onze) parcelas semanais subsequentes no valor de <strong>${fmtMoeda(c.valor_semanal || (c.valor > 1000 ? c.valor / 12 : c.valor))}</strong> cada vencerão a cada 7 (sete) dias, sendo formalizado a cada pagamento semanal o respectivo Termo Aditivo de Renovação e Abatimento de Parcela Semanal, conferindo quitação da referida semana e atualizando o saldo do plano de fidelidade de 3 meses.</p>
                            <p style="margin: 0 0 4px;">3.4. O pagamento de cada parcela semanal será efetuado exclusivamente mediante transferência bancária via PIX, para a chave <strong>vandomotolocadora@gmail.com</strong>, titularidade de <strong>Vanderlei Ferreira da Cruz</strong>, Banco <strong>Nubank</strong>. É de responsabilidade do LOCATÁRIO conferir os dados bancários informados pela LOCADORA antes de efetivar a transferência, não se responsabilizando a LOCADORA por pagamentos feitos a dados incorretos ou de terceiros.</p>
                            <p style="margin: 0;">3.5. A rescisão antecipada da locação ou devolução do veículo antes de transcorridos integralmente os 3 (três) meses de fidelidade sujeitará o LOCATÁRIO ao pagamento da multa rescisória fixada na Cláusula Quinta deste contrato.</p>
                            ` : `
                            <p style="margin: 0 0 4px;">3.1. O valor da diária de locação, livremente ajustado pelas partes, é de <strong>${fmtMoeda(c.valor / (dias || 1))}</strong>, perfazendo o valor total de <strong>${fmtMoeda(c.valor)}</strong> para o prazo contratado, a ser pago integralmente e de forma antecipada, no ato da assinatura deste instrumento.</p>
                            <p style="margin: 0 0 4px;">3.2. O pagamento será efetuado exclusivamente mediante transferência bancária via PIX, para a chave <strong>vandomotolocadora@gmail.com</strong>, titularidade de <strong>Vanderlei Ferreira da Cruz</strong>, Banco <strong>Nubank</strong>. É de responsabilidade do LOCATÁRIO conferir os dados bancários informados pela LOCADORA antes de efetivar a transferência, não se responsabilizando a LOCADORA por pagamentos feitos a dados incorretos ou de terceiros.</p>
                            <p style="margin: 0;">3.3. Em caso de renovação da locação, o valor da diária poderá ser atualizado mediante prévio acordo entre as partes, formalizado em termo aditivo.</p>
                            `}
                        </div>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA QUARTA – DA CAUÇÃO (GARANTIA)</h3>
                            <p style="margin: 0 0 4px;">4.1. A título de garantia do fiel cumprimento das obrigações assumidas neste contrato, o LOCATÁRIO presta, nesta data, caução no valor de <strong>${fmtMoeda(c.caucao || 0)}</strong>, mediante ${c.caucao_tipo === 'sem_caucao' ? 'dispensa de caução' : c.caucao_tipo === 'penhora' ? `penhora de bem no pátio da locadora (${c.caucao_penhora_detalhes || 'Bem no pátio'})` : `pagamento via ${c.caucao_tipo ? c.caucao_tipo.toUpperCase() : 'PIX'}`}.</p>
                            <p style="margin: 0 0 4px;">4.2. O valor caucionado poderá ser utilizado pela LOCADORA para ressarcimento de danos causados ao veículo, multas de trânsito não quitadas, diferença de combustível, taxas de limpeza ou qualquer outro débito do LOCATÁRIO decorrente deste contrato, sem prejuízo da cobrança do saldo remanescente, caso o valor da caução seja insuficiente para cobrir o débito apurado.</p>
                            <p style="margin: 0;">4.3. Inexistindo débitos pendentes, a caução será restituída ao LOCATÁRIO no prazo de até 5 (cinco) dias úteis, contados da efetiva devolução do veículo e da verificação de sua conformidade com o laudo de vistoria inicial.</p>
                        </div>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA QUINTA – DA RESCISÃO E DA QUEBRA CONTRATUAL</h3>
                            <p style="margin: 0 0 4px;">5.1. O descumprimento de qualquer cláusula deste contrato por qualquer das partes ensejará sua rescisão de pleno direito, independentemente de aviso prévio ou notificação judicial ou extrajudicial, sem prejuízo do direito da parte prejudicada à indenização pelas perdas e danos comprovados.</p>
                            <p style="margin: 0 0 4px;">5.2. Em caso de quebra de contrato pelo LOCATÁRIO – seja pela entrega antecipada do veículo sem prévio acordo com a LOCADORA, seja por inadimplência – o LOCATÁRIO obriga-se ao pagamento de multa compensatória no valor de R$ 2.000,00 (dois mil reais), à vista ou mediante cartão de crédito, sem prejuízo da cobrança de eventuais danos e débitos pendentes.</p>
                            <p style="margin: 0;">5.3. Verificado o atraso na devolução do veículo por prazo superior a 3 (três) dias, contados do término da locação ou de eventual prorrogação, a posse do bem passará a ser considerada indevida, autorizando a LOCADORA a adotar as medidas judiciais e extrajudiciais cabíveis, incluindo ação de busca e apreensão e/ou registro de ocorrência policial, correndo por conta do LOCATÁRIO todas as despesas decorrentes, inclusive honorários advocatícios e custas processuais.</p>
                        </div>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA SEXTA – DA RENOVAÇÃO CONTRATUAL</h3>
                            <p style="margin: 0 0 4px;">6.1. O presente contrato poderá ser renovado por igual ou diferente período, mediante prévio acordo entre as partes, formalizado por meio de Termo Aditivo, que passará a integrar este instrumento.</p>
                            <p style="margin: 0 0 4px;">6.2. A intenção de renovação deverá ser comunicada pelo LOCATÁRIO à LOCADORA com antecedência mínima de 24 (vinte e quatro) horas do término do prazo contratual, mediante comparecimento pessoal à sede da LOCADORA para formalização do respectivo aditivo.</p>
                            <p style="margin: 0;">6.3. Não havendo renovação formalizada na forma acima, aplica-se o disposto no item 2.3 da Cláusula Segunda.</p>
                        </div>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA SÉTIMA – DO COMBUSTÍVEL</h3>
                            <p style="margin: 0 0 4px;">7.1. O veículo será entregue ao LOCATÁRIO com a quantidade de combustível <strong>${nivelCombustivelLabel(c.tracos_saida ?? 0)}</strong>, registrada no laudo de vistoria, devendo ser devolvido ao final da locação com a mesma quantidade.</p>
                            <p style="margin: 0 0 4px;">7.2. Constatada divergência na quantidade de combustível no momento da devolução, será cobrado do LOCATÁRIO o valor correspondente, calculated com base na leitura do marcador do veículo e no valor do litro vigente, informado pela LOCADORA.</p>
                            <p style="margin: 0 0 4px;">7.3. Constatada a utilização de combustível adulterado ou inadequado, o LOCATÁRIO responderá integralmente pelos danos ao veículo decorrentes de tal utilização.</p>
                            <p style="margin: 0;">7.4. Não haverá restituição ao LOCATÁRIO caso o veículo seja devolvido com quantidade de combustível superior à recebida.</p>
                        </div>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA OITAVA – DA LIMPEZA E CONSERVAÇÃO</h3>
                            <p style="margin: 0 0 4px;">8.1. O veículo será entregue limpo e deverá ser devolvido nas mesmas condições de higiene e conservação, ressalvado o desgaste natural decorrente do uso regular.</p>
                            <p style="margin: 0 0 4px;">8.2. Devolvido o veículo em condições de limpeza inferiores às do recebimento, será cobrada do LOCATÁRIO taxa de lavagem, simples ou especial, conforme o estado de conservação constatado.</p>
                            <p style="margin: 0 0 4px;">${clausula83}</p>
                            <p style="margin: 0 0 4px;">${clausula84}</p>
                            <p style="margin: 0;">${clausula85}</p>
                        </div>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA NONA – DA UTILIZAÇÃO E DAS VEDAÇÕES</h3>
                            <p style="margin: 0 0 4px;">9.1. O LOCATÁRIO obriga-se a utilizar o veículo estritamente de acordo com sua natureza e finalidade, observadas as especificações do fabricante, as normas do Código de Trânsito Brasileiro e as resoluções do Conselho Nacional de Trânsito (CONTRAN) e do Departamento Estadual de Trânsito (DETRAN/RO).</p>
                            <p style="margin: 0 0 4px;">9.2. É vedado ao LOCATÁRIO sublocar, ceder, emprestar ou transferir a posse do veículo a terceiros, sob pena de rescisão imediata do contrato, aplicação das multas previstas neste instrumento e recolhimento imediato do veículo pela LOCADORA, sem direito à restituição de valores já pagos.</p>
                            <p style="margin: 0 0 4px;">9.3. O uso do veículo em desacordo com o disposto nesta cláusula autoriza a LOCADORA a rescindir o contrato independentemente de notificação prévia, bem como a proceder ao recolhimento do bem, sem que caiba ao LOCATÁRIO qualquer pretensão indenizatória, reparatória ou compensatória.</p>
                            <p style="margin: 0 0 4px;">9.4. É vedada qualquer alteração ou modificação nas características originais do veículo, estéticas ou mecânicas, salvo mediante autorização prévia e expressa, por escrito, da LOCADORA.</p>
                            <p style="margin: 0 0 4px;">9.5. O LOCATÁRIO declara-se ciente de que responderá integral e exclusivamente por quaisquer danos materiais ou pessoais, próprios ou causados a terceiros, decorrentes da utilização do veículo objeto deste contrato, ficando a LOCADORA isenta de qualquer responsabilidade solidária ou subsidiária.</p>
                            <p style="margin: 0;">9.6. Constatado dano ao veículo por culpa do LOCATÁRIO, ainda que decorrente de fato de terceiro, o reparo será providenciado de imediato, com utilização do valor da caução para cobertura das despesas, cabendo ao LOCATÁRIO complementar eventual diferença, caso o custo do reparo exceda o valor caucionado.</p>
                        </div>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA DÉCIMA – DAS MULTAS E INFRAÇÕES DE TRÂNSITO</h3>
                            <p style="margin: 0 0 4px;">10.1. As multas e infrações de trânsito ocorridas durante a vigência da locação são de responsabilidade exclusiva do LOCATÁRIO, devendo ser quitadas no momento da notificação pelo órgão competente ou até o término do contrato, o que ocorrer primeiro.</p>
                            <p style="margin: 0 0 4px;">10.2. Em caso de apreensão do veículo por infração cometida durante o período de locação, correrão por conta do LOCATÁRIO todas as despesas necessárias à liberação do bem, incluindo taxas administrativas, honorários de profissionais eventualmente contratados e o valor correspondente às diárias de locação relativas ao período em que o veículo permanecer indisponível.</p>
                            <p style="margin: 0 0 4px;">10.3. O LOCATÁRIO autoriza, desde já, que seu nome seja indicado pela LOCADORA perante o órgão de trânsito competente como condutor do veículo à época da infração, nos termos da Resolução CONTRAN nº 404/2012, para fins de transferência de pontuação e apresentação do condutor, podendo a LOCADORA apresentar cópia deste contrato como prova da relação de locação.</p>
                            <p style="margin: 0;">10.4. Fica resguardado ao LOCATÁRIO o direito de recorrer, às suas expensas, contra as multas aplicadas, sem prejuízo da obrigatoriedade do pagamento no prazo estabelecido, assegurado o reembolso caso o recurso seja julgado procedente.</p>
                        </div>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA DÉCIMA PRIMEIRA – DO SINISTRO, PERDA, ROUBO OU FURTO</h3>
                            <p style="margin: 0;">11.1. Em caso de perda, roubo, furto, extravio ou destruição total do veículo, o LOCATÁRIO obriga-se a comunicar imediatamente o fato à LOCADORA e à autoridade policial competente, ficando responsável pela indenização à LOCADORA no valor de mercado do veículo, apurado com base na Tabela FIPE vigente à data do sinistro.</p>
                        </div>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA DÉCIMA SEGUNDA – DOS DEVERES DO LOCATÁRIO</h3>
                            <p style="margin: 0 0 2px;">Sem prejuízo das demais obrigações previstas neste contrato, constituem deveres do LOCATÁRIO:</p>
                            <ul style="margin: 2px 0; padding-left: 20px;">
                                <li>a) efetuar o pagamento do aluguel e demais encargos no prazo estipulado;</li>
                                <li>b) utilizar o veículo conforme sua natureza e finalidade;</li>
                                <li>c) zelar pela conservação do bem como se seu fosse;</li>
                                <li>d) restituir o veículo, ao final da locação, no estado em que o recebeu, conforme laudo de vistoria, ressalvado o desgaste natural de uso;</li>
                                <li>e) comunicar imediatamente à LOCADORA qualquer dano ou ocorrência relevante ao veículo;</li>
                                <li>f) reparar de imediato os danos sob sua responsabilidade, arcando com as diárias correspondentes ao período de indisponibilidade do veículo para locação, quando o reparo decorrer de sua responsabilidade;</li>
                                <li>g) abster-se de modificar as características internas ou externas do veículo sem autorização prévia e expressa da LOCADORA;</li>
                                <li>h) fornecer, no ato da contratação, ao menos 2 (dois) contatos de referência pessoal, nos termos da Cláusula Décima Quinta.</li>
                            </ul>
                        </div>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA DÉCIMA TERCEIRA – DOS DEVERES DA LOCADORA</h3>
                            <p style="margin: 0 0 2px;">Constituem deveres da LOCADORA:</p>
                            <ul style="margin: 2px 0; padding-left: 20px;">
                                <li>a) entregar o veículo em perfeitas condições de uso, funcionamento e segurança, acompanhado do respectivo laudo de vistoria;</li>
                                <li>b) responder por vícios ou defeitos preexistentes à locação, não decorrentes do uso do LOCATÁRIO;</li>
                                <li>c) realizar, às suas expensas, a manutenção preventiva do veículo, incluindo revisões periódicas e reparos decorrentes do desgaste natural de uso, desde que previamente comunicados pelo LOCATÁRIO.</li>
                            </ul>
                        </div>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA DÉCIMA QUARTA – DAS PENALIDADES GERAIS</h3>
                            <p style="margin: 0 0 4px;">14.1. O descumprimento de qualquer obrigação prevista neste contrato sujeitará a parte infratora ao pagamento de indenização pelas perdas e danos, lucros cessantes e demais prejuízos comprovadamente suportados pela outra parte, sem prejuízo das penalidades específicas previstas neste instrumento.</p>
                            <p style="margin: 0;">14.2. A ocorrência de infração contratual autoriza a parte prejudicada a rescindir o contrato de pleno direito, independentemente de notificação prévia, sem prejuízo do direito à indenização cabível.</p>
                        </div>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA DÉCIMA QUINTA – DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)</h3>
                            <p style="margin: 0;">15.1. As partes comprometem-se a tratar os dados pessoais coletados em razão deste contrato em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais – LGPD), utilizando-os exclusivamente para as finalidades relacionadas à execução deste instrumento e ao cumprimento de obrigações legais e regulatórias.</p>
                        </div>

                        <div style="margin-bottom: 8px; page-break-inside: avoid;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA DÉCIMA SEXTA – DO FORO</h3>
                            <p style="margin: 0;">16.1. Fica eleito o foro da Comarca de Porto Velho/RO para dirimir quaisquer questões oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
                        </div>

                        ${c.observacoes ? `
                        <div style="margin-bottom: 10px; page-break-inside: avoid; border: 1px solid #d1d5db; padding: 6px; background-color: #f9fafb;">
                            <h3 style="font-size: 9.5px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px; color: #111827;">OBSERVAÇÕES DO CONTRATO</h3>
                            <p style="margin: 0; font-size: 8.5px; line-height: 1.4; white-space: pre-wrap; color: #374151;">${c.observacoes}</p>
                        </div>
                        ` : ''}

                        <div style="page-break-inside: avoid; margin-top: 15px;">
                            <p style="margin: 0 0 10px;">E, por estarem assim justas e contratadas, as partes firmam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença de 2 (duas) testemunhas abaixo assinadas, para que produza seus jurídicos e legais efeitos.</p>
                            <p style="margin:0 0 20px; text-align: right;">Porto Velho/RO, ${dataAtualExtenso}.</p>
                            
                            <div style="display: flex; justify-content: space-between; margin-top: 30px;">
                                <div style="text-align: center; width: 45%;">
                                    <div style="border-top: 1px solid #000; padding-top: 4px;">
                                        <strong>VANDERLEI FERREIRA DA CRUZ</strong><br>
                                        <span style="font-size:8px; color:#333;">LOCADORA (VANDO MOTOS LOCADORA LTDA) – Representante Legal</span>
                                    </div>
                                </div>
                                <div style="text-align: center; width: 45%;">
                                    <div style="border-top: 1px solid #000; padding-top: 4px;">
                                        <strong style="text-transform:uppercase;">${cli.nome || 'LOCATÁRIO(A)'}</strong><br>
                                        <span style="font-size:8px; color:#333;">LOCATÁRIO(A)</span>
                                    </div>
                                </div>
                            </div>

                            <div style="margin-top: 25px; border-top: 1px dashed #ccc; padding-top: 10px;">
                                <p style="margin:0 0 10px; font-weight:bold; font-size:9px;">TESTEMUNHAS:</p>
                                <div style="display: flex; justify-content: space-between;">
                                    <div style="width: 48%;">
                                        <div style="border-top: 1px solid #000; padding-top: 4px;">
                                            1) Nome: ____________________________<br>
                                            CPF: ____________________________
                                        </div>
                                    </div>
                                    <div style="width: 48%;">
                                        <div style="border-top: 1px solid #000; padding-top: 4px;">
                                            2) Nome: ____________________________<br>
                                            CPF: ____________________________
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                pdfContainer.innerHTML = html;

                const opt = {
                    margin: 8,
                    filename: `Contrato_${cli.nome ? cli.nome.replace(/\s+/g, '_') : 'cliente'}_${plano}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                html2pdf()
                    .set(opt)
                    .from(pdfContainer)
                    .toPdf()
                    .get('pdf')
                    .then(async function(pdf) {
                        if (watermarkBase64) {
                            const totalPages = pdf.internal.getNumberOfPages();
                            for (let i = 1; i <= totalPages; i++) {
                                pdf.setPage(i);
                                const size = 70;
                                const x = (210 - size) / 2;
                                const y = (297 - size) / 2;
                                pdf.addImage(watermarkBase64, 'PNG', x, y, size, size);
                            }
                        }
                        
                        const pdfBlob = pdf.output('blob');
                        const nomeArquivo = `Contrato_VM-${c.id.toString().slice(-5)}_${cli.nome ? cli.nome.replace(/\s+/g, '_') : 'cliente'}_${new Date().toISOString().split('T')[0]}.pdf`;
                        await salvarPDFNoDisco(pdfBlob, nomeArquivo);
                        
                        // Abrir EXCLUSIVAMENTE o visualizador na tela (sem abas de impressão ou download)
                        if (window.abrirVisualizadorPDF) {
                            window.abrirVisualizadorPDF(pdfBlob, `Contrato VM-${c.id.toString().slice(-5)} - ${cli.nome || 'Cliente'}`);
                        }
                        resolve();
                    })
                    .catch(reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    // ========== GERAR ADITIVO ==========
    function gerarPDFAditivo(contratoId, dataInicioRenovacao, novaDataFim, novoValor, obs, kmRenovacao, numeroAditivoParam = null, semanaPagaParam = null) {
        return new Promise((resolve, reject) => {
            try {
                const c = db.contratos.find(x => x.id === contratoId);
                if (!c) return reject(new Error('Contrato não encontrado.'));
                const ultAdt = getUltimoAditivo(c);
                const cli = db.clientes.find(x => x.id === c.cliente_id) || {};
                const vei = db.veiculos.find(x => x.id === c.veiculo_id) || {};
                const loggedUser = getUser();
                const emitidoPor = c.usuario_nome || (loggedUser ? (loggedUser.cpf ? `${loggedUser.nome} - (${loggedUser.cpf})` : loggedUser.nome) : 'Sistema');
                const dataAtual = new Date();
                const dataAtualExtenso = dataAtual.toLocaleDateString('pt-BR', { dateStyle: 'long' });
                const horaAtual = dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                const numeroAditivo = numeroAditivoParam !== null && numeroAditivoParam !== undefined
                    ? Number(numeroAditivoParam)
                    : (c.numero_aditivo ? Number(c.numero_aditivo) : (ultAdt ? Number(ultAdt.numero_aditivo) : 1));

                const semanasPagas = semanaPagaParam !== null && semanaPagaParam !== undefined
                    ? Number(semanaPagaParam)
                    : (Number(c.semanas_pagas) || numeroAditivo);

                const dataIniFinal = dataInicioRenovacao || (ultAdt ? ultAdt.data_inicio : c.data_inicio);
                const dataFimFinal = novaDataFim || (ultAdt ? ultAdt.data_fim : (c.vencimento ? `${c.vencimento}T18:00:00` : c.data_fim));
                const novoValorFinal = (novoValor !== null && novoValor !== undefined && !isNaN(novoValor)) 
                    ? Number(novoValor) 
                    : (ultAdt && ultAdt.valor ? Number(ultAdt.valor) : (c.tipo_plano === 'fidelidade' ? (Number(c.valor_semanal) || 350) : (c.tipo_plano === 'aquisicao' ? (Number(c.valor_semanal) || 375) : Number(c.valor))));
                const kmRenovFinal = (kmRenovacao !== null && kmRenovacao !== undefined && !isNaN(kmRenovacao))
                    ? Number(kmRenovacao)
                    : (ultAdt && ultAdt.km_atual ? Number(ultAdt.km_atual) : (vei.km_atual || c.km_saida || 0));
                const obsFinal = obs || (ultAdt ? ultAdt.observacoes : (c.observacoes || ''));

                const isCarro = Boolean(
                    (vei.categoria && vei.categoria.toLowerCase().trim() === 'carro') ||
                    (vei.tipo && vei.tipo.toLowerCase().trim() === 'carro') ||
                    (c.categoria && c.categoria.toLowerCase().trim() === 'carro') ||
                    (vei.modelo && (
                        vei.modelo.toLowerCase().includes('gol') || vei.modelo.toLowerCase().includes('uno') || 
                        vei.modelo.toLowerCase().includes('palio') || vei.modelo.toLowerCase().includes('onix') || 
                        vei.modelo.toLowerCase().includes('hb20') || vei.modelo.toLowerCase().includes('carro') || 
                        vei.modelo.toLowerCase().includes('fiat') || vei.modelo.toLowerCase().includes('chevrolet') || 
                        vei.modelo.toLowerCase().includes('volkswagen') || vei.modelo.toLowerCase().includes('ford') || 
                        vei.modelo.toLowerCase().includes('renault') || vei.modelo.toLowerCase().includes('toyota') || 
                        vei.modelo.toLowerCase().includes('honda civic') || vei.modelo.toLowerCase().includes('fit')
                    ))
                );
                const tipoVeiculoTexto = isCarro ? 'automóvel (carro)' : 'motocicleta';

                const fmtDataHora = (d) => d ? new Date(d).toLocaleString('pt-BR') : '___/___/_____ __:__';
                const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                const pdfContainer = document.createElement('div');
                pdfContainer.style.width = '100%';
                pdfContainer.style.background = '#fff';

                let html = '';
                if (c.tipo_plano === 'fidelidade') {
                    const valorSemanal = Number(c.valor_semanal) || (Number(c.valor) > 1000 ? Number(c.valor) / 12 : Number(c.valor)) || Number(novoValorFinal) || 350;
                    const valorIntegral = Number(c.valor_integral) || (Number(c.valor) > 1000 ? Number(c.valor) : valorSemanal * 12);
                    const totalPago = Math.min(valorIntegral, semanasPagas * valorSemanal);
                    const saldoRestante = Math.max(0, valorIntegral - totalPago);
                    const semanasRestantes = Math.max(0, 12 - semanasPagas);

                    html = `
                    <div style="font-family: Arial, sans-serif; color: #000; font-size: 9.5px; line-height: 1.4; padding: 6mm; max-width: 100%; text-align: justify; page-break-inside: avoid;">
                        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px;">
                            <h2 style="margin:0; font-size: 12px; font-weight: bold; text-transform: uppercase;">VANDO MOTOS LOCADORA LTDA</h2>
                            <p style="margin:2px 0 0; font-size: 8px; color: #444;">CNPJ: 28.623.431/0001-23 | Rua Algodoeiro, 4581 - Caladinho, Porto Velho/RO | Fone: (69) 99222-2722</p>
                        </div>
                        
                        <h1 style="text-align: center; font-size: 11px; font-weight: bold; text-decoration: underline; margin-bottom: 10px; text-transform: uppercase;">
                            TERMO ADITIVO DE RENOVAÇÃO E ABATIMENTO DE PARCELA SEMANAL
                            <br><span style="font-size: 9.5px; font-weight: normal;">CONTRATO DE LOCAÇÃO COM FIDELIDADE DE 3 MESES – ADITIVO Nº ${numeroAditivo}</span>
                        </h1>

                        <p style="margin: 0 0 6px;">Por este instrumento particular, de um lado como LOCADORA, <strong>VANDO MOTOS LOCADORA LTDA</strong>, inscrita no CNPJ sob o nº 28.623.431/0001-23, e de outro lado como LOCATÁRIO(A), <strong style="text-transform:uppercase;">${cli.nome || '___________________________'}</strong>, inscrito(a) no CPF/CNPJ nº ${cli.cpf_cnpj || '________________'}, têm entre si justo e acordado este Termo Aditivo de Renovação e Abatimento de Parcela Semanal, vinculado ao <strong>Contrato de Locação com Fidelidade ref. VM-${c.id.toString().slice(-5)}</strong>, sob as cláusulas a seguir:</p>

                        <div style="margin: 6px 0;">
                            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA 1ª – DO OBJETO E ABATIMENTO DA PARCELA SEMANAL</h3>
                            <p style="margin:0;">1.1. O presente Termo Aditivo formaliza o pagamento e abatimento da <strong>${semanasPagas}ª (semana de número ${semanasPagas}) parcela semanal</strong>, no valor de <strong>${fmtMoeda(novoValorFinal)}</strong>, referente ao plano de fidelidade de 3 (três) meses do(a) ${tipoVeiculoTexto} modelo <strong>${vei.modelo || '________'}</strong>, placa <strong>${vei.placa || '________'}</strong>, chassi <strong>${vei.chassi || '________'}</strong>.</p>
                            <p style="margin:2px 0 0;">1.2. A LOCADORA confere ao LOCATÁRIO plena e irrevogável quitação exclusivamente em relação à referida semana quitada.</p>
                        </div>

                        <div style="margin: 6px 0;">
                            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA 2ª – DO DEMONSTRATIVO FINANCEIRO E SALDO DO PLANO DE 3 MESES</h3>
                            <div style="border: 1px solid #ccc; background: #fafafa; padding: 6px; margin: 4px 0;">
                                <table style="width: 100%; font-size: 9px; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 2px;"><strong>Valor Total Integral do Contrato (3 Meses):</strong></td>
                                        <td style="padding: 2px; text-align: right; font-weight: bold; font-family: monospace;">${fmtMoeda(valorIntegral)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px;"><strong>Valor da Parcela Semanal:</strong></td>
                                        <td style="padding: 2px; text-align: right; font-weight: bold; font-family: monospace;">${fmtMoeda(valorSemanal)}</td>
                                    </tr>
                                    <tr style="border-top: 1px dashed #ddd;">
                                        <td style="padding: 2px; color: #047857;"><strong>Parcela Abatida neste Aditivo:</strong></td>
                                        <td style="padding: 2px; text-align: right; font-weight: bold; color: #047857;">${semanasPagas}ª Parcela de 12 Semanas (${fmtMoeda(novoValorFinal)})</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px;"><strong>Total Já Pago / Abatido pelo Locatário:</strong></td>
                                        <td style="padding: 2px; text-align: right; font-weight: bold; font-family: monospace;">${fmtMoeda(totalPago)} (${semanasPagas} de 12 semanas)</td>
                                    </tr>
                                    <tr style="border-top: 1px solid #bbb;">
                                        <td style="padding: 2px; color: #b91c1c;"><strong>Saldo Remanescente a Quitar:</strong></td>
                                        <td style="padding: 2px; text-align: right; font-weight: bold; color: #b91c1c; font-family: monospace;">${fmtMoeda(saldoRestante)} (${semanasRestantes} parcelas restantes)</td>
                                    </tr>
                                </table>
                            </div>
                        </div>

                        <div style="margin: 6px 0;">
                            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA 3ª – DO PERÍODO DA SEMANA RENOVADA E PRÓXIMO VENCIMENTO</h3>
                            <p style="margin:0;">3.1. Em decorrência do pagamento e abatimento ora formalizado, fica renovada e assegurada a posse direta e o uso do veículo pelo período semanal compreendido entre <strong>${fmtDataHora(dataIniFinal)}</strong> e <strong>${fmtDataHora(dataFimFinal)}</strong>.</p>
                            <p style="margin:2px 0 0;">3.2. A próxima parcela semanal no valor de <strong>${fmtMoeda(valorSemanal)}</strong> vencerá impreterivelmente em <strong>${fmtDataHora(dataFimFinal)}</strong>.</p>
                            <p style="margin:2px 0 0;">3.3. Registra-se que a quilometragem do veículo aferida no ato deste abatimento é de <strong>${Number(kmRenovFinal).toLocaleString('pt-BR')} KM</strong>.</p>
                        </div>

                        <div style="margin: 6px 0;">
                            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA 4ª – DA RATIFICAÇÃO DAS DEMAIS CLÁUSULAS CONTRATUAIS</h3>
                            <p style="margin:0;">Permanecem plenamente válidas, vigentes e inalteradas todas as demais cláusulas e condições estipuladas no Contrato Principal de Locação com Fidelidade ref. VM-${c.id.toString().slice(-5)}, em especial a fidelidade mínima de 3 meses sob pena de multa de R$ 2.000,00 por devolução antecipada, as vedações de sublocação, as obrigações de manutenção preventiva periódica, e a responsabilidade civil e criminal por infrações de trânsito ou sinistros.</p>
                        </div>

                        ${obsFinal ? `
                        <div style="margin: 6px 0;">
                            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 2px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">OBSERVAÇÕES ADICIONAIS</h3>
                            <p style="margin:0;">${obsFinal}</p>
                        </div>
                        ` : ''}

                        <p style="margin: 10px 0 0; text-align: right;">Porto Velho/RO, ${dataAtualExtenso}.</p>
                        
                        <div style="display: flex; justify-content: space-between; margin-top: 25px;">
                            <div style="text-align: center; width: 45%;">
                                <div style="border-top: 1px solid #000; padding-top: 4px;">
                                    <strong>VANDO MOTOS LOCADORA LTDA</strong><br>
                                    <span style="font-size:8px; color:#555;">Representante Legal - Locadora</span>
                                </div>
                            </div>
                            <div style="text-align: center; width: 45%;">
                                <div style="border-top: 1px solid #000; padding-top: 4px;">
                                    <strong style="text-transform:uppercase;">${cli.nome || 'LOCATÁRIO'}</strong><br>
                                    <span style="font-size:8px; color:#555;">Locatário</span>
                                </div>
                            </div>
                        </div>

                        <div style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 8px;">
                            <div style="display: flex; justify-content: space-between;">
                                <div style="width: 45%;">
                                    <p style="margin:0 0 15px; font-weight:bold; font-size:8px;">TESTEMUNHA:</p>
                                    <div style="border-top: 1px solid #000; padding-top: 2px; text-align: center;">
                                        <span style="font-size:8px; color:#555;">Assinatura</span>
                                    </div>
                                </div>
                                <div style="width: 45%; font-size:8px; color:#333; margin-top: 12px;">
                                    Nome: _________________________________________<br>
                                    CPF: __________________________________________
                                </div>
                            </div>
                        </div>

                        <div style="margin-top: 10px; text-align: right; font-size: 8px; color: #777;">Emitido por: ${emitidoPor} às ${horaAtual} em ${dataAtual.toLocaleDateString('pt-BR')}</div>
                    </div>
                    `;
                } else if (c.tipo_plano === 'aquisicao') {
                    const valorSemanal = Number(c.valor_semanal) || Number(c.valor_parcela) || Number(novoValorFinal) || 375;
                    const valorEntrada = Number(c.valor_entrada) || 2000;
                    const valorIntegral = Number(c.valor_integral) || (valorEntrada + 104 * valorSemanal);
                    const totalPago = valorEntrada + Math.min(valorIntegral - valorEntrada, semanasPagas * valorSemanal);
                    const saldoRestante = Math.max(0, valorIntegral - totalPago);
                    const semanasRestantes = Math.max(0, 104 - semanasPagas);

                    html = `
                    <div style="font-family: Arial, sans-serif; color: #000; font-size: 9.5px; line-height: 1.4; padding: 6mm; max-width: 100%; text-align: justify; page-break-inside: avoid;">
                        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px;">
                            <h2 style="margin:0; font-size: 12px; font-weight: bold; text-transform: uppercase;">VANDO MOTOS LOCADORA LTDA</h2>
                            <p style="margin:2px 0 0; font-size: 8px; color: #444;">CNPJ: 28.623.431/0001-23 | Rua Algodoeiro, 4581 - Caladinho, Porto Velho/RO | Fone: (69) 99222-2722</p>
                        </div>
                        
                        <h1 style="text-align: center; font-size: 11px; font-weight: bold; text-decoration: underline; margin-bottom: 10px; text-transform: uppercase;">
                            TERMO ADITIVO DE RENOVAÇÃO E PAGAMENTO DE PARCELA SEMANAL
                            <br><span style="font-size: 9.5px; font-weight: normal;">CONTRATO DE LOCAÇÃO COM OPÇÃO DE AQUISIÇÃO (COMPRA) – ADITIVO Nº ${numeroAditivo}</span>
                        </h1>

                        <p style="margin: 0 0 6px;">Por este instrumento particular, de um lado como LOCADORA, <strong>VANDO MOTOS LOCADORA LTDA</strong>, inscrita no CNPJ sob o nº 28.623.431/0001-23, e de outro lado como LOCATÁRIO(A), <strong style="text-transform:uppercase;">${cli.nome || '___________________________'}</strong>, inscrito(a) no CPF/CNPJ nº ${cli.cpf_cnpj || '________________'}, têm entre si justo e acordado este Termo Aditivo de Renovação e Confirmação de Pagamento de Parcela Semanal, vinculado ao <strong>Contrato de Locação com Opção de Aquisição ref. VM-${c.id.toString().slice(-5)}</strong>, sob as cláusulas a seguir:</p>

                        <div style="margin: 6px 0;">
                            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA 1ª – DO OBJETO E PAGAMENTO DA PARCELA SEMANAL</h3>
                            <p style="margin:0;">1.1. O presente Termo Aditivo formaliza o pagamento e quitação da <strong>${semanasPagas}ª (semana de número ${semanasPagas} de 104) parcela semanal</strong>, no valor de <strong>${fmtMoeda(novoValorFinal)}</strong>, referente ao plano de aquisição do(a) ${tipoVeiculoTexto} modelo <strong>${vei.modelo || '________'}</strong>, placa <strong>${vei.placa || '________'}</strong>, chassi <strong>${vei.chassi || '________'}</strong>.</p>
                            <p style="margin:2px 0 0;">1.2. A LOCADORA confere ao LOCATÁRIO plena e irrevogável quitação exclusivamente em relação à referida semana quitada.</p>
                        </div>

                        <div style="margin: 6px 0;">
                            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA 2ª – DO DEMONSTRATIVO FINANCEIRO E AMORTIZAÇÃO DO PLANO DE AQUISIÇÃO</h3>
                            <div style="border: 1px solid #ccc; background: #fafafa; padding: 6px; margin: 4px 0;">
                                <table style="width: 100%; font-size: 9px; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 2px;"><strong>Valor Total Integral da Aquisição (Total da Operação):</strong></td>
                                        <td style="padding: 2px; text-align: right; font-weight: bold; font-family: monospace;">${fmtMoeda(valorIntegral)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px;"><strong>Entrada Inicial Paga na Assinatura:</strong></td>
                                        <td style="padding: 2px; text-align: right; font-weight: bold; font-family: monospace;">${fmtMoeda(valorEntrada)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px;"><strong>Valor da Parcela Semanal:</strong></td>
                                        <td style="padding: 2px; text-align: right; font-weight: bold; font-family: monospace;">${fmtMoeda(valorSemanal)}</td>
                                    </tr>
                                    <tr style="border-top: 1px dashed #ddd;">
                                        <td style="padding: 2px; color: #047857;"><strong>Parcela Paga / Quitada neste Aditivo:</strong></td>
                                        <td style="padding: 2px; text-align: right; font-weight: bold; color: #047857;">${semanasPagas}ª Parcela de 104 Semanas (${fmtMoeda(novoValorFinal)})</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px;"><strong>Total Já Amortizado pelo Locatário (Entrada + Parcelas):</strong></td>
                                        <td style="padding: 2px; text-align: right; font-weight: bold; font-family: monospace;">${fmtMoeda(totalPago)} (${semanasPagas} de 104 parcelas)</td>
                                    </tr>
                                    <tr style="border-top: 1px solid #bbb;">
                                        <td style="padding: 2px; color: #b91c1c;"><strong>Saldo Devedor Restante para Transferência/Quitação:</strong></td>
                                        <td style="padding: 2px; text-align: right; font-weight: bold; color: #b91c1c; font-family: monospace;">${fmtMoeda(saldoRestante)} (${semanasRestantes} parcelas restantes)</td>
                                    </tr>
                                </table>
                            </div>
                        </div>

                        <div style="margin: 6px 0;">
                            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA 3ª – DO PERÍODO RENOVADO E PRÓXIMO VENCIMENTO</h3>
                            <p style="margin:0;">3.1. Em decorrência do pagamento da presente parcela, fica renovada a posse e vigência semanal compreendida entre <strong>${fmtDataHora(dataIniFinal)}</strong> e <strong>${fmtDataHora(dataFimFinal)}</strong>.</p>
                            <p style="margin:2px 0 0;">3.2. A próxima parcela semanal no valor de <strong>${fmtMoeda(valorSemanal)}</strong> vencerá impreterivelmente em <strong>${fmtDataHora(dataFimFinal)}</strong>.</p>
                            <p style="margin:2px 0 0;">3.3. Registra-se que a quilometragem do veículo aferida no ato deste pagamento é de <strong>${Number(kmRenovFinal).toLocaleString('pt-BR')} KM</strong>.</p>
                        </div>

                        <div style="margin: 6px 0;">
                            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA 4ª – DA RATIFICAÇÃO DAS DEMAIS CLÁUSULAS E OPÇÃO DE COMPRA</h3>
                            <p style="margin:0;">Ficam plenamente mantidas e ratificadas todas as cláusulas e condições estabelecidas no Contrato Principal ref. VM-${c.id.toString().slice(-5)}, incluindo a reserva de domínio em favor da LOCADORA até o adimplemento da 104ª parcela semanal, as normas de conservação e manutenção periódica em oficina credenciada, a indicação imediata de pontuação por multas e a perda imediata da opção de compra em caso de atraso superior a 15 dias.</p>
                        </div>

                        ${obsFinal ? `
                        <div style="margin: 6px 0;">
                            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 2px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">OBSERVAÇÕES ADICIONAIS</h3>
                            <p style="margin:0;">${obsFinal}</p>
                        </div>
                        ` : ''}

                        <p style="margin: 10px 0 0; text-align: right;">Porto Velho/RO, ${dataAtualExtenso}.</p>
                        
                        <div style="display: flex; justify-content: space-between; margin-top: 25px;">
                            <div style="text-align: center; width: 45%;">
                                <div style="border-top: 1px solid #000; padding-top: 4px;">
                                    <strong>VANDO MOTOS LOCADORA LTDA</strong><br>
                                    <span style="font-size:8px; color:#555;">Representante Legal - Locadora</span>
                                </div>
                            </div>
                            <div style="text-align: center; width: 45%;">
                                <div style="border-top: 1px solid #000; padding-top: 4px;">
                                    <strong style="text-transform:uppercase;">${cli.nome || 'LOCATÁRIO'}</strong><br>
                                    <span style="font-size:8px; color:#555;">Locatário</span>
                                </div>
                            </div>
                        </div>

                        <div style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 8px;">
                            <div style="display: flex; justify-content: space-between;">
                                <div style="width: 45%;">
                                    <p style="margin:0 0 15px; font-weight:bold; font-size:8px;">TESTEMUNHA:</p>
                                    <div style="border-top: 1px solid #000; padding-top: 2px; text-align: center;">
                                        <span style="font-size:8px; color:#555;">Assinatura</span>
                                    </div>
                                </div>
                                <div style="width: 45%; font-size:8px; color:#333; margin-top: 12px;">
                                    Nome: _________________________________________<br>
                                    CPF: __________________________________________
                                </div>
                            </div>
                        </div>

                        <div style="margin-top: 10px; text-align: right; font-size: 8px; color: #777;">Emitido por: ${emitidoPor} às ${horaAtual} em ${dataAtual.toLocaleDateString('pt-BR')}</div>
                    </div>
                    `;
                } else {
                    html = `
                    <div style="font-family: Arial, sans-serif; color: #000; font-size: 9.5px; line-height: 1.4; padding: 6mm; max-width: 100%; text-align: justify; page-break-inside: avoid;">
                        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px;">
                            <h2 style="margin:0; font-size: 12px; font-weight: bold; text-transform: uppercase;">VANDO MOTOS LOCADORA LTDA</h2>
                            <p style="margin:2px 0 0; font-size: 8px; color: #444;">CNPJ: 28.623.431/0001-23 | Rua Algodoeiro, 4581 - Caladinho, Porto Velho/RO | Fone: (69) 99222-2722</p>
                        </div>
                        
                        <h1 style="text-align: center; font-size: 11px; font-weight: bold; text-decoration: underline; margin-bottom: 10px; text-transform: uppercase;">
                            TERMO ADITIVO DE RENOVAÇÃO CONTRATUAL – ADITIVO Nº ${numeroAditivo}
                        </h1>

                        <p style="margin: 0 0 6px;">Por este instrumento, de um lado como LOCADORA, <strong>VANDO MOTOS LOCADORA LTDA</strong>, e de outro lado como LOCATÁRIO, <strong style="text-transform:uppercase;">${cli.nome || '___________________________'}</strong>, portador(a) do CPF/CNPJ: ${cli.cpf_cnpj || '________________'}, têm entre si justo e acordado o presente Termo Aditivo de Renovação do Contrato de Locação original ref. <strong>VM-${c.id.toString().slice(-5)}</strong>, mediante as seguintes cláusulas:</p>

                        <div style="margin: 6px 0;">
                            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA 1ª – DO OBJETO DA RENOVAÇÃO</h3>
                            <p style="margin:0;">O presente Termo Aditivo tem por finalidade prorrogar o período de locação do(a) ${tipoVeiculoTexto} modelo <strong>${vei.modelo || '________'}</strong>, placa <strong>${vei.placa || '________'}</strong>, chassi <strong>${vei.chassi || '________'}</strong>, com quilometragem registrada no ato desta renovação em <strong>${Number(kmRenovFinal).toLocaleString('pt-BR')} KM</strong>.</p>
                        </div>

                        <div style="margin: 6px 0;">
                            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA 2ª – DO NOVO PRAZO E VIGÊNCIA</h3>
                            <p style="margin:0;">Fica ajustada a renovação da vigência contratual, iniciando-se em <strong>${fmtDataHora(dataIniFinal)}</strong> e findando-se impreterivelmente em <strong>${fmtDataHora(dataFimFinal)}</strong>.</p>
                        </div>

                        <div style="margin: 6px 0;">
                            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA 3ª – DOS NOVO VALORES</h3>
                            <p style="margin:0;">O LOCATÁRIO pagará à LOCADORA o valor atualizado de <strong>${fmtMoeda(novoValorFinal)}</strong> pela renovação, mantendo-se a forma de pagamento via PIX ajustada no contrato original.</p>
                        </div>

                        <div style="margin: 6px 0;">
                            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">CLÁUSULA 4ª – DA RATIFICAÇÃO DO CONTRATO ORIGINAL</h3>
                            <p style="margin:0;">Ficam expressamente ratificadas e mantidas todas as demais cláusulas e condições do Contrato de Locação original, as quais permanecem em pleno vigor e validade, inclusive aquelas referentes às multas por quebra, juros moratórios, garantias de caução, proibição de sublocação, e responsabilidade civil e criminal em caso de sinistros, multas de trânsito ou apropriação indébita.</p>
                        </div>

                        ${obsFinal ? `
                        <div style="margin: 6px 0;">
                            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 2px; text-transform: uppercase; background: #e5e7eb; padding: 2px 4px;">OBSERVAÇÕES ADICIONAIS</h3>
                            <p style="margin:0;">${obsFinal}</p>
                        </div>
                        ` : ''}

                        <p style="margin: 10px 0 0; text-align: right;">Porto Velho/RO, ${dataAtualExtenso}.</p>
                        
                        <div style="display: flex; justify-content: space-between; margin-top: 25px;">
                            <div style="text-align: center; width: 45%;">
                                <div style="border-top: 1px solid #000; padding-top: 4px;">
                                    <strong>VANDO MOTOS LOCADORA LTDA</strong><br>
                                    <span style="font-size:8px; color:#555;">Representante Legal - Locadora</span>
                                </div>
                            </div>
                            <div style="text-align: center; width: 45%;">
                                <div style="border-top: 1px solid #000; padding-top: 4px;">
                                    <strong style="text-transform:uppercase;">${cli.nome || 'LOCATÁRIO'}</strong><br>
                                    <span style="font-size:8px; color:#555;">Locatário</span>
                                </div>
                            </div>
                        </div>

                        <div style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 8px;">
                            <div style="display: flex; justify-content: space-between;">
                                <div style="width: 45%;">
                                    <p style="margin:0 0 15px; font-weight:bold; font-size:8px;">TESTEMUNHA:</p>
                                    <div style="border-top: 1px solid #000; padding-top: 2px; text-align: center;">
                                        <span style="font-size:8px; color:#555;">Assinatura</span>
                                    </div>
                                </div>
                                <div style="width: 45%; font-size:8px; color:#333; margin-top: 12px;">
                                    Nome: _________________________________________<br>
                                    CPF: __________________________________________
                                </div>
                            </div>
                        </div>

                        <div style="margin-top: 10px; text-align: right; font-size: 8px; color: #777;">Emitido por: ${emitidoPor} às ${horaAtual} em ${dataAtual.toLocaleDateString('pt-BR')}</div>
                    </div>
                    `;
                }

                pdfContainer.innerHTML = html;
                const opt = {
                    margin: 8,
                    filename: `Aditivo_${cli.nome ? cli.nome.replace(/\s+/g, '_') : 'cliente'}_VM-${c.id.toString().slice(-5)}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                html2pdf()
                    .set(opt)
                    .from(pdfContainer)
                    .toPdf()
                    .get('pdf')
                    .then(async function(pdf) {
                        if (watermarkBase64) {
                            const totalPages = pdf.internal.getNumberOfPages();
                            for (let i = 1; i <= totalPages; i++) {
                                pdf.setPage(i);
                                const size = 70;
                                const x = (210 - size) / 2;
                                const y = (297 - size) / 2;
                                pdf.addImage(watermarkBase64, 'PNG', x, y, size, size);
                            }
                        }
                        
                        const pdfBlob = pdf.output('blob');
                        const nomeArquivo = `Aditivo_VM-${c.id.toString().slice(-5)}_${cli.nome ? cli.nome.replace(/\s+/g, '_') : 'cliente'}_${new Date().toISOString().split('T')[0]}.pdf`;
                        await salvarPDFNoDisco(pdfBlob, nomeArquivo);
                        
                        // Abrir EXCLUSIVAMENTE o visualizador na tela (sem abas de impressão ou download)
                        if (window.abrirVisualizadorPDF) {
                            window.abrirVisualizadorPDF(pdfBlob, `Termo Aditivo VM-${c.id.toString().slice(-5)} - ${cli.nome || 'Cliente'}`);
                        }
                        resolve();
                    })
                    .catch(reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    // ===== REIMPRESSÃO DE TERMOS ADITIVOS =====
    function fecharModalReimprimir() {
        if (!modalReimprimir) return;
        modalReimprimir.classList.add('opacity-0');
        if (modalReimprimirPanel) modalReimprimirPanel.classList.add('scale-95');
        setTimeout(() => {
            modalReimprimir.classList.add('hidden');
        }, 200);
    }

    if (btnFecharReimprimir) btnFecharReimprimir.addEventListener('click', fecharModalReimprimir);
    if (btnCancelarReimprimir) btnCancelarReimprimir.addEventListener('click', fecharModalReimprimir);

    async function reimprimirAditivoItem(c, adt) {
        showLoading('Gerando 2ª via do Termo Aditivo...');
        try {
            const numAdt = adt ? adt.numero_aditivo : c.numero_aditivo;
            const semPaga = adt ? adt.semanas_pagas : c.semanas_pagas;
            const dtIni = adt ? adt.data_inicio : c.data_inicio;
            const dtFim = adt ? adt.data_fim : (c.vencimento ? `${c.vencimento}T18:00:00` : c.data_fim);
            const val = adt ? adt.valor : (c.tipo_plano === 'fidelidade' ? (c.valor_semanal || 350) : (c.tipo_plano === 'aquisicao' ? (c.valor_semanal || 375) : c.valor));
            const km = adt ? adt.km_atual : (c.km_retorno || c.km_saida || 0);
            const observ = adt ? adt.observacoes : '';

            await gerarPDFAditivo(c.id, dtIni, dtFim, val, observ, km, numAdt, semPaga);
        } catch (err) {
            console.error('Erro ao reimprimir aditivo:', err);
            await showAlert('Erro ao reimprimir aditivo: ' + err.message);
        } finally {
            hideLoading();
        }
    }

    async function abrirReimpressaoAditivo(c) {
        if (!c) return;
        const aditivos = obterOuSintetizarAditivos(c);

        if (!aditivos || aditivos.length === 0) {
            await showAlert('Nenhum termo aditivo emitido para este contrato até o momento.');
            return;
        }

        // Se houver apenas 1 aditivo, reimprime diretamente para máxima agilidade
        if (aditivos.length === 1) {
            await reimprimirAditivoItem(c, aditivos[0]);
            return;
        }

        // Se houver mais de 1 aditivo, abre modal de seleção
        const cli = db.clientes.find(x => x.id === c.cliente_id) || { nome: 'Cliente' };
        const vei = db.veiculos.find(v => v.id === c.veiculo_id) || { modelo: 'Veículo', placa: '---' };

        if (reimpInfoCliente) reimpInfoCliente.innerText = cli.nome || 'Cliente';
        if (reimpInfoVeiculo) reimpInfoVeiculo.innerText = `${vei.modelo || 'Veículo'} (Placa: ${vei.placa || '---'})`;
        if (reimpInfoContrato) reimpInfoContrato.innerText = `VM-${c.id.toString().slice(-5)} (${c.tipo_plano ? c.tipo_plano.toUpperCase() : 'SIMPLES'})`;

        if (reimpListaAditivos) {
            reimpListaAditivos.innerHTML = '';

            // Ordena do mais recente ao mais antigo para facilitar ao usuário
            const listaOrdenada = [...aditivos].sort((a, b) => (Number(b.numero_aditivo) || 0) - (Number(a.numero_aditivo) || 0));

            listaOrdenada.forEach((adt, idx) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'bg-white border border-gray-200 p-3 hover:border-purple-300 transition flex items-center justify-between shadow-sm';
                
                let labelSemana = '';
                if (c.tipo_plano === 'fidelidade') {
                    labelSemana = `Semana ${adt.semanas_pagas || (adt.numero_aditivo + 1)} de 12`;
                } else if (c.tipo_plano === 'aquisicao') {
                    labelSemana = `Parcela ${adt.semanas_pagas || adt.numero_aditivo} de 104`;
                } else {
                    labelSemana = `Renovação #${adt.numero_aditivo}`;
                }

                const dtIniFmt = adt.data_inicio ? new Date(adt.data_inicio).toLocaleDateString('pt-BR') : '---';
                const dtFimFmt = adt.data_fim ? new Date(adt.data_fim).toLocaleDateString('pt-BR') : '---';
                const valFmt = Number(adt.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                itemDiv.innerHTML = `
                    <div class="space-y-0.5">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-gray-900 text-xs">Termo Aditivo nº ${adt.numero_aditivo}</span>
                            <span class="text-[10px] bg-purple-100 text-purple-800 font-mono font-bold px-1.5 py-0.5 rounded">${labelSemana}</span>
                            ${idx === 0 ? '<span class="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 py-0.2 rounded uppercase">Mais Recente</span>' : ''}
                        </div>
                        <div class="text-[11px] text-gray-500">
                            Período: <strong>${dtIniFmt}</strong> até <strong>${dtFimFmt}</strong>
                            ${adt.km_atual ? ` | KM: <strong>${Number(adt.km_atual).toLocaleString('pt-BR')}</strong>` : ''}
                        </div>
                        <div class="text-[11px] text-emerald-700 font-mono font-bold">
                            Valor: ${valFmt}
                        </div>
                    </div>
                    <button type="button" class="btn-item-reimp bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 hover:border-purple-600 px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-sm flex items-center gap-1 shadow-sm transition">
                        <i class="ph-bold ph-printer text-sm"></i> Reimprimir
                    </button>
                `;

                itemDiv.querySelector('.btn-item-reimp').addEventListener('click', async () => {
                    fecharModalReimprimir();
                    await reimprimirAditivoItem(c, adt);
                });

                reimpListaAditivos.appendChild(itemDiv);
            });
        }

        if (modalReimprimir) {
            modalReimprimir.classList.remove('hidden');
            setTimeout(() => {
                modalReimprimir.classList.remove('opacity-0');
                if (modalReimprimirPanel) modalReimprimirPanel.classList.remove('scale-95');
            }, 10);
        }
    }

    // ===== FUNÇÕES DE MODAL =====
    function toggleModal(abrir = true) {
        if (abrir) {
            carregarSelects();
            const agora = new Date();
            agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
            inputInicio.value = agora.toISOString().slice(0, 16);
            const fim = new Date(agora);
            fim.setDate(fim.getDate() + 7);
            inputFim.value = fim.toISOString().slice(0, 16);
            document.getElementById('modal-contrato-title').innerText = 'Emissão de Contrato de Locação';
            document.getElementById('c-id-edit').value = '';
            document.getElementById('c-contrato-original-id').value = '';
            document.getElementById('c-numero-aditivo').value = '';
            if (containerLocCaucaoValor) containerLocCaucaoValor.classList.remove('hidden');
            if (containerCaucaoPenhora) containerCaucaoPenhora.classList.add('hidden');
            if (inputCaucaoPenhoraDetalhes) inputCaucaoPenhoraDetalhes.required = false;
            
            // Limpa autocomplete do cliente
            if (inputClienteBusca) inputClienteBusca.value = '';
            if (selCliente) selCliente.value = '';
            if (containerResultados) {
                containerResultados.innerHTML = '';
                containerResultados.classList.add('hidden');
            }
            if (btnClienteLimpar) btnClienteLimpar.classList.add('hidden');

            toggleCamposPlano();
            modal.classList.remove('hidden');
            setTimeout(() => { modal.classList.remove('opacity-0'); modalPanel.classList.remove('scale-95'); }, 10);
        } else {
            modal.classList.add('opacity-0');
            modalPanel.classList.add('scale-95');
            setTimeout(() => { 
                modal.classList.add('hidden'); 
                form.reset(); 
                if (containerLocCaucaoValor) containerLocCaucaoValor.classList.remove('hidden');
                if (containerCaucaoPenhora) containerCaucaoPenhora.classList.add('hidden');
                if (inputCaucaoPenhoraDetalhes) inputCaucaoPenhoraDetalhes.required = false;
                
                // Limpa autocomplete do cliente
                if (inputClienteBusca) inputClienteBusca.value = '';
                if (selCliente) selCliente.value = '';
                if (containerResultados) {
                    containerResultados.innerHTML = '';
                    containerResultados.classList.add('hidden');
                }
                if (btnClienteLimpar) btnClienteLimpar.classList.add('hidden');
            }, 200);
        }
    }

    // ===== SUBMIT DO FORM CONTRATO =====
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading('A registar contrato...');
        let novoContrato = null;
        try {
            const clienteId = Number(selCliente.value);
            if (!clienteId) {
                await showAlert('Selecione um cliente.');
                hideLoading();
                return;
            }
            const cliTarget = db.clientes.find(c => c.id === clienteId);
            if (cliTarget && cliTarget.blacklist) {
                await showAlert(`⛔ OPERAÇÃO BLOQUEADA ⛔\n\nEste cliente encontra-se na Blacklist.\nMotivo: ${cliTarget.blacklist_motivo || 'Não informado.'}`);
                hideLoading();
                return;
            }
            const veiId = Number(selVeiculo.value);
            if (!veiId) {
                await showAlert('Selecione um veículo disponível.');
                hideLoading();
                return;
            }
            const veiculoObj = db.veiculos.find(v => v.id === veiId);
            const currentUser = getUser() || { id: 0, nome: 'Sistema' };
            const plano = selPlano.value;
            const dataInicio = inputInicio.value;
            const dataFim = inputFim.value;
            const valor = Number(inputValor.value);
            const caucao = Number(inputCaucao.value) || 0;
            const caucaoTipo = selCaucaoTipo ? selCaucaoTipo.value : 'dinheiro';
            const caucaoPenhoraDetalhes = (selCaucaoTipo && selCaucaoTipo.value === 'penhora') ? (inputCaucaoPenhoraDetalhes ? inputCaucaoPenhoraDetalhes.value.trim() : '') : null;

            if (!dataInicio || !dataFim) {
                await showAlert('Preencha as datas de início e fim.');
                hideLoading();
                return;
            }
            if (!valor || valor <= 0) {
                await showAlert('Informe um valor total válido.');
                hideLoading();
                return;
            }
            if (caucaoTipo !== 'penhora' && caucaoTipo !== 'sem_caucao' && (!caucao || caucao <= 0)) {
                await showAlert('Informe um valor de caução válido.');
                hideLoading();
                return;
            }
            if (caucaoTipo === 'penhora' && !caucaoPenhoraDetalhes) {
                await showAlert('Descreva o bem (carro ou moto) deixado em penhora no pátio.');
                hideLoading();
                return;
            }

            if (plano === 'fidelidade' && !inputProxManutencao.value) {
                await showAlert('Para o plano Fidelidade, informe a data da próxima manutenção obrigatória.');
                hideLoading();
                return;
            }
            if (plano === 'aquisicao') {
                const entrada = Number(inputValorEntrada.value);
                const parcelas = Number(inputNumParcelas.value);
                const valorParcela = Number(inputValorParcela.value);
                if (!entrada || !parcelas || !valorParcela) {
                    await showAlert('Preencha todos os campos do plano Aquisição: entrada, número de parcelas e valor da parcela.');
                    hideLoading();
                    return;
                }
            }

            const inputObservacoes = document.getElementById('loc-observacoes');
            const observacoes = inputObservacoes ? inputObservacoes.value.trim() : '';

            const isFidelidade = (plano === 'fidelidade');
            const isAquisicao = (plano === 'aquisicao');
            const valorSemanal = isFidelidade ? valor : (isAquisicao ? (Number(inputValorParcela.value) || valor || 375) : null);
            const valorIntegral = isFidelidade ? valor * 12 : (isAquisicao ? (Number(inputValorEntrada.value) + Number(inputNumParcelas.value) * Number(inputValorParcela.value)) : valor);
            let vencimentoInicial = null;
            if (isFidelidade || isAquisicao) {
                const dVenc = new Date(dataInicio);
                dVenc.setDate(dVenc.getDate() + 7);
                const dVencLocal = new Date(dVenc.getTime() - (dVenc.getTimezoneOffset() * 60000));
                vencimentoInicial = dVencLocal.toISOString().slice(0, 16);
            }

            novoContrato = {
                id: Date.now(),
                cliente_id: clienteId,
                veiculo_id: veiId,
                data_inicio: dataInicio,
                data_fim: dataFim,
                valor: (isFidelidade || isAquisicao) ? valorIntegral : valor,
                valor_integral: valorIntegral,
                valor_semanal: (isFidelidade || isAquisicao) ? valorSemanal : null,
                caucao: caucao,
                caucao_tipo: caucaoTipo,
                caucao_penhora_detalhes: caucaoPenhoraDetalhes,
                observacoes: observacoes,
                tracos_saida: veiculoObj ? (veiculoObj.combustivel || 0) : 0,
                km_saida: veiculoObj ? (Number(veiculoObj.km_atual) || 0) : 0,
                km_retorno: null,
                status: 'ativo',
                usuario_id: currentUser.id || 0,
                usuario_nome: currentUser.cpf ? `${currentUser.nome} - (${currentUser.cpf})` : (currentUser.nome || 'Sistema'),
                tipo_plano: plano,
                periodicidade_pagamento: plano === 'fidelidade' ? inputPeriodicidade.value : (plano === 'aquisicao' ? 'semanal' : null),
                valor_entrada: plano === 'aquisicao' ? Number(inputValorEntrada.value) : null,
                numero_parcelas: isFidelidade ? 12 : (plano === 'aquisicao' ? Number(inputNumParcelas.value) : null),
                valor_parcela: plano === 'aquisicao' ? Number(inputValorParcela.value) : (isFidelidade ? valorSemanal : null),
                semanas_pagas: isFidelidade ? 1 : 0,
                vencimento: vencimentoInicial,
                data_proxima_manutencao: plano === 'fidelidade' ? inputProxManutencao.value : null,
                data_ultima_manutencao: null,
                contrato_original_id: null,
                numero_aditivo: 0,
                data_devolucao_real: null
            };

            db.contratos.push(novoContrato);
            if (veiculoObj) veiculoObj.status = 'locado';

            if (cliTarget) {
                db.espera = db.espera.filter(item => item.nome !== cliTarget.nome || item.telefone !== cliTarget.wpp);
                await window.electronAPI.saveData('espera', db.espera);
            }

            // Registrar entrada financeira correspondente à 1ª semana / entrada / caução se houver
            if (db.financeiro) {
                if (isFidelidade) {
                    db.financeiro.push({
                        id: Date.now(),
                        data: new Date().toISOString().split('T')[0],
                        tipo: 'entrada',
                        categoria: 'Locação Semanal',
                        descricao: `1ª Parcela Semanal (1/12) - Contrato Fidelidade 3M - ${cliTarget ? cliTarget.nome.split(' ')[0] : 'Cliente'} (${veiculoObj ? veiculoObj.placa : '---'})`,
                        valor: valorSemanal,
                        contrato_id: novoContrato.id
                    });
                }
                if (isAquisicao && Number(inputValorEntrada.value) > 0) {
                    db.financeiro.push({
                        id: Date.now() + 2,
                        data: new Date().toISOString().split('T')[0],
                        tipo: 'entrada',
                        categoria: 'Entrada Aquisição',
                        descricao: `Entrada (Contrato de Aquisição) - ${cliTarget ? cliTarget.nome.split(' ')[0] : 'Cliente'} (${veiculoObj ? veiculoObj.placa : '---'})`,
                        valor: Number(inputValorEntrada.value),
                        contrato_id: novoContrato.id
                    });
                }
                if (caucao > 0 && caucaoTipo !== 'penhora') {
                    db.financeiro.push({
                        id: Date.now() + 1,
                        data: new Date().toISOString().split('T')[0],
                        tipo: 'entrada',
                        categoria: 'Caução',
                        descricao: `Caução de Locação - ${cliTarget ? cliTarget.nome.split(' ')[0] : 'Cliente'} (${veiculoObj ? veiculoObj.placa : '---'})`,
                        valor: caucao,
                        contrato_id: novoContrato.id
                    });
                }
                await window.electronAPI.saveData('financeiro', db.financeiro);
            }

            await window.electronAPI.saveData('contratos', db.contratos);
            await window.electronAPI.saveData('veiculos', db.veiculos);
            atualizarTabela();
            toggleModal(false);
            
            showLoading('Gerando contrato PDF...');
            
            try {
                await gerarPDFContrato(novoContrato.id);
                hideLoading();

                await showAlert('Contrato registrado e enviado para impressão com sucesso!');
            } catch (error) {
                hideLoading();
                await showAlert('Contrato registrado, mas erro ao gerar PDF: ' + error.message);
            }
        } catch (error) {
            await showAlert('Erro ao gerar contrato: ' + error.message);
        } finally {
            hideLoading();
        }
    });

    // ===== EVENTOS DE CLIQUE NA TABELA =====
    tbody.addEventListener('click', async (e) => {
        const btnDecSemana = e.target.closest('.btn-dec-semana');
        const btnIncSemana = e.target.closest('.btn-inc-semana');

        if (btnDecSemana) {
            const id = Number(btnDecSemana.getAttribute('data-id'));
            const c = db.contratos.find(x => x.id === id);
            if (c) {
                c.semanas_pagas = Math.max(0, (c.semanas_pagas || 0) - 1);
                await window.electronAPI.saveData('contratos', db.contratos);
                atualizarTabela();
            }
            return;
        }

        if (btnIncSemana) {
            const id = Number(btnIncSemana.getAttribute('data-id'));
            const c = db.contratos.find(x => x.id === id);
            if (c) {
                c.semanas_pagas = Math.min(c.numero_parcelas || 104, (c.semanas_pagas || 0) + 1);
                await window.electronAPI.saveData('contratos', db.contratos);
                atualizarTabela();
            }
            return;
        }

        const btnPDF = e.target.closest('.btn-pdf');
        const btnAditivo = e.target.closest('.btn-aditivo');
        const btnReimprimirAditivo = e.target.closest('.btn-reimprimir-aditivo');
        const btnEncerrar = e.target.closest('.btn-encerrar');
        const btnWpp = e.target.closest('.btn-wpp');
        const btnExcluirContrato = e.target.closest('.btn-excluir-contrato');

        // RENOVAR (Aditivo)
        if (btnAditivo) {
            const id = Number(btnAditivo.getAttribute('data-id'));
            const contrato = db.contratos.find(c => c.id === id);
            if (!contrato) return;
            if (contrato.status !== 'ativo') {
                await showAlert('Apenas contratos ativos podem ser renovados.');
                return;
            }
            const vei = db.veiculos.find(v => v.id === contrato.veiculo_id);
            inputAdtContratoId.value = id;

            const isFidelidade = contrato.tipo_plano === 'fidelidade';
            const isAquisicao = contrato.tipo_plano === 'aquisicao';
            const modalTitle = document.getElementById('modal-aditivo-title');
            const adtBannerFidelidade = document.getElementById('adt-banner-fidelidade');
            const adtBannerTituloPlano = document.getElementById('adt-banner-titulo-plano');
            const btnSubmitAditivo = document.getElementById('btn-submit-aditivo');
            const lblAdtNovoValor = document.getElementById('lbl-adt-novo-valor');
            const lblAdtDataInicio = document.getElementById('lbl-adt-data-inicio');
            const lblAdtDataFim = document.getElementById('lbl-adt-data-fim');

            if (isFidelidade) {
                if (modalTitle) modalTitle.innerText = '📄 Abatimento de Parcela Semanal – Fidelidade 3 Meses';
                if (adtBannerFidelidade) adtBannerFidelidade.classList.remove('hidden');
                if (adtBannerTituloPlano) adtBannerTituloPlano.innerHTML = '<i class="ph-bold ph-shield-check text-blue-600 text-sm"></i> Plano Fidelidade 3 Meses';
                
                const valorSemanal = Number(contrato.valor_semanal) || (Number(contrato.valor) > 1000 ? Number(contrato.valor) / 12 : Number(contrato.valor)) || 350;
                const valorIntegral = Number(contrato.valor_integral) || (Number(contrato.valor) > 1000 ? Number(contrato.valor) : valorSemanal * 12);
                const semanasPagas = Number(contrato.semanas_pagas) || 1;
                const proximaSemana = Math.min(12, semanasPagas + 1);
                const totalJaPago = Math.min(valorIntegral, semanasPagas * valorSemanal);
                const saldoRestante = Math.max(0, valorIntegral - totalJaPago);

                const badgeSemana = document.getElementById('adt-badge-semana');
                const txtTotalContrato = document.getElementById('adt-txt-total-contrato');
                const txtTotalAbatido = document.getElementById('adt-txt-total-abatido');
                const txtSaldoRestante = document.getElementById('adt-txt-saldo-restante');

                if (badgeSemana) {
                    badgeSemana.className = "bg-blue-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-sm";
                    badgeSemana.innerText = `Abatendo Semana ${proximaSemana} de 12`;
                }
                if (txtTotalContrato) txtTotalContrato.innerText = utils.formatMoney(valorIntegral);
                if (txtTotalAbatido) txtTotalAbatido.innerText = `${utils.formatMoney(totalJaPago)} (${semanasPagas} pagas)`;
                if (txtSaldoRestante) txtSaldoRestante.innerText = `${utils.formatMoney(saldoRestante)}`;

                if (lblAdtNovoValor) lblAdtNovoValor.innerText = 'Valor Semanal a Abater (R$) *';
                inputAdtNovoValor.value = valorSemanal;

                if (lblAdtDataInicio) lblAdtDataInicio.innerText = 'Data do Vencimento Atual *';
                if (lblAdtDataFim) lblAdtDataFim.innerText = 'Próximo Vencimento (+7 dias) *';

                if (btnSubmitAditivo) {
                    btnSubmitAditivo.innerHTML = `<i class="ph-bold ph-receipt text-lg"></i> Abater ${utils.formatMoney(valorSemanal)} e Gerar Aditivo`;
                }

                let dataBaseInicio;
                if (contrato.vencimento) {
                    dataBaseInicio = new Date(contrato.vencimento.includes('T') ? contrato.vencimento : `${contrato.vencimento}T12:00:00`);
                } else {
                    dataBaseInicio = new Date(contrato.data_inicio || Date.now());
                }
                const dtIniLocal = new Date(dataBaseInicio.getTime() - (dataBaseInicio.getTimezoneOffset() * 60000));
                inputAdtDataInicio.value = dtIniLocal.toISOString().slice(0, 16);

                const dataBaseFim = new Date(dataBaseInicio.getTime());
                dataBaseFim.setDate(dataBaseFim.getDate() + 7);
                const dtFimLocal = new Date(dataBaseFim.getTime() - (dataBaseFim.getTimezoneOffset() * 60000));
                inputAdtNovaDataFim.value = dtFimLocal.toISOString().slice(0, 16);

                inputAdtObs.placeholder = `Abatimento referente à ${proximaSemana}ª semana do plano de 3 meses.`;
            } else if (isAquisicao) {
                if (modalTitle) modalTitle.innerText = '📄 Pagamento de Parcela Semanal – Plano de Aquisição';
                if (adtBannerFidelidade) adtBannerFidelidade.classList.remove('hidden');
                if (adtBannerTituloPlano) adtBannerTituloPlano.innerHTML = '<i class="ph-bold ph-handshake text-purple-600 text-sm"></i> Plano de Aquisição (Compra)';
                
                const valorSemanal = Number(contrato.valor_semanal) || Number(contrato.valor_parcela) || 375;
                const valorEntrada = Number(contrato.valor_entrada) || 2000;
                const valorIntegral = Number(contrato.valor_integral) || (valorEntrada + 104 * valorSemanal);
                const semanasPagas = Number(contrato.semanas_pagas) || 0;
                const proximaSemana = Math.min(104, semanasPagas + 1);
                const totalJaPago = valorEntrada + Math.min(valorIntegral - valorEntrada, semanasPagas * valorSemanal);
                const saldoRestante = Math.max(0, valorIntegral - totalPago);
                const parcelasRestantes = Math.max(0, 104 - semanasPagas);

                const badgeSemana = document.getElementById('adt-badge-semana');
                const txtTotalContrato = document.getElementById('adt-txt-total-contrato');
                const txtTotalAbatido = document.getElementById('adt-txt-total-abatido');
                const txtSaldoRestante = document.getElementById('adt-txt-saldo-restante');

                if (badgeSemana) {
                    badgeSemana.className = "bg-purple-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-sm";
                    badgeSemana.innerText = `Parcela ${proximaSemana} de 104`;
                }
                if (txtTotalContrato) txtTotalContrato.innerText = `${utils.formatMoney(valorIntegral)} (Entrada R$ 2.000 + 104x R$ 375)`;
                if (txtTotalAbatido) txtTotalAbatido.innerText = `${utils.formatMoney(totalJaPago)} (${semanasPagas} pagas + entrada)`;
                if (txtSaldoRestante) txtSaldoRestante.innerText = `${utils.formatMoney(saldoRestante)} (${parcelasRestantes} parcelas restantes)`;

                if (lblAdtNovoValor) lblAdtNovoValor.innerText = 'Valor da Parcela Semanal (R$) *';
                inputAdtNovoValor.value = valorSemanal;

                if (lblAdtDataInicio) lblAdtDataInicio.innerText = 'Data do Vencimento Atual *';
                if (lblAdtDataFim) lblAdtDataFim.innerText = 'Próximo Vencimento (+7 dias) *';

                if (btnSubmitAditivo) {
                    btnSubmitAditivo.innerHTML = `<i class="ph-bold ph-receipt text-lg"></i> Pagar Parcela de ${utils.formatMoney(valorSemanal)} e Gerar Aditivo`;
                }

                let dataBaseInicio;
                if (contrato.vencimento) {
                    dataBaseInicio = new Date(contrato.vencimento.includes('T') ? contrato.vencimento : `${contrato.vencimento}T12:00:00`);
                } else {
                    dataBaseInicio = new Date(contrato.data_inicio || Date.now());
                }
                const dtIniLocal = new Date(dataBaseInicio.getTime() - (dataBaseInicio.getTimezoneOffset() * 60000));
                inputAdtDataInicio.value = dtIniLocal.toISOString().slice(0, 16);

                const dataBaseFim = new Date(dataBaseInicio.getTime());
                dataBaseFim.setDate(dataBaseFim.getDate() + 7);
                const dtFimLocal = new Date(dataBaseFim.getTime() - (dataBaseFim.getTimezoneOffset() * 60000));
                inputAdtNovaDataFim.value = dtFimLocal.toISOString().slice(0, 16);

                inputAdtObs.placeholder = `Pagamento da ${proximaSemana}ª parcela semanal do plano de aquisição.`;
            } else {
                if (modalTitle) modalTitle.innerText = '📄 Renovação de Contrato';
                if (adtBannerFidelidade) adtBannerFidelidade.classList.add('hidden');
                if (lblAdtNovoValor) lblAdtNovoValor.innerText = 'Novo Valor (R$) *';
                inputAdtNovoValor.value = contrato.valor;

                if (lblAdtDataInicio) lblAdtDataInicio.innerText = 'Data de Início da Renovação *';
                if (lblAdtDataFim) lblAdtDataFim.innerText = 'Nova Data de Término *';

                if (btnSubmitAditivo) {
                    btnSubmitAditivo.innerHTML = `<i class="ph-fill ph-file-pdf text-lg"></i> Gerar Renovação`;
                }

                const dataBaseInicio = new Date(contrato.data_fim || contrato.data_inicio || Date.now());
                const dtIniLocal = new Date(dataBaseInicio.getTime() - (dataBaseInicio.getTimezoneOffset() * 60000));
                inputAdtDataInicio.value = dtIniLocal.toISOString().slice(0, 16);

                const dataBaseFim = new Date(dataBaseInicio.getTime());
                dataBaseFim.setDate(dataBaseFim.getDate() + 7);
                const dtFimLocal = new Date(dataBaseFim.getTime() - (dataBaseFim.getTimezoneOffset() * 60000));
                inputAdtNovaDataFim.value = dtFimLocal.toISOString().slice(0, 16);

                inputAdtObs.placeholder = 'Ex: Renovação por mais 7 dias';
            }

            if (inputAdtKmAtual) inputAdtKmAtual.value = vei ? (vei.km_atual || 0) : 0;
            inputAdtObs.value = '';
            modalAditivo.classList.remove('hidden');
            setTimeout(() => { modalAditivo.classList.remove('opacity-0'); modalAditivoPanel.classList.remove('scale-95'); }, 10);
            return;
        }

        // EXCLUIR
        if (btnExcluirContrato) {
            const id = Number(btnExcluirContrato.getAttribute('data-id'));
            const c = db.contratos.find(x => x.id === id);
            const senha = await showPasswordModal();
            if (senha === null) return;
            const isMatch = await window.electronAPI.verifyAdminPassword(senha);
            if (isMatch) {
                showLoading('Excluindo contrato...');
                try {
                    if (c && c.status === 'ativo') {
                        const veiIndex = db.veiculos.findIndex(v => v.id === c.veiculo_id);
                        if (veiIndex > -1) {
                            db.veiculos[veiIndex].status = 'disponivel';
                            await window.electronAPI.saveData('veiculos', db.veiculos);
                        }
                    }
                    const index = db.contratos.findIndex(x => x.id === id);
                    if (index !== -1) {
                        db.contratos.splice(index, 1);
                    }
                    await window.electronAPI.deleteData('contratos', [id]);
                    await window.electronAPI.saveData('veiculos', db.veiculos);
                    atualizarTabela();
                    hideLoading(); // Oculta o loading após concluir
                    await showAlert("✅ Registro excluído com sucesso.");
                } catch (error) {
                    hideLoading(); // Oculta o loading em caso de erro
                    await showAlert('❌ Erro ao excluir. ' + error.message);
                }
            } else {
                await showAlert("❌ Senha incorreta. Exclusão abortada.");
            }
            return;
        }

        // WPP
        if (btnWpp) {
            const id = Number(btnWpp.getAttribute('data-id'));
            const c = db.contratos.find(x => x.id === id);
            const cli = db.clientes.find(x => x.id === c.cliente_id) || {nome: 'Cliente', wpp: ''};
            const vei = db.veiculos.find(x => x.id === c.veiculo_id) || {modelo: 'Veículo', placa: ''};
            const isCarroVei = vei.categoria === 'carro';
            const tipoStr = isCarroVei ? 'do carro' : 'da moto';
            const emojiVei = isCarroVei ? '🚗' : '🏍️';
            const dataFimStr = new Date(c.data_fim).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            let texto = `Olá *${cli.nome.trim()}*, tudo bem? 👋\n\n`;
            texto += `Aqui é da *VANDO LOCADORA*.\n`;
            if (c.tipo_plano === 'fidelidade') {
                const semVal = Number(c.valor_semanal) || (Number(c.valor) > 1000 ? Number(c.valor) / 12 : Number(c.valor)) || 350;
                const semNum = c.semanas_pagas || 1;
                const dataVencStr = c.vencimento ? new Date(c.vencimento.includes('T') ? c.vencimento : `${c.vencimento}T12:00:00`).toLocaleDateString('pt-BR') : dataFimStr;
                texto += `Consta em nosso sistema que a parcela semanal de *${utils.formatMoney(semVal)}* (${semNum}ª semana de 12) do seu contrato Fidelidade 3 Meses ${tipoStr} *${vei.modelo}* (Placa: *${vei.placa}*) vence em *${dataVencStr}*.\n`;
                texto += `Lembre-se de efetuar o pagamento para emissão do Termo de Abatimento Semanal. Qualquer dúvida, estamos à disposição! ${emojiVei}`;
            } else if (c.tipo_plano === 'aquisicao') {
                const semVal = Number(c.valor_semanal) || Number(c.valor_parcela) || 375;
                const semNum = c.semanas_pagas || 1;
                const dataVencStr = c.vencimento ? new Date(c.vencimento.includes('T') ? c.vencimento : `${c.vencimento}T12:00:00`).toLocaleDateString('pt-BR') : dataFimStr;
                texto += `Consta em nosso sistema que a parcela semanal de *${utils.formatMoney(semVal)}* (${semNum}ª semana de 104) do seu Contrato de Aquisição ${tipoStr} *${vei.modelo}* (Placa: *${vei.placa}*) vence em *${dataVencStr}*.\n`;
                texto += `Lembre-se de efetuar o pagamento para manter sua opção de compra em dia e emitir o Termo Aditivo. Qualquer dúvida, estamos à disposição! ${emojiVei}`;
            } else {
                texto += `Seu contrato de locação ${tipoStr} *${vei.modelo}* (Placa: *${vei.placa}*) vence em *${dataFimStr}*.\n`;
                texto += `Lembre-se de renovar ou devolver o veículo. Qualquer dúvida, estamos à disposição! ${emojiVei}`;
            }
            const fone = cli.wpp.replace(/\D/g, '');
            if (fone.length >= 10) {
                if (window.enviarMensagemWhatsapp) {
                    window.enviarMensagemWhatsapp(fone, texto);
                } else {
                    window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(texto)}`, '_blank');
                }
            } else {
                await showAlert("O número de WhatsApp cadastrado para este cliente é inválido.");
            }
        }

        // PDF
        if (btnPDF) {
            const id = Number(btnPDF.getAttribute('data-id'));
            showLoading('Gerando PDF...');
            try {
                await gerarPDFContrato(id);
                await showAlert('PDF gerado com sucesso!');
            } catch (error) {
                await showAlert('Erro ao gerar PDF: ' + error.message);
            } finally {
                hideLoading();
            }
        }

        // REIMPRIMIR ADITIVO
        if (btnReimprimirAditivo) {
            const id = Number(btnReimprimirAditivo.getAttribute('data-id'));
            const c = db.contratos.find(x => x.id === id);
            if (!c) return;
            await abrirReimpressaoAditivo(c);
            return;
        }

        // ENCERRAR (BAIXA / DEVOLUÇÃO)
        if (btnEncerrar) {
            const id = Number(btnEncerrar.getAttribute('data-id'));
            const c = db.contratos.find(x => x.id === id);
            if (!c) return;
            const cli = db.clientes.find(x => x.id === c.cliente_id) || { nome: 'Cliente' };
            const vei = db.veiculos.find(v => v.id === c.veiculo_id) || { modelo: 'Veículo', placa: '', km_atual: 0 };
            
            const kmSaida = c.km_saida !== undefined && c.km_saida !== null ? c.km_saida : (vei.km_atual || 0);

            inputDevContratoId.value = id;
            devInfoCliente.innerText = cli.nome || 'Cliente';
            devInfoVeiculo.innerText = `${vei.modelo || 'Veículo'} (Placa: ${vei.placa || '---'})`;
            devKmSaidaDisplay.innerText = Number(kmSaida).toLocaleString('pt-BR');
            inputDevKmRetorno.value = vei.km_atual || kmSaida || 0;
            inputDevObs.value = '';

            modalDevolucao.classList.remove('hidden');
            setTimeout(() => {
                modalDevolucao.classList.remove('opacity-0');
                modalDevolucaoPanel.classList.remove('scale-95');
            }, 10);
            return;
        }
    });

    // ===== LÓGICA DO MODAL DE DEVOLUÇÃO =====
    function fecharModalDevolucao() {
        modalDevolucao.classList.add('opacity-0');
        modalDevolucaoPanel.classList.add('scale-95');
        setTimeout(() => {
            modalDevolucao.classList.add('hidden');
        }, 200);
    }

    if (btnFecharDevolucao) btnFecharDevolucao.addEventListener('click', fecharModalDevolucao);
    if (btnCancelarDevolucao) btnCancelarDevolucao.addEventListener('click', fecharModalDevolucao);

    if (formDevolucao) {
        formDevolucao.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = Number(inputDevContratoId.value);
            const contrato = db.contratos.find(c => c.id === id);
            if (!contrato) return;
            const vei = db.veiculos.find(v => v.id === contrato.veiculo_id);
            
            const kmSaida = contrato.km_saida !== undefined && contrato.km_saida !== null ? contrato.km_saida : (vei ? (vei.km_atual || 0) : 0);
            const kmRetorno = Number(inputDevKmRetorno.value);
            
            if (isNaN(kmRetorno) || kmRetorno < 0) {
                await showAlert('Por favor, informe uma quilometragem válida de retorno.');
                return;
            }

            if (kmRetorno < kmSaida) {
                const prosseguir = await showConfirm(`⚠️ ATENÇÃO: A KM de retorno (${kmRetorno.toLocaleString('pt-BR')} km) é inferior à KM de saída (${kmSaida.toLocaleString('pt-BR')} km).\n\nDeseja confirmar a baixa mesmo assim?`);
                if (!prosseguir) return;
            }

            showLoading('Registrando devolução e encerrando contrato...');
            try {
                contrato.status = 'encerrado';
                contrato.km_retorno = kmRetorno;
                contrato.data_devolucao_real = new Date().toISOString();
                
                const devObsText = inputDevObs.value.trim();
                if (devObsText) {
                    contrato.observacoes = (contrato.observacoes ? contrato.observacoes + ' | ' : '') + `[Devolução KM ${kmRetorno}]: ` + devObsText;
                }

                if (vei) {
                    vei.km_atual = kmRetorno;
                    vei.status = 'disponivel';
                }

                await window.electronAPI.saveData('contratos', db.contratos);
                await window.electronAPI.saveData('veiculos', db.veiculos);

                fecharModalDevolucao();
                atualizarTabela();
                hideLoading();

                await showAlert(`✅ Devolução registrada com sucesso! O veículo agora está com ${kmRetorno.toLocaleString('pt-BR')} km e ficou "Disponível".`);

                // Verificar Fila de Espera
                if (db.espera && db.espera.length > 0) {
                    const primeiro = db.espera[0];
                    const isCarroDev = vei && vei.categoria === 'carro';
                    const termoDev1 = isCarroDev ? 'O carro' : 'A moto';
                    const termoDev2 = isCarroDev ? 'Um carro' : 'Uma moto';
                    const emojiDev = isCarroDev ? '🚗' : '🏍️';
                    const avisar = await showConfirm(`⚠️ HÁ CLIENTES NA FILA DE ESPERA!\n\n${termoDev1} retornou ao pátio. Deseja avisar "${primeiro.nome}" agora pelo WhatsApp?`);
                    if (avisar) {
                        const fone = primeiro.telefone.replace(/\D/g, '');
                        let txt = `Olá *${primeiro.nome.trim()}*! Tudo bem? 👋\n\nAqui é da *VANDO LOCADORA*.\n${termoDev2} acabou de ficar disponível no nosso pátio!\n\nVocê ainda tem interesse em alugar? ${emojiDev}`;
                        if (window.enviarMensagemWhatsapp) {
                            window.enviarMensagemWhatsapp(fone, txt);
                        } else {
                            window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(txt)}`, '_blank');
                        }
                    }
                }
            } catch (error) {
                hideLoading();
                await showAlert('Erro ao registrar devolução: ' + error.message);
            }
        });
    }

    // ===== FORM ADITIVO =====
    formAditivo.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading('A processar renovação...');
        let contratoId = null;
        let dataInicioRenovacao = null;
        let novaDataFim = null;
        let novoValor = null;
        let kmAtualRenovacao = null;
        let obs = null;
        try {
            contratoId = Number(inputAdtContratoId.value);
            const contrato = db.contratos.find(c => c.id === contratoId);
            if (!contrato) throw new Error('Contrato não encontrado.');
            dataInicioRenovacao = inputAdtDataInicio.value;
            novaDataFim = inputAdtNovaDataFim.value;
            novoValor = Number(inputAdtNovoValor.value);
            kmAtualRenovacao = inputAdtKmAtual ? Number(inputAdtKmAtual.value) : null;
            obs = inputAdtObs.value.trim();

            if (!dataInicioRenovacao || !novaDataFim || !novoValor) {
                await showAlert('Preencha as datas de início e término e o novo valor.');
                hideLoading();
                return;
            }

            const dtIniObj = new Date(dataInicioRenovacao);
            const dtFimObj = new Date(novaDataFim);
            if (dtFimObj <= dtIniObj) {
                await showAlert('A nova data de término deve ser posterior à data de início da renovação.');
                hideLoading();
                return;
            }

            const isFidelidade = contrato.tipo_plano === 'fidelidade';
            const isAquisicao = contrato.tipo_plano === 'aquisicao';
            if (isFidelidade) {
                contrato.semanas_pagas = Math.min(12, (contrato.semanas_pagas || 1) + 1);
                contrato.numero_aditivo = (contrato.numero_aditivo || 0) + 1;
                contrato.vencimento = novaDataFim.slice(0, 10);

                if (db.financeiro) {
                    const cliTarget = db.clientes.find(cl => cl.id === contrato.cliente_id);
                    const veiTarget = db.veiculos.find(ve => ve.id === contrato.veiculo_id);
                    db.financeiro.push({
                        id: Date.now(),
                        data: new Date().toISOString().split('T')[0],
                        tipo: 'entrada',
                        categoria: 'Locação Semanal',
                        descricao: `Abatimento Semanal (${contrato.semanas_pagas}ª semana de 12) - Contrato Fidelidade VM-${contrato.id.toString().slice(-5)} - ${cliTarget ? cliTarget.nome.split(' ')[0] : 'Cliente'} (${veiTarget ? veiTarget.placa : '---'})`,
                        valor: novoValor,
                        contrato_id: contrato.id
                    });
                    await window.electronAPI.saveData('financeiro', db.financeiro);
                }
            } else if (isAquisicao) {
                contrato.semanas_pagas = Math.min(104, (contrato.semanas_pagas || 0) + 1);
                contrato.numero_aditivo = (contrato.numero_aditivo || 0) + 1;
                contrato.vencimento = novaDataFim.slice(0, 10);

                if (db.financeiro) {
                    const cliTarget = db.clientes.find(cl => cl.id === contrato.cliente_id);
                    const veiTarget = db.veiculos.find(ve => ve.id === contrato.veiculo_id);
                    db.financeiro.push({
                        id: Date.now(),
                        data: new Date().toISOString().split('T')[0],
                        tipo: 'entrada',
                        categoria: 'Parcela Aquisição',
                        descricao: `Parcela Aquisição (${contrato.semanas_pagas}ª semana de 104) - Contrato VM-${contrato.id.toString().slice(-5)} - ${cliTarget ? cliTarget.nome.split(' ')[0] : 'Cliente'} (${veiTarget ? veiTarget.placa : '---'})`,
                        valor: novoValor,
                        contrato_id: contrato.id
                    });
                    await window.electronAPI.saveData('financeiro', db.financeiro);
                }
            } else {
                contrato.data_fim = novaDataFim;
                contrato.valor = novoValor;
                contrato.numero_aditivo = (contrato.numero_aditivo || 0) + 1;
            }

            if (kmAtualRenovacao !== null && !isNaN(kmAtualRenovacao) && kmAtualRenovacao >= 0) {
                const vei = db.veiculos.find(v => v.id === contrato.veiculo_id);
                if (vei) {
                    vei.km_atual = kmAtualRenovacao;
                    await window.electronAPI.saveData('veiculos', db.veiculos);
                }
            }

            if (contrato.tipo_plano === 'fidelidade' && contrato.data_proxima_manutencao) {
                const dataManut = new Date(contrato.data_proxima_manutencao);
                dataManut.setDate(dataManut.getDate() + 30);
                contrato.data_proxima_manutencao = dataManut.toISOString().split('T')[0];
            }

            const aditivoItem = {
                id: Date.now(),
                numero_aditivo: contrato.numero_aditivo,
                semanas_pagas: contrato.semanas_pagas || contrato.numero_aditivo,
                data_inicio: dataInicioRenovacao,
                data_fim: novaDataFim,
                valor: novoValor,
                km_atual: kmAtualRenovacao,
                observacoes: obs || '',
                criado_em: new Date().toISOString()
            };

            const historico = getHistoricoAditivos(contrato);
            historico.push(aditivoItem);
            contrato.historico_aditivos = JSON.stringify(historico);
            contrato.ultimo_aditivo = JSON.stringify(aditivoItem);

            await window.electronAPI.saveData('contratos', db.contratos);
            atualizarTabela();

            modalAditivo.classList.add('opacity-0');
            modalAditivoPanel.classList.add('scale-95');
            setTimeout(() => { modalAditivo.classList.add('hidden'); }, 200);
            
            showLoading(isFidelidade ? 'Gerando Termo de Abatimento Semanal...' : 'Gerando PDF da renovação...');
            
            try {
                await gerarPDFAditivo(contratoId, dataInicioRenovacao, novaDataFim, novoValor, obs, kmAtualRenovacao, contrato.numero_aditivo, contrato.semanas_pagas);
                hideLoading();

                const cli = db.clientes.find(x => x.id === contrato.cliente_id);
                const vei = db.veiculos.find(x => x.id === contrato.veiculo_id) || { modelo: 'Veículo', placa: '' };
                const isCarroRenov = vei.categoria === 'carro';
                const tipoRenov = isCarroRenov ? 'do carro' : 'da moto';
                const emojiRenov = isCarroRenov ? '🚗' : '🏍️';
                const fone = cli ? (cli.wpp || '').replace(/\D/g, '') : '';
                if (fone.length >= 10 && cli) {
                    const dataIniFmt = new Date(dataInicioRenovacao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                    const dataFimFmt = new Date(novaDataFim).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                    const valFmt = Number(novoValor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    let textWpp = `Olá *${cli.nome.trim()}*! 👋\n\n`;
                    if (isFidelidade) {
                        textWpp += `Seu abatimento semanal ${tipoRenov} *${vei.modelo}* (Placa: *${vei.placa}*) foi confirmado com sucesso!\n`;
                        textWpp += `📝 Parcela: *Semana ${contrato.semanas_pagas} de 12*\n`;
                        textWpp += `💰 Valor Abatido: *${valFmt}*\n`;
                        textWpp += `📅 Próximo Vencimento: *${dataFimFmt}*\n\n`;
                    } else {
                        textWpp += `Seu contrato de locação ${tipoRenov} *${vei.modelo}* (Placa: *${vei.placa}*) foi *RENOVADO* com sucesso!\n`;
                        textWpp += `💰 Novo Valor: *${valFmt}*\n`;
                        textWpp += `📅 Período da Renovação: *${dataIniFmt}* até *${dataFimFmt}*\n\n`;
                    }
                    textWpp += `Qualquer dúvida, estamos à disposição! ${emojiRenov}`;
                    
                    const querEnviar = await showConfirm(isFidelidade ? 'Abatimento registrado e Termo Aditivo gerado!\n\nDeseja enviar os dados da semana quitada para o cliente via WhatsApp?' : 'Renovação registrada e PDF enviado para impressão!\n\nDeseja enviar os dados da renovação para o cliente via WhatsApp?');
                    if (querEnviar) {
                        if (window.enviarMensagemWhatsapp) {
                            window.enviarMensagemWhatsapp(fone, textWpp);
                        } else {
                            window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(textWpp)}`, '_blank');
                        }
                    }
                } else {
                    await showAlert(isFidelidade ? 'Abatimento registrado e Termo Aditivo gerado com sucesso!' : 'Renovação registrada e PDF enviado para impressão!');
                }
            } catch (error) {
                hideLoading();
                await showAlert('Renovação registrada, mas erro ao gerar PDF: ' + error.message);
            }
        } catch (error) {
            await showAlert('Erro: ' + error.message);
        } finally {
            hideLoading();
        }
    });

    // ===== FECHAR MODAL ADITIVO =====
    document.getElementById('btn-fechar-aditivo').addEventListener('click', () => {
        modalAditivo.classList.add('opacity-0');
        modalAditivoPanel.classList.add('scale-95');
        setTimeout(() => { modalAditivo.classList.add('hidden'); }, 200);
    });
    document.getElementById('btn-cancelar-aditivo').addEventListener('click', () => {
        modalAditivo.classList.add('opacity-0');
        modalAditivoPanel.classList.add('scale-95');
        setTimeout(() => { modalAditivo.classList.add('hidden'); }, 200);
    });

    // ===== BOTÕES NOVOS =====
    document.getElementById('btn-novo-contrato').addEventListener('click', () => toggleModal(true));
    document.getElementById('btn-fechar-modal-c').addEventListener('click', () => toggleModal(false));
    document.getElementById('btn-cancelar-c').addEventListener('click', () => toggleModal(false));
    inputBusca.addEventListener('input', () => {
        paginaAtual = 1;
        atualizarTabela();
    });

    btnPagePrev.addEventListener('click', () => {
        if (paginaAtual > 1) {
            paginaAtual--;
            atualizarTabela();
            tbody.closest('.overflow-x-auto').scrollTop = 0;
        }
    });

    btnPageNext.addEventListener('click', () => {
        paginaAtual++;
        atualizarTabela();
        tbody.closest('.overflow-x-auto').scrollTop = 0;
    });

    function initAutocompleteCliente() {
        if (!inputClienteBusca || !containerResultados || !btnClienteLimpar) return;

        inputClienteBusca.addEventListener('input', () => {
            const termo = inputClienteBusca.value.toLowerCase().trim();
            if (termo === '') {
                containerResultados.innerHTML = '';
                containerResultados.classList.add('hidden');
                btnClienteLimpar.classList.add('hidden');
                selCliente.value = '';
                return;
            }

            btnClienteLimpar.classList.remove('hidden');

            const filtrados = db.clientes.filter(c => {
                const nome = (c.nome || '').toLowerCase();
                const cpf = (c.cpf_cnpj || '').toLowerCase();
                const cod = (c.codigo || '').toLowerCase();
                return nome.includes(termo) || cpf.includes(termo) || cod.includes(termo);
            }).slice(0, 15);

            if (filtrados.length === 0) {
                containerResultados.innerHTML = `<div class="px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider text-center">Nenhum cliente encontrado</div>`;
                containerResultados.classList.remove('hidden');
                return;
            }

            containerResultados.innerHTML = '';
            filtrados.forEach(c => {
                const item = document.createElement('div');
                item.className = 'px-4 py-2.5 border-b border-gray-100 hover:bg-brand-light transition duration-150 cursor-pointer text-xs flex justify-between items-center';
                
                if (c.blacklist) {
                    item.className += ' bg-red-50 text-red-700 hover:bg-red-100/70';
                    item.innerHTML = `
                        <div class="flex-1">
                            <span class="font-bold block">⛔ BLOQUEADO: ${c.nome} [BLACKLIST]</span>
                            <span class="text-[9px] text-red-500 block">CPF: ${c.cpf_cnpj || '---'} | Motivo: ${c.blacklist_motivo || 'Não informado'}</span>
                        </div>
                    `;
                } else {
                    item.innerHTML = `
                        <div class="flex-1">
                            <span class="font-bold text-gray-900 block">${c.nome}</span>
                            <span class="text-[9px] text-gray-500 block">Código: ${c.codigo || 'S/C'} | CPF: ${c.cpf_cnpj || '---'}</span>
                        </div>
                    `;
                }

                item.addEventListener('click', () => {
                    if (c.blacklist) {
                        showAlert(`⛔ OPERAÇÃO BLOQUEADA ⛔\n\nEste cliente encontra-se na Blacklist.\nMotivo: ${c.blacklist_motivo || 'Não informado.'}`);
                        selCliente.value = '';
                        inputClienteBusca.value = '';
                        btnClienteLimpar.classList.add('hidden');
                    } else {
                        selCliente.value = c.id;
                        inputClienteBusca.value = `${c.nome} (${c.cpf_cnpj || 'Sem CPF'})`;
                        btnClienteLimpar.classList.remove('hidden');
                    }
                    containerResultados.innerHTML = '';
                    containerResultados.classList.add('hidden');
                });

                containerResultados.appendChild(item);
            });

            containerResultados.classList.remove('hidden');
        });

        document.addEventListener('click', (e) => {
            if (e.target !== inputClienteBusca && e.target !== containerResultados && !containerResultados.contains(e.target)) {
                containerResultados.classList.add('hidden');
            }
        });

        btnClienteLimpar.addEventListener('click', () => {
            selCliente.value = '';
            inputClienteBusca.value = '';
            containerResultados.innerHTML = '';
            containerResultados.classList.add('hidden');
            btnClienteLimpar.classList.add('hidden');
            inputClienteBusca.focus();
        });
    }

    initAutocompleteCliente();

    // ===== CONFIGURAR MÁSCARAS DE TELEFONE =====
    function setupPhoneMasks() {
        const formatPhone = (val) => {
            let numbers = val.replace(/\D/g, '');
            if (numbers.length > 11) numbers = numbers.slice(0, 11);
            if (numbers.length <= 2) {
                return numbers ? `(${numbers}` : '';
            }
            if (numbers.length <= 6) {
                return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
            }
            if (numbers.length <= 10) {
                return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
            }
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
        };

        const applyMask = (input) => {
            if (!input) return;
            input.addEventListener('input', () => {
                const selectionStart = input.selectionStart;
                const prevLen = input.value.length;
                const formatted = formatPhone(input.value);
                input.value = formatted;
                const newLen = formatted.length;
                if (selectionStart !== null) {
                    const diff = newLen - prevLen;
                    input.setSelectionRange(selectionStart + diff, selectionStart + diff);
                }
            });
        };

        applyMask(document.getElementById('fila-wpp'));
    }
    setupPhoneMasks();

    atualizarTabela();

    // ===== EXPORTAR CSV =====
    document.getElementById('btn-export-csv-contratos').addEventListener('click', () => {
        const data = db.contratos.map(c => {
            const cli = db.clientes.find(x => x.id === c.cliente_id);
            const vei = db.veiculos.find(x => x.id === c.veiculo_id);
            return {
                ID: c.id,
                Cliente: cli ? cli.nome : 'N/A',
                Veículo: vei ? vei.placa : 'N/A',
                Início: utils.formatDate(c.data_inicio),
                Fim: utils.formatDate(c.data_fim),
                Valor: c.valor,
                Status: c.status,
                EmitidoPor: c.usuario_nome || 'Sistema',
                Plano: c.tipo_plano || 'simples'
            };
        });
        exportCSV(data, 'contratos');
    });
}
