// src/promptModal.js
export function showPrompt(message, defaultValue = '') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[200]';
        overlay.innerHTML = `
            <div class="bg-white p-6 max-w-md w-full border border-gray-900 shadow-hard">
                <p class="text-sm text-gray-800 mb-3 font-bold">${message}</p>
                <input type="text" id="prompt-input" value="${defaultValue}" class="w-full px-3 py-2 border border-gray-300 text-sm focus:border-brand-main outline-none mb-4">
                <div class="flex gap-3 justify-end">
                    <button class="btn-cancel bg-white border border-gray-300 px-4 py-2 font-bold hover:bg-gray-50 transition">Cancelar</button>
                    <button class="btn-confirm bg-brand-dark text-brand-main px-4 py-2 font-bold hover:bg-black shadow-hard transition">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const input = overlay.querySelector('#prompt-input');
        input.focus();
        input.select();

        function cleanup() {
            overlay.remove();
        }

        function resolveValue(value) {
            cleanup();
            resolve(value);
        }

        overlay.querySelector('.btn-confirm').addEventListener('click', () => {
            resolveValue(input.value);
        });
        overlay.querySelector('.btn-cancel').addEventListener('click', () => {
            resolveValue(null);
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') resolveValue(input.value);
            if (e.key === 'Escape') resolveValue(null);
        });
        // Fechar ao clicar fora (opcional)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(null);
            }
        });
    });
}
