# Híbridos na serra

**Acesse:** https://marciofmar.github.io/serra-hibridos/

Simulador que mostra como o BYD Song Plus 2027, o Song Plus 2024, o Geely EX5 EM-i e o Leapmotor C10 REEV se comportam subindo serras do Sudeste e do Sul: quanto da bateria gastam, quando o motor a combustão liga, quanto combustível consomem, onde regeneram nas descidas e em que trechos ficam sem fôlego para retomar ou ultrapassar.

## Como rodar no computador

```bash
npm start   # abre em http://localhost:5173
npm test    # roda os testes do modelo
```

Precisa só do Node 18 ou mais novo. Não há dependências para instalar.

## O que dá para ajustar

- **Subida:** 22 trajetos com perfil real por trechos, incluindo os dois sentidos de Nova Friburgo, Garganta do Embaú e Garganta do Registro, e Porto Alegre → Gramado pela RS-115 ou pela Rota Romântica completa, com descidas.
- **Condução:** velocidade constante, retomadas de curva ou ultrapassagens.
- **Aproximação, extensão e desnível:** qualquer serra pode ser esticada ou alterada.
- **Carga inicial e ponto em que o térmico liga:** padrão de fábrica de cada carro ou uma carga escolhida, como no modo SOC/Save. Para serra, 50% ou 70% preserva a ajuda da bateria nas retomadas.
- **Velocidade e carga extra.**

## Como ler os resultados

- **Faixas de modos:** azul é regenerando, verde-água é elétrico, ouro é térmico recarregando, laranja é térmico com ajuda da bateria, roxo é "sem fôlego" (mantém a velocidade, mas não acelera como pedido) e vermelho listrado é perda de velocidade.
- **Viagem animada:** o carro sobe o perfil, a estrada vai sendo pintada pelo modo e a lista de fases mostra cada mudança.
- **Gráfico de potência:** a linha cinza escura é o máximo que o carro entrega nas rodas naquele ponto; a tracejada é o que o motorista está pedindo.

Os números são estimativas de um modelo físico com premissas documentadas em `docs/modelo.md`. Fontes em `docs/fontes.md`.
