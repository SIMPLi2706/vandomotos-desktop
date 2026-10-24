import { db, utils } from './db.js';
import { showAlert, showConfirm } from './modal.js';
import { showLoading, hideLoading } from './loading.js';
import { handleFileUpload, showLightbox } from './fileUtils.js';
import { exportCSV } from './csvUtils.js';

// ===== VALIDADORES DE CPF E CNPJ (ALGORITMO OFICIAL) =====
export function validarCPF(cpf) {
    const clean = (cpf || '').replace(/\D/g, '');
    if (clean.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(clean)) return false;
    
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(clean.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(clean.charAt(9))) return false;
    
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(clean.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(clean.charAt(10))) return false;
    
    return true;
}

export function validarCNPJ(cnpj) {
    const clean = (cnpj || '').replace(/\D/g, '');
    if (clean.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(clean)) return false;
    
    let tamanho = clean.length - 2;
    let numeros = clean.substring(0, tamanho);
    let digitos = clean.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;
    
    tamanho = tamanho + 1;
    numeros = clean.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1))) return false;
    
    return true;
}

export function validarCPFCNPJ(doc, tipo = 'PF') {
    const clean = (doc || '').replace(/\D/g, '');
    if (!clean) return false;
    if (tipo === 'PJ' || clean.length > 11) {
        return validarCNPJ(clean);
    }
    return validarCPF(clean);
}

export function formatarCPFCNPJ(valor) {
    const clean = (valor || '').replace(/\D/g, '');
    if (clean.length <= 11) {
        return clean
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        return clean
            .slice(0, 14)
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2');
    }
}

// ===== PARSER DE TEXTO / FORMULÁRIO DE CLIENTE =====
export function parseTextoCliente(texto) {
    if (!texto || typeof texto !== 'string') return {};

    const resultado = {
        nome: '',
        tipo: 'PF',
        cpf_cnpj: '',
        rg_identidade: '',
        num_cnh: '',
        whatsapp: '',
        email: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        ref_nome_1: '',
        ref_fone_1: '',
        ref_nome_2: '',
        ref_fone_2: '',
        ref_nome_3: '',
        ref_fone_3: ''
    };

    const normKey = (str) => {
        return (str || '')
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "");
    };

    const linhas = texto.split(/\r?\n/);
    
    linhas.forEach(linha => {
        const idxDoisPontos = linha.indexOf(':');
        const idxIgual = linha.indexOf('=');
        let separatorIdx = -1;
        
        if (idxDoisPontos !== -1 && idxIgual !== -1) {
            separatorIdx = Math.min(idxDoisPontos, idxIgual);
        } else if (idxDoisPontos !== -1) {
            separatorIdx = idxDoisPontos;
        } else if (idxIgual !== -1) {
            separatorIdx = idxIgual;
        }

        if (separatorIdx === -1) return;

        const chaveRaw = linha.substring(0, separatorIdx).trim();
        let valor = linha.substring(separatorIdx + 1).trim();

        valor = valor.replace(/^[*_\-•>:]+\s*/, '').trim();
        if (!valor) return;

        const chave = normKey(chaveRaw);

        // NOME
        if (['nome', 'nomecompleto', 'razaosocial', 'cliente', 'nomedocliente', 'titular', 'nomecliente'].includes(chave)) {
            resultado.nome = valor;
        }
        // TIPO
        else if (['tipo', 'tipodepessoa', 'pessoa', 'tipopessoa', 'tipopfoupj'].includes(chave)) {
            const vUpper = valor.toUpperCase();
            if (vUpper.includes('JURIDICA') || vUpper.includes('PJ') || vUpper.includes('EMPRESA') || vUpper.includes('CNPJ')) {
                resultado.tipo = 'PJ';
            } else {
                resultado.tipo = 'PF';
            }
        }
        // CPF / CNPJ
        else if (['cpf', 'cnpj', 'cpfcnpj', 'cpffcnpj', 'doc', 'documento', 'cpfoucnpj'].includes(chave)) {
            resultado.cpf_cnpj = valor;
        }
        // RG
        else if (['rg', 'identidade', 'rgidentidade', 'registrogeral'].includes(chave)) {
            resultado.rg_identidade = valor;
        }
        // CNH
        else if (['cnh', 'ncnh', 'numcnh', 'habilitacao', 'carteirademotorista', 'ndacnh', 'numerodacnh'].includes(chave)) {
            resultado.num_cnh = valor;
        }
        // WHATSAPP / TELEFONE
        else if (['whatsapp', 'wpp', 'whats', 'celular', 'telefone', 'fone', 'contato', 'tel', 'whatsapppessoal', 'zap'].includes(chave)) {
            resultado.whatsapp = valor;
        }
        // EMAIL
        else if (['email', 'mail'].includes(chave)) {
            resultado.email = valor;
        }
        // CEP
        else if (['cep', 'codigopostal'].includes(chave)) {
            resultado.cep = valor;
        }
        // LOGRADOURO
        else if (['logradouro', 'rua', 'av', 'avenida', 'endereco', 'enderecoruaav', 'logradouroruaav'].includes(chave)) {
            resultado.logradouro = valor;
        }
        // NUMERO
        else if (['numero', 'n', 'num', 'no', 'numeroresidencia'].includes(chave)) {
            resultado.numero = valor;
        }
        // COMPLEMENTO
        else if (['complemento', 'apto', 'apartamento', 'bloco', 'casa'].includes(chave)) {
            resultado.complemento = valor;
        }
        // BAIRRO
        else if (['bairro'].includes(chave)) {
            resultado.bairro = valor;
        }
        // CIDADE
        else if (['cidade', 'municipio', 'localidade'].includes(chave)) {
            resultado.cidade = valor;
        }
        // UF / ESTADO
        else if (['uf', 'estado', 'estadouf'].includes(chave)) {
            resultado.uf = valor.substring(0, 2).toUpperCase();
        }
        // REFERENCIA 1 NOME / DADOS
        else if (['referencia1nome', 'ref1nome', 'referencia1nometelefone', 'contato1nome', 'referencia1', 'ref1'].includes(chave)) {
            if (valor.includes('/') || valor.includes('-')) {
                const parts = valor.split(/[\/\-]/);
                resultado.ref_nome_1 = parts[0].trim();
                resultado.ref_fone_1 = parts.slice(1).join(' ').trim();
            } else {
                resultado.ref_nome_1 = valor;
            }
        }
        // REFERENCIA 1 TELEFONE
        else if (['referencia1telefone', 'ref1fone', 'ref1tel', 'referencia1wpp', 'contato1telefone', 'ref1telefone'].includes(chave)) {
            resultado.ref_fone_1 = valor;
        }
        // REFERENCIA 2 NOME / DADOS
        else if (['referencia2nome', 'ref2nome', 'referencia2nometelefone', 'contato2nome', 'referencia2', 'ref2'].includes(chave)) {
            if (valor.includes('/') || valor.includes('-')) {
                const parts = valor.split(/[\/\-]/);
                resultado.ref_nome_2 = parts[0].trim();
                resultado.ref_fone_2 = parts.slice(1).join(' ').trim();
            } else {
                resultado.ref_nome_2 = valor;
            }
        }
        // REFERENCIA 2 TELEFONE
        else if (['referencia2telefone', 'ref2fone', 'ref2tel', 'referencia2wpp', 'contato2telefone', 'ref2telefone'].includes(chave)) {
            resultado.ref_fone_2 = valor;
        }
        // REFERENCIA 3 NOME / DADOS
        else if (['referencia3nome', 'ref3nome', 'referencia3nometelefone', 'contato3nome', 'referencia3', 'ref3'].includes(chave)) {
            if (valor.includes('/') || valor.includes('-')) {
                const parts = valor.split(/[\/\-]/);
                resultado.ref_nome_3 = parts[0].trim();
                resultado.ref_fone_3 = parts.slice(1).join(' ').trim();
            } else {
                resultado.ref_nome_3 = valor;
            }
        }
        // REFERENCIA 3 TELEFONE
        else if (['referencia3telefone', 'ref3fone', 'ref3tel', 'referencia3wpp', 'contato3telefone', 'ref3telefone'].includes(chave)) {
            resultado.ref_fone_3 = valor;
        }
    });

    // FALLBACK REGEX (MARGEM DE ERRO ZERO PARA DADOS PERDIDOS)
    if (!resultado.cpf_cnpj) {
        const matchCnpj = texto.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
        if (matchCnpj) {
            resultado.cpf_cnpj = matchCnpj[0];
            resultado.tipo = 'PJ';
        } else {
            const matchCpf = texto.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
            if (matchCpf) {
                resultado.cpf_cnpj = matchCpf[0];
                resultado.tipo = 'PF';
            } else {
                const digitos = texto.match(/\b\d{11}\b|\b\d{14}\b/g);
                if (digitos) {
                    for (const d of digitos) {
                        if (validarCPFCNPJ(d, d.length === 14 ? 'PJ' : 'PF')) {
                            resultado.cpf_cnpj = formatarCPFCNPJ(d);
                            resultado.tipo = d.length === 14 ? 'PJ' : 'PF';
                            break;
                        }
                    }
                }
            }
        }
    } else {
        const clean = resultado.cpf_cnpj.replace(/\D/g, '');
        if (clean.length > 11) resultado.tipo = 'PJ';
        resultado.cpf_cnpj = formatarCPFCNPJ(clean);
    }

    if (!resultado.whatsapp) {
        const matchFone = texto.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}/);
        if (matchFone) {
            resultado.whatsapp = matchFone[0];
        }
    }

    if (!resultado.email) {
        const matchEmail = texto.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (matchEmail) {
            resultado.email = matchEmail[0];
        }
    }

    if (!resultado.cep) {
        const matchCep = texto.match(/\b\d{5}[-\s]?\d{3}\b/);
        if (matchCep) {
            resultado.cep = matchCep[0];
        }
    }

    return resultado;
}

export function renderClientes(container) {
    container.innerHTML = `
        <div class="flex flex-col h-full fade-enter">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div class="relative w-full md:max-w-md flex gap-2">
                    <input type="text" id="busca-clientes" placeholder="Buscar por código, nome, CPF/CNPJ, WhatsApp ou E-mail..." class="w-full pl-10 pr-4 py-2 border border-gray-200 text-sm focus:ring-0 outline-none transition shadow-sm">
                    <button id="btn-export-csv-clientes" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 text-xs font-bold uppercase transition flex items-center gap-1 shadow-sm whitespace-nowrap">
                        <i class="ph-bold ph-file-csv text-sm"></i> CSV
                    </button>
                </div>
                <div class="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <button id="btn-importar-texto-cliente" class="w-full sm:w-auto justify-center bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 font-bold text-sm flex items-center gap-2 border border-emerald-900 transition-all shadow-hard cursor-pointer">
                        <i class="ph-bold ph-magic-wand text-lg"></i> Importar por Texto/Formulário
                    </button>
                    <button id="btn-novo-cliente" class="w-full sm:w-auto justify-center bg-brand-dark hover:bg-black text-white px-5 py-3 md:py-2.5 font-bold text-sm flex items-center gap-2 border border-gray-800 transition-all shadow-hard cursor-pointer">
                        <i class="ph-bold ph-user-plus text-brand-main text-lg"></i> Cadastrar Cliente
                    </button>
                </div>
            </div>

            <div class="flex gap-2 mb-4 border-b border-gray-200">
                <button id="btn-filtro-todos" class="px-4 py-2 text-xs font-black uppercase tracking-widest border-b-2 border-brand-dark text-brand-dark transition-colors">
                    Todos os Clientes
                </button>
                <button id="btn-filtro-blacklist" class="px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 border-transparent text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1">
                    <i class="ph-fill ph-warning-octagon text-sm"></i> Blacklist <span id="badge-blacklist-count" class="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-sm ml-1 text-[10px] font-black shadow-sm">0</span>
                </button>
            </div>

            <div class="bg-white border border-gray-200 shadow-soft flex-1 overflow-hidden flex flex-col">
                <div class="overflow-x-auto flex-1 custom-scroll">
                    <table class="w-full text-left border-collapse whitespace-nowrap text-sm">
                        <thead>
                            <tr class="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider font-mono">
                                <th class="px-6 py-4 font-bold">Cód. Identificador</th>
                                <th class="px-6 py-4 font-bold">Nome / Razão Social</th>
                                <th class="px-6 py-4 font-bold">Tipo</th>
                                <th class="px-6 py-4 font-bold">CPF / CNPJ</th>
                                <th class="px-6 py-4 font-bold">WhatsApp</th>
                                <th class="px-6 py-4 font-bold">E-mail</th>
                                <th class="px-6 py-4 font-bold text-right">Painel de Controle</th>
                            </tr>
                        </thead>
                        <tbody id="tb-clientes" class="divide-y divide-gray-100"></tbody>
                    </table>
                </div>
                <div id="clientes-empty" class="hidden flex-col items-center justify-center py-16 text-center">
                    <i class="ph ph-users text-5xl text-gray-300 mb-3"></i>
                    <p class="text-sm text-gray-500 font-bold uppercase tracking-wider" id="txt-empty-state">Base de clientes vazia</p>
                </div>
                <!-- PAGINAÇÃO -->
                <div id="clientes-paginacao" class="bg-gray-50 border-t border-gray-200 px-6 py-3 flex justify-between items-center gap-4 text-xs font-bold text-gray-500 uppercase font-mono">
                    <button type="button" id="btn-page-prev" class="bg-white hover:bg-gray-100 text-gray-700 px-3 py-1.5 border border-gray-200 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer">
                        <i class="ph ph-caret-left"></i> Anterior
                    </button>
                    <span id="page-indicator">Página 1 de 1</span>
                    <button type="button" id="btn-page-next" class="bg-white hover:bg-gray-100 text-gray-700 px-3 py-1.5 border border-gray-200 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer">
                        Próximo <i class="ph ph-caret-right"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- MODAL CLIENTE -->
        <div id="modal-cliente" class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4 transition-opacity opacity-0">
            <div class="bg-white border border-gray-900 w-full max-w-4xl shadow-2xl overflow-hidden transform scale-95 transition-transform flex flex-col max-h-[90vh]" id="modal-cliente-panel">
                <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 class="text-lg font-black text-gray-900 uppercase tracking-tight" id="modal-cliente-title">Dossiê Cadastral</h2>
                        <p class="text-xs text-gray-500 font-mono mt-0.5" id="modal-cliente-code">Código: Gerado automaticamente</p>
                    </div>
                    <button id="btn-fechar-modal" class="text-gray-400 hover:text-red-600 transition p-1"><i class="ph ph-x text-2xl"></i></button>
                </div>

                <div class="bg-gray-100 px-6 border-b border-gray-200 flex gap-2">
                    <button id="tab-dados" class="px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-brand-dark text-brand-dark bg-white mt-1 transition-colors">1. Dados Pessoais</button>
                    <button id="tab-endereco" class="px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent text-gray-500 hover:text-gray-800 mt-1 transition-colors">2. Localização (CEP)</button>
                    <button id="tab-historico" class="px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent text-gray-500 hover:text-gray-800 mt-1 transition-colors">3. Histórico de Uso</button>
                    <button id="tab-galeria" class="px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent text-gray-500 hover:text-gray-800 mt-1 transition-colors">4. Galeria de Arquivos</button>
                </div>

                <form id="form-cliente" class="overflow-y-auto flex-1 p-6 space-y-6 custom-scroll bg-white">
                    <input type="hidden" id="c-id">
                    <input type="hidden" id="c-codigo-gerado">

                    <div id="conteudo-tab-dados" class="space-y-6">
                        <!-- FOTO DE PERFIL -->
                        <div class="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-sm">
                            <div class="relative w-20 h-20 rounded-full border-2 border-brand-dark bg-gray-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm" id="avatar-preview-box">
                                <img id="img-avatar-preview" src="" class="w-full h-full object-cover hidden">
                                <i id="icon-avatar-default" class="ph-bold ph-user text-3xl text-gray-400"></i>
                            </div>
                            <div class="flex flex-col gap-2">
                                <div>
                                    <h4 class="text-xs font-black text-gray-900 uppercase tracking-wider">Foto de Perfil do Cliente</h4>
                                    <p class="text-[11px] text-gray-500">Formato quadrado recomendado (JPG, PNG ou WEBP).</p>
                                </div>
                                <div class="flex items-center gap-2">
                                    <label class="bg-brand-dark hover:bg-black text-brand-main text-xs font-bold px-3 py-1.5 cursor-pointer transition flex items-center gap-1 shadow-sm">
                                        <i class="ph-bold ph-camera"></i> Alterar Foto
                                        <input type="file" id="file-foto-perfil" accept="image/*" class="hidden">
                                    </label>
                                    <button type="button" id="btn-remover-foto-perfil" class="bg-white border border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-gray-600 text-xs font-bold px-3 py-1.5 transition hidden cursor-pointer">
                                        Remover Foto
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="border border-red-200 bg-red-50 p-4 rounded-sm">
                            <h3 class="text-xs font-black text-red-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <i class="ph-fill ph-warning-octagon text-lg"></i> Painel de Segurança (Blacklist)
                            </h3>
                            <div class="flex flex-col md:flex-row items-start md:items-center gap-4">
                                <div class="flex items-center gap-2 mt-1">
                                    <input type="checkbox" id="c-blacklist" class="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer">
                                    <label for="c-blacklist" class="text-xs font-bold text-red-900 uppercase cursor-pointer">Bloquear Cliente</label>
                                </div>
                                <div class="flex-1 w-full">
                                    <input type="text" id="c-blacklist-motivo" disabled placeholder="Motivo do bloqueio (Ex: Calote, Moto Destruída, etc.)" class="w-full px-3 py-2 border border-red-300 text-sm focus:border-red-500 outline-none bg-white text-red-800 placeholder-red-300 disabled:opacity-50 disabled:bg-gray-100">
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div class="md:col-span-2">
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nome Completo / Razão Social *</label>
                                <input type="text" id="c-nome" required class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Tipo de Pessoa *</label>
                                <select id="c-tipo" class="w-full px-3 py-2 border border-gray-300 text-sm bg-white focus:border-brand-main outline-none">
                                    <option value="PF">Física (PF)</option>
                                    <option value="PJ">Jurídica (PJ)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" id="lbl-doc">CPF *</label>
                                <input type="text" id="c-cpf-cnpj" required placeholder="000.000.000-00" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-mono">
                                <p id="msg-valida-doc" class="hidden text-[10px] font-bold text-red-600 mt-1 uppercase tracking-wider flex items-center gap-1">
                                    <i class="ph-bold ph-warning-circle"></i> Documento Inválido!
                                </p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">RG / Identidade</label>
                                <input type="text" id="c-rg-identidade" placeholder="Ex: 1234567-SSP/RO" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-mono">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nº da CNH</label>
                                <input type="text" id="c-num-cnh" placeholder="Ex: 12345678900" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-mono">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">WhatsApp Pessoal *</label>
                                <input type="text" id="c-wpp" required placeholder="(69) 9..." class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">E-mail</label>
                                <input type="email" id="c-email" placeholder="cliente@email.com" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                            </div>
                        </div>

                        <div class="border-t border-gray-200 pt-4">
                            <h3 class="text-xs font-extrabold text-brand-hover uppercase tracking-widest mb-4 flex items-center gap-2">
                                <i class="ph ph-phone-call text-base"></i> Triagem de Segurança (3 Referências)
                            </h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div class="bg-gray-50 p-3 border border-gray-200">
                                    <span class="text-[10px] font-bold text-gray-400 uppercase font-mono block mb-2">Referência 01</span>
                                    <input type="text" id="c-ref-nome-1" placeholder="Nome do Contato 1" class="w-full px-3 py-1.5 border border-gray-300 text-xs mb-2 bg-white">
                                    <input type="text" id="c-ref-fone-1" placeholder="Telefone / Wpp 1" class="w-full px-3 py-1.5 border border-gray-300 text-xs bg-white">
                                </div>
                                <div class="bg-gray-50 p-3 border border-gray-200">
                                    <span class="text-[10px] font-bold text-gray-400 uppercase font-mono block mb-2">Referência 02</span>
                                    <input type="text" id="c-ref-nome-2" placeholder="Nome do Contato 2" class="w-full px-3 py-1.5 border border-gray-300 text-xs mb-2 bg-white">
                                    <input type="text" id="c-ref-fone-2" placeholder="Telefone / Wpp 2" class="w-full px-3 py-1.5 border border-gray-300 text-xs bg-white">
                                </div>
                                <div class="bg-gray-50 p-3 border border-gray-200">
                                    <span class="text-[10px] font-bold text-gray-400 uppercase font-mono block mb-2">Referência 03</span>
                                    <input type="text" id="c-ref-nome-3" placeholder="Nome do Contato 3" class="w-full px-3 py-1.5 border border-gray-300 text-xs mb-2 bg-white">
                                    <input type="text" id="c-ref-fone-3" placeholder="Telefone / Wpp 3" class="w-full px-3 py-1.5 border border-gray-300 text-xs bg-white">
                                </div>
                            </div>
                        </div>

                        <div class="border-t border-gray-200 pt-4">
                            <h3 class="text-xs font-extrabold text-gray-900 uppercase tracking-widest mb-3">
                                Arquivo Digital (Identidade / CNH)
                            </h3>
                            <div class="border border-dashed border-gray-300 p-4 flex flex-col justify-between bg-gray-50 w-full md:w-1/2">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Habilitação (CNH) ou RG</label>
                                    <input type="file" id="file-cnh" accept="image/*" class="text-xs text-gray-500 file:mr-4 file:py-1 file:px-2 file:border-0 file:bg-brand-dark file:text-brand-main file:font-bold hover:file:bg-black w-full">
                                </div>
                                <div id="preview-cnh-box" class="mt-3 hidden text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                    <i class="ph-fill ph-check-circle text-base"></i> Documento Carregado! <button type="button" id="btn-ver-cnh" class="text-brand-hover underline ml-2">Visualizar</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="conteudo-tab-endereco" class="hidden space-y-6">
                        <div class="bg-brand-light border border-brand-main p-4 flex items-start gap-3">
                            <i class="ph-fill ph-map-pin text-2xl text-brand-hover"></i>
                            <div>
                                <h4 class="text-sm font-bold text-gray-900">Busca Automática de CEP</h4>
                                <p class="text-xs text-gray-600 mt-1">Digite o CEP e o sistema preencherá o logradouro e a cidade usando os dados oficiais dos Correios.</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">CEP</label>
                                <input type="text" id="c-cep" placeholder="00000-000" maxlength="9" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none font-mono">
                            </div>
                            <div class="md:col-span-3">
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Logradouro (Rua, Av, etc)</label>
                                <input type="text" id="c-logradouro" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none bg-white">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Número</label>
                                <input type="text" id="c-numero" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                            </div>
                            <div class="md:col-span-3">
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Complemento (Apto, Bloco, Casa)</label>
                                <input type="text" id="c-complemento" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Bairro</label>
                                <input type="text" id="c-bairro" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none bg-white">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Cidade</label>
                                <input type="text" id="c-cidade" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none bg-white">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Estado (UF)</label>
                                <input type="text" id="c-uf" maxlength="2" placeholder="RO" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none bg-white uppercase font-bold text-center">
                            </div>
                        </div>

                        <div class="border-t border-gray-200 pt-4">
                            <h3 class="text-xs font-extrabold text-gray-900 uppercase tracking-widest mb-3">
                                Comprovante de Endereço Digital
                            </h3>
                            <div class="border border-dashed border-gray-300 p-4 flex flex-col justify-between bg-gray-50 w-full md:w-1/2">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Fatura Atualizada (Água, Luz, Internet)</label>
                                    <input type="file" id="file-residencia" accept="image/*" class="text-xs text-gray-500 file:mr-4 file:py-1 file:px-2 file:border-0 file:bg-brand-dark file:text-brand-main file:font-bold hover:file:bg-black w-full">
                                </div>
                                <div id="preview-res-box" class="mt-3 hidden text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                    <i class="ph-fill ph-check-circle text-base"></i> Comprovante Carregado! <button type="button" id="btn-ver-res" class="text-brand-hover underline ml-2">Visualizar</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="conteudo-tab-historico" class="hidden space-y-4">
                        <div class="bg-gray-50 border p-4">
                            <h4 class="text-xs font-bold text-gray-500 uppercase font-mono tracking-wider mb-3">Linha do Tempo de Aluguéis</h4>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-xs whitespace-nowrap">
                                    <thead>
                                        <tr class="border-b border-gray-200 text-gray-400 uppercase font-mono">
                                            <th class="pb-2">ID Contrato</th>
                                            <th class="pb-2">Veículo / Modelo</th>
                                            <th class="pb-2">Placa</th>
                                            <th class="pb-2">Valor Cobrado</th>
                                            <th class="pb-2">Situação Atual</th>
                                        </tr>
                                    </thead>
                                    <tbody id="tb-historico-locacoes" class="divide-y divide-gray-100 text-gray-700 font-medium">
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div id="conteudo-tab-galeria" class="hidden space-y-6">
                        <div class="flex justify-between items-center bg-gray-50 border border-gray-200 p-4 rounded-sm">
                            <div>
                                <h3 class="text-xs font-extrabold text-brand-hover uppercase tracking-widest">Galeria de Documentos Extras</h3>
                                <p class="text-[10px] text-gray-500 font-mono mt-0.5">Comprovantes de Residência, Fotos de CNH, Termos, etc.</p>
                            </div>
                            <label class="bg-brand-dark hover:bg-black text-brand-main px-3 py-1.5 rounded-sm font-bold text-xs uppercase cursor-pointer flex items-center gap-1 shadow-sm transition">
                                <i class="ph-bold ph-upload text-xs"></i> Enviar Arquivo
                                <input type="file" id="file-foto-galeria" accept="image/*,.pdf" class="hidden">
                            </label>
                        </div>
                        
                        <div id="galeria-fotos-container" class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded min-h-[150px] bg-gray-50/50">
                        </div>
                    </div>

                    <div class="pt-4 border-t border-gray-100 flex gap-3 bg-white" id="modal-actions-footer">
                        <button type="button" id="btn-cancelar" class="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition">Cancelar</button>
                        <button type="submit" class="flex-1 px-4 py-2.5 bg-brand-dark text-brand-main font-black hover:bg-black shadow-hard border border-gray-900 transition">Gravar Dossiê Completo</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL IMPORTAR CLIENTE POR TEXTO / FORMULÁRIO -->
        <div id="modal-importar-cliente" class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4 transition-opacity opacity-0">
            <div class="bg-white border border-gray-900 w-full max-w-2xl shadow-2xl overflow-hidden transform scale-95 transition-transform flex flex-col max-h-[90vh]" id="modal-importar-cliente-panel">
                <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div class="flex items-center gap-2">
                        <i class="ph-bold ph-magic-wand text-emerald-600 text-xl"></i>
                        <div>
                            <h2 class="text-lg font-black text-gray-900 uppercase tracking-tight">Leitura Automática de Formulário</h2>
                            <p class="text-xs text-gray-500 font-mono">Cole a resposta do WhatsApp ou carregue um arquivo de texto/ficha</p>
                        </div>
                    </div>
                    <button id="btn-fechar-modal-importar" class="text-gray-400 hover:text-red-600 transition p-1"><i class="ph ph-x text-2xl"></i></button>
                </div>

                <div class="p-6 space-y-4 overflow-y-auto custom-scroll bg-white">
                    <div class="bg-emerald-50 border border-emerald-200 p-4 rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div>
                            <h4 class="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                                <i class="ph-bold ph-whatsapp-logo text-emerald-600 text-base"></i> Modelo Oficial para WhatsApp
                            </h4>
                            <p class="text-[11px] text-emerald-700 mt-0.5">Envie este modelo formatado para o seu cliente preencher pelo celular.</p>
                        </div>
                        <button type="button" id="btn-copiar-modelo-wpp" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold uppercase transition flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer">
                            <i class="ph-bold ph-copy"></i> Copiar Ficha Cadastral
                        </button>
                    </div>

                    <div>
                        <div class="flex justify-between items-center mb-1.5">
                            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider">Formulário / Texto do Cliente *</label>
                            <label class="text-xs text-brand-dark hover:underline font-bold cursor-pointer flex items-center gap-1">
                                <i class="ph-bold ph-file-text"></i> Carregar arquivo (.txt)
                                <input type="file" id="file-importar-txt" accept=".txt,.doc,.docx" class="hidden">
                            </label>
                        </div>
                        <textarea id="txt-importar-cliente" rows="10" placeholder="Cole aqui a mensagem do WhatsApp ou texto preenchido do cliente...&#10;&#10;Exemplo:&#10;Nome: João da Silva&#10;CPF: 123.456.789-00&#10;WhatsApp: (69) 99988-7766&#10;CEP: 76801-000&#10;Rua: Av. Sete de Setembro, Nº 123" class="w-full p-3 border border-gray-300 text-xs font-mono focus:border-emerald-600 outline-none transition bg-gray-50 leading-relaxed"></textarea>
                    </div>
                </div>

                <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
                    <button type="button" id="btn-cancelar-importar" class="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition">Cancelar</button>
                    <button type="button" id="btn-processar-importacao" class="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-hard border border-emerald-800 transition flex items-center justify-center gap-2">
                        <i class="ph-bold ph-magic-wand text-lg"></i> Extrair e Preencher Cadastro
                    </button>
                </div>
            </div>
        </div>

        <div id="lightbox-viewer" class="fixed inset-0 bg-black/90 z-[60] hidden flex flex-col items-center justify-center p-4">
            <button id="btn-fechar-lightbox" class="absolute top-5 right-5 text-white bg-gray-950 px-4 py-2 border border-gray-700 font-bold flex items-center gap-2 hover:bg-gray-800 transition"><i class="ph ph-x"></i> Fechar Inspeção</button>
            <img id="img-lightbox-src" src="" alt="Inspeção de Documento" class="max-w-full max-h-[85vh] object-contain border-4 border-white shadow-2xl bg-gray-900">
        </div>
    `;

    // ========== JAVASCRIPT ==========
    const tbody = document.getElementById('tb-clientes');
    const emptyState = document.getElementById('clientes-empty');
    const txtEmptyState = document.getElementById('txt-empty-state');
    const modal = document.getElementById('modal-cliente');
    const modalPanel = document.getElementById('modal-cliente-panel');
    const form = document.getElementById('form-cliente');
    const inputBusca = document.getElementById('busca-clientes');
    const selTipo = document.getElementById('c-tipo');
    const lblDoc = document.getElementById('lbl-doc');

    const tabDados = document.getElementById('tab-dados');
    const tabEndereco = document.getElementById('tab-endereco');
    const tabHistorico = document.getElementById('tab-historico');
    const tabGaleria = document.getElementById('tab-galeria');
    
    const conTabDados = document.getElementById('conteudo-tab-dados');
    const conTabEndereco = document.getElementById('conteudo-tab-endereco');
    const conTabHistorico = document.getElementById('conteudo-tab-historico');
    const conTabGaleria = document.getElementById('conteudo-tab-galeria');
    const footerActions = document.getElementById('modal-actions-footer');

    let filtroAtual = 'todos';
    let paginaAtual = 1;
    const itensPorPagina = 50;

    const btnFiltroTodos = document.getElementById('btn-filtro-todos');
    const btnFiltroBlacklist = document.getElementById('btn-filtro-blacklist');
    const badgeBlacklistCount = document.getElementById('badge-blacklist-count');

    const btnPagePrev = document.getElementById('btn-page-prev');
    const btnPageNext = document.getElementById('btn-page-next');
    const pageIndicator = document.getElementById('page-indicator');
    const containerPaginacao = document.getElementById('clientes-paginacao');

    const checkBlacklist = document.getElementById('c-blacklist');
    const inputMotivoBL = document.getElementById('c-blacklist-motivo');

    const inputCep = document.getElementById('c-cep');
    const inputLogradouro = document.getElementById('c-logradouro');
    const inputNumero = document.getElementById('c-numero');
    const inputComplemento = document.getElementById('c-complemento');
    const inputBairro = document.getElementById('c-bairro');
    const inputCidade = document.getElementById('c-cidade');
    const inputUf = document.getElementById('c-uf');
    const inputEmail = document.getElementById('c-email');
    const inputRgIdentidade = document.getElementById('c-rg-identidade');
    const inputNumCnh = document.getElementById('c-num-cnh');

    const fileCnh = document.getElementById('file-cnh');
    const fileRes = document.getElementById('file-residencia');
    const boxCnh = document.getElementById('preview-cnh-box');
    const boxRes = document.getElementById('preview-res-box');
    
    const filePerfil = document.getElementById('file-foto-perfil');
    const imgAvatarPreview = document.getElementById('img-avatar-preview');
    const iconAvatarDefault = document.getElementById('icon-avatar-default');
    const btnRemoverFotoPerfil = document.getElementById('btn-remover-foto-perfil');

    const lightbox = document.getElementById('lightbox-viewer');
    const lightboxImg = document.getElementById('img-lightbox-src');

    let imgCnhBase64 = "";
    let imgResBase64 = "";
    let imgPerfilBase64 = "";

    const inputCpfCnpj = document.getElementById('c-cpf-cnpj');
    const msgValidaDoc = document.getElementById('msg-valida-doc');

    // ===== EVENTOS =====
    inputCpfCnpj.addEventListener('input', (e) => {
        const formatado = formatarCPFCNPJ(e.target.value);
        e.target.value = formatado;
        
        const clean = formatado.replace(/\D/g, '');
        const tipoDoc = selTipo.value;
        const minLen = tipoDoc === 'PF' ? 11 : 14;
        
        if (clean.length >= minLen) {
            const ehValido = validarCPFCNPJ(clean, tipoDoc);
            if (!ehValido) {
                msgValidaDoc.classList.remove('hidden');
                inputCpfCnpj.classList.add('border-red-500', 'bg-red-50');
            } else {
                msgValidaDoc.classList.add('hidden');
                inputCpfCnpj.classList.remove('border-red-500', 'bg-red-50');
            }
        } else {
            msgValidaDoc.classList.add('hidden');
            inputCpfCnpj.classList.remove('border-red-500', 'bg-red-50');
        }
    });

    inputCpfCnpj.addEventListener('blur', (e) => {
        const clean = e.target.value.replace(/\D/g, '');
        if (clean.length > 0) {
            const tipoDoc = selTipo.value;
            const ehValido = validarCPFCNPJ(clean, tipoDoc);
            if (!ehValido) {
                msgValidaDoc.classList.remove('hidden');
                inputCpfCnpj.classList.add('border-red-500', 'bg-red-50');
            } else {
                msgValidaDoc.classList.add('hidden');
                inputCpfCnpj.classList.remove('border-red-500', 'bg-red-50');
            }
        }
    });

    inputCep.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 5) v = v.replace(/^(\d{5})(\d)/, '$1-$2');
        e.target.value = v;
    });

    inputCep.addEventListener('blur', async (e) => {
        const cepLimpo = e.target.value.replace(/\D/g, '');
        if (cepLimpo.length === 8) {
            inputLogradouro.value = "Buscando...";
            try {
                const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
                if (!resposta.ok) throw new Error('Falha na comunicação com o serviço de CEP.');
                const dadosCep = await resposta.json();
                if (!dadosCep.erro) {
                    inputLogradouro.value = dadosCep.logradouro || '';
                    inputBairro.value = dadosCep.bairro || '';
                    inputCidade.value = dadosCep.localidade || '';
                    inputUf.value = dadosCep.uf || '';
                    inputNumero.focus();
                } else {
                    inputLogradouro.value = "";
                    await showAlert('CEP não encontrado na base dos Correios.');
                }
            } catch (erro) {
                inputLogradouro.value = "";
                console.error("Erro na busca de CEP:", erro);
                await showAlert('Erro ao buscar CEP: ' + erro.message);
            }
        }
    });

    selTipo.addEventListener('change', () => {
        if (selTipo.value === 'PF') {
            lblDoc.innerText = 'CPF *';
            inputCpfCnpj.placeholder = '000.000.000-00';
        } else {
            lblDoc.innerText = 'CNPJ *';
            inputCpfCnpj.placeholder = '00.000.000/0001-00';
        }
        if (inputCpfCnpj.value) {
            inputCpfCnpj.value = formatarCPFCNPJ(inputCpfCnpj.value);
        }
    });

    checkBlacklist.addEventListener('change', (e) => {
        inputMotivoBL.disabled = !e.target.checked;
        if (!e.target.checked) inputMotivoBL.value = '';
        else inputMotivoBL.focus();
    });

    tabDados.addEventListener('click', (e) => { e.preventDefault(); alternarAbas('dados'); });
    tabEndereco.addEventListener('click', (e) => { e.preventDefault(); alternarAbas('endereco'); });
    tabHistorico.addEventListener('click', (e) => { e.preventDefault(); alternarAbas('historico'); });
    tabGaleria.addEventListener('click', (e) => { e.preventDefault(); alternarAbas('galeria'); });

    function resetarEstiloAbas() {
        const classesInativas = "px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent text-gray-500 hover:text-gray-800 mt-1 transition-colors";
        tabDados.className = classesInativas;
        tabEndereco.className = classesInativas;
        tabHistorico.className = classesInativas;
        tabGaleria.className = classesInativas;
        
        conTabDados.classList.add('hidden');
        conTabEndereco.classList.add('hidden');
        conTabHistorico.classList.add('hidden');
        conTabGaleria.classList.add('hidden');
    }

    function alternarAbas(aba) {
        resetarEstiloAbas();
        const classesAtivas = "px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-brand-dark text-brand-dark bg-white mt-1 transition-colors";
        if (aba === 'dados') {
            tabDados.className = classesAtivas;
            conTabDados.classList.remove('hidden');
            footerActions.classList.remove('hidden');
        } else if (aba === 'endereco') {
            tabEndereco.className = classesAtivas;
            conTabEndereco.classList.remove('hidden');
            footerActions.classList.remove('hidden');
        } else if (aba === 'historico') {
            tabHistorico.className = classesAtivas;
            conTabHistorico.classList.remove('hidden');
            footerActions.classList.add('hidden');
            carregarHistoricoLocacoes();
        } else if (aba === 'galeria') {
            tabGaleria.className = classesAtivas;
            conTabGaleria.classList.remove('hidden');
            footerActions.classList.add('hidden');
            renderGaleriaFotos();
        }
    }

    async function renderGaleriaFotos() {
        const container = document.getElementById('galeria-fotos-container');
        container.innerHTML = '';
        
        const cId = document.getElementById('c-id').value;
        if (!cId) {
            container.innerHTML = '<div class="col-span-full p-6 text-center text-gray-400 font-bold uppercase tracking-wider">Salve o cliente primeiro para gerenciar seus arquivos extras.</div>';
            return;
        }
        
        const cli = db.clientes.find(x => x.id === Number(cId));
        if (!cli) return;
        
        let filesList = [];
        try {
            filesList = typeof cli.galeria_fotos === 'string' ? JSON.parse(cli.galeria_fotos) : (cli.galeria_fotos || []);
        } catch {
            filesList = [];
        }
        
        if (filesList.length === 0) {
            container.innerHTML = '<div class="col-span-full p-6 text-center text-gray-400 font-bold uppercase tracking-wider">Nenhum arquivo enviado ainda.</div>';
            return;
        }
        
        showLoading('Carregando galeria...');
        try {
            for (let i = 0; i < filesList.length; i++) {
                const path = filesList[i];
                const base64 = await window.electronAPI.readFile(path);
                
                const card = document.createElement('div');
                card.className = "relative bg-white border border-gray-200 rounded p-2 flex flex-col justify-between shadow-sm group";
                card.innerHTML = `
                    <div class="h-28 w-full bg-gray-100 flex items-center justify-center overflow-hidden rounded mb-2 cursor-pointer btn-ver-galeria-foto" data-index="${i}">
                        <img src="${base64}" class="w-full h-full object-cover group-hover:scale-105 transition duration-200">
                    </div>
                    <div class="flex justify-between items-center text-[10px] text-gray-500 font-semibold font-mono">
                        <span>Doc #${i + 1}</span>
                        <button type="button" class="btn-excluir-galeria-foto text-red-500 hover:text-red-700 transition px-1" data-index="${i}" title="Excluir Arquivo">
                            <i class="ph-bold ph-trash text-base"></i>
                        </button>
                    </div>
                `;
                
                card.querySelector('.btn-ver-galeria-foto').addEventListener('click', () => {
                    showLightbox(base64);
                });
                
                card.querySelector('.btn-excluir-galeria-foto').addEventListener('click', async () => {
                    const confirmado = await showConfirm("Confirma a exclusão deste documento?");
                    if (confirmado) {
                        try {
                            filesList.splice(i, 1);
                            cli.galeria_fotos = JSON.stringify(filesList);
                            await window.electronAPI.saveData('clientes', db.clientes);
                            renderGaleriaFotos();
                        } catch (err) {
                            await showAlert("Erro ao deletar: " + err.message);
                        }
                    }
                });
                
                container.appendChild(card);
            }
        } catch (err) {
            console.error(err);
        } finally {
            hideLoading();
        }
    }

    handleFileUpload(document.getElementById('file-foto-galeria'), async (base64) => {
        const cId = document.getElementById('c-id').value;
        if (!cId) {
            await showAlert("Salve o cliente primeiro antes de enviar fotos para a galeria.");
            return;
        }
        
        const cli = db.clientes.find(x => x.id === Number(cId));
        if (!cli) return;
        
        showLoading('Salvando arquivo...');
        try {
            let filesList = [];
            try {
                filesList = typeof cli.galeria_fotos === 'string' ? JSON.parse(cli.galeria_fotos) : (cli.galeria_fotos || []);
            } catch {
                filesList = [];
            }
            
            const userDataPath = await window.electronAPI.getUserDataPath();
            const pastaUploads = `${userDataPath}/uploads/cliente_${cId}`;
            await window.electronAPI.createFolder(pastaUploads);
            
            const fileName = `doc_${Date.now()}.png`;
            const caminhoCompleto = `${pastaUploads}/${fileName}`;
            
            await window.electronAPI.saveFile(caminhoCompleto, base64);
            
            filesList.push(caminhoCompleto);
            cli.galeria_fotos = JSON.stringify(filesList);
            
            await window.electronAPI.saveData('clientes', db.clientes);
            hideLoading();
            renderGaleriaFotos();
            await showAlert("Documento enviado com sucesso para o dossiê!");
        } catch (err) {
            hideLoading();
            await showAlert("Erro ao salvar arquivo: " + err.message);
        }
    });

    // Upload com utilitário
    handleFileUpload(fileCnh, (base64) => { imgCnhBase64 = base64; boxCnh.classList.remove('hidden'); });
    handleFileUpload(fileRes, (base64) => { imgResBase64 = base64; boxRes.classList.remove('hidden'); });
    handleFileUpload(filePerfil, (base64) => {
        imgPerfilBase64 = base64;
        if (imgAvatarPreview && iconAvatarDefault) {
            imgAvatarPreview.src = base64;
            imgAvatarPreview.classList.remove('hidden');
            iconAvatarDefault.classList.add('hidden');
        }
        if (btnRemoverFotoPerfil) btnRemoverFotoPerfil.classList.remove('hidden');
    });

    if (btnRemoverFotoPerfil) {
        btnRemoverFotoPerfil.addEventListener('click', () => {
            imgPerfilBase64 = "";
            if (filePerfil) filePerfil.value = "";
            if (imgAvatarPreview && iconAvatarDefault) {
                imgAvatarPreview.src = "";
                imgAvatarPreview.classList.add('hidden');
                iconAvatarDefault.classList.remove('hidden');
            }
            btnRemoverFotoPerfil.classList.add('hidden');
        });
    }

    document.getElementById('btn-ver-cnh').addEventListener('click', async () => {
        if (!imgCnhBase64) return;
        let base64ToShow = imgCnhBase64;
        if (!imgCnhBase64.startsWith('data:')) {
            showLoading('Carregando documento...');
            base64ToShow = await window.electronAPI.readFile(imgCnhBase64);
            hideLoading();
        }
        if (base64ToShow) {
            lightboxImg.src = base64ToShow;
            lightbox.classList.remove('hidden');
        } else {
            await showAlert('Não foi possível ler o arquivo do documento.');
        }
    });
    document.getElementById('btn-ver-res').addEventListener('click', async () => {
        if (!imgResBase64) return;
        let base64ToShow = imgResBase64;
        if (!imgResBase64.startsWith('data:')) {
            showLoading('Carregando comprovante...');
            base64ToShow = await window.electronAPI.readFile(imgResBase64);
            hideLoading();
        }
        if (base64ToShow) {
            lightboxImg.src = base64ToShow;
            lightbox.classList.remove('hidden');
        } else {
            await showAlert('Não foi possível ler o arquivo do comprovante.');
        }
    });
    document.getElementById('btn-fechar-lightbox').addEventListener('click', () => lightbox.classList.add('hidden'));

    function carregarHistoricoLocacoes() {
        const idCliente = Number(document.getElementById('c-id').value);
        const tBodyHist = document.getElementById('tb-historico-locacoes');
        tBodyHist.innerHTML = '';
        if (!idCliente) {
            tBodyHist.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-gray-400 italic">Salve o cliente primeiro para gerar histórico.</td></tr>';
            return;
        }
        const contratosDoCliente = db.contratos.filter(c => c.cliente_id === idCliente);
        if (contratosDoCliente.length === 0) {
            tBodyHist.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-gray-400 italic">Nenhum registro de locação encontrado para este CPF/CNPJ.</td></tr>';
            return;
        }
        const htmlRows = [];
        contratosDoCliente.forEach(c => {
            const vei = db.veiculos.find(v => v.id === c.veiculo_id) || { modelo: 'Modelo Removido', placa: '---' };
            const statusLabel = c.status === 'ativo' ? '<span class="text-blue-600 bg-blue-50 px-1.5 py-0.5 font-bold">Vigente</span>' : '<span class="text-gray-500 bg-gray-100 px-1.5 py-0.5 font-normal">Encerrado</span>';
            htmlRows.push(`
                <tr class="border-b">
                    <td class="py-2.5 font-mono text-gray-400">#${c.id.toString().slice(-5)}</td>
                    <td class="py-2.5">${vei.modelo}</td>
                    <td class="py-2.5 font-mono">${vei.placa}</td>
                    <td class="py-2.5 font-bold">${utils.formatMoney(c.valor)}</td>
                    <td class="py-2.5">${statusLabel}</td>
                </tr>
            `);
        });
        tBodyHist.innerHTML = htmlRows.join('');
    }

    function atualizarTabela() {
        const termo = inputBusca.value.toLowerCase();
        tbody.innerHTML = '';
        const qtBlacklist = db.clientes.filter(c => c.blacklist).length;
        badgeBlacklistCount.innerText = qtBlacklist;
        let filtrados = db.clientes.filter(c => {
            const matchTermo = c.nome.toLowerCase().includes(termo) || 
                               (c.codigo && c.codigo.toLowerCase().includes(termo)) || 
                               c.cpf_cnpj.includes(termo) || 
                               c.wpp.includes(termo) ||
                               (c.num_cnh && c.num_cnh.toLowerCase().includes(termo)) ||
                               (c.rg_identidade && c.rg_identidade.toLowerCase().includes(termo)) ||
                               (c.email && c.email.toLowerCase().includes(termo));
            if (filtroAtual === 'blacklist') return matchTermo && c.blacklist;
            return matchTermo;
        });

        // Configuração de Paginação
        const totalPaginas = Math.ceil(filtrados.length / itensPorPagina) || 1;
        if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
        if (paginaAtual < 1) paginaAtual = 1;

        const inicio = (paginaAtual - 1) * itensPorPagina;
        const fim = inicio + itensPorPagina;
        const paginados = filtrados.slice(inicio, fim);

        // Atualizar controles de paginação
        btnPagePrev.disabled = (paginaAtual === 1);
        btnPageNext.disabled = (paginaAtual === totalPaginas);
        pageIndicator.innerText = `Página ${paginaAtual} de ${totalPaginas} (${filtrados.length} clientes)`;

        if (filtrados.length === 0) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('flex');
            txtEmptyState.innerText = filtroAtual === 'blacklist' ? "Nenhum cliente na lista de bloqueados." : "Base de clientes vazia";
            containerPaginacao.classList.add('hidden');
        } else {
            emptyState.classList.add('hidden');
            emptyState.classList.remove('flex');
            containerPaginacao.classList.remove('hidden');
            paginados.forEach(c => {
                const isBlacklisted = c.blacklist;
                const nomeFormatado = isBlacklisted ? `<span class="text-gray-400 line-through">${c.nome}</span> <div class="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 mt-1 uppercase tracking-widest rounded-sm shadow-sm inline-flex items-center gap-1 w-max" title="Motivo: ${c.blacklist_motivo}"><i class="ph-bold ph-warning-octagon"></i> Blacklist</div>` : `<span class="text-gray-900">${c.nome}</span>`;
                
                // Avatar do Cliente
                const iniciais = (c.nome || 'C').trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
                let avatarHtml = `<div class="w-8 h-8 rounded-full bg-brand-dark text-brand-main font-black text-xs flex items-center justify-center shrink-0 border border-gray-800 shadow-sm">${iniciais}</div>`;
                if (c.foto_perfil) {
                    if (c.foto_perfil.startsWith('data:')) {
                        avatarHtml = `<div class="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-300 shadow-sm bg-gray-100"><img src="${c.foto_perfil}" class="w-full h-full object-cover"></div>`;
                    } else {
                        avatarHtml = `<div class="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-300 shadow-sm bg-gray-100"><img id="avatar-img-${c.id}" class="w-full h-full object-cover hidden"><div id="avatar-init-${c.id}" class="w-full h-full bg-brand-dark text-brand-main font-black text-xs flex items-center justify-center">${iniciais}</div></div>`;
                    }
                }

                const tr = document.createElement('tr');
                tr.className = `hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors ${isBlacklisted ? 'bg-red-50/30' : ''}`;
                tr.innerHTML = `
                    <td class="px-6 py-4 font-mono font-bold text-brand-hover">${c.codigo || '---'}</td>
                    <td class="px-6 py-4 font-bold text-gray-900">
                        <div class="flex items-center gap-3">
                            ${avatarHtml}
                            <div class="flex flex-col">${nomeFormatado}</div>
                        </div>
                    </td>
                    <td class="px-6 py-4"><span class="text-xs px-1.5 py-0.5 font-bold bg-gray-900 text-white">${c.tipo}</span></td>
                    <td class="px-6 py-4 text-gray-600 font-mono text-xs">${c.cpf_cnpj}</td>
                    <td class="px-6 py-4 text-gray-700">${c.wpp}</td>
                    <td class="px-6 py-4 text-gray-600">${c.email || '—'}</td>
                    <td class="px-6 py-4 text-right">
                        <button class="btn-editar text-white bg-brand-dark hover:bg-black px-3 py-1.5 text-xs font-bold shadow-sm transition mr-2" data-id="${c.id}">Ver Dossiê</button>
                        <button class="btn-deletar text-gray-400 hover:text-red-600 px-2 py-1.5 text-xs font-bold transition" data-id="${c.id}">Remover</button>
                    </td>
                `;
                tbody.appendChild(tr);

                // Carregar avatar do arquivo se for um caminho local
                if (c.foto_perfil && !c.foto_perfil.startsWith('data:')) {
                    window.electronAPI.readFile(c.foto_perfil).then(base64 => {
                        if (base64) {
                            const imgEl = document.getElementById(`avatar-img-${c.id}`);
                            const initEl = document.getElementById(`avatar-init-${c.id}`);
                            if (imgEl && initEl) {
                                imgEl.src = base64;
                                imgEl.classList.remove('hidden');
                                initEl.classList.add('hidden');
                            }
                        }
                    }).catch(() => {});
                }
            });
        }
    }

    function toggleModal(abrir = true) {
        if (abrir) {
            alternarAbas('dados');
            modal.classList.remove('hidden');
            setTimeout(() => { modal.classList.remove('opacity-0'); modalPanel.classList.remove('scale-95'); }, 10);
        } else {
            modal.classList.add('opacity-0');
            modalPanel.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                form.reset();
                document.getElementById('c-id').value = '';
                document.getElementById('c-codigo-gerado').value = '';
                document.getElementById('modal-cliente-code').innerText = "Código: Gerado automaticamente";
                if (inputRgIdentidade) inputRgIdentidade.value = '';
                if (inputNumCnh) inputNumCnh.value = '';
                checkBlacklist.checked = false;
                inputMotivoBL.value = '';
                inputMotivoBL.disabled = true;
                imgCnhBase64 = "";
                imgResBase64 = "";
                imgPerfilBase64 = "";
                if (filePerfil) filePerfil.value = "";
                if (imgAvatarPreview) {
                    imgAvatarPreview.src = "";
                    imgAvatarPreview.classList.add('hidden');
                }
                if (iconAvatarDefault) iconAvatarDefault.classList.remove('hidden');
                if (btnRemoverFotoPerfil) btnRemoverFotoPerfil.classList.add('hidden');
                boxCnh.classList.add('hidden');
                boxRes.classList.add('hidden');
                document.getElementById('galeria-fotos-container').innerHTML = '';
                lblDoc.innerText = 'CPF *';
            }, 200);
        }
    }

    // ===== SUBMIT FORM =====
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('c-id').value;
        let codigoFinal = document.getElementById('c-codigo-gerado').value;
        if (!codigoFinal) {
            const numeroSequencial = db.clientes.length + 1;
            codigoFinal = `VM-${String(numeroSequencial).padStart(4, '0')}`;
        }

        const idCliente = id ? Number(id) : Date.now();

        // Salvar imagens localmente se forem novas (Base64)
        let finalCnh = imgCnhBase64;
        let finalRes = imgResBase64;
        let finalPerfil = imgPerfilBase64;

        const docValor = inputCpfCnpj.value;
        const tipoDoc = selTipo.value;
        if (!validarCPFCNPJ(docValor, tipoDoc)) {
            await showAlert(`❌ O ${tipoDoc === 'PF' ? 'CPF' : 'CNPJ'} informado (${docValor}) é matematicamente inválido!\nPor favor, verifique os dígitos.`);
            inputCpfCnpj.focus();
            return;
        }

        showLoading('A guardar cliente...');

        try {
            if (imgPerfilBase64 && imgPerfilBase64.startsWith('data:')) {
                const userDataPath = await window.electronAPI.getUserDataPath();
                const uploadsPath = `${userDataPath}/uploads`;
                await window.electronAPI.createFolder(uploadsPath);
                const ext = imgPerfilBase64.split(';')[0].split('/')[1] || 'png';
                const fileName = `perfil_${idCliente}.${ext}`;
                const filePath = `${uploadsPath}/${fileName}`;
                await window.electronAPI.saveFile(filePath, imgPerfilBase64);
                finalPerfil = filePath;
            } else if (id) {
                const prev = db.clientes.find(c => c.id === idCliente);
                finalPerfil = imgPerfilBase64 ? (prev ? prev.foto_perfil : '') : '';
            }

            if (imgCnhBase64 && imgCnhBase64.startsWith('data:')) {
                const userDataPath = await window.electronAPI.getUserDataPath();
                const uploadsPath = `${userDataPath}/uploads`;
                await window.electronAPI.createFolder(uploadsPath);
                const ext = imgCnhBase64.split(';')[0].split('/')[1] || 'png';
                const fileName = `cnh_${idCliente}.${ext}`;
                const filePath = `${uploadsPath}/${fileName}`;
                await window.electronAPI.saveFile(filePath, imgCnhBase64);
                finalCnh = filePath;
            } else if (id) {
                const prev = db.clientes.find(c => c.id === idCliente);
                finalCnh = prev ? prev.img_cnh : '';
            }

            if (imgResBase64 && imgResBase64.startsWith('data:')) {
                const userDataPath = await window.electronAPI.getUserDataPath();
                const uploadsPath = `${userDataPath}/uploads`;
                await window.electronAPI.createFolder(uploadsPath);
                const ext = imgResBase64.split(';')[0].split('/')[1] || 'png';
                const fileName = `residencia_${idCliente}.${ext}`;
                const filePath = `${uploadsPath}/${fileName}`;
                await window.electronAPI.saveFile(filePath, imgResBase64);
                finalRes = filePath;
            } else if (id) {
                const prev = db.clientes.find(c => c.id === idCliente);
                finalRes = prev ? prev.img_residencia : '';
            }

            const dados = {
                id: idCliente,
                codigo: codigoFinal,
                nome: document.getElementById('c-nome').value,
                tipo: selTipo.value,
                cpf_cnpj: document.getElementById('c-cpf-cnpj').value,
                num_cnh: inputNumCnh.value.trim(),
                rg_identidade: inputRgIdentidade.value.trim(),
                wpp: document.getElementById('c-wpp').value,
                email: inputEmail.value.trim(),
                cep: inputCep.value,
                logradouro: inputLogradouro.value,
                numero: inputNumero.value,
                complemento: inputComplemento.value,
                bairro: inputBairro.value,
                cidade: inputCidade.value,
                uf: inputUf.value.toUpperCase(),
                endereco: `${inputLogradouro.value}, ${inputNumero.value} ${inputComplemento.value ? '- ' + inputComplemento.value : ''} - ${inputBairro.value}, ${inputCidade.value}/${inputUf.value.toUpperCase()} - CEP: ${inputCep.value}`,
                ref_nome_1: document.getElementById('c-ref-nome-1').value,
                ref_fone_1: document.getElementById('c-ref-fone-1').value,
                ref_nome_2: document.getElementById('c-ref-nome-2').value,
                ref_fone_2: document.getElementById('c-ref-fone-2').value,
                ref_nome_3: document.getElementById('c-ref-nome-3').value,
                ref_fone_3: document.getElementById('c-ref-fone-3').value,
                foto_perfil: finalPerfil,
                img_cnh: finalCnh,
                img_residencia: finalRes,
                blacklist: checkBlacklist.checked,
                blacklist_motivo: inputMotivoBL.value
            };

            if (id) {
                const index = db.clientes.findIndex(c => c.id === dados.id);
                db.clientes[index] = dados;
            } else {
                db.clientes.push(dados);
            }

            await window.electronAPI.saveData('clientes', db.clientes);
            atualizarTabela();
            toggleModal(false);
            await showAlert('✅ Cliente gravado com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            await showAlert('❌ Erro ao salvar cliente: ' + error.message);
        } finally {
            hideLoading();
        }
    });

    // ===== EVENTOS DE CLIQUE NA TABELA =====
    tbody.addEventListener('click', async (e) => {
        const id = Number(e.target.getAttribute('data-id'));
        if (!id) return;

        if (e.target.classList.contains('btn-deletar')) {
            const temContratoAtivo = db.contratos.some(c => c.cliente_id === id && c.status === 'ativo');
            if (temContratoAtivo) {
                await showAlert("Bloqueado: Este cliente possui um contrato de locação ativo e não pode ser removido.");
                return;
            }
            if (await showConfirm("Deseja apagar este dossiê? Esta ação removerá o histórico permanente.")) {
                db.clientes = db.clientes.filter(c => c.id !== id);
                showLoading('A remover cliente...');
                await window.electronAPI.deleteData('clientes', [id]);
                hideLoading();
                atualizarTabela();
                await showAlert('✅ Cliente removido.');
            }
        }
        
        if (e.target.classList.contains('btn-editar')) {
            const c = db.clientes.find(c => c.id === id);
            document.getElementById('c-id').value = c.id;
            document.getElementById('c-codigo-gerado').value = c.codigo || '';
            document.getElementById('modal-cliente-code').innerText = `Código: ${c.codigo || 'Legado'}`;
            checkBlacklist.checked = c.blacklist || false;
            inputMotivoBL.value = c.blacklist_motivo || '';
            inputMotivoBL.disabled = !(c.blacklist || false);
            document.getElementById('c-nome').value = c.nome;
            selTipo.value = c.tipo || 'PF';
            lblDoc.innerText = selTipo.value === 'PF' ? 'CPF *' : 'CNPJ *';
            document.getElementById('c-cpf-cnpj').value = c.cpf_cnpj;
            if (inputNumCnh) inputNumCnh.value = c.num_cnh || '';
            if (inputRgIdentidade) inputRgIdentidade.value = c.rg_identidade || '';
            document.getElementById('c-wpp').value = c.wpp;
            inputEmail.value = c.email || '';
            inputCep.value = c.cep || '';
            inputLogradouro.value = c.logradouro || (c.endereco ? c.endereco : '');
            inputNumero.value = c.numero || '';
            inputComplemento.value = c.complemento || '';
            inputBairro.value = c.bairro || '';
            inputCidade.value = c.cidade || '';
            inputUf.value = c.uf || '';
            document.getElementById('c-ref-nome-1').value = c.ref_nome_1 || '';
            document.getElementById('c-ref-fone-1').value = c.ref_fone_1 || '';
            document.getElementById('c-ref-nome-2').value = c.ref_nome_2 || '';
            document.getElementById('c-ref-fone-2').value = c.ref_fone_2 || '';
            document.getElementById('c-ref-nome-3').value = c.ref_nome_3 || '';
            document.getElementById('c-ref-fone-3').value = c.ref_fone_3 || '';
            imgCnhBase64 = c.img_cnh || "";
            imgResBase64 = c.img_residencia || "";
            imgPerfilBase64 = c.foto_perfil || "";

            if (imgPerfilBase64) {
                if (imgPerfilBase64.startsWith('data:')) {
                    imgAvatarPreview.src = imgPerfilBase64;
                    imgAvatarPreview.classList.remove('hidden');
                    iconAvatarDefault.classList.add('hidden');
                } else {
                    window.electronAPI.readFile(imgPerfilBase64).then(base64 => {
                        if (base64) {
                            imgAvatarPreview.src = base64;
                            imgAvatarPreview.classList.remove('hidden');
                            iconAvatarDefault.classList.add('hidden');
                        }
                    }).catch(err => console.error(err));
                }
                if (btnRemoverFotoPerfil) btnRemoverFotoPerfil.classList.remove('hidden');
            } else {
                if (imgAvatarPreview) {
                    imgAvatarPreview.src = "";
                    imgAvatarPreview.classList.add('hidden');
                }
                if (iconAvatarDefault) iconAvatarDefault.classList.remove('hidden');
                if (btnRemoverFotoPerfil) btnRemoverFotoPerfil.classList.add('hidden');
            }

            if (imgCnhBase64) boxCnh.classList.remove('hidden');
            if (imgResBase64) boxRes.classList.remove('hidden');
            toggleModal(true);
        }
    });

    // ===== BOTÕES =====
    document.getElementById('btn-novo-cliente').addEventListener('click', () => toggleModal(true));
    document.getElementById('btn-fechar-modal').addEventListener('click', () => toggleModal(false));
    document.getElementById('btn-cancelar').addEventListener('click', () => toggleModal(false));

    // ===== MODAL IMPORTAR POR TEXTO / FORMULÁRIO =====
    const modalImportar = document.getElementById('modal-importar-cliente');
    const modalImportarPanel = document.getElementById('modal-importar-cliente-panel');
    const btnImportarTextoCliente = document.getElementById('btn-importar-texto-cliente');
    const btnFecharModalImportar = document.getElementById('btn-fechar-modal-importar');
    const btnCancelarImportar = document.getElementById('btn-cancelar-importar');
    const btnCopiarModeloWpp = document.getElementById('btn-copiar-modelo-wpp');
    const fileImportarTxt = document.getElementById('file-importar-txt');
    const txtImportarCliente = document.getElementById('txt-importar-cliente');
    const btnProcessarImportacao = document.getElementById('btn-processar-importacao');

    function toggleModalImportar(abrir = true) {
        if (abrir) {
            modalImportar.classList.remove('hidden');
            setTimeout(() => { modalImportar.classList.remove('opacity-0'); modalImportarPanel.classList.remove('scale-95'); }, 10);
        } else {
            modalImportar.classList.add('opacity-0');
            modalImportarPanel.classList.add('scale-95');
            setTimeout(() => {
                modalImportar.classList.add('hidden');
                txtImportarCliente.value = '';
                fileImportarTxt.value = '';
            }, 200);
        }
    }

    if (btnImportarTextoCliente) {
        btnImportarTextoCliente.addEventListener('click', () => toggleModalImportar(true));
    }
    if (btnFecharModalImportar) {
        btnFecharModalImportar.addEventListener('click', () => toggleModalImportar(false));
    }
    if (btnCancelarImportar) {
        btnCancelarImportar.addEventListener('click', () => toggleModalImportar(false));
    }

    // Copiar Modelo Ficha Cadastral para WhatsApp
    if (btnCopiarModeloWpp) {
        btnCopiarModeloWpp.addEventListener('click', async () => {
            const modeloText = `📋 *FICHA DE CADASTRO - VANDO MOTOS & CARROS*
Por favor, preencha os dados abaixo e nos envie de volta:

Nome Completo: 
Tipo (PF ou PJ): PF
CPF ou CNPJ: 
RG / Identidade: 
Nº da CNH: 
WhatsApp: 
E-mail: 

--- ENDEREÇO ---
CEP: 
Logradouro (Rua/Av): 
Número: 
Complemento: 
Bairro: 
Cidade: 
Estado (UF): 

--- 3 REFERÊNCIAS PESSOAIS ---
Referência 1 (Nome): 
Referência 1 (Telefone): 
Referência 2 (Nome): 
Referência 2 (Telefone): 
Referência 3 (Nome): 
Referência 3 (Telefone): `;
            try {
                await navigator.clipboard.writeText(modeloText);
                await showAlert("Modelo de Ficha Cadastral copiado para a área de transferência com sucesso! Cole no WhatsApp do cliente.");
            } catch {
                await showAlert("Ficha de Cadastro:\n\n" + modeloText);
            }
        });
    }

    // Carregar arquivo de texto
    if (fileImportarTxt) {
        fileImportarTxt.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                txtImportarCliente.value = evt.target.result || '';
            };
            reader.readAsText(file);
        });
    }

    // Processar e preencher cadastro
    if (btnProcessarImportacao) {
        btnProcessarImportacao.addEventListener('click', async () => {
            const rawText = txtImportarCliente.value;
            if (!rawText || !rawText.trim()) {
                await showAlert("Por favor, cole ou carregue o formulário do cliente para continuar.");
                return;
            }

            const dadosExtraid = parseTextoCliente(rawText);

            // Verificar se ao menos algum dado importante foi extraído
            const temDados = dadosExtraid.nome || dadosExtraid.cpf_cnpj || dadosExtraid.whatsapp || dadosExtraid.cep;
            if (!temDados) {
                await showAlert("Não foi possível identificar campos do formulário no texto fornecido. Verifique o conteúdo e tente novamente.");
                return;
            }

            // Abrir modal de cadastro zerado e preencher
            toggleModalImportar(false);
            toggleModal(true);

            if (dadosExtraid.nome) document.getElementById('c-nome').value = dadosExtraid.nome;
            if (dadosExtraid.tipo) {
                selTipo.value = dadosExtraid.tipo;
                selTipo.dispatchEvent(new Event('change'));
            }
            if (dadosExtraid.cpf_cnpj) {
                const elDoc = document.getElementById('c-cpf-cnpj');
                elDoc.value = dadosExtraid.cpf_cnpj;
                elDoc.dispatchEvent(new Event('input'));
            }
            if (dadosExtraid.rg_identidade && inputRgIdentidade) inputRgIdentidade.value = dadosExtraid.rg_identidade;
            if (dadosExtraid.num_cnh && inputNumCnh) inputNumCnh.value = dadosExtraid.num_cnh;
            if (dadosExtraid.whatsapp) {
                const elWpp = document.getElementById('c-wpp');
                elWpp.value = dadosExtraid.whatsapp;
                elWpp.dispatchEvent(new Event('input'));
            }
            if (dadosExtraid.email && inputEmail) inputEmail.value = dadosExtraid.email;
            
            // Endereço
            if (dadosExtraid.cep && inputCep) {
                inputCep.value = dadosExtraid.cep;
                inputCep.dispatchEvent(new Event('input'));
            }
            if (dadosExtraid.logradouro && inputLogradouro) inputLogradouro.value = dadosExtraid.logradouro;
            if (dadosExtraid.numero && inputNumero) inputNumero.value = dadosExtraid.numero;
            if (dadosExtraid.complemento && inputComplemento) inputComplemento.value = dadosExtraid.complemento;
            if (dadosExtraid.bairro && inputBairro) inputBairro.value = dadosExtraid.bairro;
            if (dadosExtraid.cidade && inputCidade) inputCidade.value = dadosExtraid.cidade;
            if (dadosExtraid.uf && inputUf) inputUf.value = dadosExtraid.uf;

            // Se tem CEP mas falta logradouro/bairro, dispara busca de CEP
            if (dadosExtraid.cep && (!dadosExtraid.logradouro || !dadosExtraid.bairro || !dadosExtraid.cidade)) {
                inputCep.dispatchEvent(new Event('blur'));
            }

            // Referências
            if (dadosExtraid.ref_nome_1) document.getElementById('c-ref-nome-1').value = dadosExtraid.ref_nome_1;
            if (dadosExtraid.ref_fone_1) {
                const elRef1 = document.getElementById('c-ref-fone-1');
                elRef1.value = dadosExtraid.ref_fone_1;
                elRef1.dispatchEvent(new Event('input'));
            }
            if (dadosExtraid.ref_nome_2) document.getElementById('c-ref-nome-2').value = dadosExtraid.ref_nome_2;
            if (dadosExtraid.ref_fone_2) {
                const elRef2 = document.getElementById('c-ref-fone-2');
                elRef2.value = dadosExtraid.ref_fone_2;
                elRef2.dispatchEvent(new Event('input'));
            }
            if (dadosExtraid.ref_nome_3) document.getElementById('c-ref-nome-3').value = dadosExtraid.ref_nome_3;
            if (dadosExtraid.ref_fone_3) {
                const elRef3 = document.getElementById('c-ref-fone-3');
                elRef3.value = dadosExtraid.ref_fone_3;
                elRef3.dispatchEvent(new Event('input'));
            }

            await showAlert("Formulário lido e dados preenchidos no cadastro com sucesso! Revise os campos e clique em 'Gravar Dossiê Completo' para finalizar.");
        });
    }

    btnFiltroTodos.addEventListener('click', () => {
        filtroAtual = 'todos';
        paginaAtual = 1;
        btnFiltroTodos.className = "px-4 py-2 text-xs font-black uppercase tracking-widest border-b-2 border-brand-dark text-brand-dark transition-colors";
        btnFiltroBlacklist.className = "px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 border-transparent text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1";
        atualizarTabela();
    });

    btnFiltroBlacklist.addEventListener('click', () => {
        filtroAtual = 'blacklist';
        paginaAtual = 1;
        btnFiltroBlacklist.className = "px-4 py-2 text-xs font-black uppercase tracking-widest border-b-2 border-red-600 text-red-600 transition-colors flex items-center gap-1";
        btnFiltroTodos.className = "px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 border-transparent text-gray-500 hover:text-brand-dark transition-colors";
        atualizarTabela();
    });

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

        applyMask(document.getElementById('c-wpp'));
        applyMask(document.getElementById('c-ref-fone-1'));
        applyMask(document.getElementById('c-ref-fone-2'));
        applyMask(document.getElementById('c-ref-fone-3'));
    }
    setupPhoneMasks();

    atualizarTabela();

    // ===== EXPORTAR CSV =====
    document.getElementById('btn-export-csv-clientes').addEventListener('click', () => {
        const data = db.clientes.map(c => ({
            ID: c.id,
            Código: c.codigo,
            Nome: c.nome,
            Tipo: c.tipo,
            CPF_CNPJ: c.cpf_cnpj,
            WhatsApp: c.wpp,
            Email: c.email || '',
            Cidade: c.cidade,
            Estado: c.uf,
            Blacklist: c.blacklist ? 'SIM' : 'NÃO'
        }));
        exportCSV(data, 'clientes');
    });
}
