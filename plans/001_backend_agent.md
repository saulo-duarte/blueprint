---
name: spatial-architect-go-backend
description: Backend orquestrador em Go utilizando Fiber para o Agente de IA. Focado em Tool Calling (Claude 4.6), Processamento de Imagem e Sanitização Geométrica de formas ortogonais e livres.
---

# PRD: AI Orchestrator Service (Golang / Fiber)

## 1. Visão Geral

Este serviço atua como o **"Cérebro de Visão Espacial"** do sistema. Seu papel principal não é apenas instanciar requisições simples de JSON para a IA, mas atuar como um **Runtime de Ferramentas (Tool Calling)** robusto. Ele expõe uma API de funções que o modelo (Claude 4.6) "invoca" para desenhar a planta baixa — decodificando desde formas retangulares estritas até traçados irregulares (ferramenta de caneta). Além disso, o Go se encarrega de validar as lógicas vetoriais, normalizar as coordenadas para a interface cliente e aplicar uma rigorosa sanitização geométrica.

## 2. Tech Stack & Ferramentas

- **Linguagem:** Go 1.22+
- **Framework Web:** `gofiber/fiber/v2` (Escolhido por sua altíssima performance, eficiência de memória e similaridade com Express/FastAPI para rápida iteração).
- **AI Client:** `anthropic-sdk-go` (ou abstração via requests HTTP puros com `resty/v2` para maior controle de timeouts e retries).
- **Image Handling:** `disintegration/imaging` ou bibliotecas similares para resize inteligente, compressão on-the-fly e extração de metadados antes de enviar o payload à IA.
- **Validação de Payload:** `go-playground/validator/v10` para checar os inputs originados tanto do front quanto da própria IA.

## 3. Arquitetura de "Tool Calling" (O Coração)

Para garantir um mapeamento espacial coerente, o Claude não vai "adivinhar" schemas JSON complexos de uma vez. O Go definirá um contrato de Tool Calling usando as seguintes funções (que a IA executará sequencialmente):

| Função             | Parâmetros                         | Descrição                                                                                                                                                         |
| :----------------- | :--------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add_room_polygon` | `name`, `vertices[]`, `color_hint` | **Suporte a Formas Livres:** Cria um polígono arbitrário fechado (não apenas quadrados). Ideal para capturar contornos de desenhistas (ferramenta caneta / laço). |
| `add_room_rect`    | `name`, `x`, `y`, `w`, `h`         | Adiciona uma sala retangular simples e otimizada.                                                                                                                 |
| `add_door`         | `wall_id`, `position_norm`         | Adiciona uma porta vinculada estruturalmente a uma parede (aresta do polígono).                                                                                   |
| `set_metadata`     | `key`, `value`                     | Define informações do projeto (Ex: "Área Total Estimada").                                                                                                        |

## 4. Pipeline de Processamento (Fluxo Multi-Agente)

### Passo 1: In-Context Training & Prompt Caching

O backend manterá um `System Prompt` altamente otimizado tirando vantagem do **Prompt Caching** da Anthropic:

- **Golden Dataset Cacheado:** 3 a 5 cenários-exemplo (Imagem de referência + Sequência perfeita de Tool Calls geradas). O cache reduzirá o custo e a latência brutalmente.
- **Contexto Geométrico Estrito:** Instruções claras de que o Canvas possui `X=0, Y=0` no canto superior esquerdo e todas as coordenadas devem vir **normalizadas** (floating points de `0.000` a `1.000` relativos às dimensões da imagem).

### Passo 2: O Loop de Execução

1. **Ingestão (Fiber):** O Fiber recebe um `multipart/form-data` contendo a imagem da planta original.
2. **Pré-Processamento:** Aplica validação de tamanho/MIME, extrai aspect-ratio original e faz redimensionamento leve se necessário.
3. **Vision Call:** Faz streaming da Imagem e das Definições de Ferramentas (Functions) para o Claude 4.6.
4. **Execution & Hooking:** O Claude retorna a invocação das ferramentas pretendidas.
5. **Sanitizer (A Vantagem do Go):**
   - **Fechamento de Polígonos:** Para formas criadas via caneta/traçado livre, o Go garante a topologia (força o último vértice conectar-se ao primeiro `V[n] == V[0]`).
   - **Limpeza de Ruído (Douglas-Peucker alg):** Caso a IA gere vértices excessivos para formas livres, aplica uma leve simplificação geométrica para economizar processamento de render no Canvas.
   - **Rounding Preciso:** Aplica `Math.Round` para prender coordenadas em no máximo 3 ou 4 casas decimais.
   - **Snap e Merge:** Se vértices de salas opostas estiverem geometricamente a uma distância pífia (`< 0.005`), o Go consolida ambos no mesmo ponto nodal (magnetismo matemático).

## 5. Estrutura de Dados (Go Structs)

O motor Go deve espelhar perfeitamente o estado esperado pelo Frontend/KonvaJS, garantindo tipos estritamente tipados:

```go
package domain

// Coordenada normalizada no plano (0.0 até 1.0)
type Point struct {
    X float64 `json:"x" validate:"required,min=0,max=1"`
    Y float64 `json:"y" validate:"required,min=0,max=1"`
}

// Suporta tanto retângulos estritos quanto "formas orgânicas/caneta" mapeadas em N vértices
type Room struct {
    ID       string  `json:"id"`
    Name     string  `json:"name" validate:"required,min=2"`
    Type     string  `json:"type"` // "rect" ou "polygon"
    Vertices []Point `json:"vertices,omitempty" validate:"required,min=3"`
}

type AIResponse struct {
    ProjectName string  `json:"project_name"`
    Rooms       []Room  `json:"rooms"`
    Errors      []string `json:"errors,omitempty"` // Retorna logs caso a IA tenha tentado algo que o Sanitizer rejeitou
}
```
