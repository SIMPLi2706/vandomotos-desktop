import { db, utils } from './db.js';
import { exportCSV } from './csvUtils.js';
import { renderClientes } from './clientes.js';
import { renderVeiculos } from './veiculos.js';
import { renderContratos } from './contratos.js';
import { renderFinanceiro } from './financeiro.js';
import { renderRelatorios } from './relatorios.js';
import { renderUsuarios } from './usuarios.js';
import { setUser, getUser, clearUser } from './session.js';
import { showAlert, showConfirm } from './modal.js';
import { showLoading, hideLoading } from './loading.js';

// Elementos
const loginScreen = document.getElementById('login-screen');
const formLogin = document.getElementById('form-login');
const loginErro = document.getElementById('login-erro');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const btnBackup = document.getElementById('btn-backup');

const menuContainer = document.getElementById('main-menu');
const pageTitle = document.getElementById('page-title');
const appContent = document.getElementById('app-content');

const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const btnMenuMobile = document.getElementById('btn-menu-mobile');

let currentUser = null;
let currentUserLevel = 'atendente';

window.enviarMensagemWhatsapp = function(telefone, texto) {
    const fone = telefone.replace(/\D/g, '');
    const url = `https://web.whatsapp.com/send?phone=55${fone}&text=${encodeURIComponent(texto)}`;
    
    const webview = document.getElementById('whatsapp-webview');
    if (webview) {
        let navigated = false;
        try {
            const currentUrl = webview.getURL();
            if (currentUrl && currentUrl.startsWith('https://web.whatsapp.com')) {
                const code = `
                    (function() {
                        const link = document.createElement('a');
                        link.href = '/send?phone=55${fone}&text=${encodeURIComponent(texto)}';
                        document.body.appendChild(link);
                        const clickEvent = new MouseEvent('click', {
                            view: window,
                            bubbles: true,
                            cancelable: true
                        });
                        link.dispatchEvent(clickEvent);
                        link.remove();
                    })();
                `;
                webview.executeJavaScript(code).catch(err => {
                    console.error("Erro ao injetar clique do WhatsApp:", err);
                    webview.src = url;
                });
                navigated = true;
            }
        } catch (e) {
            console.error("Erro ao obter URL do webview:", e);
        }
        if (!navigated) {
            webview.src = url;
        }
    } else {
        window.whatsappPendingUrl = url;
    }
    navigateTo('whatsapp');
};

const menuItems = [
    { id: 'dashboard', icon: 'ph-squares-four', title: 'Visão Geral', nivel: ['admin', 'gerente', 'atendente'] },
    { id: 'clientes', icon: 'ph-users', title: 'Clientes', nivel: ['admin', 'gerente', 'atendente'] },
    { id: 'veiculos', icon: 'ph-motorcycle', title: 'Frota', nivel: ['admin', 'gerente', 'atendente'] },
    { id: 'contratos', icon: 'ph-handshake', title: 'Locações', nivel: ['admin', 'gerente', 'atendente'] },
    { id: 'whatsapp', icon: 'ph-whatsapp-logo', title: 'WhatsApp Web', nivel: ['admin', 'gerente', 'atendente'] },
    { id: 'financeiro', icon: 'ph-wallet', title: 'Caixa', nivel: ['admin', 'gerente'] },
    { id: 'relatorios', icon: 'ph-chart-bar', title: 'Relatórios', nivel: ['admin', 'gerente'] },
    { id: 'usuarios', icon: 'ph-users-three', title: 'Usuários', nivel: ['admin'] }
];

window.addEventListener('error', function(event) {
    if(loginErro) {
        loginErro.classList.remove('hidden');
        loginErro.innerHTML = `Erro:<br><span class="text-white text-[10px] lowercase">${event.message}</span>`;
    }
});

// Mobile
function toggleMobileMenu(forceClose = false) {
    if (forceClose || !sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('opacity-0');
        setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
    } else {
        sidebarOverlay.classList.remove('hidden');
        setTimeout(() => sidebarOverlay.classList.remove('opacity-0'), 10);
        sidebar.classList.remove('-translate-x-full');
    }
}

if(btnMenuMobile) btnMenuMobile.addEventListener('click', () => toggleMobileMenu());
if(sidebarOverlay) sidebarOverlay.addEventListener('click', () => toggleMobileMenu(true));

// ===== LOGIN =====
async function setupLoginForm() {
    const stepProfiles = document.getElementById('login-step-profiles');
    const stepPassword = document.getElementById('login-step-password');
    const profilesList = document.getElementById('login-profiles-list');
    const btnLoginOutro = document.getElementById('btn-login-outro');
    const btnVoltarPerfis = document.getElementById('btn-voltar-perfis');
    const usernameContainer = document.getElementById('login-username-container');
    const selectedUserContainer = document.getElementById('selected-user-container');
    const selectedUserAvatar = document.getElementById('selected-user-avatar');
    const selectedUserName = document.getElementById('selected-user-name');
    const selectedUserRole = document.getElementById('selected-user-role');
    const inputUsername = document.getElementById('login-username');
    const inputSenha = document.getElementById('login-senha');

    // Carregar usuários
    try {
        const users = await window.electronAPI.getLoginUsers();
        profilesList.innerHTML = '';
        users.forEach(u => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'bg-gray-900 border border-gray-850 p-4 flex flex-col items-center gap-2 hover:border-brand-main hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer text-center';
            card.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-brand-main/10 text-brand-main border border-brand-main/20 flex items-center justify-center font-black text-sm uppercase">
                    ${u.nome.slice(0, 2)}
                </div>
                <div>
                    <h4 class="text-white text-[11px] font-bold uppercase block truncate max-w-[120px]">${u.nome}</h4>
                    <span class="text-[8px] font-bold uppercase text-gray-500 tracking-wider block">${u.nivel === 'admin' ? 'Administrador' : u.nivel === 'gerente' ? 'Gerente' : 'Atendente'}</span>
                </div>
            `;
            card.addEventListener('click', () => {
                inputUsername.value = u.username;
                selectedUserName.innerText = u.nome;
                selectedUserRole.innerText = u.nivel === 'admin' ? 'Administrador' : u.nivel === 'gerente' ? 'Gerente' : 'Atendente';
                selectedUserAvatar.innerText = u.nome.slice(0, 2);
                
                usernameContainer.classList.add('hidden');
                inputUsername.required = false;
                selectedUserContainer.classList.remove('hidden');
                
                inputSenha.value = '';
                loginErro.classList.add('hidden');
                
                stepProfiles.classList.add('hidden');
                stepPassword.classList.remove('hidden');
                setTimeout(() => inputSenha.focus(), 150);
            });
            profilesList.appendChild(card);
        });
    } catch (err) {
        console.error('Erro ao carregar perfis de login:', err);
        profilesList.innerHTML = `
            <div class="col-span-2 text-center bg-red-950/40 border border-red-900 p-3 rounded">
                <p class="text-red-500 text-xs font-bold uppercase tracking-wider mb-1"><i class="ph ph-warning-circle"></i> Erro de Conexão</p>
                <p class="text-gray-400 text-[10px] font-mono leading-relaxed truncate max-w-full" title="${err.message}">${err.message}</p>
            </div>
        `;
    }

    btnLoginOutro.addEventListener('click', () => {
        inputUsername.value = '';
        usernameContainer.classList.remove('hidden');
        inputUsername.required = true;
        selectedUserContainer.classList.add('hidden');
        
        inputSenha.value = '';
        loginErro.classList.add('hidden');
        
        stepProfiles.classList.add('hidden');
        stepPassword.classList.remove('hidden');
        setTimeout(() => inputUsername.focus(), 150);
    });

    btnVoltarPerfis.addEventListener('click', () => {
        stepPassword.classList.add('hidden');
        stepProfiles.classList.remove('hidden');
        inputUsername.value = '';
        inputSenha.value = '';
    });

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = inputUsername.value.trim();
        const senha = inputSenha.value.trim();

        btnLogin.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> A Validar...';
        loginErro.classList.add('hidden');

        try {
            const data = await window.electronAPI.login(username, senha);
            currentUser = data.user;
            currentUserLevel = data.user.nivel;
            setUser(currentUser);
            await iniciarSistema();
        } catch (error) {
            console.error('❌ Erro no login:', error);
            loginErro.classList.remove('hidden');
            loginErro.innerHTML = `Erro: ${error.message}`;
            btnLogin.innerHTML = '<i class="ph-bold ph-lock-key text-lg"></i> Entrar';
        }
    });
}

// ===== INICIALIZAÇÃO =====
async function iniciarSistema() {
    try {
        loginScreen.classList.add('opacity-0');
        setTimeout(() => loginScreen.classList.add('hidden'), 500);

        showLoading('A carregar dados...');
        const data = await window.electronAPI.loadData();
        Object.assign(db, data);
        hideLoading();

        console.log('✅ Dados carregados:', { clientes: db.clientes.length, veiculos: db.veiculos.length });

        const roleLabel = document.getElementById('user-role-label');
        if(roleLabel) roleLabel.innerText = `${currentUser.nivel.toUpperCase()} - ${currentUser.nome}`;
        
        document.getElementById('current-date').innerHTML = `<span class="text-emerald-600">${new Date().toLocaleDateString('pt-BR')}</span>`;
        
        pageTitle.innerText = "A Carregar...";
        
        btnLogout.addEventListener('click', async () => {
            if(await showConfirm("Deseja trancar o sistema e encerrar a sessão?")) {
                await window.electronAPI.logout();
                clearUser();
                window.location.reload();
            }
        });

        btnBackup.addEventListener('click', async () => {
            showLoading('A criar backup...');
            try {
                const result = await window.electronAPI.backup();
                if (result.success) {
                    await showAlert(`✅ Backup realizado com sucesso!\nArquivo: ${result.path}`);
                } else {
                    await showAlert('❌ Falha ao criar backup: ' + (result.error || ''));
                }
            } finally {
                hideLoading();
            }
        });

        buildMenu();
        navigateTo('dashboard');
    } catch (err) {
        console.error('❌ Erro ao iniciar sistema:', err);
        hideLoading();
        loginScreen.classList.remove('opacity-0');
        loginScreen.classList.remove('hidden');
        loginErro.classList.remove('hidden');
        loginErro.innerHTML = `Erro ao carregar dados: ${err.message}`;
        btnLogin.innerHTML = '<i class="ph-bold ph-lock-key text-lg"></i> Tentar novamente';
    }
}

function buildMenu() {
    menuContainer.innerHTML = '';
    const allowedItems = menuItems.filter(item => item.nivel.includes(currentUserLevel));

    allowedItems.forEach(item => {
        const btn = document.createElement('button');
        btn.className = `w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold mb-1.5 nav-btn border-l-4 border-transparent text-gray-400 hover:bg-gray-900 hover:text-white transition-all`;
        btn.dataset.id = item.id;
        btn.innerHTML = `<i class="ph ${item.icon} text-xl"></i> ${item.title}`;
        btn.onclick = () => navigateTo(item.id);
        menuContainer.appendChild(btn);
    });
}

async function navigateTo(viewId, forceRefresh = false) {
    if (forceRefresh) {
        try {
            const freshData = await window.electronAPI.loadData();
            Object.assign(db, freshData);
        } catch (e) {
            console.error("Erro ao sincronizar banco:", e);
        }
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-brand-dark', 'text-brand-main', 'border-brand-main');
        btn.classList.add('text-gray-400', 'border-transparent');
        if (btn.dataset.id === viewId) {
            btn.classList.remove('text-gray-400', 'border-transparent');
            btn.classList.add('bg-brand-dark', 'text-brand-main', 'border-brand-main');
        }
    });

    const currentView = menuItems.find(i => i.id === viewId);
    if(currentView) pageTitle.innerText = currentView.title;
    
    const wppPersistent = document.getElementById('whatsapp-persistent-container');
    const webview = document.getElementById('whatsapp-webview');

    if (viewId === 'whatsapp') {
        appContent.classList.add('hidden');
        wppPersistent.classList.remove('hidden');
        wppPersistent.classList.add('flex');
        
        if (webview && (!webview.src || webview.src === 'about:blank' || webview.src === '')) {
            webview.src = window.whatsappPendingUrl || 'https://web.whatsapp.com/';
            window.whatsappPendingUrl = null;
        } else if (webview && window.whatsappPendingUrl) {
            webview.src = window.whatsappPendingUrl;
            window.whatsappPendingUrl = null;
        }
    } else {
        wppPersistent.classList.add('hidden');
        wppPersistent.classList.remove('flex');
        appContent.classList.remove('hidden');
        renderView(viewId);
    }
    toggleMobileMenu(true);
}

// ===== RENDER VIEWS =====
function renderView(viewId) {
    appContent.innerHTML = ''; 
    const wrapper = document.createElement('div');
    wrapper.className = 'fade-enter h-full flex flex-col';

    if (viewId === 'dashboard') {
        const totalClientes = db.clientes.length;
        const totalVeiculos = db.veiculos.length;
        const totalMotos = db.veiculos.filter(v => v.categoria !== 'carro').length;
        const totalCarros = db.veiculos.filter(v => v.categoria === 'carro').length;
        const locacoesAtivas = db.contratos.filter(c => c.status === 'ativo').length;
        const receitaTotal = db.financeiro.filter(f => f.tipo === 'entrada').reduce((acc, curr) => acc + Number(curr.valor), 0);
        const despesaTotal = db.financeiro.filter(f => f.tipo === 'saida').reduce((acc, curr) => acc + Number(curr.valor), 0);
        const veiculosOficina = db.veiculos.filter(v => v.status === 'manutencao').length;
        const veiculosLivres = totalVeiculos - locacoesAtivas - veiculosOficina;

        wrapper.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
                <div class="bg-white p-4 md:p-6 border border-gray-200 shadow-soft flex flex-col justify-between">
                    <p class="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><i class="ph ph-users text-lg"></i> Clientes</p>
                    <h3 class="text-2xl md:text-4xl font-black text-brand-dark">${totalClientes}</h3>
                </div>
                <div class="bg-white p-4 md:p-6 border border-gray-200 shadow-soft flex flex-col justify-between">
                    <p class="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><i class="ph ph-car text-lg"></i> Total Frota</p>
                    <div class="flex items-baseline justify-between">
                        <h3 class="text-2xl md:text-4xl font-black text-brand-dark">${totalVeiculos}</h3>
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            🏍️ ${totalMotos} | 🚗 ${totalCarros}
                        </span>
                    </div>
                </div>
                <div class="bg-white p-4 md:p-6 border border-gray-200 shadow-soft flex flex-col justify-between border-t-4 border-t-blue-500">
                    <p class="text-[10px] md:text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2"><i class="ph ph-handshake text-lg"></i> Locações</p>
                    <h3 class="text-2xl md:text-4xl font-black text-blue-600">${locacoesAtivas}</h3>
                </div>
                <div class="bg-brand-dark p-4 md:p-6 border border-brand-dark shadow-hard flex flex-col justify-between relative overflow-hidden group">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-brand-main/5 transform rotate-45 translate-x-10 -translate-y-10"></div>
                    <p class="text-[10px] md:text-xs font-bold text-brand-main uppercase tracking-widest mb-2 relative z-10 flex items-center gap-2"><i class="ph ph-wallet text-lg"></i> Receita Bruta</p>
                    <h3 class="text-xl md:text-3xl font-black text-white relative z-10 mt-1">${utils.formatMoney(receitaTotal)}</h3>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 flex-1">
                <div class="bg-white border border-gray-200 p-4 shadow-soft flex flex-col min-h-[300px]">
                    <h4 class="text-[10px] md:text-xs font-black text-gray-800 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">Status da Frota</h4>
                    <div class="relative flex-1 w-full flex items-center justify-center">
                        <canvas id="chart-frota"></canvas>
                    </div>
                </div>
                <div class="bg-white border border-gray-200 p-4 shadow-soft flex flex-col min-h-[300px]">
                    <h4 class="text-[10px] md:text-xs font-black text-gray-800 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">Balanço Global</h4>
                    <div class="relative flex-1 w-full flex items-center justify-center">
                        <canvas id="chart-financas"></canvas>
                    </div>
                </div>
                <div class="bg-white border border-gray-200 p-4 shadow-soft flex flex-col min-h-[300px]">
                    <h4 class="text-[10px] md:text-xs font-black text-red-600 uppercase tracking-widest mb-4 border-b border-red-100 pb-2 flex items-center gap-2">
                        <i class="ph-fill ph-warning-circle text-lg"></i> Alertas
                    </h4>
                    <div id="radar-alertas" class="space-y-2 overflow-y-auto custom-scroll flex-1 pr-2"></div>
                </div>
            </div>
        `;
        appContent.appendChild(wrapper);

        setTimeout(() => {
            const ctxFrota = document.getElementById('chart-frota');
            if(ctxFrota) {
                new Chart(ctxFrota, {
                    type: 'doughnut',
                    data: {
                        labels: ['Livre', 'Locada', 'Oficina'],
                        datasets: [{
                            data: [veiculosLivres, locacoesAtivas, veiculosOficina],
                            backgroundColor: ['#10b981', '#3b82f6', '#f97316'],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10, family: 'Inter' } } } } }
                });
            }

            const ctxFin = document.getElementById('chart-financas');
            if(ctxFin) {
                new Chart(ctxFin, {
                    type: 'bar',
                    data: {
                        labels: ['Fluxo'],
                        datasets: [
                            { label: 'Entradas', data: [receitaTotal], backgroundColor: '#10b981', borderRadius: 4 },
                            { label: 'Saídas', data: [despesaTotal], backgroundColor: '#ef4444', borderRadius: 4 }
                        ]
                    },
                    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, display: false } }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10, family: 'Inter' } } } } }
                });
            }

            const radar = document.getElementById('radar-alertas');
            let alertasHTML = '';
            db.veiculos.forEach(v => {
                const kmAt = Number(v.km_atual) || 0;
                const kmOl = Number(v.km_oleo) || 0;
                if(kmOl > 0 && kmAt >= kmOl) {
                    alertasHTML += `<div class="bg-orange-50 text-orange-700 p-2 border border-orange-200 text-[10px] font-bold shadow-sm rounded-sm"><div class="uppercase tracking-widest text-orange-500 mb-0.5">Óleo Vencido</div><div class="text-xs">Moto <span class="font-mono text-black">${v.placa}</span> passou do limite (${kmOl}km).</div></div>`;
                }
                if(v.doc) {
                    const docDate = new Date(v.doc);
                    docDate.setMinutes(docDate.getMinutes() + docDate.getTimezoneOffset());
                    docDate.setHours(0,0,0,0);
                    const hoje = new Date();
                    hoje.setHours(0,0,0,0);
                    if(docDate <= hoje) {
                         alertasHTML += `<div class="bg-red-50 text-red-700 p-2 border border-red-200 text-[10px] font-bold shadow-sm rounded-sm"><div class="uppercase tracking-widest text-red-500 mb-0.5">Documento Vencido</div><div class="text-xs">CRLV da <span class="font-mono text-black">${v.placa}</span> encontra-se expirado.</div></div>`;
                    }
                }
            });
            // Mapeamento O(1) para evitar loop N*M lento
            const clientesMap = {};
            db.clientes.forEach(cli => {
                clientesMap[cli.id] = cli;
            });
            const veiculosMap = {};
            db.veiculos.forEach(vei => {
                veiculosMap[vei.id] = vei;
            });

            db.contratos.filter(c => c.status === 'ativo').forEach(c => {
                 const dataVenc = new Date(c.vencimento || c.data_fim);
                 const hoje = new Date();
                 hoje.setHours(0,0,0,0);
                 if(dataVenc < hoje) {
                     const cli = clientesMap[c.cliente_id] || {nome: 'Desconhecido', wpp: ''};
                     const vei = veiculosMap[c.veiculo_id] || {modelo: 'Veículo', placa: '--', categoria: 'moto'};
                     const atrasoDias = Math.floor((hoje - dataVenc) / (1000 * 60 * 60 * 24));
                     const isFidelidadeAtraso = c.tipo_plano === 'fidelidade';
                     const isAquisicaoAtraso = c.tipo_plano === 'aquisicao';
                     const valorPendente = isFidelidadeAtraso
                         ? (Number(c.valor_semanal) || (Number(c.valor) > 1000 ? Number(c.valor) / 12 : Number(c.valor)) || 350)
                         : (isAquisicaoAtraso
                             ? (Number(c.valor_semanal) || Number(c.valor_parcela) || 375)
                             : Number(c.valor_parcela || c.valor || 0));
                     const isCarroAtraso = vei.categoria === 'carro';
                     const tipoStrAtraso = isCarroAtraso ? 'do carro' : 'da moto';
                     const emojiAtraso = isCarroAtraso ? '🚗' : '🏍️';
                     
                     const textoCobranca = isAquisicaoAtraso
                         ? `Olá *${cli.nome.trim()}*, tudo bem? 👋\n\nConsta em nosso sistema uma parcela semanal de *${utils.formatMoney(valorPendente)}* em atraso (vencida em *${utils.formatDate(dataVenc.toISOString())}* - ${atrasoDias} dias de atraso) referente ao Contrato de Aquisição ${tipoStrAtraso} (Placa: *${vei.placa}*).\n\nPoderia nos enviar o comprovante Pix por aqui assim que possível para manter seu contrato regularizado? Obrigado! ${emojiAtraso}`
                         : `Olá *${cli.nome.trim()}*, tudo bem? 👋\n\nConsta em nosso sistema uma semanalidade de *${utils.formatMoney(valorPendente)}* em atraso (vencida em *${utils.formatDate(dataVenc.toISOString())}* - ${atrasoDias} dias de atraso) referente à locação ${tipoStrAtraso} (Placa: *${vei.placa}*).\n\nPoderia nos enviar o comprovante Pix por aqui assim que possível? Obrigado! ${emojiAtraso}`;
                     const fone = (cli.wpp || '').replace(/\D/g, '');
                     
                     alertasHTML += `
                         <div class="bg-red-50 text-red-700 p-2.5 border border-red-200 text-[10px] font-bold shadow-sm rounded-sm flex flex-col gap-2">
                             <div>
                                 <div class="uppercase tracking-widest text-red-500 mb-0.5">${isAquisicaoAtraso ? 'Parcela Aquisição Atrasada' : 'Semanalidade Atrasada'} (${atrasoDias} dias)</div>
                                 <div class="text-xs">Cliente <span class="text-black font-extrabold">${cli.nome}</span> pendente.</div>
                                 <div class="text-[9px] text-gray-500 font-mono mt-0.5">Venc: ${utils.formatDate(dataVenc.toISOString())} | Valor: ${utils.formatMoney(valorPendente)}</div>
                             </div>
                             ${fone.length >= 10 ? `
                                 <button type="button" class="btn-cobrar-dashboard bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-1.5 uppercase tracking-wide rounded-sm text-[9px] w-full flex items-center justify-center gap-1 transition shadow-sm" data-fone="${fone}" data-texto="${encodeURIComponent(textoCobranca)}">
                                     <i class="ph-bold ph-whatsapp-logo text-xs"></i> Cobrar via WhatsApp
                                 </button>
                             ` : ''}
                         </div>
                     `;
                 }
            });
            if(alertasHTML === '') {
                radar.innerHTML = '<div class="text-gray-400 text-[10px] font-bold uppercase tracking-widest p-6 text-center border border-gray-200 border-dashed bg-gray-50 flex flex-col items-center gap-2"><i class="ph-fill ph-shield-check text-3xl text-emerald-300"></i> Sem pendências.</div>';
            } else {
                radar.innerHTML = alertasHTML;
            }

            // Registrar click nos botões de cobrança do dashboard
            radar.addEventListener('click', (e) => {
                const btnCobrar = e.target.closest('.btn-cobrar-dashboard');
                if (btnCobrar) {
                    const fone = btnCobrar.getAttribute('data-fone');
                    const texto = decodeURIComponent(btnCobrar.getAttribute('data-texto'));
                    if (window.enviarMensagemWhatsapp) {
                        window.enviarMensagemWhatsapp(fone, texto);
                    } else {
                        window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(texto)}`, '_blank');
                    }
                }
            });
        }, 150);

    } else if (viewId === 'clientes') {
        appContent.appendChild(wrapper);
        renderClientes(wrapper); 
    } else if (viewId === 'veiculos') {
        appContent.appendChild(wrapper);
        renderVeiculos(wrapper); 
    } else if (viewId === 'contratos') {
        appContent.appendChild(wrapper);
        renderContratos(wrapper); 
    } else if (viewId === 'financeiro') {
        appContent.appendChild(wrapper);
        renderFinanceiro(wrapper); 
    } else if (viewId === 'relatorios') {
        appContent.appendChild(wrapper);
        renderRelatorios(wrapper); 
    } else if (viewId === 'usuarios') {
        appContent.appendChild(wrapper);
        renderUsuarios(wrapper); 
    }
}

setupLoginForm();
