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
- **Ajuda da bateria:** plena acima de 50% de carga, caindo em linha reta até zero em 20%. Esforço contínuo reduz o teto em até 50%, com memória de 2 minutos.

## Estratégia de controle

- Acima do limiar: modo elétrico, se a bateria der conta da demanda.
- Na chegada ao limiar: o térmico liga e recarrega até limiar + 4 pontos, com 10 a 30 kW de recarga conforme a distância do alvo. Depois desliga.
- Abaixo do limiar − 2: o térmico reserva até 10 kW para recarga mesmo sob demanda alta. É o comportamento descrito para o Song aspirado: o motor tenta mover o carro e recarregar ao mesmo tempo.
- Consumo de gasolina: a eficiência do motor sobe de 60% da eficiência média (em carga quase nula) até a eficiência média plena a partir de 50% da potência nominal. Motor em carga baixa queima mais por kWh.

## Estados

| Código | Cor | Significado |
|---|---|---|
| EV | verde-água | só bateria |
| CHG | amarelo | térmico cobrindo a demanda e recarregando |
| BAT | laranja | térmico no máximo e bateria complementando |
| WEAK | roxo | mantém a velocidade, mas não entrega a aceleração pedida |
| LIM | vermelho | nem a velocidade de cruzeiro se sustenta |

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

## Ideias para calibrar

- Relatos do usuário com serra, velocidade, número de pessoas e carga mostrada no painel quando o carro perde fôlego.
- Cd oficial do Song Plus.
- Potência do gerador do DM-i e velocidade de engate do modo de tração direta.
- Arquivos GPX de outras serras para trocar os três terços por perfis reais.
