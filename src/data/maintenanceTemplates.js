/**
 * Templates de manutenção preventiva baseados nos manuais dos equipamentos motomecanizados.
 *
 * Cada template contém:
 * - keywords: array de palavras-chave para matching (primeira é obrigatória, demais são refinamento por marca)
 * - excludeKeywords: array de palavras que invalidam o match (ex: "elétrico", "acoplamento")
 * - brand: marca do equipamento (usado para priorizar match por marca)
 * - label: nome amigável do equipamento
 * - maintenances: array de manutenções programadas do manual
 */

const MAINTENANCE_TEMPLATES = [
    {
        id: 'ventilador_eletrico',
        keywords: ['ventilador eletrico', 'ventilador elétrico'],
        brand: null,
        label: 'Ventilador Elétrico',
        maintenances: [
            { type: 'semanal', description: 'INSPEÇÃO VISUAL GERAL (CARCAÇA - CABOS - FIXAÇÕES)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'VERIFICAR RUÍDOS E VIBRAÇÕES ANORMAIS DURANTE FUNCIONAMENTO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'VERIFICAR TEMPERATURA DO MOTOR DURANTE OPERAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'mensal', description: 'LIMPAR PÁS E HÉLICE COM PANO ÚMIDO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'mensal', description: 'LIMPAR CARCAÇA E GRADE DE PROTEÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'mensal', description: 'VERIFICAR FIXAÇÃO DOS PARAFUSOS E SUPORTES', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'mensal', description: 'VERIFICAR ESTADO DOS CABOS ELÉTRICOS E CONEXÕES', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'LUBRIFICAR ROLAMENTOS (CONFORME MANUAL DO FABRICANTE)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'VERIFICAR ALINHAMENTO E BALANCEAMENTO DO EIXO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'LIMPAR INTERIOR DA CARCAÇA DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'VERIFICAR E APERTAR CONEXÕES ELÉTRICAS NO PAINEL E TOMADA', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'semestral', description: 'APERTAR PORCAS E PARAFUSOS DA HÉLICE', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'VERIFICAR DESGASTE DOS ROLAMENTOS (FOLGA E RUÍDO)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'MEDIR AMPERAGEM DO MOTOR (VERIFICAR CONSUMO ELÉTRICO)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'VERIFICAR ISOLAMENTO ELÉTRICO DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAÇÃO ELÉTRICA COMPLETA (ENROLAMENTO - CAPACITOR - ATERRAMENTO)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'anual', description: 'SUBSTITUIR ROLAMENTOS SE NECESSÁRIO', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'REVISÃO GERAL DOS CONTATOS E PROTEÇÕES ELÉTRICAS', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAR E TESTAR CHAVE DE PARTIDA E PROTEÇÃO TÉRMICA', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
        ]
    },
    {
        id: 'ventilador_caf',
        keywords: ['ventilador a combustao', 'ventilador a combustão', 'power blower', 'caf', 'cone air flow'],
        excludeKeywords: ['eletrico', 'elétrico', 'acoplamento', 'adaptador', 'traqueia', 'exaustor', 'mangueira'],
        brand: null,
        label: 'Ventilador a Combustão - Power Blower CAF',
        maintenances: [
            { type: 'mensal', description: 'AJUSTAR TENSÃO DA CORREIA (BELT-DRIVE)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'mensal', description: 'INSPECIONAR E LIMPAR CARCAÇA DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'LIMPAR ELEMENTO DE ESPUMA OU PAPEL DO FILTRO DE AR', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'semestral', description: 'SUBSTITUIR CORREIA (BELT-DRIVE)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'TROCAR ÓLEO DO MOTOR (SAE 10W-30 HONDA / SAE 30 BRIGGS)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'INSPECIONAR E LIMPAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'SUBSTITUIR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
        ]
    },
    {
        id: 'motosserra_stihl',
        keywords: ['motosserra'],
        excludeKeywords: ['corte de concreto'],
        brand: 'stihl',
        label: 'Motosserra Stihl',
        maintenances: [
            { type: 'diaria', description: 'VERIFICAR NÍVEIS DE ÓLEO DE CORRENTE E COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'CHECAR TENSÃO E LUBRIFICAÇÃO DA CORRENTE', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'INSPECIONAR VAZAMENTOS - FREIO DE CORRENTE - SABRE E PARAFUSOS SOLTOS', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'VERIFICAR DESGASTE DO PINHÃO DA CORRENTE', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'REBARBAR O SABRE', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'VERIFICAR E AFIAR A CORRENTE (ÂNGULO 30 GRAUS)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'mensal', description: 'LIMPAR FILTRO DE AR COM DETERGENTE E ÁGUA (PH MAIOR 12) E ENXAGUAR', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'mensal', description: 'LEVAR A POSTO STIHL PARA LIMPEZA DE TANQUES E CABEÇOTE DE ASPIRAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'REVISAR FUNCIONAMENTO DO FREIO DA CORRENTE EM CONCESSIONÁRIA STIHL', priority: 'alta', estimatedDuration: 2, reminderDays: 7 },
            { type: 'semestral', description: 'REVISAR FREIO DA CORRENTE', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'AJUSTAR CARBURADOR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'VENTILAR DRENO DE CÂMARA DE COMBUSTÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'SUBSTITUIR CABEÇOTE DE ASPIRAÇÃO NO TANQUE EM CONCESSIONÁRIA', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
        ]
    },
    {
        id: 'motosserra_husqvarna',
        keywords: ['motosserra'],
        excludeKeywords: ['corte de concreto'],
        brand: 'husqvarna',
        label: 'Motosserra Husqvarna 385XP',
        maintenances: [
            { type: 'diaria', description: 'VERIFICAR NÍVEL DE ÓLEO DA CORRENTE E AJUSTAR BOMBA DE LUBRIFICAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'INSPECIONAR FREIO DE CORRENTE E TESTAR SISTEMA DE PARADA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'CHECAR TENSÃO E DESGASTE DA CORRENTE E PINHÃO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'LIMPAR CARCAÇAS DE REFRIGERAÇÃO E DISSIPADORES DE CALOR', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'INSPECIONAR E AJUSTAR EMBREAGEM CENTRÍFUGA (ROLAMENTO - MOLAS - PATINS)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'mensal', description: 'DESMONTAR E LIMPAR CARBURADOR E EXECUTAR TESTE DE PRESSÃO E VEDAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'mensal', description: 'LIMPAR TANQUE DE COMBUSTÍVEL E SUBSTITUIR FILTRO DE ALIMENTAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'SUBSTITUIR VELA DE IGNIÇÃO (CHAMPION RCJ 7Y GAP 0.5MM)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'VERIFICAR SISTEMA DE IGNIÇÃO E CONEXÕES ELÉTRICAS', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'semestral', description: 'REVISAR RETENTORES E JUNTAS DO CÁRTER', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'SUBSTITUIR FILTROS DE AR E ÓLEO DA CORRENTE (ESPUMA E PAPEL)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'REVISÃO COMPLETA EM CONCESSIONÁRIA - ROLAMENTOS DO VIRABREQUIM E AJUSTE DE TUCHOS', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
        ]
    },
    {
        id: 'motobomba_toyama',
        keywords: ['motobomba'],
        brand: 'toyama',
        label: 'Motobomba Toyama 4T',
        maintenances: [
            { type: 'diaria', description: 'VERIFICAR NÍVEL DE ÓLEO DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'VERIFICAR NÍVEL DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'INSPECIONAR EXISTÊNCIA DE VAZAMENTOS', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'LIMPAR FILTRO DE AR EXTERNO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'VERIFICAR FIXAÇÃO DE PARAFUSOS', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'mensal', description: 'TROCAR ÓLEO DO MOTOR (10W-30) - REVISÃO INICIAL (ATÉ 20H/1 MÊS)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'mensal', description: 'LIMPAR ELEMENTO DO FILTRO DE AR (ESPUMA E PAPEL) - REVISÃO INICIAL', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'LIMPAR ELEMENTO DO FILTRO DE AR (ESPUMA E PAPEL)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'TROCAR ÓLEO DO MOTOR (10W-30)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'VERIFICAR E LIMPAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'semestral', description: 'TROCAR ÓLEO DO MOTOR (10W-30) - REVISÃO SEMESTRAL', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'VERIFICAR E LIMPAR VELA DE IGNIÇÃO - REVISÃO SEMESTRAL', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'SUBSTITUIR ELEMENTO DO FILTRO DE AR (SE DANIFICADO)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'SUBSTITUIR VELA DE IGNIÇÃO (GAP 0.7-0.8MM)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'SUBSTITUIR FILTRO DE AR (ESPUMA E PAPEL)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'TROCAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAR E TROCAR MANGUEIRA DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
        ]
    },
    {
        id: 'motobomba_honda',
        keywords: ['motobomba'],
        brand: 'honda',
        label: 'Motobomba Honda',
        maintenances: [
            { type: 'diaria', description: 'VERIFICAR NÍVEL DE ÓLEO DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'VERIFICAR FILTRO DE AR EXTERNO PARA SUJEIRA GROSSA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'trimestral', description: 'LIMPAR ELEMENTO DO FILTRO DE AR (ESPUMA E PAPEL)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'semestral', description: 'TROCAR ÓLEO DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'VERIFICAR E AJUSTAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'LIMPAR TANQUE E FILTRO DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'LIMPAR COPO DE SEDIMENTOS', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'SUBSTITUIR VELA DE IGNIÇÃO (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAR E AJUSTAR FOLGA DAS VÁLVULAS (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAR AJUSTE DA MARCHA LENTA (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAR AJUSTE DAS VÁLVULAS (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'anual', description: 'LIMPAR TANQUE DE COMBUSTÍVEL (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAR IMPULSOR E FOLGA DO IMPULSOR (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAR VÁLVULA DE ENTRADA DA BOMBA (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'anual', description: 'LIMPAR CÂMARA DE COMBUSTÃO (ASSISTÊNCIA ESPECIALIZADA) - A CADA 500H', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAR TUBULAÇÃO DE COMBUSTÍVEL - MANGUEIRAS E CONEXÕES (ASSISTÊNCIA ESPECIALIZADA) - A CADA 2 ANOS', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
        ]
    },
    {
        id: 'gerador_toyama',
        keywords: ['gerador'],
        brand: 'toyama',
        label: 'Gerador Toyama 4T',
        maintenances: [
            { type: 'trimestral', description: 'LIMPAR FILTRO DE AR', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'semestral', description: 'TROCAR ÓLEO DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'VERIFICAR E LIMPAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'SUBSTITUIR ELEMENTO DO FILTRO DE AR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'SUBSTITUIR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAR E AJUSTAR FOLGA DAS VÁLVULAS', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAR E TROCAR TUBO DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
        ]
    },
    {
        id: 'gerador_honda',
        keywords: ['gerador'],
        brand: 'honda',
        label: 'Gerador Honda 4T',
        maintenances: [
            { type: 'trimestral', description: 'LIMPAR FILTRO DE AR', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'semestral', description: 'TROCAR ÓLEO DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'LIMPAR COPO DE SEDIMENTOS', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'VERIFICAR E AJUSTAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'LIMPAR TANQUE E FILTRO DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'SUBSTITUIR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAR E AJUSTAR FOLGA DAS VÁLVULAS (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'anual', description: 'LIMPAR CÂMARA DE COMBUSTÃO (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAR TUBULAÇÃO DE COMBUSTÍVEL - A CADA 2 ANOS', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
        ]
    },
    {
        id: 'soprador_costal',
        keywords: ['soprador'],
        brand: null,
        label: 'Soprador Costal',
        maintenances: [
            { type: 'trimestral', description: 'LIMPAR FILTRO DE AR', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'INSPECIONAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
        ]
    },
    {
        id: 'motorebolo_stihl',
        keywords: ['motorebolo', 'motocortadora', 'cortadora de concreto', 'cortadora'],
        brand: 'stihl',
        label: 'Motorebolo Stihl',
        maintenances: [
            { type: 'diaria', description: 'TESTE VISUAL (ESTADO E VEDAÇÃO) DA MÁQUINA COMPLETA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'TESTE DE FUNCIONAMENTO DOS ELEMENTOS DE MANEJO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'VERIFICAR BOMBA MANUAL DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'VERIFICAR CONEXÃO DA ÁGUA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'VERIFICAR MARCHA LENTA DO CARBURADOR (DISCO NÃO DEVE MOVER)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'VERIFICAR ELEMENTOS ANTIVIBRAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'VERIFICAR DISCO DE CORTE', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'LIMPAR E REESTRICAR CORREIA ESTRIADA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'LIMPAR ALETAS DE REFRIGERAÇÃO E ASPIRAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'VERIFICAR CONEXÃO DA ÁGUA - REVISÃO SEMANAL', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'REGULAR MARCHA LENTA DO CARBURADOR', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'REAPERTAR PARAFUSOS E PORCAS ACESSÍVEIS', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'VERIFICAR ELEMENTOS ANTIVIBRAÇÃO - REVISÃO SEMANAL', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'VERIFICAR E SUBSTITUIR DISCO DE CORTE (SE NECESSÁRIO)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'VERIFICAR APOIO E AMORTECEDOR DE BORRACHA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'LIMPAR MÁQUINA COMPLETA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'mensal', description: 'FAZER MANUTENÇÃO DA BOMBA MANUAL EM PONTO DE VENDAS', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'mensal', description: 'LIMPAR TANQUE DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'mensal', description: 'AJUSTAR DISTÂNCIA DOS ELETRODOS DA VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'mensal', description: 'REAPERTAR PARAFUSOS E PORCAS ACESSÍVEIS - REVISÃO MENSAL', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'anual', description: 'SUBSTITUIR CORREIA ESTRIADA', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'SUBSTITUIR CABEÇOTE DE ASPIRAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'SUBSTITUIR FILTRO DE AR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'LIMPAR ALETAS DO CILINDRO EM PONTO DE VENDAS', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'anual', description: 'SUBSTITUIR ELEMENTOS ANTIVIBRAÇÃO EM PONTO DE VENDAS', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'anual', description: 'SUBSTITUIR APOIO E AMORTECEDOR DE BORRACHA', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'REAPERTAR PARAFUSOS E PORCAS - REVISÃO ANUAL', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'SUBSTITUIR ETIQUETA DE SEGURANÇA', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
        ]
    },
    {
        id: 'compressor_coltri',
        keywords: ['compressor'],
        excludeKeywords: ['bancada', 'ferrari', 'ar comprimido'],
        brand: 'coltri',
        label: 'Compressor Coltri MCH 8',
        maintenances: [
            { type: 'diaria', description: 'DESCARGA DE CONDENSADO - VERIFICAÇÃO E LIMPEZA (5H)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'DESCARGA DE CONDENSADO - VERIFICAÇÃO E LIMPEZA (10H)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'VERIFICAÇÃO DO DESLIGAMENTO AUTOMÁTICO (10H)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'diaria', description: 'VERIFICAÇÃO DO NÍVEL DO ÓLEO LUBRIFICANTE (10H)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'trimestral', description: 'FILTRO DE AR - LIMPEZA SE HOUVER ACÚMULO DE POEIRA (50H)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'DESCARGA DE CONDENSADO - VERIFICAÇÃO E LIMPEZA (250H)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'VERIFICAÇÃO DO DESLIGAMENTO AUTOMÁTICO (250H)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'VERIFICAÇÃO DO NÍVEL DO ÓLEO LUBRIFICANTE (250H)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'VERIFICAÇÃO E TENSÃO DA CORREIA - DESGASTE E LIMPEZA (250H)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'semestral', description: 'DESCARGA DE CONDENSADO - VERIFICAÇÃO E LIMPEZA (500H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'VERIFICAÇÃO DAS FUNÇÕES PRINCIPAIS (500H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'VÁLVULAS DE DESCARGA DE CONDENSADO - LIMPEZA (500H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'VERIFICAÇÃO E TENSÃO DA CORREIA (500H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'ELEMENTO FILTRANTE SEPARADOR - LIMPEZA (500H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'TROCA DE ÓLEO (500H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAÇÃO DAS FUNÇÕES PRINCIPAIS (1000H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'VÁLVULAS DE DESCARGA DE CONDENSADO - LIMPEZA (1000H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'TROCA DA CORREIA (1000H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'ELEMENTO FILTRANTE SEPARADOR - TROCA (1000H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'TROCA DE ÓLEO (1000H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAÇÃO DAS VÁLVULAS DE 1° E 2° ESTÁGIO (1000H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'ANÉIS DE VEDAÇÃO PARA DESCARGA DE CONDENSADO - TROCA (2000H)', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'TROCA DA CORREIA (2000H)', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'ELEMENTO FILTRANTE SEPARADOR - TROCA (2000H)', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'TROCA DE ÓLEO (2000H)', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'VÁLVULAS DE DESCARGA DE CONDENSADO - TROCA (2000H)', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAÇÃO DAS VÁLVULAS DE 3° ESTÁGIO (2000H)', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
        ]
    },
    {
        id: 'motopoda_2t',
        keywords: ['motopoda', 'moto poda', 'podador'],
        brand: null,
        label: 'Motopoda 2T',
        maintenances: [
            { type: 'semanal', description: 'VERIFICAR NÍVEL DE COMBUSTÍVEL (MISTURA GASOLINA + ÓLEO 2T)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'VERIFICAR FILTRO DE AR', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'VERIFICAR ESTADO DAS LÂMINAS DE PODA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'VERIFICAR PARAFUSOS E FIXAÇÕES', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'TESTAR FREIO E ELEMENTOS DE SEGURANÇA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'LIMPAR FILTRO DE AR (ESPUMA)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'LIMPAR LÂMINAS DE CORTE', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'VERIFICAR DESGASTE DAS LÂMINAS', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'LIMPAR ALETAS DE ARREFECIMENTO DO CILINDRO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'LIMPAR EMBREAGEM E TAMBOR', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'mensal', description: 'DESCARBONAR ESCAPAMENTO E JANELA DE SAÍDA DO CILINDRO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'mensal', description: 'LAVAR TANQUE DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'mensal', description: 'INSPECIONAR E LIMPAR MÓDULO ELETRÔNICO (BOBINA)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'mensal', description: 'LIMPAR CONJUNTO DE PARTIDA', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'VERIFICAR E AJUSTAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'VERIFICAR MOLA E CORDEL DO ARRANQUE', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'SUBSTITUIR FILTRO DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'semestral', description: 'SUBSTITUIR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'LIMPAR E CALIBRAR MÓDULO ELETRÔNICO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'DESCARBONAR PISTÃO - CILINDRO E ANÉIS', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'REVISÃO COMPLETA EM ASSISTÊNCIA TÉCNICA AUTORIZADA', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'anual', description: 'SUBSTITUIR LÂMINAS DE CORTE (SE DESGASTADAS)', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAR E SUBSTITUIR AMORTECEDORES DE VIBRAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
        ]
    },
    {
        id: 'motor_rabeta_4t',
        keywords: ['motor de rabeta', 'rabeta', 'motor rabeta'],
        brand: null,
        label: 'Motor de Rabeta 4T',
        maintenances: [
            { type: 'semanal', description: 'VERIFICAR NÍVEL DE ÓLEO DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'VERIFICAR NÍVEL DE ÓLEO DA RABETA (CÂMBIO)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'VERIFICAR HÉLICE (TRINCAS E DEFORMAÇÕES)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'VERIFICAR FIXAÇÃO DO MOTOR NA EMBARCAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: 'INSPECIONAR MANGUEIRAS E CONEXÕES DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'semanal', description: "LAVAR EXTERNAMENTE COM ÁGUA DOCE APÓS USO", priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'mensal', description: 'TROCA DE ÓLEO DO MOTOR - REVISÃO INICIAL (20H OU 1 MÊS)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'mensal', description: 'TROCA DE ÓLEO DA RABETA - REVISÃO INICIAL (20H OU 1 MÊS)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'mensal', description: 'VERIFICAR TORQUE DOS PARAFUSOS PRINCIPAIS', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'TROCAR ÓLEO DO MOTOR (100H OU 6 MESES)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'TROCAR ÓLEO DA RABETA (100H OU 6 MESES)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'SUBSTITUIR FILTRO DE COMBUSTÍVEL DECANTADOR (100H)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: 'VERIFICAR E LIMPAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'trimestral', description: "LAVAR EXTERNAMENTE COM ÁGUA DOCE - REVISÃO TRIMESTRAL", priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'semestral', description: "SUBSTITUIR ROTOR DA BOMBA D'ÁGUA (200H OU 6 MESES)", priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: "SUBSTITUIR FILTROS DE COMBUSTÍVEL - LINHA E SEPARADOR D'ÁGUA", priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'VERIFICAR SISTEMA DE REFRIGERAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'semestral', description: 'INSPECIONAR E SUBSTITUIR ANODO DE ZINCO (ANTICORROSÃO)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'SUBSTITUIR VELA DE IGNIÇÃO (300H OU 12 MESES)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'VERIFICAR E AJUSTAR FILTRO VST', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'INSPECIONAR CABOS DE COMANDO E ACELERADOR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'REVISÃO ELÉTRICA - CONECTORES - BATERIA E ALTERNADOR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'anual', description: 'SUBSTITUIR CORREIA DENTADA (1000H OU 5 ANOS)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
        ]
    },
];

/**
 * Mapeamento de tipo → cor para chips e ícones
 */
export const MAINTENANCE_TYPE_LABELS = {
    diaria: 'Diária',
    semanal: 'Semanal',
    mensal: 'Mensal',
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual',
};

/**
 * Mapeamento tipo → cor para UI
 */
export const MAINTENANCE_TYPE_COLORS = {
    diaria: '#e91e63',
    semanal: '#9c27b0',
    mensal: '#2196f3',
    trimestral: '#009688',
    semestral: '#ff9800',
    anual: '#795548',
};

/**
 * Ordem de prioridade dos tipos (para ordenação)
 */
export const MAINTENANCE_TYPE_ORDER = {
    diaria: 1,
    semanal: 2,
    mensal: 3,
    trimestral: 4,
    semestral: 5,
    anual: 6,
};

export default MAINTENANCE_TEMPLATES;
