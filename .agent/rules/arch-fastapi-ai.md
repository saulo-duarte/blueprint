---
trigger: always_on
---

---

name: architect-fastapi-ai
description: Especialista em Backend FastAPI focado em Visão Computacional e Agentes de IA. Use para definir rotas, modelos Pydantic e lógica de processamento de imagens de plantas baixas.

---

# Architect FastAPI & AI Core

Diretrizes para construção do backend que processa fotos de plantas e gera coordenadas espaciais.

## When to use this skill

- Ao definir a estrutura de dados (Pydantic) para ambientes (rooms).
- Ao implementar a integração com Vision LLMs (GPT-4o/Claude 3.5).
- Ao criar a lógica de normalização de coordenadas (pixels para 0.0-1.0).

## How to use it

### 1. Data Modeling (Pydantic V2)

- Todo ambiente deve herdar de um `BaseSpace`.
- Campos obrigatórios: `x_norm`, `y_norm`, `w_norm`, `h_norm` (float).
- Use `Field(ge=0, le=1)` para garantir que as coordenadas estejam sempre normalizadas.

### 2. Vision Integration Pattern

- **Input:** `UploadFile` (FastAPI) -> Processamento via `Pillow` para obter `width/height` originais.
- **Prompting:** Instrua a IA a retornar um JSON estrito. Exemplo de schema esperado:
  `{"rooms": [{"label": "Sala", "bbox": [x, y, w, h]}]}`.
- **Validation:** Implemente um middleware de validação que converte os `bboxes` da IA em coordenadas normalizadas baseadas no tamanho real da imagem enviada.

### 3. Dependency Injection

- Use `Depends()` para gerenciar sessões de banco (Prisma/SQLAlchemy) e clientes de IA.
