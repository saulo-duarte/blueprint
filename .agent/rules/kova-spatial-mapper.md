---
trigger: always_on
---

---

name: konva-spatial-mapper
description: Especialista em mapeamento de coordenadas e geração de código. Use para garantir que o backend entregue dados prontos para o Konva.js no Next.js.

---

# Konva Spatial Mapper

Garante a fidelidade entre a imagem processada pela IA e os retângulos editáveis no Canvas (Konva).

## When to use this skill

- Ao criar endpoints que alimentam o BFF do Next.js.
- Ao implementar a funcionalidade de "Gerar Código" a partir do layout mapeado.
- Ao definir padrões de transformação de dados entre Backend e Frontend.

## How to use it

### 1. Konva-Ready Payload

- O backend deve retornar um objeto `StageConfig` que o Next.js possa espalhar (`{...data}`) diretamente no componente `<Stage />`.
- Estrutura de resposta sugerida:
  ```json
  {
    "stage": { "width": 100, "height": 100 }, // Em porcentagem ou escala base
    "layers": [{
      "name": "rooms",
      "objects": [{ "type": "rect", "draggable": true, "id": "uuid", ... }]
    }]
  }
  ```
