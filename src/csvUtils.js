// src/csvUtils.js
export function exportCSV(data, filename) {
    if (!data || data.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(key => `"${(obj[key] || '').toString().replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
