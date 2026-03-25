---
name: vision-analyst-agent
description: PRD e regras para o Agente de Visão (Filtro Semântico). Responsável por analisar a planta baixa, realizar o Chain of Thought para isolar paredes reais de ruídos (cotas/móveis) e ancorar proporções.
---

# PRD: Vision Analyst Agent (Go Service)

## 1. Visão Geral

Este módulo em Go é o primeiro passo da pipeline multi-agente. Ele recebe a imagem bruta e usa o Claude Opus 4.6 (sem Tool Calling nesta etapa) para gerar um relatório semântico e geométrico profundo. O output deste agente servirá como contexto base inquestionável para o Agente Builder.

## 2. Chain of Thought (Engenharia de Prompt)

O código Go deve configurar o `System Prompt` do Claude com instruções rigorosas de raciocínio passo a passo (`<thinking>` tags).

### Diretrizes Visuais (Obrigatórias no Prompt):

1. **Hierarquia de Linhas:**
   - **Paredes Estruturais:** Procure por linhas grossas, escuras e contínuas. Elas formam limites fechados.
   - **Ruído (Ignorar):** Linhas finas, tracejadas, linhas com setas nas pontas (cotas de medida), números isolados, blocos de texto e hachuras de móveis.
2. **Verificação de Enclausuramento:**
   - Ambientes reais são polígonos fechados. Se uma linha "morre" no meio do nada ou termina em um "T" com uma seta, é uma linha de medida. Não a classifique como parede.
3. **Ancoragem de Proporção (Aspect Ratio):**
   - Identifique a parede mais longa do perímetro externo.
   - Analise se existe alguma cota de texto legível (ex: "4.00m") para estabelecer uma relação de escala interna.

## 3. O Contrato de Output (Estrutura de Resposta)

O Go deve solicitar que o Claude retorne um JSON estrito (usando o modo JSON da Anthropic) com a seguinte estrutura conceitual:

```json
{
  "thought_process": "Analisei a imagem. Vejo linhas finas com texto '3.00' indicando medidas; irei ignorá-las. As paredes estruturais são as linhas grossas em preto sólido que formam 3 retângulos fechados...",
  "scale_anchor": {
    "reference": "Parede inferior da planta",
    "estimated_ratio": "Retângulo deitado, proporção aprox 16:9"
  },
  "environments": [
    {
      "name": "Sala Principal",
      "shape_description": "Polígono de 4 lados, retângulo perfeito, ocupa o centro-sul da imagem.",
      "connected_to": ["Cozinha", "Corredor"]
    }
  ],
  "noise_detected": [
    "Mesa de jantar redonda",
    "Linhas de cota horizontais finas",
    "Texto de área m2"
  ]
}
```

4. Implementação no Go (Diretrizes para a IDE)
   Pacote: Crie um pacote analyst ou vision.

Structs: Defina as structs correspondentes ao JSON acima para fazer o json.Unmarshal com segurança.

Integração: Crie uma função func AnalyzeFloorPlan(ctx context.Context, imgBase64 string) (\*AnalystReport, error).

Validação: Se o array environments vier vazio, o Go deve retornar um erro de validação (ex: "Nenhuma estrutura detectada") e abortar a pipeline antes de chamar o Agente Builder.

5. Como Manter Proporções (Reaproveitando a Rule)
   O serviço Go deve injetar na requisição do Analyst a largura e altura originais da imagem.

Prompt injection: "A imagem original possui {WIDTH}x{HEIGHT} pixels. Mantenha a política de Zero-Pixel (use 0.0 a 1.0) nas descrições de posição (ex: 'centro em x=0.5, y=0.5')."

---

### O fluxo final na sua Pipeline em Go ficará assim:

1. Request chega no Echo/Fiber com a foto.
2. Go extrai `Width/Height` originais da imagem.
3. Go chama o `AnalyzeFloorPlan` (este PRD que acabamos de criar).
4. O Claude responde _"Ignorar cota X, focar na linha grossa Y. Temos 3 salas"_.
5. Go pega esse relatório e passa para o **Builder** (que tem as _Tools_ habilitadas) desenhar os polígonos exatos.
