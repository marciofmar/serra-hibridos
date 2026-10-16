# CLAUDE.md

Simulador de desempenho de híbridos plug-in em subidas de serra. Compara o BYD Song Plus 2027, o Song Plus 2024 (baterias de 8,3 ou 18,3 kWh), o Geely EX5 EM-i Ultra e o Leapmotor C10 REEV (elétrico com gerador a gasolina) em serras do Sudeste e do Sul do Brasil.

O dono do projeto tem um Song Plus 2024 e usa a experiência dele como referência de realidade. Quando o modelo contradiz o que ele observa no carro, o relato dele prevalece: revise as premissas antes de defender o resultado.

## Comandos

- `npm start` – serve a página em http://localhost:5173 (ES modules não funcionam via file://)
- `npm test` – testes do modelo com `node:test`, sem dependências

Sem build e sem dependências de npm. O Chart.js vem do CDN do cdnjs em `index.html`.

## Estrutura

- `src/model/config.js` – todas as premissas numéricas do modelo (eficiências, curva da bateria, estratégia do térmico, estilos de condução). Comece por aqui para calibrar.
- `src/model/vehicles.js` – fichas dos carros. Cada número tem comentário `src:` (fonte) ou `est:` (estimativa).
- `src/model/climbs.js` – subidas pré-configuradas e `buildProfile`, que transforma preset + ajustes em segmentos `[[km, %], ...]`.
- `src/model/simulate.js` – simulação passo a passo (50 m). Função pura, sem DOM.
- `src/model/phases.js` – agrupa os pontos da simulação em fases para a viagem animada.
- `src/ui/app.js` – interface: controles, cartões e gráficos.
- `src/ui/ride.js` – viagem animada (canvas): carro subindo o perfil, fases, painel e controles.
- `src/ui/modes.js` – cores e textos dos modos de operação.
- `data/` – dados brutos enviados pelo usuário: perfis por trechos da Grajaú–Jacarepaguá e das outras serras (`01_` a `13_`), um CSV por serra, com uma ou mais subidas (coluna `Sentido_Subida`). Cada subida vira um preset em `climbs.js`.
- `docs/modelo.md` – física, estratégia de controle e histórico de correções. Leia antes de mudar o modelo.
- `docs/fontes.md` – fontes de cada dado.

## Regras de trabalho

- Mantenha `simulate.js` puro e testável. Lógica nova de modelo vai em `src/model/`, nunca em `app.js`.
- Todo número novo em `vehicles.js` ou `climbs.js` precisa de fonte ou de marcação `est:`. Registre a fonte em `docs/fontes.md`.
- Premissas novas vão em `config.js`, com comentário explicando o significado.
- Ao mudar o comportamento do modelo, atualize o histórico em `docs/modelo.md` e rode `npm test`. Se um teste quebrar por mudança intencional, ajuste o teste e explique no commit.
- Ficha brasileira tem prioridade sobre fichas de outros países quando houver divergência.
- Perfis por trechos (`segments`) são preferíveis a totais. Quando o usuário enviar um perfil, use-o e remova a marcação de estimativa.
- A interface é usada principalmente no celular: teste em largura de ~400 px.
- Textos da interface e da documentação em português do Brasil. Evite a construção "não é X, é Y".

## Limitações conhecidas

- A lógica de controle real da BYD, da Geely e da Leapmotor é proprietária. A estratégia simulada (limiar com histerese, reserva de recarga, curva de ajuda da bateria) é uma aproximação calibrada pelo relato do usuário e por uma análise publicada sobre o Song Plus aspirado. Só o piso elétrico de fábrica (`evFloor`) é próprio de cada carro; o resto da estratégia é comum a todos.
- Em velocidade constante de 80 km/h, o modelo diz que os carros sustentam todas as serras da lista, com uma exceção: o C10 REEV cai para cerca de 69 km/h na Rocinha (trecho de 9,4%) com bateria baixa. A perda de desempenho aparece sobretudo nas retomadas e ultrapassagens.
- Sem regeneração em descidas, sem ar-condicionado, sem aquecimento de bateria ou motor. Por isso a Rota Romântica (Porto Alegre → Gramado) está em três subidas separadas, sem as descidas entre elas.
- Os perfis por trechos têm de 1 a 7 trechos de 1 a 8 km; rampas curtas mais fortes (como os picos de 15% da variante Toriba ou de 20% no Rio do Rastro) ficam diluídas na média do trecho.
