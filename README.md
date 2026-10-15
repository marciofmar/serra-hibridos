# Híbridos na serra

Simulador que mostra como o BYD Song Plus 2027, o Song Plus 2024 e o Geely EX5 EM-i se comportam subindo serras do Sudeste e do Sul: quanto da bateria gastam, quando o motor a combustão liga, quanto combustível consomem e em que trechos ficam sem fôlego para retomar ou ultrapassar.

## Como usar

```bash
npm start   # abre em http://localhost:5173
npm test    # roda os testes do modelo
```

Precisa só do Node 18 ou mais novo. Não há dependências para instalar.

## O que dá para ajustar

- **Subida:** 15 perfis, incluindo a Grajaú–Jacarepaguá nos dois sentidos com perfil real por trechos.
- **Condução:** velocidade constante, retomadas de curva ou ultrapassagens.
- **Plano antes, extensão e desnível:** qualquer serra pode ser esticada ou alterada.
- **Carga inicial e limiar do térmico:** o limiar é o nível de bateria em que o motor a combustão liga para manter a carga. O padrão de fábrica fica perto de 20%; para serra, 50% ou 70% preserva a ajuda da bateria nas retomadas.
- **Velocidade e carga extra.**

## Como ler os resultados

- **Barra de modos:** verde-água é elétrico, amarelo é térmico recarregando, laranja é térmico com ajuda da bateria, roxo é "sem fôlego" (mantém a velocidade, mas não acelera como pedido) e vermelho é perda de velocidade.
- **Gráfico de potência:** a linha cinza escura é o máximo que o carro entrega nas rodas naquele ponto; a tracejada é o que o motorista está pedindo.

Os números são estimativas de um modelo físico com premissas documentadas em `docs/modelo.md`. Fontes em `docs/fontes.md`.
