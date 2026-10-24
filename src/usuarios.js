import { showAlert, showConfirm } from './modal.js';
import { showLoading, hideLoading } from './loading.js';
import { showPrompt } from './promptModal.js';
import { getUser } from './session.js';

export function renderUsuarios(container) {
    container.innerHTML = `
        <div class="fade-enter">
            <h2 class="text-lg font-black mb-4">👥 Gerenciar Usuários</h2>
            <div class="bg-white p-4 border shadow-soft mb-4">
                <table class="w-full text-left whitespace-nowrap text-sm">
                    <thead>
                        <tr class="border-b">
                            <th class="py-2">Usuário</th>
                            <th>Nome</th>
                            <th>CPF</th>
                            <th>Nível</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tb-usuarios"></tbody>
                </table>
            </div>
            <button id="btn-novo-usuario" class="bg-brand-dark text-brand-main px-4 py-2 font-bold shadow-hard">+ Novo Usuário</button>
        </div>
    `;
    carregarUsuarios();

    document.getElementById('btn-novo-usuario').addEventListener('click', async () => {
        try {
            const username = await showPrompt('Usuário (login):');
            if (!username) return;
            const nome = await showPrompt('Nome completo:');
            if (!nome) return;
            const cpf = await showPrompt('CPF do Usuário (Ex: 000.000.000-00):');
            if (!cpf) return;
            const senha = await showPrompt('Senha:');
            if (!senha) return;
            const nivel = await showPrompt('Nível (admin, gerente, atendente):') || 'atendente';
            if (!['admin', 'gerente', 'atendente'].includes(nivel)) {
                await showAlert('Nível inválido. Use admin, gerente ou atendente.');
                return;
            }
            const usuario = {
                id: Date.now(),
                username,
                nome,
                cpf,
                senha,
                nivel
            };
            showLoading('Salvando usuário...');
            try {
                await window.electronAPI.saveUser(usuario);
                await carregarUsuarios();
                await showAlert('Usuário criado com sucesso!');
            } catch (error) {
                await showAlert('Erro: ' + error.message);
            } finally {
                hideLoading();
            }
        } catch (error) {
            // Usuário cancelou o prompt
            console.log('Operação cancelada.');
        }
    });
}

async function carregarUsuarios() {
    try {
        const users = await window.electronAPI.getUsers();
        const tbody = document.getElementById('tb-usuarios');
        if (!tbody) return;
        tbody.innerHTML = users.map(u => `
            <tr class="border-b hover:bg-gray-50">
                <td class="py-2 font-bold">${u.username}</td>
                <td>${u.nome}</td>
                <td class="font-mono text-xs">${u.cpf || '---'}</td>
                <td><span class="px-2 py-1 text-xs font-bold ${u.nivel === 'admin' ? 'bg-red-100 text-red-700' : u.nivel === 'gerente' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}">${u.nivel.toUpperCase()}</span></td>
                <td>
                    ${(u.username !== 'admin' && u.username !== 'vando') ? `
                        <button class="btn-reset-senha text-blue-500 hover:underline mr-2" data-id="${u.id}">Redefinir Senha</button>
                        <button class="btn-del-user text-red-500 hover:underline" data-id="${u.id}">Remover</button>
                    ` : '<span class="text-gray-400 text-xs">(admin padrão)</span>'}
                </td>
            </tr>
        `).join('');

        // Resetar senha
        document.querySelectorAll('.btn-reset-senha').forEach(btn => {
            btn.addEventListener('click', async () => {
                const novaSenha = await showPrompt('Digite a nova senha para o usuário:');
                if (novaSenha && novaSenha.length >= 4) {
                    showLoading('Atualizando senha...');
                    try {
                        const users = await window.electronAPI.getUsers();
                        const user = users.find(u => u.id === Number(btn.dataset.id));
                        if (user) {
                            user.senha = novaSenha;
                            await window.electronAPI.saveUser(user);
                            await showAlert('Senha atualizada com sucesso!');
                            carregarUsuarios();
                        }
                    } catch (error) {
                        await showAlert('Erro: ' + error.message);
                    } finally {
                        hideLoading();
                    }
                } else if (novaSenha !== null) {
                    await showAlert('A senha deve ter pelo menos 4 caracteres.');
                }
            });
        });

        // Remover usuário
        document.querySelectorAll('.btn-del-user').forEach(btn => {
            btn.addEventListener('click', async () => {
                const userId = Number(btn.dataset.id);
                try {
                    const users = await window.electronAPI.getUsers();
                    const targetUser = users.find(u => u.id === userId);
                    const currentUser = getUser();
                    
                    if (currentUser && targetUser && currentUser.username === targetUser.username) {
                        await showAlert('❌ Bloqueado: Você não pode remover o seu próprio usuário enquanto estiver logado.');
                        return;
                    }
                    
                    const confirmado = await showConfirm('Deseja realmente remover este usuário?');
                    if (confirmado) {
                        showLoading('Removendo...');
                        try {
                            await window.electronAPI.deleteUser(userId);
                            await carregarUsuarios();
                        } catch (error) {
                            await showAlert('Erro: ' + error.message);
                        } finally {
                            hideLoading();
                        }
                    }
                } catch (error) {
                    await showAlert('Erro ao verificar usuário: ' + error.message);
                }
            });
        });
    } catch (error) {
        await showAlert('Erro ao carregar usuários: ' + error.message);
    }
}
