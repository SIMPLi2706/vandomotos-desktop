// src/modal.js
export function showConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[200]';
        overlay.innerHTML = `
            <div class="bg-white p-6 max-w-md w-full border border-gray-900 shadow-hard">
                <p class="text-sm text-gray-800 mb-4">${message}</p>
                <div class="flex gap-3 justify-end">
                    <button class="btn-cancel bg-white border border-gray-300 px-4 py-2 font-bold hover:bg-gray-50 transition">Cancelar</button>
                    <button class="btn-confirm bg-brand-dark text-brand-main px-4 py-2 font-bold hover:bg-black shadow-hard transition">Confirmar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('.btn-confirm').addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });
        overlay.querySelector('.btn-cancel').addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });
        // Fechar ao clicar fora (opcional)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        });
    });
}

export function showAlert(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[200]';
        overlay.innerHTML = `
            <div class="bg-white p-6 max-w-md w-full border border-gray-900 shadow-hard">
                <p class="text-sm text-gray-800 mb-4">${message}</p>
                <div class="flex justify-end">
                    <button class="btn-ok bg-brand-dark text-brand-main px-4 py-2 font-bold hover:bg-black shadow-hard transition">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('.btn-ok').addEventListener('click', () => {
            overlay.remove();
            resolve();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve();
            }
        });
    });
}
