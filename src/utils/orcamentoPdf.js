import { MESES, estaPaga, fmtData, fmtMoeda, resumoPendentes } from '../services/orcamentoService';

// jspdf (~350 kB) só é carregado na hora de exportar.
const carregar = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    return { jsPDF, autoTable };
};

const AZUL = [30, 58, 95];

/** Descreve os filtros ativos para o cabeçalho ("Ano 2026 · Agosto · Setor DEMOP"). */
export function descreverFiltros(f = {}) {
    const partes = [];
    if (f.ano && f.ano !== 'todos') partes.push(`Ano ${f.ano}`);
    if (f.mes && f.mes !== 'todos') partes.push(MESES[Number(f.mes) - 1]);
    if (f.setor && f.setor !== 'todos') partes.push(`Setor ${f.setor}`);
    if (f.pagamento === 'pagas') partes.push('Somente pagas');
    if (f.pagamento === 'pendentes') partes.push('Somente não pagas');
    if (f.militarNome) partes.push(`Militar ${f.militarNome}`);
    if (f.militarRg) partes.push(`RG ${f.militarRg}`);
    if (f.busca) partes.push(`Busca "${f.busca}"`);
    return partes.length ? partes.join(' · ') : 'Todas as notas';
}

/**
 * Gera o PDF (A4 paisagem) da lista de notas fiscais: cabeçalho com filtros e totais,
 * tabela com uma linha por nota e rodapé com paginação. Devolve o nome do arquivo.
 */
export async function exportarNotasPdf(notas, filtro = {}, { emitidoPor = '' } = {}) {
    const { jsPDF, autoTable } = await carregar();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const largura = doc.internal.pageSize.getWidth();
    const altura = doc.internal.pageSize.getHeight();
    const margem = 10;

    const total = notas.reduce((s, n) => s + (Number(n.valor) || 0), 0);
    const pendentes = resumoPendentes(notas);
    const agora = new Date();

    // Cabeçalho
    doc.setFillColor(...AZUL);
    doc.rect(0, 0, largura, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('CBMERJ · GOCG — Orçamento · Notas fiscais', margem, 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(descreverFiltros(filtro), margem, 16);
    doc.text(`Emitido em ${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${emitidoPor ? ` por ${emitidoPor}` : ''}`, largura - margem, 16, { align: 'right' });

    // Resumo
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    let resumo = `${notas.length} nota(s) · Total ${fmtMoeda(total)}`;
    if (pendentes.qtd > 0) resumo += `   |   Não pagas: ${pendentes.qtd} · ${fmtMoeda(pendentes.valor)}   |   Pagas: ${fmtMoeda(total - pendentes.valor)}`;
    doc.text(resumo, margem, 29);

    const body = notas.map((n) => [
        fmtData(n.data),
        `${n.empresa || '—'}\n${n.cnpjFormatado || ''}`,
        n.numeroNota || '—',
        n.objeto || '—',
        n.setor || '—',
        n.militarNome ? `${n.militarNome}${n.militarRg ? `\nRG ${n.militarRg}` : ''}` : '—',
        estaPaga(n) ? `Pago${n.pagoEm ? `\n${fmtData(n.pagoEm)}` : ''}` : 'NÃO PAGO',
        fmtMoeda(n.valor),
    ]);

    autoTable(doc, {
        startY: 33,
        head: [['Data', 'Fornecedor / CNPJ', 'Nº nota', 'Objeto', 'Setor', 'Militar', 'Pagamento', 'Valor']],
        body,
        foot: [['', '', '', '', '', '', 'Total', fmtMoeda(total)]],
        margin: { left: margem, right: margem, bottom: 14 },
        styles: { fontSize: 8, cellPadding: 1.8, overflow: 'linebreak', valign: 'middle', lineColor: [225, 228, 232], lineWidth: 0.1 },
        headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        footStyles: { fillColor: [236, 240, 245], textColor: [30, 58, 95], fontStyle: 'bold', fontSize: 9, halign: 'right' },
        alternateRowStyles: { fillColor: [246, 248, 250] },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 62 },
            2: { cellWidth: 22 },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 28 },
            5: { cellWidth: 34 },
            6: { cellWidth: 22, halign: 'center' },
            7: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 6 && String(data.cell.raw).startsWith('NÃO')) {
                data.cell.styles.textColor = [200, 80, 0];
                data.cell.styles.fontStyle = 'bold';
            }
        },
        didDrawPage: () => {
            const pagina = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text(`Página ${pagina}`, largura - margem, altura - 6, { align: 'right' });
            doc.text('Sistema de Controle DEMOP · Orçamento GOCG', margem, altura - 6);
        },
    });

    const nome = `notas_fiscais_gocg_${agora.toISOString().slice(0, 10)}.pdf`;
    doc.save(nome);
    return nome;
}
