# CLAUDE.md

Simulador de desempenho de híbridos plug-in em subidas de serra. Compara o BYD Song Plus 2027, o Song Plus 2024 (baterias de 8,3 ou 18,3 kWh), o Geely EX5 EM-i Ultra e o Leapmotor C10 REEV (elétrico com gerador a gasolina) em serras do Sudeste e do Sul do Brasil.

O dono do projeto tem um Song Plus 2024 e usa a experiência dele como referência de realidade. Quando o modelo contradiz o que ele observa no carro, o relato dele prevalece: revise as premissas antes de defender o resultado.

## Comandos

- `npm start` – serve a página em http://localhost:5173 (ES modules não funcionam via file://)
- `npm test` – testes do modelo com `node:test`, sem dependências

Sem build e sem dependências de npm. O Chart.js vem do CDN do cdnjs em `index.html`.

## Publicação

- Repositório público: https://github.com/marciofmar/serra-hibridos
- Site (GitHub Pages, raiz da branch `main`): https://marciofmar.github.io/serra-hibridos/
- Todo push na `main` republica o site em um ou dois minutos. Rode `npm test` antes de enviar.
- O contador de acessos não é publicado pelo push: depois de mudar `contador/`, rode `npx wrangler@4 deploy` dentro de `contador/` (exige `npx wrangler@4 login` do dono da conta Cloudflare).
- Os commits usam o e-mail privado do GitHub (`216239881+marciofmar@users.noreply.github.com`, configurado neste repositório). Não use outro e-mail aqui.

## Estrutura

- `src/model/config.js` – todas as premissas numéricas do modelo (eficiências, curva da bateria, estratégia do térmico, estilos de condução). Comece por aqui para calibrar.
- `src/model/vehicles.js` – fichas dos carros. Cada número tem comentário `src:` (fonte) ou `est:` (estimativa).
- `src/model/climbs.js` – subidas pré-configuradas e `buildProfile`, que transforma preset + ajustes em segmentos `[[km, %], ...]`.
- `src/model/simulate.js` – simulação passo a passo (50 m). Função pura, sem DOM.
- `src/model/phases.js` – agrupa os pontos da simulação em fases para a viagem animada.
- `src/ui/app.js` – interface: controles, cartões e gráficos.
- `src/ui/ride.js` – viagem animada (canvas): carro subindo o perfil, fases, painel e controles.
- `src/ui/modes.js` – cores e textos dos modos de operação.
- `src/ui/contador.js` – registra o acesso (uma vez por sessão, só no site publicado) e mostra o total no rodapé. Exporta o endereço do Worker; com `?worker=local` em `localhost`, usa o Worker local (`npx wrangler@4 dev`, porta 8787).
- `src/ui/contato.js` – tela Fale conosco (`<dialog id="contato">` em `index.html`): abre pelo topo, pelo chamado abaixo dos resultados, pelo quadro de limitações, pelo rodapé ou pelo endereço `#contato`.
- `contador/` – serviço do contador e do Fale conosco na Cloudflare (Worker + banco D1), publicado à parte do site. Ver "Contador de acessos e Fale conosco" abaixo.
- `data/` – dados brutos enviados pelo usuário: perfis por trechos da Grajaú–Jacarepaguá e das outras serras (`01_` a `13_`), um CSV por serra, com uma ou mais subidas (coluna `Sentido_Subida`), cada uma do pé ao topo, incluindo patamares e descidas no meio. Cada subida vira um preset em `climbs.js`.
- `docs/modelo.md` – física, estratégia de controle e histórico de correções. Leia antes de mudar o modelo.
- `docs/fontes.md` – fontes de cada dado.

## Contador de acessos e Fale conosco

- Worker `serra-hibridos-contador` em https://serra-hibridos-contador.marciofmar.workers.dev, banco D1 `serra-hibridos-acessos` (tabelas `acessos` e `mensagens` em `contador/schema.sql`).
- `POST /visita` grava data/hora UTC, cidade, estado e país que a Cloudflare deduz do IP. O IP não é gravado (decisão do dono, pela LGPD); não comece a gravá-lo sem pedido explícito. Aceita só as origens do site e de `localhost:5173`.
- `GET /total` devolve o total, mostrado no rodapé do site.
- `POST /contato` grava uma mensagem do Fale conosco (assunto, texto, campos do relato, link, nome e e-mail opcionais, local aproximado). Mesmas origens do `/visita`. Contra spam: campo-isca `site`, limite de 3 envios por minuto por IP (binding `LIMITE_CONTATO`; o IP só serve de chave e não é gravado) e teto de 200 mensagens em 24 h.
- Aviso de mensagem nova pelo Telegram, sem o conteúdo, quando existirem os segredos `TELEGRAM_TOKEN` e `TELEGRAM_CHAT_ID`. Para configurar: criar o bot no @BotFather, mandar uma mensagem a ele, pegar o `chat.id` em `https://api.telegram.org/bot<token>/getUpdates` e rodar `npx wrangler@4 secret put` para cada segredo, dentro de `contador/`.
- `GET /admin` mostra as mensagens (não lidas primeiro) e o histórico de acessos, só para o dono: senha no segredo `ADMIN_SENHA` (`npx wrangler@4 secret put ADMIN_SENHA`). `POST /admin/mensagem` marca como lida ou apaga. Não coloque link para o painel no site.
- Mudança no `schema.sql` precisa ser aplicada no banco publicado antes do deploy: `npx wrangler@4 d1 execute serra-hibridos-acessos --remote --file=schema.sql` (as instruções usam `IF NOT EXISTS` e podem rodar de novo). Para testar localmente, use `--local` e `npx wrangler@4 dev --var ADMIN_SENHA:<senha-de-teste>`.
- O rodapé avisa os visitantes do que é coletado. Ao mudar o que se coleta, atualize o aviso.

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

O site mostra estas limitações aos usuários no quadro "Limitações do modelo" (`<dialog id="limits">` em `index.html`, aberto pelo botão do topo, pelo rodapé ou pelo endereço `#limitacoes`). Ao mudar o modelo, mantenha o quadro e esta lista coerentes.

- A lógica de controle real da BYD, da Geely e da Leapmotor é proprietária. A estratégia simulada (limiar com histerese, reserva de recarga, curva de ajuda da bateria) é uma aproximação calibrada pelo relato do usuário e por uma análise publicada sobre o Song Plus aspirado. Só o piso elétrico de fábrica (`evFloor`) é próprio de cada carro; o resto da estratégia é comum a todos.
- Em velocidade constante de 80 km/h, o modelo diz que os carros sustentam todas as serras da lista, com uma exceção: o C10 REEV cai para cerca de 70 km/h no Rio do Rastro (paredão de 9,5%) com bateria baixa. A perda de desempenho aparece sobretudo nas retomadas e ultrapassagens.
- Sem ar-condicionado, sem aquecimento de bateria ou motor. A regeneração em descida tem eficiência e tetos estimados (`REGEN` em `config.js`), e as retomadas não recuperam a frenagem antes das curvas.
- Os perfis por trechos têm trechos de 0,4 a 14 km; rampas curtas mais fortes (como os picos de 20% no Rio do Rastro) ficam diluídas na média do trecho.
