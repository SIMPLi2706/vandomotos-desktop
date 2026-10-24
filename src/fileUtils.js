// src/fileUtils.js
export function handleFileUpload(inputElement, callback) {
    inputElement.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => callback(reader.result);
        reader.readAsDataURL(file);
    });
}

export function showLightbox(imageSrc) {
    // Verifica se existe um lightbox global, senão cria um
    let lightbox = document.getElementById('lightbox-viewer');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox-viewer';
        lightbox.className = 'fixed inset-0 bg-black/90 z-[60] hidden flex flex-col items-center justify-center p-4';
        lightbox.innerHTML = `
            <button id="btn-fechar-lightbox" class="absolute top-5 right-5 text-white bg-gray-950 px-4 py-2 border border-gray-700 font-bold flex items-center gap-2 hover:bg-gray-800 transition">
                <i class="ph ph-x"></i> Fechar
            </button>
            <img id="img-lightbox-src" src="" alt="Imagem" class="max-w-full max-h-[85vh] object-contain border-4 border-white shadow-2xl bg-gray-900">
        `;
        document.body.appendChild(lightbox);
        document.getElementById('btn-fechar-lightbox').addEventListener('click', () => {
            lightbox.classList.add('hidden');
        });
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) lightbox.classList.add('hidden');
        });
    }
    const img = document.getElementById('img-lightbox-src');
    img.src = imageSrc;
    lightbox.classList.remove('hidden');
}
