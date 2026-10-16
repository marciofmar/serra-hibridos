# Modelo

## Física

A cada passo de 50 m, a força nas rodas é a soma de três parcelas:

```
F = m·g·Crr·cosθ  +  m·g·senθ  +  ½·ρ·Cd·A·v²
    rolamento        inclinação     arrasto
```

- `m` = massa em ordem de marcha + carga extra
- `θ` = ângulo da rampa (inclinação em % / 100 → arctan)
- `ρ` = densidade do ar, que cai com a altitude: `ρ = 1,2 · e^(−h/8500)`
- `A` ≈ 0,85 × largura × altura

Potência pedida = F × v. Nas retomadas soma-se `m · a · v`.

## Trem de força

- **Bateria → rodas:** 85% de eficiência.
- **Térmico → rodas:** 82%, considerando o caminho pelo gerador (modo série), que é o usado sob carga alta.
- **Térmico sustentado:** 85% da potência nominal.
- **Altitude:** o motor aspirado perde potência na mesma proporção da densidade do ar (cerca de 11% a cada 1.000 m). O turbo compensa até 12 pontos dessa perda.
- **Teto da bateria:** o menor entre 105% da potência do motor elétrico e 12 kW por kWh de capacidade. A regra limita a bateria de 8,3 kWh do Song 2024 a cerca de 100 kW.
- **Piso elétrico de fábrica (`evFloor`):** carga em que cada carro deixa o modo elétrico e o térmico assume, sem ajuste do motorista. Song 2027: 20%. Song 2024: 25%. EX5: 20%. C10 REEV: 25% (modo EV; o modo EV+, em que o carro parte, vai até quase esvaziar e não é simulado como padrão). Fontes em `docs/fontes.md`.
- **Ajuda da bateria:** relativa ao piso de cada carro. Plena a partir de 25 pontos acima do piso, caindo em linha reta até zero 5 pontos abaixo dele. No Song 2024 (piso 25%), isso dá a curva calibrada com o dono: plena acima de 50%, zero em 20%. No Song 2027 e no EX5 (piso 20%), plena acima de 45%, zero em 15%. Esforço contínuo reduz o teto em até 50%, com memória de 2 minutos.

## Descidas e regeneração

Quando a força nas rodas fica negativa (a descida empurra mais que arrasto e rolamento seguram), o carro mantém a velocidade de cruzeiro com o motor elétrico como freio:

- O térmico fica parado.
- A bateria recebe 80% da potência de frenagem, até um teto: o menor entre 60% da potência do motor elétrico e 4 kW por kWh de bateria. No Song 2024 de 8,3 kWh, o teto é de 33 kW; nos outros, o motor manda.
- Acima de 95% de carga a regeneração cai em linha reta até zero em 100%. O excedente vai para os freios.
- Descidas suaves (como −0,9% a 80 km/h) ainda pedem potência, porque o arrasto vence a gravidade.

Todos esses números são estimativas (`REGEN` em `config.js`). Limitação: nas retomadas o modelo conta a aceleração depois da curva, mas não a frenagem regenerativa antes dela.

## Estratégia de controle

- Limiar: por padrão, o piso elétrico de fábrica de cada carro. O usuário pode escolher uma carga única para todos, como faz no modo SOC da BYD, no Save da Geely ou no modo Combustível da Leapmotor.
- Acima do limiar: modo elétrico, se a bateria der conta da demanda. Perto do piso a bateria ajuda pouco, então o térmico pode entrar alguns pontos antes do limiar em subida.
- Na chegada ao limiar: o térmico liga e recarrega até limiar + 4 pontos, com 10 a 30 kW de recarga conforme a distância do alvo. Depois desliga.
- Abaixo do limiar − 2: o térmico reserva até 10 kW para recarga mesmo sob demanda alta. É o comportamento descrito para o Song aspirado: o motor tenta mover o carro e recarregar ao mesmo tempo.
- Consumo de gasolina: a eficiência do motor sobe de 60% da eficiência média (em carga quase nula) até a eficiência média plena a partir de 50% da potência nominal. Motor em carga baixa queima mais por kWh.

## Estados

| Código | Cor | Significado |
|---|---|---|
| REG | azul | descida, motor elétrico regenerando |
| EV | verde-água | só bateria |
| CHG | ouro | térmico cobrindo a demanda e recarregando |
| BAT | laranja | térmico no máximo e bateria complementando |
| WEAK | roxo | mantém a velocidade, mas não entrega a aceleração pedida |
| LIM | vermelho com listras escuras | nem a velocidade de cruzeiro se sustenta |

As cores seguem a gravidade. O pior modo leva listras diagonais para ser reconhecido mesmo quando aparece sozinho na faixa, sem depender de comparar o tom com o laranja.

## Fases da viagem animada

Os modos alternam dentro de cada bloco de retomada, então a animação agrupa os pontos em fases (`src/model/phases.js`):

- cada bloco de 500 m recebe o modo mais exigente que teve, na ordem EV < CHG < BAT < WEAK < LIM;
- blocos vizinhos com o mesmo modo viram uma fase;
- uma fase de um bloco só, entre duas fases iguais, é absorvida por elas.

A estrada e a etiqueta sobre o carro mostram o modo instantâneo. O quadro de fase e a lista "Fases da viagem" mostram as fases agrupadas. O desenho exagera a inclinação para caber na tela.

## Estilos de condução

A cada bloco de 500 m, uma fração do trecho pede aceleração extra:

- Constante: nenhuma
- Normal: 30% do bloco a 0,8 m/s² (retomadas de curva)
- Forte: 40% do bloco a 1,2 m/s² (ultrapassagens)

## Histórico de correções

As versões abaixo surgiram de questionamentos do usuário. Elas explicam por que as premissas atuais são as que são.

1. **Curva estática de consumo.** Só o motor elétrico, sem regeneração e sem térmico.
2. **Térmico com recarga.** Limiar com histerese e modo paralelo.
3. **Piso da bateria.** O primeiro piso era relativo ao limiar (limiar − 10) e proibia a bateria de ajudar mesmo com 39% de carga. Trocado por piso absoluto.
4. **Corte gradual.** O usuário observou que a perda de potência é ponderada pela carga e pelo esforço, e não um corte seco em 10%. Entrou a curva de carga e o fator de esforço.
5. **Realismo do Song 2024.** O usuário, dono do carro, apontou que o modelo não mostrava perda de potência em cenários difíceis. Mudanças:
   - retomadas e ultrapassagens (antes só havia velocidade constante);
   - perda de potência com a altitude no motor aspirado;
   - térmico a 85% e caminho série a 82% (antes 90% e 93%);
   - ajuda da bateria plena só acima de 50% e zerada em 20%;
   - reserva de recarga abaixo do limiar.
   Resultado: com ultrapassagens, o Song 2024 fica sem fôlego por mais tempo que o 2027, e um limiar de 50% elimina a falta de fôlego, como recomenda a análise publicada.
6. **Perfil real da Grajaú–Jacarepaguá** por trechos, enviado pelo usuário (`data/`).
7. **Viagem animada.** Cada ponto da simulação passou a guardar a inclinação do trecho e a gasolina acumulada, usadas pela animação. Os resultados do modelo não mudaram.
8. **Gestão de energia por carro.** O usuário perguntou se os três carros usavam a mesma lógica. Usavam. Entrou o piso elétrico de fábrica de cada um, com fonte, e a curva de ajuda da bateria passou a ser relativa a esse piso. O Song 2024 manteve a calibração. O Song 2027 e o EX5 passaram a rodar no elétrico até 20% e a ter ajuda plena da bateria até 45%. O limiar padrão da interface virou "padrão de fábrica de cada carro". Os demais parâmetros de estratégia (histerese, taxa de recarga, reserva) continuam iguais para todos, por falta de dado publicado.
9. **Leapmotor C10 REEV.** Elétrico de autonomia estendida: o 1.5 aspirado de 88 cv só gera energia. O modelo já tratava o térmico pelo caminho série (82%), que é o único caminho do C10, então nenhuma regra nova foi necessária. O teto de potência é o do motor traseiro (158 kW). Com o menor gerador da lista, o C10 não segura a carga numa serra longa em ritmo forte: em Campos do Jordão a 80 km/h, com ultrapassagens e limiar de 50%, a bateria cai para perto de 34%, coerente com o teste da Motor Show.
10. **Perfis por trechos de todas as serras.** O usuário enviou 13 CSVs. Cada sentido ou rota virou um preset: 20 subidas, além das três da Grajaú–Jacarepaguá. Nova Friburgo, Embaú e Registro ganharam os dois sentidos. Campos do Jordão ganhou a variante do Hotel Toriba. Porto Alegre → Gramado ficou com a RS-115 e com a Rota Romântica em três subidas separadas, porque o modelo não trata as descidas entre elas. A aproximação passou a ter inclinação própria por preset (Rio do Rastro: 8,3 km a 2,2% desde Lauro Müller; Rocinha: 8 km a 0,4%; Mogi: 4 km a 0,3%), e `alt0` passou a ser a altitude no pé da serra. Campos do Jordão deixou de ter os 25 km de vale antes, porque o perfil enviado começa na base da PRF em Piracuama.
11. **Descidas com regeneração.** O usuário pediu a Rota Romântica completa. Antes, uma força negativa nas rodas virava recarga com eficiência acima de 100% (bug sem efeito, porque nenhum perfil descia). Entrou o modo REG, com teto de regeneração e corte perto de 100% de carga. A Rota Romântica completa (71 km) liga as três subidas pelas descidas ao vale do rio Cadeia (13 km a −3,0%) e ao vale do rio Caí (14 km a −0,9%), estimadas pelos marcos de km do CSV. Os resultados das serras só de subida não mudaram.
12. **Perfis completos, com patamares e descidas.** O usuário reenviou os 13 CSVs com os trechos planos e de descida no meio das subidas, e com cada subida começando no pé da serra. Saíram as aproximações (Mogi, Rio do Rastro, Rocinha) e os vales antes da serra (Embaú, Dona Francisca). A Rota Romântica completa passou a vir do arquivo, igual à estimativa anterior. Só as descidas mais fortes regeneram de fato (Campos do Jordão −3,1%, Gramado pela RS-115 −2,5%, Dona Francisca −1,9% a 60 km/h, Rota Romântica −3%); nas suaves, de −0,6% a −1,7%, a gravidade só reduz o gasto, porque arrasto e rolamento ainda pedem potência. A variante do Hotel Toriba saiu, porque não veio no arquivo novo.

## Ideias para calibrar

- Relatos do usuário com serra, velocidade, número de pessoas e carga mostrada no painel quando o carro perde fôlego.
- Cd oficial do Song Plus.
- Potência do gerador do DM-i e velocidade de engate do modo de tração direta.
- Arquivos GPX das serras, para trocar os trechos de 1 a 8 km por perfis mais finos e capturar as rampas curtas mais fortes.
