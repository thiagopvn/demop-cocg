import * as XLSX from 'xlsx';

/**
 * Converte uma lista de objetos para arquivo XLSX
 * @param {Array} data - Lista de objetos para converter
 * @param {string} fileName - Nome do arquivo (sem extensão)
 * @param {string} sheetName - Nome da aba da planilha
 * @param {Object} customHeaders - Objeto com mapeamento de cabeçalhos personalizados
 * @example
 * const data = [{nome: 'João', idade: 25}, {nome: 'Maria', idade: 30}];
 * const headers = {nome: 'Nome Completo', idade: 'Idade do Usuário'};
 * exportToExcel(data, 'usuarios', 'Dados', headers);
 */
export const exportToExcel = (data, fileName, sheetName = 'Dados', customHeaders = null) => {
    try {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Dados inválidos para exportação');
        }

        // Preparar os dados para exportação
        const dataToExport = data.map(item => {
            const newItem = {};
            
            // Se houver headers customizados, use-os
            if (customHeaders) {
                Object.keys(item).forEach(key => {
                    const headerName = customHeaders[key] || key;
                    
                    // Tratamento especial para timestamps do Firestore
                    if (item[key] && item[key].seconds) {
                        newItem[headerName] = new Date(item[key].seconds * 1000).toLocaleString();
                    } else {
                        newItem[headerName] = item[key];
                    }
                });
            } else {
                Object.keys(item).forEach(key => {
                    // Tratamento especial para timestamps do Firestore
                    if (item[key] && item[key].seconds) {
                        newItem[key] = new Date(item[key].seconds * 1000).toLocaleString();
                    } else {
                        newItem[key] = item[key];
                    }
                });
            }
            
            return newItem;
        });

        // Criar planilha
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Gerar nome do arquivo com data atual
        const fullFileName = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Salvar arquivo
        XLSX.writeFile(wb, fullFileName);

        return true;
    } catch (error) {
        console.error('Erro ao exportar para Excel:', error);
        return false;
    }
};

/**
 * Exporta movimentações para arquivo Excel
 * @param {Array} movimentacoes - Lista de movimentações
 * @param {string} nomeArquivo - Nome base do arquivo
 */
export const exportarMovimentacoes = (movimentacoes, nomeArquivo) => {
    try {
        if (!Array.isArray(movimentacoes) || movimentacoes.length === 0) {
            throw new Error('Não há dados para exportar');
        }

        const headers = {
            material: 'ID Material',
            material_description: 'Material',
            user: 'ID Usuário',
            user_name: 'Nome do Militar',
            sender: 'ID Remetente',
            sender_name: 'Nome do Remetente',
            quantity: 'Quantidade',
            type: 'Tipo',
            status: 'Status',
            signed: 'Assinado',
            date: 'Data'
        };

        const dadosFormatados = movimentacoes.map(mov => ({
            [headers.material]: mov.material,
            [headers.material_description]: mov.material_description,
            [headers.user]: mov.user,
            [headers.user_name]: mov.user_name,
            [headers.sender]: mov.sender,
            [headers.sender_name]: mov.sender_name,
            [headers.quantity]: mov.quantity,
            [headers.type]: mov.type === 'cautela' ? 'Cautela' : 'Descarte',
            [headers.status]: mov.status === 'devolvido' ? 'Devolvido' : 'Em Aberto',
            [headers.signed]: mov.signed ? 'Sim' : 'Não',
            [headers.date]: mov.date ? new Date(mov.date.seconds * 1000).toLocaleString('pt-BR') : ''
        }));

        // Criar planilha
        const ws = XLSX.utils.json_to_sheet(dadosFormatados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Movimentações');

        // Nome do arquivo com data atual
        const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const nomeCompletoArquivo = `${nomeArquivo}_${dataAtual}.xlsx`;
        
        // Salvar arquivo
        XLSX.writeFile(wb, nomeCompletoArquivo);

        return true;
    } catch (error) {
        console.error('Erro ao exportar para Excel:', error);
        return false;
    }
};