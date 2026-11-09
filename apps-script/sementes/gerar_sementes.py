"""Gera as sementes (abas manuais) do modelo de manutenção em sementes.json.
Fonte única usada para popular a planilha e para os testes do ETL."""
import json, pathlib

H_EQUIP = ["equip_id","nome_canonico","categoria","subtipo","marca","modelo","data_aquisicao",
           "valor_aquisicao","data_baixa","status","fonte_km","equip_pai_id","rastrear_manutencao","vida_util_km"]
E = []
def eq(i,n,c,s="",m="",mo="",d="",v="",st="Ativo",f="nenhuma",p="",r="N",vu=""):
    E.append([i,n,c,s,m,mo,d,v,"",st,f,p,r,vu])
eq("MOTO-HIMALAYAN","Himalayan 411","Veículo","Moto","Royal Enfield","Himalayan 411","22/01/2020",f="hodometro",r="S")
eq("CARRO-TR4","Pajero TR4 2010","Veículo","Carro","Mitsubishi","Pajero TR4 2010","13/04/2026",f="hodometro",r="S")
eq("BIKE-CHISEL","CHISEL","Bicicleta","MTB","Specialized","Chisel","22/01/2021",f="strava",r="S")
eq("BIKE-TRICROSS","Tricross","Bicicleta","Gravel/Ciclocross","Specialized","Tricross","23/09/2016",5000,f="strava",r="S")
eq("BIKE-FUJI","PRO – Carbono Aro 26","Bicicleta","MTB","Fuji","MTB PRO",f="strava",r="S")
eq("TENIS-FIRE","Fila Fire","Calçado","Tênis corrida","Fila","Fire","16/08/2024",199,f="strava",r="S",vu=700)
eq("TENIS-SHINOBI","ASICS Gel Shinobi","Calçado","Tênis corrida","ASICS","Gel Shinobi","28/01/2023",f="strava",r="S",vu=700)
eq("TENIS-KIPRUN","Kiprun TR","Calçado","Tênis trail","Kalenji/Evadict","Kiprun TR","28/01/2023",f="strava",r="S",vu=700)
eq("TENIS-ULTRARANGE","Vans Ultrarange Neo VR3","Calçado","Tênis casual","Vans","Ultrarange Neo VR3","17/01/2025",630,f="strava",r="S",vu=700)
eq("CASA-BANHEIRO","Banheiro","Casa","Hidráulica",r="S")
eq("ACC-CAP-AEROFIT","Capacete Aerofit 900 Noir","Acessório ciclismo","Capacete","Decathlon","","11/02/2023",250)
eq("ACC-CAP-POLISPORT","Capacete Polisport Light Road","Acessório ciclismo","Capacete","Polisport","Light road","11/10/2023",280)
eq("ACC-CICLO-IGS620","Ciclocomputador IGS620","Acessório ciclismo","Ciclocomputador","IGPSPORT","620","15/01/2021",989)
eq("ACC-CICLO-BSC300","Ciclocomputador BSC 300","Acessório ciclismo","Ciclocomputador","IGPSPORT","BSC 300","28/04/2024",870)
eq("ACC-CINTA-HR40","Cinta cardíaca HR40","Acessório ciclismo","Sensor","IGPSPORT","HR40","31/01/2023",269)
eq("ACC-OCULOS-OAKLEY","Oakley Flak 2.0 XL","Acessório ciclismo","Óculos","Oakley","Flak 2.0 9188 F359","11/10/2023",650)
eq("ACC-MOCHILA-USWE","Mochila hidratação USWE Epic 8","Acessório ciclismo","Mochila","USWE","EPIC 8 3L","02/02/2023",1044)
eq("ACC-CAP-BELL-2020","Capacete Bell MX-9 Adventure MIPS","Acessório moto","Capacete","Bell","MX-9 Adventure MIPS","25/01/2020",759,p="MOTO-HIMALAYAN")
eq("ACC-CAP-BELL-2025","Capacete Bell MX-9 Stealth Camo","Acessório moto","Capacete","Bell","MX-9 Adventure MIPS Stealth","07/02/2025",768,p="MOTO-HIMALAYAN")
eq("ACC-CAP-HJC","Capacete HJC CS 15 Kane","Acessório moto","Capacete","HJC","CS 15","09/08/2021",630,p="MOTO-HIMALAYAN")
eq("ACC-JAQ-X11","Jaqueta X-11 Summer Pro","Acessório moto","Jaqueta","X-11","Summer Pro","21/02/2020",565,p="MOTO-HIMALAYAN")
eq("ACC-JAQ-ALPINESTARS","Jaqueta Alpinestars Headlands Drystar","Acessório moto","Jaqueta","Alpinestars","Drystar Asphalt","09/08/2021",1530,p="MOTO-HIMALAYAN")
eq("ACC-JAQ-TEXX","Jaqueta Texx Storm","Acessório moto","Jaqueta","Texx","Storm","29/08/2023",900,p="MOTO-HIMALAYAN")
eq("TREK-BARRACA","Barraca Naturehike Mongar","Trekking","Barraca","Naturehike","Mongar","18/06/2021",1459)
eq("TREK-MOCHILA-DEUTER","Mochila Deuter Alpamayo 55+10","Trekking","Mochila","Deuter","Alpamayo 55+10","26/06/2021",952)
eq("TREK-MOCHILA-NH500","Mochila Quechua NH500 20L","Trekking","Mochila","Decathlon","NH500 20L","19/11/2020",250,f="strava")
eq("ELE-RELOGIO-GTR4","Amazfit GTR4","Eletrônico","Relógio","Amazfit","GTR4","02/09/2023",970)
eq("ELE-ALEXA","Alexa Echo Dot 3","Eletrônico","Assistente virtual","Amazon","Echo dot 3 ger","25/01/2022",271)
eq("ELE-JBL-FLIP3","JBL Flip 3","Eletrônico","Caixa de som","JBL","Flip 3","29/01/2017",380)
eq("ELE-GOPRO","GoPro Hero 3 Black","Eletrônico","Câmera de ação","GoPro","Hero 3 Black","01/07/2021",500)
eq("ELE-CELULAR","Motorola Edge 40 Neo","Eletrônico","Celular","Motorola","Edge 40 neo","31/05/2024",904)
eq("ELE-AIRPODS","AirPods Pro 2","Eletrônico","Fone de ouvido","Apple","Airpod pro 2","27/02/2024",1530)
eq("ELE-MONITOR","Monitor Philco","Eletrônico","Monitor","Philco","","26/04/2020",600)
eq("ELE-SOUNDBAR","JBL SB180","Eletrônico","Soundbar","JBL","SB180","22/02/2024",1049)
eq("ELE-TV","TV LG 49\" 4K","Eletrônico","TV","LG","LED UHD 4K","23/01/2019",2399)
eq("ELE-WEBCAM","Webcam Intelbras 1080p","Eletrônico","Webcam","Intelbras","","29/08/2023",239)
eq("CASA-AR-COND","Ar-condicionado Springer Midea 9000","Casa","Ar condicionado","Springer Midea","","11/02/2017",999)
eq("CASA-CADEIRA-2020","Cadeira Home Office","Casa","Cadeira","","","26/04/2020",580,st="Baixado")
eq("CASA-CADEIRA-TOKSTOK","Cadeira Home Office Tok & Stok","Casa","Cadeira","Tok & Stok","WEB","08/05/2025",711)
eq("CASA-CAFETEIRA","Nespresso Vertuo POP","Casa","Cafeteira","Nespresso","Vertuo POP","27/11/2023",489)
eq("CASA-ESCOVA","Escova elétrica Oral-B","Casa","Escova de dente","Oral B","","04/02/2025",109)
eq("CASA-PANELA","Panela de pressão Brinox 4,2L","Casa","Panela de pressão","Brinox","Ceramic Life Pressure","17/02/2025",299)
eq("CASA-SOFA","Sofá-cama Guest 3 lugares","Casa","Sofá","Tok & Stok","Guest","27/01/2025",2499)
eq("VEST-RAYBAN","Ray-Ban Wayfarer","Vestuário","Óculos de sol","Ray-Ban","RB2140 901 50","23/11/2023",790)
eq("VEST-FILA-ACD-BRANCO","Fila ACD Classic Mid Branco","Vestuário","Tênis casual","Fila","Classic Mid","07/12/2024",314.93,st="Baixado")
eq("VEST-FILA-ACD-VERMELHO","Fila ACD Classic SE Vermelho","Vestuário","Tênis casual","Fila","ACD Classic SE","17/12/2024",220)
eq("VEST-FILA-FX100","Fila FX-100 All Terrain Low","Vestuário","Tênis casual","Fila","FX-100 All Terrain Low","17/12/2024",345.21)
eq("VEST-FILA-ACD-PRETO","Fila ACD Mid Preto/Branco","Vestuário","Tênis casual","Fila","ACD Mid","12/03/2025")

H_DEPARA = ["nome_origem","origem","equip_id"]
D = []
def dp(nome, eid, origem="*"): D.append([nome, origem, eid])
for n in ["Himalayan 411","Bomba de combustível"]: dp(n,"MOTO-HIMALAYAN")
dp("Pajero TR4 2010","CARRO-TR4")
dp("CHISEL","BIKE-CHISEL"); dp("Tricross","BIKE-TRICROSS"); dp("PRO - CARBONO - ARO 26","BIKE-FUJI")
dp("Fire","TENIS-FIRE","manutencoes"); dp("Fila fire Fire","TENIS-FIRE","strava")
dp("Shinobi","TENIS-SHINOBI","manutencoes"); dp("ASICS Gel-shinobi Shinobi","TENIS-SHINOBI","strava")
dp("KIPRUN TR","TENIS-KIPRUN","manutencoes"); dp("Kalenji evadic KIPRUN TR","TENIS-KIPRUN","strava")
dp("Ultrarange Neo Vr3 Mte Navy True Blue","TENIS-ULTRARANGE","manutencoes"); dp("Vans Ultrarange Neo Vr3","TENIS-ULTRARANGE","strava")
dp("Backpack NH500 20L GREY","TREK-MOCHILA-NH500","manutencoes"); dp("Quechua NH 500 NH500","TREK-MOCHILA-NH500","strava")
dp("Kit Completo caixa acoplada do vaso","CASA-BANHEIRO","manutencoes")
for n,e in [("Capacete aerofit 900 noir","ACC-CAP-AEROFIT"),("Capacete Polisport light road","ACC-CAP-POLISPORT"),
            ("IGS620","ACC-CICLO-IGS620"),("BSC 300","ACC-CICLO-BSC300"),("Cinta cardíaca HR 40","ACC-CINTA-HR40"),
            ("OAKLEY Flak 2.0 XL","ACC-OCULOS-OAKLEY"),("USWE EPIC 8 3L","ACC-MOCHILA-USWE"),
            ("Capacete BELL MX-9 ADVENTURE MIPS","ACC-CAP-BELL-2020"),
            ("Capacete BELL MX-9 ADVENTURE MIPS Stealth Camo Black Hi","ACC-CAP-BELL-2025"),
            ("Capacete HJC CS 15 KANE CINZA","ACC-CAP-HJC"),("Jaqueta X-11 SUMMER PRO","ACC-JAQ-X11"),
            ("Jaqueta ALPINESTARS HEADLANDS DRYSTAR ASPHALT","ACC-JAQ-ALPINESTARS"),("Jaqueta TEXX STORM","ACC-JAQ-TEXX"),
            ("Naturehike mongar","TREK-BARRACA"),("Deuter Alpamayo 55+10","TREK-MOCHILA-DEUTER"),
            ("GTR4","ELE-RELOGIO-GTR4"),("Alexa","ELE-ALEXA"),("JBL FLIP 3","ELE-JBL-FLIP3"),("Gopro hero 3 black","ELE-GOPRO"),
            ("Edge 40 neo","ELE-CELULAR"),("Airpod pro 2","ELE-AIRPODS"),("Monitor de TV Philco para PC","ELE-MONITOR"),
            ("JBL SB180","ELE-SOUNDBAR"),('TV 49" LED UHD 4K',"ELE-TV"),("Web cam 1080 p usb intelbrás","ELE-WEBCAM"),
            ("Springer Midea 9000","CASA-AR-COND"),("Cadeira Home Office","CASA-CADEIRA-2020"),
            ("Cadeira Home Office Tok & Stok","CASA-CADEIRA-TOKSTOK"),("Nespresso Vertuo POP Yellow","CASA-CAFETEIRA"),
            ("Elétrica","CASA-ESCOVA"),("Brinox Cinza Grafite Granito Ceramic Life Pressure 4,2L","CASA-PANELA"),
            ("Sofá-cama Guest 3 lugares cinza","CASA-SOFA"),("Ray-Ban way farer","VEST-RAYBAN"),
            ("ACD CLASSIC MID Branco","VEST-FILA-ACD-BRANCO"),("Acd Classic Se VERMELHO","VEST-FILA-ACD-VERMELHO"),
            ("FX-100 ALL TERRAIN LOW BRANCO","VEST-FILA-FX100"),("Fila ACD MID MASCULINO PRETO/BRANCO","VEST-FILA-ACD-PRETO")]:
    dp(n,e,"manutencoes")

# dim_servico: a ordem importa — o ETL usa o PRIMEIRO serviço cujo padrão aparece no texto.
H_SERV = ["ordem","servico_id","descricao_padrao","componente","natureza","padroes_texto"]
S = []
def sv(i,d,c,n,p): S.append([len(S)+1,i,d,c,n,p])
sv("S-OLEO-FILTRO","Filtro de óleo","Motor / Óleo","Preventiva","filtro de oleo; filtro oleo")
sv("S-OLEO-MOTOR","Troca de óleo do motor","Motor / Óleo","Preventiva","oleo motor")
sv("S-ARRUELA","Arruela do parafuso de inspeção","Motor / Óleo","Preventiva","arruela")
sv("S-FILTRO-AR","Filtro de ar","Motor / Óleo","Preventiva","filtro de ar; filtro k & n; filtro k&n")
sv("S-DESCARBON","Descarbonizante","Motor / Óleo","Preventiva","descarbonizante")
sv("S-VELA","Vela de ignição","Motor / Ignição e válvulas","Preventiva","vela de ignicao")
sv("S-VALVULAS","Regulagem de válvulas","Motor / Ignição e válvulas","Preventiva","regular valvulas")
sv("S-MOTOR-REPARO","Reparo de motor","Motor / Reparo","Corretiva","junta cabecote; retifica; troca de valvula; sensor de rotacao; bujao supressor")
sv("S-CORREIA","Correia dentada","Motor / Inspeção","Inspeção","correia dentada")
sv("S-LUBRIF","Lubrificação da transmissão","Transmissão","Preventiva","kit lubrificacao; graxa")
sv("S-RELACAO","Relação (coroa, corrente e pinhão)","Transmissão","Preventiva","relacao")
sv("S-MEDICAO-CORRENTE","Medição de corrente","Transmissão","Inspeção","medicao de corrente")
sv("S-CORRENTE","Troca de corrente","Transmissão","Preventiva","troca corrente")
sv("S-CASSETE","Cassete / coroa","Transmissão","Preventiva","cassete; troca coroa")
sv("S-CAMBIO","Câmbio","Transmissão","Corretiva","cambio")
sv("S-EMBREAGEM","Cabo de embreagem","Transmissão","Corretiva","embreagem")
sv("S-SELANTE","Selante dos pneus","Pneus","Preventiva","liquido; vacina")
sv("S-PNEU-REPARO","Câmara / remendo","Pneus","Corretiva","camera; camara; remendo")
sv("S-PNEU","Troca de pneu","Pneus","Preventiva","troca dos pneus; troca pneu; pneu traseiro; pneu dianteiro")
sv("S-ALINHAMENTO","Alinhamento / balanceamento","Rodas","Preventiva","balancea; alinhamento; cambagem; desempeno")
sv("S-PROTETOR-ARO","Protetor de aro","Rodas","Upgrade","protetor de aro")
sv("S-CUBO","Rolamentos do cubo","Rodas","Corretiva","freehub")
sv("S-SUSP-REPARO","Reparo de suspensão","Suspensão","Corretiva","embolo; amortecedor; coxim; coifa")
sv("S-SUSP","Revisão de suspensão","Suspensão","Preventiva","suspensao")
sv("S-PASTILHA","Pastilha de freio","Freios","Preventiva","pastilha")
sv("S-FLUIDO-FREIO","Fluido de freio","Freios","Preventiva","dot 4")
sv("S-DISCO","Disco de freio","Freios","Corretiva","disco")
sv("S-DIRECAO","Caixa de direção","Direção","Preventiva","caixa de direcao")
sv("S-BATERIA","Bateria","Elétrica","Corretiva","bateria")
sv("S-ELETRICA","Reparo elétrico","Elétrica","Corretiva","fusivel; setas; lampada; milha")
sv("S-COMBUSTIVEL","Sistema de combustível","Combustível","Corretiva","bomba de combustivel; canister")
sv("S-ESCAPAMENTO","Escapamento","Carroceria / Acessórios","Upgrade","escapamento")
sv("S-ACESSORIOS","Acessórios / carroceria","Carroceria / Acessórios","Upgrade","bolha; descanso; guidao; pelicula; polimento")
sv("S-REVISAO","Revisão geral","Revisão geral","Preventiva","revisao geral")
sv("S-MAO-OBRA","Mão de obra mecânica","Revisão geral","Preventiva","mao de obra")
sv("S-HIDRAULICA","Hidráulica","Hidráulica","Corretiva","caixa acoplada")

# plano: alvo = equip_id, subtipo ou categoria; servicos = servico_ids separados por ';'
H_PLANO = ["alvo","componente","servicos","intervalo_km","intervalo_dias","observacao"]
P = [
 ["MOTO-HIMALAYAN","Óleo + filtro","S-OLEO-MOTOR; S-OLEO-FILTRO",5000,180,"histórico: troca a cada ~5–7 mil km"],
 ["MOTO-HIMALAYAN","Lubrificação da corrente","S-LUBRIF",5000,180,"histórico"],
 ["MOTO-HIMALAYAN","Válvulas","S-VALVULAS",10000,365,"histórico"],
 ["MOTO-HIMALAYAN","Vela de ignição","S-VELA",10000,730,""],
 ["MOTO-HIMALAYAN","Óleo da suspensão","S-SUSP",20000,730,""],
 ["MOTO-HIMALAYAN","Fluido de freio","S-FLUIDO-FREIO","",730,""],
 ["MOTO-HIMALAYAN","Relação","S-RELACAO",20000,"",""],
 ["MOTO-HIMALAYAN","Pneus","S-PNEU",20000,"",""],
 ["CARRO-TR4","Óleo + filtros","S-OLEO-MOTOR; S-OLEO-FILTRO; S-FILTRO-AR",10000,365,""],
 ["CARRO-TR4","Alinhamento / balanceamento","S-ALINHAMENTO",10000,365,""],
 ["CARRO-TR4","Correia dentada","S-CORREIA",60000,1460,"conferir no manual"],
 ["Bicicleta","Selante dos pneus","S-SELANTE","",120,""],
 ["Bicicleta","Revisão geral","S-REVISAO",3000,365,""],
 ["MTB","Revisão de suspensão","S-SUSP; S-SUSP-REPARO",3000,365,""],
 ["Bicicleta","Corrente","S-CORRENTE; S-MEDICAO-CORRENTE; S-RELACAO",2000,"",""],
 ["Bicicleta","Pneu","S-PNEU",3000,"",""],
 ["Bicicleta","Pastilhas de freio","S-PASTILHA",2000,"",""],
]

out = {"dim_equipamento":[H_EQUIP]+E,"de_para_nomes":[H_DEPARA]+D,"dim_servico":[H_SERV]+S,"plano_manutencao":[H_PLANO]+P}
p = pathlib.Path(__file__).with_name("sementes.json")
p.write_text(json.dumps(out, ensure_ascii=False, indent=1))
print({k:len(v)-1 for k,v in out.items()})
