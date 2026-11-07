// Visualizador e Gerenciador de PDFs Global
export async function salvarPDFNoDisco(pdfBlob, nomeArquivo, subpasta = 'relatorios_pdf') {
    try {
        if (!window.electronAPI || !window.electronAPI.getUserDataPath) return null;
        const userDataPath = await window.electronAPI.getUserDataPath();
        const pastaDestino = `${userDataPath}/${subpasta}`;
        
        await window.electronAPI.createFolder(pastaDestino);
        const caminhoCompleto = `${pastaDestino}/${nomeArquivo}`;
        
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

export function imprimirPDFDireto(pdfBlob) {
    try {
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.zIndex = '-999';
        iframe.src = pdfUrl;
        document.body.appendChild(iframe);
        
        iframe.onload = () => {
            setTimeout(() => {
                try {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                } catch (e) {
                    console.warn('Falha no print direto do iframe:', e);
                }
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                    URL.revokeObjectURL(pdfUrl);
                }, 5000);
            }, 600);
        };
    } catch (e) {
        console.error('Erro ao preparar impressão direta:', e);
    }
}

export function abrirVisualizadorPDF(pdfBlob, titulo = 'Visualizar Documento') {
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
                        <h3 id="pdf-viewer-title" class="text-sm font-bold uppercase tracking-wide">Visualizar Documento</h3>
                    </div>
                    <div class="flex items-center gap-3">
                        <button id="btn-imprimir-pdf-viewer" class="bg-brand-main hover:bg-brand-hover text-brand-dark px-4 py-2 text-xs font-black uppercase rounded tracking-wider flex items-center gap-2 border border-brand-dark transition-colors shadow-sm">
                            <i class="ph-bold ph-printer text-base"></i> Imprimir Documento
                        </button>
                        <button id="btn-fechar-pdf-viewer" class="bg-gray-800 hover:bg-red-900/40 text-gray-300 hover:text-red-400 px-4 py-2 text-xs font-bold uppercase rounded tracking-wider flex items-center gap-2 border border-gray-700 hover:border-red-800 transition-colors">
                            <i class="ph-bold ph-x text-base"></i> Fechar
                        </button>
                    </div>
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

        document.getElementById('btn-imprimir-pdf-viewer').addEventListener('click', () => {
            const iframe = document.getElementById('pdf-viewer-iframe');
            if (iframe && iframe.contentWindow) {
                try {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                } catch (err) {
                    console.warn('Erro ao disparar print do iframe do visualizador:', err);
                }
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
}

// Vincula globalmente no window para compatibilidade com qualquer módulo
if (typeof window !== 'undefined') {
    window.abrirVisualizadorPDF = abrirVisualizadorPDF;
}
