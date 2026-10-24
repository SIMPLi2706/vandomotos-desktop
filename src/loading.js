// src/loading.js
let loadingOverlay = null;

export function showLoading(text = 'A processar...') {
    if (loadingOverlay) return;
    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex flex-col items-center justify-center z-[150]';
    loadingOverlay.innerHTML = `
        <div class="bg-white p-8 border border-gray-900 shadow-hard flex flex-col items-center gap-4">
            <div class="w-12 h-12 border-4 border-brand-main border-t-transparent rounded-full animate-spin"></div>
            <p class="text-sm font-bold uppercase tracking-widest">${text}</p>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
}

export function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.remove();
        loadingOverlay = null;
    }
}
