import { db } from './db.js';

/**
 * Sincroniza e reconcilia os registros de contratos e manutenções com o livro caixa (financeiro).
 * Garante que nenhum valor registrado nos contratos ou oficinas fique ausente do financeiro,
 * eliminando valores zerados e divergências com o caderno de anotações.
 */
export async function sincronizarFinanceiroComContratos() {
    if (!db.contratos || !Array.isArray(db.contratos)) return { sincronizados: 0 };
    if (!db.financeiro || !Array.isArray(db.financeiro)) db.financeiro = [];

    let novosLancamentos = 0;

    for (const c of db.contratos) {
        const cli = (db.clientes || []).find(cl => cl.id === c.cliente_id) || { nome: 'Cliente' };
        const vei = (db.veiculos || []).find(v => v.id === c.veiculo_id) || { placa: '---', modelo: 'Veículo' };
        const dataContrato = c.data_inicio ? c.data_inicio.slice(0, 10) : new Date(c.id).toISOString().slice(0, 10);

        // 1. Verificar se existe registro de receita inicial da locação
        const lancamentosContrato = db.financeiro.filter(f => f.contrato_id === c.id);
        const temEntradaLocacao = lancamentosContrato.some(f => 
            f.tipo === 'entrada' && (f.categoria === 'Locação Semanal' || f.categoria === 'Entrada Aquisição' || f.categoria === 'Parcela Aquisição')
        );

        if (!temEntradaLocacao) {
            if (c.tipo_plano === 'fidelidade') {
                const valorSemanal = Number(c.valor_semanal) || (Number(c.valor) > 1000 ? Number(c.valor) / 12 : Number(c.valor)) || 350;
                db.financeiro.push({
                    id: Number(c.id) + 1,
                    data: dataContrato,
                    tipo: 'entrada',
                    categoria: 'Locação Semanal',
                    descricao: `1ª Parcela Semanal (1/12) - Contrato Fidelidade 3M - ${cli.nome.split(' ')[0]} (${vei.placa})`,
                    valor: valorSemanal,
                    contrato_id: c.id
                });
                novosLancamentos++;
            } else if (c.tipo_plano === 'aquisicao') {
                if (Number(c.valor_entrada) > 0) {
                    db.financeiro.push({
                        id: Number(c.id) + 1,
                        data: dataContrato,
                        tipo: 'entrada',
                        categoria: 'Entrada Aquisição',
                        descricao: `Entrada (Contrato de Aquisição) - ${cli.nome.split(' ')[0]} (${vei.placa})`,
                        valor: Number(c.valor_entrada),
                        contrato_id: c.id
                    });
                    novosLancamentos++;
                }
                const valorSemanal = Number(c.valor_semanal) || Number(c.valor_parcela) || 375;
                if (Number(c.semanas_pagas) > 0) {
                    db.financeiro.push({
                        id: Number(c.id) + 2,
                        data: dataContrato,
                        tipo: 'entrada',
                        categoria: 'Parcela Aquisição',
                        descricao: `1ª Parcela Semanal (1/104) - Aquisição - ${cli.nome.split(' ')[0]} (${vei.placa})`,
                        valor: valorSemanal,
                        contrato_id: c.id
                    });
                    novosLancamentos++;
                }
            } else {
                // Simples
                const valorContrato = Number(c.valor) || 0;
                if (valorContrato > 0) {
                    db.financeiro.push({
                        id: Number(c.id) + 1,
                        data: dataContrato,
                        tipo: 'entrada',
                        categoria: 'Locação Semanal',
                        descricao: `Locação Semanal - Contrato VM-${c.id.toString().slice(-5)} - ${cli.nome.split(' ')[0]} (${vei.placa})`,
                        valor: valorContrato,
                        contrato_id: c.id
                    });
                    novosLancamentos++;
                }
            }
        }

        // 2. Verificar Caução
        if (Number(c.caucao) > 0 && c.caucao_tipo !== 'penhora') {
            const temCaucao = lancamentosContrato.some(f => f.tipo === 'entrada' && f.categoria === 'Caução');
            if (!temCaucao) {
                db.financeiro.push({
                    id: Number(c.id) + 3,
                    data: dataContrato,
                    tipo: 'entrada',
                    categoria: 'Caução',
                    descricao: `Caução de Locação - ${cli.nome.split(' ')[0]} (${vei.placa})`,
                    valor: Number(c.caucao),
                    contrato_id: c.id
                });
                novosLancamentos++;
            }
        }

        // 3. Verificar Aditivos registrados no histórico
        let historico = [];
        if (Array.isArray(c.historico_aditivos)) {
            historico = c.historico_aditivos;
        } else if (typeof c.historico_aditivos === 'string' && c.historico_aditivos.trim()) {
            try { historico = JSON.parse(c.historico_aditivos); } catch {}
        }

        if (Array.isArray(historico) && historico.length > 0) {
            historico.forEach((adt, idx) => {
                const jaExiste = db.financeiro.some(f => f.contrato_id === c.id && (
                    (f.descricao && f.descricao.includes(`${adt.numero_aditivo}º Aditivo`)) ||
                    (f.descricao && f.descricao.includes(`(${adt.semanas_pagas}ª semana`)) ||
                    (f.descricao && f.descricao.includes(`Semana ${adt.semanas_pagas} de`))
                ));
                if (!jaExiste) {
                    const dataAdt = adt.data_inicio ? adt.data_inicio.slice(0, 10) : (adt.criado_em ? adt.criado_em.slice(0, 10) : dataContrato);
                    const valAdt = Number(adt.valor) || (c.tipo_plano === 'fidelidade' ? (Number(c.valor_semanal) || 350) : (c.tipo_plano === 'aquisicao' ? (Number(c.valor_semanal) || 375) : Number(c.valor)));
                    const descAdt = c.tipo_plano === 'fidelidade'
                        ? `Abatimento Semanal (${adt.semanas_pagas}ª semana de 12) - Contrato Fidelidade VM-${c.id.toString().slice(-5)} - ${cli.nome.split(' ')[0]} (${vei.placa})`
                        : (c.tipo_plano === 'aquisicao'
                            ? `Parcela Aquisição (${adt.semanas_pagas}ª semana de 104) - Contrato VM-${c.id.toString().slice(-5)} - ${cli.nome.split(' ')[0]} (${vei.placa})`
                            : `Renovação de Locação (${adt.numero_aditivo}º Aditivo) - Contrato VM-${c.id.toString().slice(-5)} - ${cli.nome.split(' ')[0]} (${vei.placa})`);

                    db.financeiro.push({
                        id: typeof adt.id === 'number' ? adt.id : (Date.now() + idx + 10),
                        data: dataAdt,
                        tipo: 'entrada',
                        categoria: c.tipo_plano === 'aquisicao' ? 'Parcela Aquisição' : 'Locação Semanal',
                        descricao: descAdt,
                        valor: valAdt,
                        contrato_id: c.id
                    });
                    novosLancamentos++;
                }
            });
        } else if ((c.tipo_plano === 'fidelidade' && Number(c.semanas_pagas) > 1) || (c.tipo_plano === 'aquisicao' && Number(c.semanas_pagas) > 1)) {
            // Caso tenha semanas pagas mas sem histórico em JSON (legado)
            const pagas = Number(c.semanas_pagas);
            for (let sem = 2; sem <= pagas; sem++) {
                const jaExiste = db.financeiro.some(f => f.contrato_id === c.id && (
                    (f.descricao && f.descricao.includes(`(${sem}ª semana`)) ||
                    (f.descricao && f.descricao.includes(`Semana ${sem} de`))
                ));
                if (!jaExiste) {
                    const valSem = c.tipo_plano === 'fidelidade'
                        ? (Number(c.valor_semanal) || 350)
                        : (Number(c.valor_semanal) || Number(c.valor_parcela) || 375);
                    const desc = c.tipo_plano === 'fidelidade'
                        ? `Abatimento Semanal (${sem}ª semana de 12) - Contrato Fidelidade VM-${c.id.toString().slice(-5)} - ${cli.nome.split(' ')[0]} (${vei.placa})`
                        : `Parcela Aquisição (${sem}ª semana de 104) - Contrato VM-${c.id.toString().slice(-5)} - ${cli.nome.split(' ')[0]} (${vei.placa})`;
                    
                    db.financeiro.push({
                        id: Number(c.id) + sem * 10,
                        data: dataContrato,
                        tipo: 'entrada',
                        categoria: c.tipo_plano === 'aquisicao' ? 'Parcela Aquisição' : 'Locação Semanal',
                        descricao: desc,
                        valor: valSem,
                        contrato_id: c.id
                    });
                    novosLancamentos++;
                }
            }
        }
    }

    // 4. Sincronizar manutenções registradas nos veículos
    if (db.veiculos && Array.isArray(db.veiculos)) {
        db.veiculos.forEach(v => {
            let mList = [];
            try {
                mList = typeof v.manutencoes === 'string' ? JSON.parse(v.manutencoes) : (v.manutencoes || []);
            } catch {}
            if (Array.isArray(mList)) {
                mList.forEach((m, mIdx) => {
                    const mValor = Number(m.valor) || 0;
                    if (mValor > 0) {
                        const jaExiste = db.financeiro.some(f => 
                            f.tipo === 'saida' && 
                            f.descricao && 
                            f.descricao.includes(v.placa) && 
                            Math.abs(Number(f.valor) - mValor) < 0.01 &&
                            (f.data === m.data || f.data === (m.data ? m.data.slice(0, 10) : ''))
                        );
                        if (!jaExiste) {
                            db.financeiro.push({
                                id: typeof m.id === 'number' ? m.id : (Date.now() + mIdx + 100),
                                data: m.data ? m.data.slice(0, 10) : new Date().toISOString().slice(0, 10),
                                tipo: 'saida',
                                categoria: 'Manutenção de Frota',
                                descricao: `Manutenção: ${m.tipo || 'Oficina'} - ${v.modelo} (${v.placa})`,
                                valor: mValor,
                                contrato_id: null
                            });
                            novosLancamentos++;
                        }
                    }
                });
            }
        });
    }

    if (novosLancamentos > 0) {
        console.log(`✅ Sincronização concluída: ${novosLancamentos} novos lançamentos inseridos no livro caixa.`);
        if (window.electronAPI && window.electronAPI.saveData) {
            await window.electronAPI.saveData('financeiro', db.financeiro);
        }
    }

    return { sincronizados: novosLancamentos, total: db.financeiro.length };
}
