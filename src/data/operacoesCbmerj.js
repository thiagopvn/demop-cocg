/**
 * Operações do CBMERJ — material previsto por nota (levantamento de 15/09/2026
 * sobre os boletins de 2020 a 2026). Para cada operação recorrente consta apenas
 * a nota mais recente. Estes dados semeiam a coleção `operacoes` na primeira
 * abertura do módulo pelo admingeral; depois disso a edição é feita na tela.
 *
 * Quantidades são as fixadas pela nota (não mudam com o estoque). O vínculo com
 * o material do DEMOP (`material_id`) é feito na tela e é ele que traz o local
 * de guarda, a foto e o nome atual do cadastro.
 */

const item = (nome, quantidade = null, extra = {}) => ({ nome, quantidade, unidade: '', observacao: '', sinonimos: [], material_id: null, ...extra });
const link = (rotulo, url, tipo = 'boletim') => ({ rotulo, url, tipo });
const obs = (titulo, texto) => ({ titulo, texto });

export const NPEPI_REFERENCIA = {
    titulo: 'EPI: todas as notas remetem à NPEPI/CBMERJ',
    texto: 'Nota CHEMG 174/2021 (Bol 031, de 19/02/2021, Anexo IV), reforçada pelo alerta da Nota CHEMG 681/2024 (Bol 037, de 24/10/2024).',
    links: [
        link('NPEPI — Bol 031/2021', 'https://drive.google.com/file/d/1-uxxVoHxD-ixiHPKcthEAcDKgUSuhU9e/view'),
        link('Alerta NPEPI — Bol 037/2024', 'https://drive.google.com/file/d/1s_skAMd64F0ud7_2w6zvKUbFtOQ-NENY/view'),
    ],
};

export const SOBRE_LEVANTAMENTO = [
    'Levantamento feito em 15/09/2026 sobre os boletins de 2020 a 2026 do acervo (_acervo/_texto). Para cada operação recorrente consta apenas a nota mais recente, da mais nova para a mais antiga.',
    'Os boletins ficam na pasta 1-Boletins do Drive; quando a nota já está recortada no Livro de Ordens, o link do recorte vem junto.',
    'Os Bol 213, 217, 219 e 221/2025 e 086/2026 estavam sem camada de texto no acervo; foram OCRizados (tesseract). As tabelas do Pluvian foram conferidas na imagem da página.',
    'Verificação por varredura de "operação <nome>" em todos os boletins de 2020-2026; Verão, Réveillon e Carnaval têm PTO todo ano, e só a edição mais recente foi listada.',
];

export const OPERACOES_PADRAO = [
    /* ------------------------------------------------------------------ */
    /* 1. Extinctus                                                        */
    /* ------------------------------------------------------------------ */
    {
        chave: 'extinctus-2026',
        ordem: 1,
        categoria: 'operacao',
        icone: 'fogo',
        cor: '#ea580c',
        nome: 'Operação Extinctus 2026',
        subtitulo: 'Fogo em vegetação / estiagem',
        nota: 'Nota CHEMG 624/2026',
        boletim: 'Bol SEDEC/CBMERJ nº 101, de 10/06/2026',
        folhas: 'fls. 7-11',
        vigencia: '09/06/2026 a 15/10/2026',
        descricao: 'Plano tático-operacional para o período de estiagem.',
        links: [
            link('Boletim', 'https://drive.google.com/file/d/1WuqefbSY-hmoDVhmkGXd7OXtck-n47Nf/view'),
            link('Nota recortada (Livro de Ordens 2026)', 'https://drive.google.com/file/d/1wO7NGhuuIT7Z2UYccH0ypoh5FMnyES4Y/view', 'recorte'),
        ],
        secoes: [
            {
                titulo: 'Material por GRD — composição CIF',
                referencia: 'item 6.2',
                itens: [
                    item('Abafadores', 6),
                    item('Enxadas e/ou McLeod', 6),
                    item('Mochila costal', 5, { observacao: 'Bomba costal.', sinonimos: ['bomba costal'] }),
                    item('Pás de campanha', 6),
                    item('Facões', 2),
                    item('Sopradores', 2),
                    item('Rádio portátil', 3),
                ],
            },
        ],
        observacoes: [
            obs('GRD (item 6.1)', '01 AR; 01 oficial intermediário ou subalterno (líder); 01 praça condutor; 03 praças auxiliares; equipamentos do item 6.2; uniforme e EPI.'),
            obs('Uniforme e EPI (itens 7.1 e 7.2)', 'Uniforme: o característico de cada função. EPI: mínimos da NPEPI (CHEMG 174/2021).'),
            obs('Tanques de água (itens 8.3 e 8.4)', 'Cadastro no SisGeO dos tanques flexível (TFA) e rígido de água; quem tem TFA providencia lona de proteção para a montagem.'),
            obs('Plano por unidade (item 8.1)', 'Plano de operações de fogo em vegetação por unidade, com infiltração, exfiltração, pouso de aeronave e captação de água.'),
        ],
    },

    /* ------------------------------------------------------------------ */
    /* 2. Pluvian                                                          */
    /* ------------------------------------------------------------------ */
    {
        chave: 'pluvian-2025-2026',
        ordem: 2,
        categoria: 'operacao',
        icone: 'chuva',
        cor: '#2563eb',
        nome: 'Operação Pluvian 2025/2026',
        subtitulo: 'Chuvas',
        nota: 'Nota CHEMG 1081/2025',
        boletim: 'Bol SEDEC/CBMERJ nº 213, de 19/11/2025',
        folhas: 'fls. 19-27',
        vigencia: '24/11/2025 a 30/04/2026',
        descricao: 'Plano tático-operacional. Encerrada pela Nota CHEMG 405/2026 (Bol 078, de 06/05/2026), com a estatística no Anexo VII.',
        links: [
            link('Boletim', 'https://drive.google.com/file/d/1qUQ5fjCbvARWFXcvXMbkccuYVo2KFl8A/view'),
            link('Nota recortada (Livro de Ordens 2025)', 'https://drive.google.com/file/d/10pEaf4ieno41y24RunC17OiOqogC6hay/view', 'recorte'),
        ],
        secoes: [
            {
                titulo: 'Material por GRD',
                referencia: 'item 5.4.3',
                itens: [
                    item('Alavanca', 2),
                    item('Tesourão', 1),
                    item('Pá de campanha', 2),
                    item('Pá de bico c/ punho', 2),
                    item('Enxada', 2),
                    item('Balde de obra', 5),
                    item('Malho de 5 kg ou mais', 1),
                    item('Rádio portátil c/ bateria reserva', 1),
                    item('Corda de prontidão (mínimo 30 m)', 1),
                    item('Saco de cadáver', 2),
                    item('Fita de isolamento (rolo)', 1),
                    item('Luva de procedimento (caixa)', 1),
                    item('Luz de cena', 1),
                    item('Lanterna cotovelo', 2),
                    item('Luva nitrílica de cano longo ou curto', 4),
                    item('Apito c/ cordel', 1),
                ],
            },
            {
                titulo: 'Pronto-emprego de cada GRD',
                referencia: 'item 5.4.3',
                itens: [
                    item('Barco de alumínio guarnecido em reboque', 1, { observacao: 'Com par de remos e motor de rabeta abastecido e combustível reserva.' }),
                    item('Par de remos', 1),
                    item('Motor de rabeta', 1, { observacao: 'Abastecido, com combustível reserva.' }),
                    item('Pino-bola na viatura AR', 1),
                ],
            },
            {
                titulo: 'EPI de cada militar da GRD',
                referencia: 'item 5.4.2',
                itens: [
                    item('Capacete de salvamento', 1, { unidade: 'por militar' }),
                    item('Colete tático de salvamento', 1, { unidade: 'por militar' }),
                    item('Cinto tático de salvamento', 1, { unidade: 'por militar' }),
                    item('Cotoveleira e joelheira', 1, { unidade: 'par por militar' }),
                    item('Cantil ou mochila de hidratação', 1, { unidade: 'por militar' }),
                    item('Luva de salvamento', 1, { unidade: 'par por militar' }),
                    item('Apito com cordel', 1, { unidade: 'por militar' }),
                    item('Protetor auricular', 1, { unidade: 'par por militar' }),
                    item('Máscara PFF2', 1, { unidade: 'por militar' }),
                    item('Jardineira', 1, { unidade: 'por militar' }),
                ],
            },
        ],
        observacoes: [
            obs('GRD (item 5.3.1)', '01 AR; 01 oficial líder; 01 condutor; 03 auxiliares; equipamentos do item 5.4.3; uniforme e EPI dos itens 5.4.1 e 5.4.2.'),
            obs('Quantidade de GRD (item 5.3.2)', '01 GRD do GBM (líder oficial) + 01 GRD a mais para cada 03 DBM/PABM subordinados, cadastradas no SisGeO logo após a passagem de serviço.'),
            obs('SCCO (item 7.3)', 'Os CBA devem manter os recursos de instalação do SCCO prontos para montar PC ou PCAv.'),
        ],
    },

    /* ------------------------------------------------------------------ */
    /* 3. Verão                                                            */
    /* ------------------------------------------------------------------ */
    {
        chave: 'verao-2025-2026',
        ordem: 3,
        categoria: 'operacao',
        icone: 'mar',
        cor: '#0d9488',
        nome: 'Operação Verão 2025/2026',
        subtitulo: 'Salvamento marítimo',
        nota: 'Nota CHEMG 1217/2025',
        boletim: 'Bol SEDEC/CBMERJ nº 231, de 18/12/2025',
        folhas: 'fls. 6-19',
        vigencia: '',
        descricao: 'Plano tático-operacional para eventos de prevenção e salvamento marítimo.',
        links: [
            link('Boletim', 'https://drive.google.com/file/d/1X_uTFo86uwO84JLzdVi6BShc6iEoTJmd/view'),
        ],
        secoes: [
            {
                titulo: 'Posto de comando avançado — checklist',
                referencia: 'Obs. 04 do item 8.3.3 (fl. 13) — única lista expressa de material de PC encontrada de 2020 para cá',
                itens: [
                    item('Tenda com toldo'),
                    item('Fita de isolamento'),
                    item('Saco para recolhimento de cadáver'),
                    item('Régua de tomadas 110 V'),
                    item('Mesa dobrável com 04 lugares'),
                    item('Flip-chart'),
                    item('Prancheta'),
                    item('Materiais de escritório'),
                    item('Viatura AR'),
                    item('Reboque pino-bola'),
                    item('Materiais operacionais'),
                    item('Rescue tube'),
                    item('Quadriciclo'),
                    item('Barraca de GV'),
                    item('Saco de resgate - arremesso'),
                    item('Rádios portáteis'),
                    item('Pranchão'),
                    item('Máscara de mergulho'),
                    item('Placa de identificação PC'),
                    item('Mapa de força'),
                    item('Mapa viaturas'),
                    item('Nadadeiras'),
                    item('Binóculo'),
                    item('Cones'),
                    item('Capacete'),
                    item('Cordelete de uso geral 10 m'),
                    item('Lanterna'),
                ],
            },
        ],
        observacoes: [
            obs('GRD diárias (Obs. 02)', 'CBA X mantém 04 GRD diárias (AR com 05 militares).'),
            obs('Apoio especializado (Obs. 03)', 'CBA VIII (aeronaves do GOA, mergulhadores do GBS, GOPP) via COCBMERJ.'),
            obs('Comunicações e EPI (itens 10.1 e 10.2)', 'Rádio oficial em todo posto de salvamento; EPI obrigatório.'),
        ],
    },

    /* ------------------------------------------------------------------ */
    /* 4. Réveillon                                                        */
    /* ------------------------------------------------------------------ */
    {
        chave: 'reveillon-2025-2026',
        ordem: 4,
        categoria: 'operacao',
        icone: 'festa',
        cor: '#7c3aed',
        nome: 'Operação Réveillon 2025/2026',
        subtitulo: 'Copacabana',
        nota: 'Nota CHEMG 1230/2025',
        boletim: 'Bol SEDEC/CBMERJ nº 234, de 23/12/2025',
        folhas: 'fls. 5-17',
        vigencia: '',
        descricao: 'Plano tático-operacional. Viaturas equipadas conforme as relações de material-carga (Obs. 1 a 3 do item 7.3.2).',
        links: [
            link('Boletim', 'https://drive.google.com/file/d/1jaotPk1pux2DgSqWGB-eMdilK8kjK2rx/view'),
        ],
        secoes: [
            {
                titulo: 'Mínimo do AR-491 (FT-01)',
                referencia: 'Obs. 1 a 3 do item 7.3.2',
                itens: [
                    item('Extintor PQS', 1),
                    item('Extintor CO2', 1),
                    item('Desencarcerador', 1),
                    item('Kit de arrombamento', 1, { observacao: 'Halligan, alavanca e luvas de raspa de couro.' }),
                    item('Kit de retirada de pessoa em elevador', 1),
                    item('Corda de uso geral', 1),
                    item('Fita de isolamento', 1),
                ],
            },
            {
                titulo: 'Mínimo do AR-568 (FT-04)',
                referencia: 'o mesmo do AR-491, sem o desencarcerador',
                itens: [
                    item('Extintor PQS', 1),
                    item('Extintor CO2', 1),
                    item('Kit de arrombamento', 1, { observacao: 'Halligan, alavanca e luvas de raspa de couro.' }),
                    item('Kit de retirada de pessoa em elevador', 1),
                    item('Corda de uso geral', 1),
                    item('Fita de isolamento', 1),
                ],
            },
        ],
        observacoes: [
            obs('Forças-tarefa (item 7.3.1)', 'FT-01 (1º GMar): AR, ABT, ARC · FT-02 (Princesa Isabel x N. S. de Copacabana): AESP, ABS, ASE, 02 AM · FT-03 (17º GBM): AR, ABS, ASE, AEM · FT-04 (3º GMar): AR, AR COVANT, ASE, AR IMV · FT-05 (orla): 20 postos de observação, AR, ASE · FT-06 (mar): 03 AMA, AL, BIA, 02 BIR.'),
            obs('Uniforme e EPI (itens 9 e 9.3)', 'Força terrestre 3º G ou 3º H; força marítima 4º A ou 11º B. EPI: mínimos da NPEPI.'),
            obs('Comunicações (item 10.2.1)', 'CSM/MTel fornece rádios portáteis.'),
        ],
    },

    /* ------------------------------------------------------------------ */
    /* 5. Carnaval                                                         */
    /* ------------------------------------------------------------------ */
    {
        chave: 'carnaval-2026',
        ordem: 5,
        categoria: 'operacao',
        icone: 'carnaval',
        cor: '#db2777',
        nome: 'Operação Carnaval 2026',
        subtitulo: 'Sambódromo',
        nota: 'Nota CHEMG 147/2026',
        boletim: 'Bol SEDEC/CBMERJ nº 026, de 09/02/2026',
        folhas: 'fls. 10-18',
        vigencia: '',
        descricao: 'Plano tático-operacional. Escala consolidada: Nota CHEMG 159/2026 (Bol 027, de 10/02/2026). Demais viaturas seguem as relações de material-carga (Obs. 01).',
        links: [
            link('Boletim', 'https://drive.google.com/file/d/1XBc9YChZYKlGPQRMnpX-IjUNbF-mHfat/view'),
            link('Bol 027 (escala consolidada)', 'https://drive.google.com/file/d/1cW3FxhgoWfSSgSP13Ao-2yVIP69m4tw7/view'),
        ],
        secoes: [
            {
                titulo: 'Material mínimo dos AR de salvamento',
                referencia: 'Obs. 02',
                itens: [
                    item('Extintor AP', 1),
                    item('Extintor CO2', 1),
                    item('Halligan', 1),
                    item('Alavanca', 1),
                    item('Tesourão', 1),
                    item('Luvas de raspa de couro', 5, { unidade: 'pares' }),
                    item('Cones', 4),
                    item('Mangueira de 1½"', 2),
                    item('Esguicho de 1½"', 1),
                ],
            },
            {
                titulo: 'AR da Div-01 (Concentração) — adicional',
                referencia: 'Obs. 03',
                itens: [
                    item('Boia rígida', 1),
                    item('Corda de prontidão', 1),
                    item('Jardineira', 3),
                ],
            },
            {
                titulo: 'AR de altura da Div-02 — adicional',
                referencia: 'Obs. 04',
                itens: [
                    item('Kit de salvamento em altura'),
                ],
            },
            {
                titulo: 'Posto de comando (Div-02)',
                referencia: 'itens 5.8.4.2 a 5.8.4.8',
                itens: [
                    item('Mobiliário das instalações de comando e das divisões', null, { observacao: 'CBA I (5.8.4.2).' }),
                    item('Rádios portáteis com acessórios e baterias sobressalentes', null, { observacao: 'CSM/MTel (5.8.4.8).' }),
                    item('Antena de internet móvel no PC', 1, { observacao: 'CSM/MTel (5.8.4.8).' }),
                ],
            },
        ],
        observacoes: [
            obs('Divisões (item 5.2)', 'Div-01 Concentração: AR de salvamento com barco de alumínio, ABT, AT · Div-02 Salvador de Sá: AR-IMV, AR de salvamento em altura, AEsp, ASE · Div-03 Dispersão: 02 AR de salvamento com bomba-reboque, ABS.'),
            obs('Apoio das CBA (5.8.4 e 5.8.5)', 'CBA I fornece 01 barco de alumínio, 01 bomba-reboque e 02 AR; CBA VIII fornece 01 bomba-reboque, 01 ASE avançada, 01 AR e 01 AR IMV.'),
            obs('Logística do PC', 'Vigilância patrimonial do PC entre os dias (5.8.4.3); eletricista de dia ao QCG à disposição da logística (5.3.1.3).'),
            obs('Uniforme e EPI (item 5.6)', 'Uniforme 3º A; EPI: mínimos da NPEPI.'),
        ],
    },

    /* ------------------------------------------------------------------ */
    /* Normas de base                                                      */
    /* ------------------------------------------------------------------ */
    {
        chave: 'scco-icg-3-1-2024',
        ordem: 10,
        categoria: 'norma',
        icone: 'norma',
        cor: '#1e3a5f',
        nome: 'SCCO — ICG 3-1/2024',
        subtitulo: 'Sistema de Comando e Controle Operacional',
        nota: 'Nota GAB/CMDO-GERAL 074/2024',
        boletim: 'Bol 040, de 01/03/2024',
        folhas: '',
        vigencia: '',
        descricao: 'Define PC, PCAv e base operacional e as unidades de instalação/materiais, mas não traz lista de material do PC.',
        links: [
            link('Boletim', 'https://drive.google.com/file/d/1GBUU_khxUbTArtJffKS7ALv6MsxnA5aN/view'),
            link('Recorte', 'https://drive.google.com/file/d/16sgkh2yYABPceuY09eqZWfdAShLZ2hdE/view', 'recorte'),
        ],
        secoes: [],
        observacoes: [],
    },
    {
        chave: 'desastres-icg-3-2-2024',
        ordem: 11,
        categoria: 'norma',
        icone: 'norma',
        cor: '#1e3a5f',
        nome: 'Desastres — ICG 3-2/2024',
        subtitulo: 'Grupo de Resposta a Desastres (GRD)',
        nota: 'Nota GAB/CMDO-GERAL 075/2024',
        boletim: 'Bol 040, de 01/03/2024',
        folhas: '',
        vigencia: '',
        descricao: 'Art. 12 fixa a GRD (AR + comandante + condutor + 03 auxiliares + "equipamentos operacionais suficientes" + EPI), sem tabela de material; a tabela é a de cada plano (Pluvian/Extinctus).',
        links: [
            link('Recorte', 'https://drive.google.com/file/d/1z8pI9dTEDlDhRM5wgDmK4S9dSvA5OsE0/view', 'recorte'),
        ],
        secoes: [],
        observacoes: [],
    },
    {
        chave: 'npepi-2021',
        ordem: 12,
        categoria: 'norma',
        icone: 'epi',
        cor: '#b45309',
        nome: 'NPEPI — Nota CHEMG 174/2021',
        subtitulo: 'Norma de EPI do CBMERJ',
        nota: 'Nota CHEMG 174/2021',
        boletim: 'Bol 031, de 19/02/2021 (Anexo IV)',
        folhas: '',
        vigencia: '',
        descricao: 'Todas as notas de operação remetem os EPI mínimos a esta norma.',
        links: [
            link('Boletim', 'https://drive.google.com/file/d/1-uxxVoHxD-ixiHPKcthEAcDKgUSuhU9e/view'),
        ],
        secoes: [],
        observacoes: [],
    },
    {
        chave: 'alerta-npepi-2024',
        ordem: 13,
        categoria: 'norma',
        icone: 'epi',
        cor: '#b45309',
        nome: 'Alerta NPEPI — Nota CHEMG 681/2024',
        subtitulo: 'Reforço ao uso de EPI',
        nota: 'Nota CHEMG 681/2024',
        boletim: 'Bol 037, de 24/10/2024',
        folhas: '',
        vigencia: '',
        descricao: 'Alerta que reforça a NPEPI (Nota CHEMG 174/2021).',
        links: [
            link('Boletim', 'https://drive.google.com/file/d/1s_skAMd64F0ud7_2w6zvKUbFtOQ-NENY/view'),
            link('Recorte', 'https://drive.google.com/file/d/16-LWnQDoWf5bi16ituSp3D0NC1NIgx1F/view', 'recorte'),
        ],
        secoes: [],
        observacoes: [],
    },

    /* ------------------------------------------------------------------ */
    /* Outras operações (sem lista própria de material)                    */
    /* ------------------------------------------------------------------ */
    {
        chave: 'rock-in-rio-2024',
        ordem: 20,
        categoria: 'outra',
        icone: 'evento',
        cor: '#475569',
        nome: 'Rock in Rio 2024',
        subtitulo: 'Sem lista própria de material',
        nota: 'Nota CHEMG 548/2024',
        boletim: 'Bol 158, de 26/08/2024',
        folhas: '',
        vigencia: '',
        descricao: 'Só viaturas por FT, uniforme 3º H e EPI NPEPI.',
        links: [
            link('Boletim', 'https://drive.google.com/file/d/1mJbvyeDffqYoTfK1XYZT2CFoweNngtDJ/view'),
        ],
        secoes: [],
        observacoes: [],
    },
    {
        chave: 'desfile-7-setembro-2026',
        ordem: 21,
        categoria: 'outra',
        icone: 'evento',
        cor: '#475569',
        nome: 'Desfile de 7 de Setembro 2026',
        subtitulo: 'Sem lista própria de material',
        nota: 'Nota CHEMG 865/2026',
        boletim: 'Bol 153, de 24/08/2026',
        folhas: '',
        vigencia: '',
        descricao: 'Empenho de viaturas e uniformes. Boletim ainda só no acervo local: a pasta 1-Boletins do Drive vai até 06/2026.',
        links: [],
        secoes: [],
        observacoes: [],
    },
    {
        chave: 'operacoes-pontuais',
        ordem: 22,
        categoria: 'outra',
        icone: 'evento',
        cor: '#475569',
        nome: 'Operações pontuais',
        subtitulo: 'Sem plano de material recorrente',
        nota: '',
        boletim: '',
        folhas: '',
        vigencia: '',
        descricao: 'Aqua Vestigium (RS, 2024), Caminhos Seguros (2024), Petrópolis (2022) e Dilúvio (EB, 2025): pontuais, sem plano de material recorrente.',
        links: [],
        secoes: [],
        observacoes: [],
    },
];
