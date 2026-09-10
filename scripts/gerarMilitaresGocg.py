import fitz, json, re
doc = fitz.open("DIRETORIA GERAL DE PESSOAL.pdf")
itens = []
vistos = set()
for page in doc:
    for t in page.find_tables().tables:
        rows = t.extract()
        header = [ (c or '').replace('\n',' ').strip() for c in rows[0] ]
        try:
            iNG = header.index('N.Guerra'); iRG = header.index('RG')
        except ValueError:
            print('header inesperado', header); continue
        for r in rows[1:]:
            ng = re.sub(r'\s+', ' ', (r[iNG] or '').replace('\n',' ')).strip().upper()
            rg = re.sub(r'\D', '', r[iRG] or '')
            if not ng or not rg:
                continue
            chave = (ng, rg)
            if chave in vistos: continue
            vistos.add(chave)
            itens.append({'nomeGuerra': ng, 'rg': rg})
print(len(itens), 'militares')
dup_rg = [x for x in itens if sum(1 for y in itens if y['rg']==x['rg'])>1]
print('rg duplicado:', dup_rg)
lines = ["// Gerado a partir de \"DIRETORIA GERAL DE PESSOAL.pdf\" (Relatório de militares do GOCG, DGP, 09/09/2026).",
         "// Somente as colunas N. Guerra e RG. Para atualizar: python scripts/gerarMilitaresGocg.py",
         "// (a lista é usada apenas como sugestão de autopreenchimento no Orçamento GOCG).",
         "export const MILITARES_GOCG = ["]
for x in itens:
    lines.append(f"    {{ nomeGuerra: {json.dumps(x['nomeGuerra'], ensure_ascii=False)}, rg: '{x['rg']}' }},")
lines.append("];")
lines.append("export default MILITARES_GOCG;")
open('src/data/militaresGocg.js','w',encoding='utf-8').write('\n'.join(lines)+'\n')
