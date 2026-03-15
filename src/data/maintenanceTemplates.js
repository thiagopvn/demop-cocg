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
            { type: 'cada_180_dias', description: 'INSPEÇÃO VISUAL GERAL (CARCAÇA - CABOS - FIXAÇÕES)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR RUÍDOS E VIBRAÇÕES ANORMAIS DURANTE FUNCIONAMENTO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR TEMPERATURA DO MOTOR DURANTE OPERAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'LIMPAR PÁS E HÉLICE COM PANO ÚMIDO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'LIMPAR CARCAÇA E GRADE DE PROTEÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'VERIFICAR FIXAÇÃO DOS PARAFUSOS E SUPORTES', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'VERIFICAR ESTADO DOS CABOS ELÉTRICOS E CONEXÕES', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'LUBRIFICAR ROLAMENTOS (CONFORME MANUAL DO FABRICANTE)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'VERIFICAR ALINHAMENTO E BALANCEAMENTO DO EIXO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'LIMPAR INTERIOR DA CARCAÇA DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'VERIFICAR E APERTAR CONEXÕES ELÉTRICAS NO PAINEL E TOMADA', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'APERTAR PORCAS E PARAFUSOS DA HÉLICE', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'VERIFICAR DESGASTE DOS ROLAMENTOS (FOLGA E RUÍDO)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'MEDIR AMPERAGEM DO MOTOR (VERIFICAR CONSUMO ELÉTRICO)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'VERIFICAR ISOLAMENTO ELÉTRICO DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAÇÃO ELÉTRICA COMPLETA (ENROLAMENTO - CAPACITOR - ATERRAMENTO)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR ROLAMENTOS SE NECESSÁRIO', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'REVISÃO GERAL DOS CONTATOS E PROTEÇÕES ELÉTRICAS', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAR E TESTAR CHAVE DE PARTIDA E PROTEÇÃO TÉRMICA', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
        ]
    },
    {
        id: 'ventilador_caf',
        keywords: ['ventilador a combustao', 'ventilador a combustão', 'power blower', 'caf', 'cone air flow'],
        excludeKeywords: ['eletrico', 'elétrico', 'acoplamento', 'adaptador', 'traqueia', 'exaustor', 'mangueira'],
        brand: null,
        label: 'Ventilador a Combustão - Power Blower CAF',
        maintenances: [
            { type: 'cada_180_dias', description: 'AJUSTAR TENSÃO DA CORREIA (BELT-DRIVE)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'INSPECIONAR E LIMPAR CARCAÇA DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'LIMPAR ELEMENTO DE ESPUMA OU PAPEL DO FILTRO DE AR', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'SUBSTITUIR CORREIA (BELT-DRIVE)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'TROCAR ÓLEO DO MOTOR (SAE 10W-30 HONDA / SAE 30 BRIGGS)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'INSPECIONAR E LIMPAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
        ]
    },
    {
        id: 'motosserra_stihl',
        keywords: ['motosserra'],
        excludeKeywords: ['corte de concreto'],
        brand: 'stihl',
        label: 'Motosserra Stihl',
        maintenances: [
            { type: 'cada_180_dias', description: 'VERIFICAR NÍVEIS DE ÓLEO DE CORRENTE E COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'CHECAR TENSÃO E LUBRIFICAÇÃO DA CORRENTE', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'INSPECIONAR VAZAMENTOS - FREIO DE CORRENTE - SABRE E PARAFUSOS SOLTOS', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR DESGASTE DO PINHÃO DA CORRENTE', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'REBARBAR O SABRE', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR E AFIAR A CORRENTE (ÂNGULO 30 GRAUS)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'LIMPAR FILTRO DE AR COM DETERGENTE E ÁGUA (PH MAIOR 12) E ENXAGUAR', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'LEVAR A POSTO STIHL PARA LIMPEZA DE TANQUES E CABEÇOTE DE ASPIRAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_120_dias', description: 'REVISAR FUNCIONAMENTO DO FREIO DA CORRENTE EM CONCESSIONÁRIA STIHL', priority: 'alta', estimatedDuration: 2, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'REVISAR FREIO DA CORRENTE', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'AJUSTAR CARBURADOR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'VENTILAR DRENO DE CÂMARA DE COMBUSTÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR CABEÇOTE DE ASPIRAÇÃO NO TANQUE EM CONCESSIONÁRIA', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
        ]
    },
    {
        id: 'motosserra_husqvarna',
        keywords: ['motosserra'],
        excludeKeywords: ['corte de concreto'],
        brand: 'husqvarna',
        label: 'Motosserra Husqvarna 385XP',
        maintenances: [
            { type: 'cada_180_dias', description: 'VERIFICAR NÍVEL DE ÓLEO DA CORRENTE E AJUSTAR BOMBA DE LUBRIFICAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'INSPECIONAR FREIO DE CORRENTE E TESTAR SISTEMA DE PARADA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'CHECAR TENSÃO E DESGASTE DA CORRENTE E PINHÃO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'LIMPAR CARCAÇAS DE REFRIGERAÇÃO E DISSIPADORES DE CALOR', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'INSPECIONAR E AJUSTAR EMBREAGEM CENTRÍFUGA (ROLAMENTO - MOLAS - PATINS)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'DESMONTAR E LIMPAR CARBURADOR E EXECUTAR TESTE DE PRESSÃO E VEDAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'LIMPAR TANQUE DE COMBUSTÍVEL E SUBSTITUIR FILTRO DE ALIMENTAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'SUBSTITUIR VELA DE IGNIÇÃO (CHAMPION RCJ 7Y GAP 0.5MM)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'VERIFICAR SISTEMA DE IGNIÇÃO E CONEXÕES ELÉTRICAS', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'REVISAR RETENTORES E JUNTAS DO CÁRTER', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'SUBSTITUIR FILTROS DE AR E ÓLEO DA CORRENTE (ESPUMA E PAPEL)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'REVISÃO COMPLETA EM CONCESSIONÁRIA - ROLAMENTOS DO VIRABREQUIM E AJUSTE DE TUCHOS', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
        ]
    },
    {
        id: 'motobomba_toyama',
        keywords: ['motobomba'],
        brand: 'toyama',
        label: 'Motobomba Toyama 4T',
        maintenances: [
            { type: 'cada_180_dias', description: 'VERIFICAR NÍVEL DE ÓLEO DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR NÍVEL DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'INSPECIONAR EXISTÊNCIA DE VAZAMENTOS', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'LIMPAR FILTRO DE AR EXTERNO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR FIXAÇÃO DE PARAFUSOS', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'TROCAR ÓLEO DO MOTOR (10W-30) - REVISÃO INICIAL (ATÉ 20H/1 MÊS)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'LIMPAR ELEMENTO DO FILTRO DE AR (ESPUMA E PAPEL) - REVISÃO INICIAL', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'LIMPAR ELEMENTO DO FILTRO DE AR (ESPUMA E PAPEL)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'TROCAR ÓLEO DO MOTOR (10W-30)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'VERIFICAR E LIMPAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'TROCAR ÓLEO DO MOTOR (10W-30) - REVISÃO SEMESTRAL', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'VERIFICAR E LIMPAR VELA DE IGNIÇÃO - REVISÃO SEMESTRAL', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'SUBSTITUIR ELEMENTO DO FILTRO DE AR (SE DANIFICADO)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'SUBSTITUIR VELA DE IGNIÇÃO (GAP 0.7-0.8MM)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR FILTRO DE AR (ESPUMA E PAPEL)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'TROCAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAR E TROCAR MANGUEIRA DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
        ]
    },
    {
        id: 'motobomba_honda',
        keywords: ['motobomba'],
        brand: 'honda',
        label: 'Motobomba Honda',
        maintenances: [
            { type: 'cada_180_dias', description: 'VERIFICAR NÍVEL DE ÓLEO DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR FILTRO DE AR EXTERNO PARA SUJEIRA GROSSA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'LIMPAR ELEMENTO DO FILTRO DE AR (ESPUMA E PAPEL)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'TROCAR ÓLEO DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'VERIFICAR E AJUSTAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'LIMPAR TANQUE E FILTRO DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'LIMPAR COPO DE SEDIMENTOS', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR VELA DE IGNIÇÃO (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAR E AJUSTAR FOLGA DAS VÁLVULAS (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAR AJUSTE DA MARCHA LENTA (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAR AJUSTE DAS VÁLVULAS (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'LIMPAR TANQUE DE COMBUSTÍVEL (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAR IMPULSOR E FOLGA DO IMPULSOR (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAR VÁLVULA DE ENTRADA DA BOMBA (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'LIMPAR CÂMARA DE COMBUSTÃO (ASSISTÊNCIA ESPECIALIZADA) - A CADA 500H', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAR TUBULAÇÃO DE COMBUSTÍVEL - MANGUEIRAS E CONEXÕES (ASSISTÊNCIA ESPECIALIZADA) - A CADA 2 ANOS', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
        ]
    },
    {
        id: 'gerador_toyama',
        keywords: ['gerador'],
        brand: 'toyama',
        label: 'Gerador Toyama 4T',
        maintenances: [
            { type: 'cada_180_dias', description: 'LIMPAR FILTRO DE AR', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'TROCAR ÓLEO DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'VERIFICAR E LIMPAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR ELEMENTO DO FILTRO DE AR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAR E AJUSTAR FOLGA DAS VÁLVULAS', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAR E TROCAR TUBO DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
        ]
    },
    {
        id: 'gerador_honda',
        keywords: ['gerador'],
        brand: 'honda',
        label: 'Gerador Honda 4T',
        maintenances: [
            { type: 'cada_180_dias', description: 'LIMPAR FILTRO DE AR', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'TROCAR ÓLEO DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'LIMPAR COPO DE SEDIMENTOS', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'VERIFICAR E AJUSTAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'LIMPAR TANQUE E FILTRO DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAR E AJUSTAR FOLGA DAS VÁLVULAS (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'LIMPAR CÂMARA DE COMBUSTÃO (ASSISTÊNCIA ESPECIALIZADA)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAR TUBULAÇÃO DE COMBUSTÍVEL - A CADA 2 ANOS', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
        ]
    },
    {
        id: 'soprador_costal',
        keywords: ['soprador'],
        brand: null,
        label: 'Soprador Costal',
        maintenances: [
            { type: 'cada_180_dias', description: 'LIMPAR FILTRO DE AR', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'INSPECIONAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
        ]
    },
    {
        id: 'motorebolo_stihl',
        keywords: ['motorebolo', 'motocortadora', 'cortadora de concreto', 'cortadora'],
        brand: 'stihl',
        label: 'Motorebolo Stihl',
        maintenances: [
            { type: 'cada_180_dias', description: 'TESTE VISUAL (ESTADO E VEDAÇÃO) DA MÁQUINA COMPLETA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'TESTE DE FUNCIONAMENTO DOS ELEMENTOS DE MANEJO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR BOMBA MANUAL DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR CONEXÃO DA ÁGUA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR MARCHA LENTA DO CARBURADOR (DISCO NÃO DEVE MOVER)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR ELEMENTOS ANTIVIBRAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR DISCO DE CORTE', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'LIMPAR E REESTRICAR CORREIA ESTRIADA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'LIMPAR ALETAS DE REFRIGERAÇÃO E ASPIRAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR CONEXÃO DA ÁGUA - REVISÃO SEMANAL', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'REGULAR MARCHA LENTA DO CARBURADOR', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'REAPERTAR PARAFUSOS E PORCAS ACESSÍVEIS', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR ELEMENTOS ANTIVIBRAÇÃO - REVISÃO SEMANAL', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR E SUBSTITUIR DISCO DE CORTE (SE NECESSÁRIO)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR APOIO E AMORTECEDOR DE BORRACHA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'LIMPAR MÁQUINA COMPLETA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'FAZER MANUTENÇÃO DA BOMBA MANUAL EM PONTO DE VENDAS', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'LIMPAR TANQUE DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'AJUSTAR DISTÂNCIA DOS ELETRODOS DA VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'REAPERTAR PARAFUSOS E PORCAS ACESSÍVEIS - REVISÃO MENSAL', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR CORREIA ESTRIADA', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR CABEÇOTE DE ASPIRAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR FILTRO DE AR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'LIMPAR ALETAS DO CILINDRO EM PONTO DE VENDAS', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR ELEMENTOS ANTIVIBRAÇÃO EM PONTO DE VENDAS', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR APOIO E AMORTECEDOR DE BORRACHA', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'REAPERTAR PARAFUSOS E PORCAS - REVISÃO ANUAL', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR ETIQUETA DE SEGURANÇA', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
        ]
    },
    {
        id: 'compressor_coltri',
        keywords: ['compressor'],
        excludeKeywords: ['bancada', 'ferrari', 'ar comprimido'],
        brand: 'coltri',
        label: 'Compressor Coltri MCH 8',
        maintenances: [
            { type: 'cada_180_dias', description: 'DESCARGA DE CONDENSADO - VERIFICAÇÃO E LIMPEZA (5H)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'DESCARGA DE CONDENSADO - VERIFICAÇÃO E LIMPEZA (10H)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAÇÃO DO DESLIGAMENTO AUTOMÁTICO (10H)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAÇÃO DO NÍVEL DO ÓLEO LUBRIFICANTE (10H)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'FILTRO DE AR - LIMPEZA SE HOUVER ACÚMULO DE POEIRA (50H)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'DESCARGA DE CONDENSADO - VERIFICAÇÃO E LIMPEZA (250H)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'VERIFICAÇÃO DO DESLIGAMENTO AUTOMÁTICO (250H)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'VERIFICAÇÃO DO NÍVEL DO ÓLEO LUBRIFICANTE (250H)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'VERIFICAÇÃO E TENSÃO DA CORREIA - DESGASTE E LIMPEZA (250H)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'DESCARGA DE CONDENSADO - VERIFICAÇÃO E LIMPEZA (500H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'VERIFICAÇÃO DAS FUNÇÕES PRINCIPAIS (500H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'VÁLVULAS DE DESCARGA DE CONDENSADO - LIMPEZA (500H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'VERIFICAÇÃO E TENSÃO DA CORREIA (500H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'ELEMENTO FILTRANTE SEPARADOR - LIMPEZA (500H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'TROCA DE ÓLEO (500H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAÇÃO DAS FUNÇÕES PRINCIPAIS (1000H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VÁLVULAS DE DESCARGA DE CONDENSADO - LIMPEZA (1000H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'TROCA DA CORREIA (1000H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'ELEMENTO FILTRANTE SEPARADOR - TROCA (1000H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'TROCA DE ÓLEO (1000H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAÇÃO DAS VÁLVULAS DE 1° E 2° ESTÁGIO (1000H)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'ANÉIS DE VEDAÇÃO PARA DESCARGA DE CONDENSADO - TROCA (2000H)', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'TROCA DA CORREIA (2000H)', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'ELEMENTO FILTRANTE SEPARADOR - TROCA (2000H)', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'TROCA DE ÓLEO (2000H)', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VÁLVULAS DE DESCARGA DE CONDENSADO - TROCA (2000H)', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAÇÃO DAS VÁLVULAS DE 3° ESTÁGIO (2000H)', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
        ]
    },
    {
        id: 'motopoda_2t',
        keywords: ['motopoda', 'moto poda', 'podador'],
        brand: null,
        label: 'Motopoda 2T',
        maintenances: [
            { type: 'cada_180_dias', description: 'VERIFICAR NÍVEL DE COMBUSTÍVEL (MISTURA GASOLINA + ÓLEO 2T)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR FILTRO DE AR', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR ESTADO DAS LÂMINAS DE PODA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR PARAFUSOS E FIXAÇÕES', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'TESTAR FREIO E ELEMENTOS DE SEGURANÇA', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'LIMPAR FILTRO DE AR (ESPUMA)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'LIMPAR LÂMINAS DE CORTE', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR DESGASTE DAS LÂMINAS', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'LIMPAR ALETAS DE ARREFECIMENTO DO CILINDRO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'LIMPAR EMBREAGEM E TAMBOR', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'DESCARBONAR ESCAPAMENTO E JANELA DE SAÍDA DO CILINDRO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'LAVAR TANQUE DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'INSPECIONAR E LIMPAR MÓDULO ELETRÔNICO (BOBINA)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'LIMPAR CONJUNTO DE PARTIDA', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'VERIFICAR E AJUSTAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'VERIFICAR MOLA E CORDEL DO ARRANQUE', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'SUBSTITUIR FILTRO DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'SUBSTITUIR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'LIMPAR E CALIBRAR MÓDULO ELETRÔNICO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'DESCARBONAR PISTÃO - CILINDRO E ANÉIS', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'REVISÃO COMPLETA EM ASSISTÊNCIA TÉCNICA AUTORIZADA', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR LÂMINAS DE CORTE (SE DESGASTADAS)', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAR E SUBSTITUIR AMORTECEDORES DE VIBRAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
        ]
    },
    {
        id: 'motor_rabeta_4t',
        keywords: ['motor de rabeta', 'rabeta', 'motor rabeta'],
        brand: null,
        label: 'Motor de Rabeta 4T',
        maintenances: [
            { type: 'cada_180_dias', description: 'VERIFICAR NÍVEL DE ÓLEO DO MOTOR', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR NÍVEL DE ÓLEO DA RABETA (CÂMBIO)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR HÉLICE (TRINCAS E DEFORMAÇÕES)', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'VERIFICAR FIXAÇÃO DO MOTOR NA EMBARCAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'INSPECIONAR MANGUEIRAS E CONEXÕES DE COMBUSTÍVEL', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: "LAVAR EXTERNAMENTE COM ÁGUA DOCE APÓS USO", priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'TROCA DE ÓLEO DO MOTOR - REVISÃO INICIAL (20H OU 1 MÊS)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'TROCA DE ÓLEO DA RABETA - REVISÃO INICIAL (20H OU 1 MÊS)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'VERIFICAR TORQUE DOS PARAFUSOS PRINCIPAIS', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'TROCAR ÓLEO DO MOTOR (100H OU 6 MESES)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'TROCAR ÓLEO DA RABETA (100H OU 6 MESES)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'SUBSTITUIR FILTRO DE COMBUSTÍVEL DECANTADOR (100H)', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'VERIFICAR E LIMPAR VELA DE IGNIÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: "LAVAR EXTERNAMENTE COM ÁGUA DOCE - REVISÃO TRIMESTRAL", priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: "SUBSTITUIR ROTOR DA BOMBA D'ÁGUA (200H OU 6 MESES)", priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: "SUBSTITUIR FILTROS DE COMBUSTÍVEL - LINHA E SEPARADOR D'ÁGUA", priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'VERIFICAR SISTEMA DE REFRIGERAÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'INSPECIONAR E SUBSTITUIR ANODO DE ZINCO (ANTICORROSÃO)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR VELA DE IGNIÇÃO (300H OU 12 MESES)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'VERIFICAR E AJUSTAR FILTRO VST', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'INSPECIONAR CABOS DE COMANDO E ACELERADOR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'REVISÃO ELÉTRICA - CONECTORES - BATERIA E ALTERNADOR', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIR CORREIA DENTADA (1000H OU 5 ANOS)', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
        ]
    },
    {
        id: 'furadeira',
        keywords: ['furadeira'],
        excludeKeywords: ['broca', 'ponta', 'mandril avulso'],
        brand: null,
        label: 'Furadeira',
        maintenances: [
            { type: 'cada_180_dias', description: 'LIMPEZA EXTERNA DA CARCAÇA E ABERTURAS DE VENTILAÇÃO COM PANO SECO OU AR COMPRIMIDO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'INSPEÇÃO VISUAL DO CABO DE ALIMENTAÇÃO - VERIFICAR CORTES E RACHADURAS', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'LUBRIFICAÇÃO DO MANDRIL E MECANISMO DE AJUSTE COM LUBRIFICANTE DE SILICONE', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'VERIFICAR E APERTAR PARAFUSOS E FIXAÇÕES EXTERNAS', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'INSPEÇÃO DAS ESCOVAS DE CARVÃO - VERIFICAR DESGASTE E SUBSTITUIR SE NECESSÁRIO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'LUBRIFICAÇÃO DAS ENGRENAGENS E ROLAMENTOS INTERNOS COM GRAXA RECOMENDADA', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'SUBSTITUIÇÃO DAS ESCOVAS DE CARVÃO (USO PROFISSIONAL E CONTÍNUO)', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'REVISÃO GERAL - DESMONTAGEM - LIMPEZA DE BOBINAS - INDUZIDO - BUCHAS E SISTEMA ELÉTRICO', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
        ]
    },
    {
        id: 'retifica',
        keywords: ['retifica', 'retífica', 'dremel'],
        excludeKeywords: ['disco da', 'ponta de', 'acessorio'],
        brand: null,
        label: 'Mini Retífica',
        maintenances: [
            { type: 'cada_180_dias', description: 'LIMPEZA DA CARCAÇA E RETIRADA DE POEIRA DAS ABERTURAS COM PINCEL OU AR COMPRIMIDO', priority: 'media', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_180_dias', description: 'INSPEÇÃO VISUAL DO CABO E VERIFICAÇÃO DO REGULADOR DE VELOCIDADE', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'LIMPEZA DOS CONTATOS COM LIMPA-CONTATO - PREVENIR OSCILAÇÃO DE VELOCIDADE', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'INSPEÇÃO E SUBSTITUIÇÃO DAS ESCOVAS DE CARVÃO SE NECESSÁRIO', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'LUBRIFICAÇÃO DO ROLAMENTO COM GRAXA - PREVENÇÃO', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'LIMPEZA DOS POLOS DO MOTOR E VERIFICAÇÃO DO EIXO E MANDRIL', priority: 'media', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'REVISÃO GERAL - DESMONTAGEM - LIMPEZA DE TODOS OS COMPONENTES INTERNOS E VERIFICAÇÃO DO SISTEMA ELÉTRICO', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
        ]
    },
    {
        id: 'desencarcerador_hidraulico_holmatro',
        keywords: ['desencarcerador'],
        excludeKeywords: ['adaptador', 'carregador', 'corrente', 'gancho', 'mangueira', 'suporte', 'pinça'],
        brand: 'holmatro',
        label: 'Desencarcerador Hidráulico Holmatro',
        maintenances: [
            { type: 'cada_120_dias', description: 'VERIFICAÇÃO DAS CONDIÇÕES GERAIS DA FERRAMENTA - VAZAMENTOS E DANOS', priority: 'alta', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_120_dias', description: 'LIMPEZA E SECAGEM DA FERRAMENTA COM PANO MACIO - APLICAR WD40 NAS PARTES METÁLICAS', priority: 'alta', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_120_dias', description: 'VERIFICAÇÃO E LIMPEZA DOS ACOPLADORES E TAMPAS ANTI-PÓ - VERIFICAR VAZAMENTO DE ÓLEO', priority: 'alta', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_90_dias', description: 'LUBRIFICAÇÃO DAS LÂMINAS - ARTICULAÇÕES E BRAÇADEIRAS COM ÓLEO TEFLON', priority: 'alta', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'VERIFICAÇÃO DA LEGIBILIDADE DO RÓTULO DE IDENTIFICAÇÃO E SEGURANÇA', priority: 'media', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_90_dias', description: 'INSPEÇÃO DAS MANGUEIRAS HIDRÁULICAS - VERIFICAR DESGASTE - BOLHAS - VAZAMENTOS E ACESSÓRIOS', priority: 'alta', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_90_dias', description: 'VERIFICAÇÃO E AJUSTE DO TORQUE DOS PARAFUSOS PRINCIPAIS - 100 NM', priority: 'alta', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'TROCA DO FLUIDO HIDRÁULICO E ÓLEO DO MOTOR - VERIFICAÇÃO DE VÁLVULAS', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'TESTE DE DESEMPENHO DA BOMBA HIDRÁULICA - VERIFICAÇÃO DE TODAS AS VÁLVULAS', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'INSPEÇÃO E MANUTENÇÃO COMPLETA POR TÉCNICO AUTORIZADO HOLMATRO - SUBSTITUIÇÃO DE O-RINGS E RETENTORES', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'TESTE OPERACIONAL COMPLETO - VERIFICAÇÃO DE PRESSÃO E DESEMPENHO', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
        ]
    },
    {
        id: 'desencarcerador_eletrico_holmatro',
        keywords: ['desencarcerador'],
        excludeKeywords: ['adaptador', 'carregador', 'corrente', 'gancho', 'mangueira', 'suporte', 'pinça'],
        brand: 'holmatro',
        label: 'Desencarcerador Elétrico Holmatro',
        maintenances: [
            { type: 'cada_120_dias', description: 'VERIFICAÇÃO DAS CONDIÇÕES GERAIS DA FERRAMENTA - VAZAMENTOS - DANOS E LED INDICADOR', priority: 'alta', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_120_dias', description: 'VERIFICAÇÃO DO NÍVEL DE CARGA DA BATERIA - MANTER CARREGADA', priority: 'alta', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_120_dias', description: 'LIMPEZA DA FERRAMENTA COM PANO MACIO - APLICAR WD40 NAS LÂMINAS PARA PREVENIR CORROSÃO', priority: 'alta', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_90_dias', description: 'LUBRIFICAÇÃO DOS PONTOS DE ARTICULAÇÃO E LÂMINAS COM ÓLEO TEFLON', priority: 'alta', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_90_dias', description: 'VERIFICAÇÃO DOS CONECTORES DA BATERIA - LIMPAR CORROSÃO - VERIFICAR DANOS', priority: 'alta', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_90_dias', description: 'VERIFICAÇÃO DOS ACOPLADORES E TAMPAS ANTI-PÓ - LIMPEZA COM PANO MACIO', priority: 'alta', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_90_dias', description: 'LUBRIFICAR PONTOS PIVOTANTES DOS BRAÇOS ESPALHADORES E LÂMINAS DO CORTADOR', priority: 'alta', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_365_dias', description: 'INSPEÇÃO E MANUTENÇÃO COMPLETA POR TÉCNICO AUTORIZADO HOLMATRO - SISTEMA HIDRÁULICO FECHADO', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'TESTE OPERACIONAL COMPLETO E VERIFICAÇÃO DO CICLO DE CARGA DA BATERIA', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
        ]
    },
    {
        id: 'desencarcerador_hidraulico_lukas',
        keywords: ['desencarcerador', 'cilindro expansor', 'cortador hidraulico', 'ferramenta de corte hidraulic', 'ferramenta de separacao hidraulic'],
        excludeKeywords: ['adaptador', 'carregador', 'corrente', 'gancho', 'mangueira', 'suporte', 'pinça'],
        brand: 'lukas',
        label: 'Desencarcerador Hidráulico Lukas',
        maintenances: [
            { type: 'cada_120_dias', description: 'INSPEÇÃO VISUAL APÓS USO - VERIFICAR CONDIÇÕES GERAIS E VAZAMENTOS DE ÓLEO', priority: 'alta', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_120_dias', description: 'VERIFICAR NÍVEL DO FLUIDO HIDRÁULICO NO RESERVATÓRIO', priority: 'alta', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_120_dias', description: 'FECHAR OS BRAÇOS DEIXANDO 10 A 15 MM DE DISTÂNCIA APÓS USO - ALIVIAR PRESSÃO HIDRÁULICA', priority: 'alta', estimatedDuration: 1, reminderDays: 3 },
            { type: 'cada_90_dias', description: 'LIMPEZA DE TODAS AS PEÇAS E ACOPLADORES COM PANO MACIO - REMOVER SUJEIRA DOS CONECTORES', priority: 'alta', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_90_dias', description: 'VERIFICAÇÃO DAS MANGUEIRAS HIDRÁULICAS - VERIFICAR DOBRAS - BOLHAS - ARAME INTERNO VISÍVEL E VAZAMENTOS', priority: 'alta', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_90_dias', description: 'TESTE DE FUNCIONAMENTO - LIGAR O EQUIPAMENTO E VERIFICAR OPERAÇÃO CORRETA DE TODAS AS FERRAMENTAS', priority: 'alta', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_90_dias', description: 'LUBRIFICAÇÃO DE TODAS AS PARTES MÓVEIS - ARTICULAÇÕES E BRAÇOS COM GRAXA RECOMENDADA', priority: 'alta', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_90_dias', description: 'VERIFICAÇÃO E LIMPEZA DO ELEMENTO FILTRANTE DO FILTRO DE AR - A CADA 50 HORAS OU AMBIENTE POEIRENTO', priority: 'alta', estimatedDuration: 1, reminderDays: 7 },
            { type: 'cada_180_dias', description: 'TROCA DO ÓLEO DO MOTOR A CADA 100 HORAS DE OPERAÇÃO', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_180_dias', description: 'SUBSTITUIÇÃO DA VELA DE IGNIÇÃO E AJUSTE DO GAP DO ELETRODO A CADA 100 HORAS', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'SUBSTITUIÇÃO DO FILTRO DE AR E VELA DE IGNIÇÃO A CADA 200 HORAS', priority: 'alta', estimatedDuration: 1, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'LIMPEZA E AJUSTE DO CARBURADOR - FOLGA DAS VÁLVULAS - SEDE E CABEÇA DO CILINDRO A CADA 300 HORAS - CONCESSIONÁRIA', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
            { type: 'cada_365_dias', description: 'INSPEÇÃO GERAL DO MOTOR - VERIFICAR PARTIDA - LINHA DE COMBUSTÍVEL E DANOS A CADA 1000 HORAS OU 2 ANOS', priority: 'alta', estimatedDuration: 2, reminderDays: 14 },
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
    cada_90_dias: 'A cada 90 dias',
    cada_120_dias: 'A cada 120 dias',
    cada_180_dias: 'A cada 180 dias',
    cada_365_dias: 'A cada 365 dias',
    corretiva: 'Corretiva',
    reparo: 'Reparo',
    customizado: 'Personalizado',
};

/**
 * Retorna o label de exibição para um tipo de manutenção.
 * Suporta tipos fixos e customizados com dias personalizados.
 */
export const getMaintenanceTypeLabel = (type, customRecurrenceDays) => {
    if (MAINTENANCE_TYPE_LABELS[type]) return MAINTENANCE_TYPE_LABELS[type];
    if (type === 'customizado' && customRecurrenceDays) return `A cada ${customRecurrenceDays} dias`;
    return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'N/A';
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
    cada_90_dias: '#00897b',
    cada_120_dias: '#5c6bc0',
    cada_180_dias: '#2196f3',
    cada_365_dias: '#8d6e63',
    corretiva: '#f44336',
    reparo: '#ff5722',
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
    cada_90_dias: 3.5,
    cada_120_dias: 4.5,
    cada_180_dias: 5.5,
    cada_365_dias: 6.5,
    corretiva: 7,
    reparo: 8,
};

/**
 * Mapeamento de tipo → intervalo em dias (para tipos com dias fixos)
 */
export const MAINTENANCE_TYPE_DAYS = {
    cada_90_dias: 90,
    cada_120_dias: 120,
    cada_180_dias: 180,
    cada_365_dias: 365,
};

export default MAINTENANCE_TEMPLATES;
