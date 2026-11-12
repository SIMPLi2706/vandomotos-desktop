import { db } from './db.js';

/**
 * Formata uma data no padrão YYYY-MM-DD respeitando o fuso horário local.
 */
export function formatLocalYMD(dateInput = new Date()) {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (!d || isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Soma dias a uma data YYYY-MM-DD sem deslocamento de fuso horário,
 * limitando ao teto informado (padrão: data atual local) para evitar lançamentos futuros.
 */
function adicionarDiasYMD(ymdBase, dias, tetoYMD) {
    if (!ymdBase) return tetoYMD || formatLocalYMD(new Date());
    const d = new Date(`${ymdBase.slice(0, 10)}T12:00:00`);
    if (isNaN(d.getTime())) return tetoYMD || formatLocalYMD(new Date());
    d.setDate(d.getDate() + dias);
    const res = formatLocalYMD(d);
    if (tetoYMD && res > tetoYMD) return tetoYMD;
    return res;
}

/**
 * Identifica lançamentos que NÃO são vendas/receitas operacionais
 * (ex.: cauções, calções, penhoras, garantias, fianças).
 */
export function isRegistroNaoVenda(f) {
    if (!f) return false;
    const norm = (str) => String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const cat = norm(f.categoria);
    const desc = norm(f.descricao);

    const termosCategoria = ['caucao', 'caucoes', 'calcao', 'calcoes', 'calsao', 'calsoes', 'penhora', 'penhoras', 'garantia', 'fianca'];
    if (termosCategoria.some(t => cat.includes(t))) return true;

    if (/\b(caucao|caucoes|calcao|calcoes|calsao|calsoes|penhora|penhoras|fianca|fiancas)\b/.test(desc)) {
        return true;
    }

    if (f.tipo === 'entrada' && /\b(garantia contratual|garantia de locacao|garantia do contrato|deposito garantia)\b/.test(desc)) {
        return true;
    }

    return false;
}

function isLancamentoRenovacaoOuAditivo(f) {
    const desc = String(f.descricao || '');
    return /(Recebimento Semanal|Abatimento Semanal|Renovação|º Aditivo|Parcela Semanal \(\d+|Parcela Aquisição \(\d+)/i.test(desc);
}

/**
 * Sincroniza e reconcilia exclusivamente as VENDAS/LOCAÇÕES e MANUTENÇÕES com o livro caixa.
 * Cauções, penhoras e garantias NÃO são puxadas para receitas/vendas.
 */
export async function sincronizarFinanceiroComContratos() {
    if (!db.contratos || !Array.isArray(db.contratos)) return { sincronizados: 0 };
    if (!db.financeiro || !Array.isArray(db.financeiro)) db.financeiro = [];

    let alterado = false;
    let novosLancamentos = 0;
    const hojeYMD = formatLocalYMD(new Date());

    // 0. Limpar cauções/penhoras vinculadas a contratos que tenham sido inseridas anteriormente no livro caixa
    const tamanhoAntes = db.financeiro.length;
    db.financeiro = db.financeiro.filter(f => !(f.contrato_id && isRegistroNaoVenda(f)));
    if (db.financeiro.length !== tamanhoAntes) {
        alterado = true;
    }

    for (const c of db.contratos) {
        const cli = (db.clientes || []).find(cl => cl.id === c.cliente_id) || { nome: 'Cliente' };
        const vei = (db.veiculos || []).find(v => v.id === c.veiculo_id) || { placa: '---', modelo: 'Veículo' };
        const dataContrato = c.data_inicio ? c.data_inicio.slice(0, 10) : formatLocalYMD(new Date(c.id));
        const primeiroNomeCli = (cli.nome || 'Cliente').trim().split(' ')[0];

        const lancamentosContrato = db.financeiro.filter(f => f.contrato_id === c.id && !isRegistroNaoVenda(f));

        // 1. Verificar venda/receita inicial do contrato (NÃO puxar caução/penhora)
        if (c.tipo_plano === 'fidelidade') {
            const temInicial = lancamentosContrato.some(f =>
                f.tipo === 'entrada' &&
                f.categoria === 'Locação Semanal' &&
                (!isLancamentoRenovacaoOuAditivo(f) || /1ª\s*(Parcela|semana)|\(1\/12\)/i.test(f.descricao || ''))
            );
            if (!temInicial) {
                const valorSemanal = Number(c.valor_semanal) || Number(c.valor_parcela) || (Number(c.valor) > 1000 ? Number(c.valor) / 12 : Number(c.valor)) || 350;
                if (valorSemanal > 0) {
                    db.financeiro.push({
                        id: Number(c.id) + 1,
                        data: dataContrato,
                        tipo: 'entrada',
                        categoria: 'Locação Semanal',
                        descricao: `1ª Parcela Semanal (1/12) - Contrato Fidelidade 3M - ${primeiroNomeCli} (${vei.placa})`,
                        valor: valorSemanal,
                        contrato_id: c.id
                    });
                    novosLancamentos++;
                    alterado = true;
                }
            }
        } else if (c.tipo_plano === 'aquisicao') {
            if (Number(c.valor_entrada) > 0) {
                const temEntradaAquisicao = lancamentosContrato.some(f => f.tipo === 'entrada' && f.categoria === 'Entrada Aquisição');
                if (!temEntradaAquisicao) {
                    db.financeiro.push({
                        id: Number(c.id) + 1,
                        data: dataContrato,
                        tipo: 'entrada',
                        categoria: 'Entrada Aquisição',
                        descricao: `Entrada (Contrato de Aquisição) - ${primeiroNomeCli} (${vei.placa})`,
                        valor: Number(c.valor_entrada),
                        contrato_id: c.id
                    });
                    novosLancamentos++;
                    alterado = true;
                }
            }
        } else {
            // Plano Simples: receita inicial da locação
            const temInicialSimples = lancamentosContrato.some(f =>
                f.tipo === 'entrada' &&
                f.categoria === 'Locação Semanal' &&
                !isLancamentoRenovacaoOuAditivo(f)
            );
            if (!temInicialSimples) {
                const valorContrato = Number(c.valor) || 0;
                if (valorContrato > 0) {
                    db.financeiro.push({
                        id: Number(c.id) + 1,
                        data: dataContrato,
                        tipo: 'entrada',
                        categoria: 'Locação Semanal',
                        descricao: `Locação Semanal - Contrato VM-${c.id.toString().slice(-5)} - ${primeiroNomeCli} (${vei.placa})`,
                        valor: valorContrato,
                        contrato_id: c.id
                    });
                    novosLancamentos++;
                    alterado = true;
                }
            }
        }

        // 2. Verificar Aditivos / Renovações / Parcelas pagas registradas no histórico JSON
        let historico = [];
        if (Array.isArray(c.historico_aditivos)) {
            historico = c.historico_aditivos;
        } else if (typeof c.historico_aditivos === 'string' && c.historico_aditivos.trim()) {
            try { historico = JSON.parse(c.historico_aditivos); } catch {}
        }

        if (Array.isArray(historico) && historico.length > 0) {
            historico.forEach((adt, idx) => {
                const jaExiste = db.financeiro.some(f => f.contrato_id === c.id && (
                    (adt.numero_aditivo && f.descricao && f.descricao.includes(`${adt.numero_aditivo}º Aditivo`)) ||
                    (adt.semanas_pagas && f.descricao && f.descricao.includes(`(${adt.semanas_pagas}ª semana`)) ||
                    (adt.semanas_pagas && f.descricao && f.descricao.includes(`Semana ${adt.semanas_pagas} de`)) ||
                    (typeof adt.id === 'number' && f.id === adt.id)
                ));
                if (!jaExiste) {
                    const dataAdt = adt.data_inicio ? adt.data_inicio.slice(0, 10) : (adt.criado_em ? adt.criado_em.slice(0, 10) : dataContrato);
                    const valAdt = Number(adt.valor) || (c.tipo_plano === 'fidelidade' ? (Number(c.valor_semanal) || 350) : (c.tipo_plano === 'aquisicao' ? (Number(c.valor_semanal) || Number(c.valor_parcela) || 375) : Number(c.valor)));
                    if (valAdt > 0) {
                        const descAdt = c.tipo_plano === 'fidelidade'
                            ? `Abatimento Semanal (${adt.semanas_pagas}ª semana de 12) - Contrato Fidelidade VM-${c.id.toString().slice(-5)} - ${primeiroNomeCli} (${vei.placa})`
                            : (c.tipo_plano === 'aquisicao'
                                ? `Parcela Aquisição (${adt.semanas_pagas}ª semana de 104) - Contrato VM-${c.id.toString().slice(-5)} - ${primeiroNomeCli} (${vei.placa})`
                                : `Renovação de Locação (${adt.numero_aditivo}º Aditivo) - Contrato VM-${c.id.toString().slice(-5)} - ${primeiroNomeCli} (${vei.placa})`);

                        db.financeiro.push({
                            id: typeof adt.id === 'number' ? adt.id : (Number(c.id) + 500 + idx),
                            data: dataAdt,
                            tipo: 'entrada',
                            categoria: c.tipo_plano === 'aquisicao' ? 'Parcela Aquisição' : 'Locação Semanal',
                            descricao: descAdt,
                            valor: valAdt,
                            contrato_id: c.id
                        });
                        novosLancamentos++;
                        alterado = true;
                    }
                }
            });
        }

        // 3. Reconciliar renovações / parcelas legadas (contratos antigos antes do historico_aditivos JSON)
        const numAdt = Number(c.numero_aditivo) || 0;
        const lancsAtualizados = db.financeiro.filter(f => f.contrato_id === c.id && !isRegistroNaoVenda(f) && f.tipo === 'entrada');

        if (c.tipo_plano === 'fidelidade') {
            const totalSemanasPagas = Math.max(Number(c.semanas_pagas) || 1, numAdt + 1);
            const qtdExistentes = lancsAtualizados.filter(f => f.categoria === 'Locação Semanal').length;
            if (totalSemanasPagas > 1 && qtdExistentes < totalSemanasPagas) {
                const valSem = Number(c.valor_semanal) || Number(c.valor_parcela) || 350;
                for (let sem = 2; sem <= totalSemanasPagas; sem++) {
                    const jaExisteSem = db.financeiro.some(f => f.contrato_id === c.id && (
                        (f.descricao && f.descricao.includes(`(${sem}ª semana`)) ||
                        (f.descricao && f.descricao.includes(`Semana ${sem} de`))
                    ));
                    if (!jaExisteSem && db.financeiro.filter(f => f.contrato_id === c.id && f.categoria === 'Locação Semanal' && f.tipo === 'entrada').length < totalSemanasPagas) {
                        db.financeiro.push({
                            id: Number(c.id) + 100 + sem,
                            data: adicionarDiasYMD(dataContrato, (sem - 1) * 7, hojeYMD),
                            tipo: 'entrada',
                            categoria: 'Locação Semanal',
                            descricao: `Abatimento Semanal (${sem}ª semana de 12) - Contrato Fidelidade VM-${c.id.toString().slice(-5)} - ${primeiroNomeCli} (${vei.placa})`,
                            valor: valSem,
                            contrato_id: c.id
                        });
                        novosLancamentos++;
                        alterado = true;
                    }
                }
            }
        } else if (c.tipo_plano === 'aquisicao') {
            const totalParcelasPagas = Math.max(Number(c.semanas_pagas) || 0, numAdt);
            const valSem = Number(c.valor_semanal) || Number(c.valor_parcela) || 375;
            for (let sem = 1; sem <= totalParcelasPagas; sem++) {
                const jaExisteSem = db.financeiro.some(f => f.contrato_id === c.id && (
                    (f.descricao && f.descricao.includes(`(${sem}ª semana`)) ||
                    (f.descricao && f.descricao.includes(`(${sem}º Aditivo`))
                ));
                const totalParcelasNoCaixa = db.financeiro.filter(f => f.contrato_id === c.id && f.categoria === 'Parcela Aquisição' && f.tipo === 'entrada').length;
                if (!jaExisteSem && totalParcelasNoCaixa < totalParcelasPagas) {
                    db.financeiro.push({
                        id: Number(c.id) + 100 + sem,
                        data: adicionarDiasYMD(dataContrato, sem * 7, hojeYMD),
                        tipo: 'entrada',
                        categoria: 'Parcela Aquisição',
                        descricao: `Parcela Aquisição (${sem}ª semana de 104) - Contrato VM-${c.id.toString().slice(-5)} - ${primeiroNomeCli} (${vei.placa})`,
                        valor: valSem,
                        contrato_id: c.id
                    });
                    novosLancamentos++;
                    alterado = true;
                }
            }
        } else if (numAdt > 0) {
            // Plano Simples com renovações (aditivos) anteriores ao historico_aditivos
            const valRenov = Number(c.valor) || 0;
            if (valRenov > 0) {
                for (let adtNum = 1; adtNum <= numAdt; adtNum++) {
                    const jaExisteAdt = db.financeiro.some(f => f.contrato_id === c.id && (
                        (f.descricao && f.descricao.includes(`${adtNum}º Aditivo`))
                    ));
                    const renovacoesNoCaixa = db.financeiro.filter(f =>
                        f.contrato_id === c.id &&
                        f.tipo === 'entrada' &&
                        f.categoria === 'Locação Semanal' &&
                        isLancamentoRenovacaoOuAditivo(f)
                    ).length;

                    if (!jaExisteAdt && renovacoesNoCaixa < numAdt) {
                        db.financeiro.push({
                            id: Number(c.id) + 100 + adtNum,
                            data: adicionarDiasYMD(dataContrato, adtNum * 7, hojeYMD),
                            tipo: 'entrada',
                            categoria: 'Locação Semanal',
                            descricao: `Renovação de Locação (${adtNum}º Aditivo) - Contrato VM-${c.id.toString().slice(-5)} - ${primeiroNomeCli} (${vei.placa})`,
                            valor: valRenov,
                            contrato_id: c.id
                        });
                        novosLancamentos++;
                        alterado = true;
                    }
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
                        const mData = m.data ? m.data.slice(0, 10) : hojeYMD;
                        const jaExiste = db.financeiro.some(f =>
                            f.tipo === 'saida' &&
                            f.descricao &&
                            f.descricao.includes(v.placa) &&
                            Math.abs(Number(f.valor) - mValor) < 0.01 &&
                            (f.data ? f.data.slice(0, 10) === mData : false)
                        );
                        if (!jaExiste) {
                            db.financeiro.push({
                                id: typeof m.id === 'number' ? m.id : (Number(v.id) * 1000 + mIdx + 100),
                                data: mData,
                                tipo: 'saida',
                                categoria: 'Manutenção de Frota',
                                descricao: `Manutenção: ${m.tipo || 'Oficina'} - ${v.modelo} (${v.placa})`,
                                valor: mValor,
                                contrato_id: null
                            });
                            novosLancamentos++;
                            alterado = true;
                        }
                    }
                });
            }
        });
    }

    if (alterado) {
        console.log(`✅ Sincronização concluída: ${novosLancamentos} novos lançamentos de vendas/oficina sincronizados (cauções/penhoras excluídas).`);
        if (window.electronAPI && window.electronAPI.saveData) {
            await window.electronAPI.saveData('financeiro', db.financeiro);
        }
    }

    return { sincronizados: novosLancamentos, total: db.financeiro.length };
}
