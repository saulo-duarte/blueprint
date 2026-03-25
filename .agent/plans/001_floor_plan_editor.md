---
name: spatial-architect-frontend
description: Frontend de um editor interativo de plantas baixas usando Next.js, Konva.js e Zustand. Permite manipulação de vértices, snap de portas e mapeamento de defeitos com Pins.
---

# PRD: Floor Plan Editor - MVP Phase (Frontend)

## 1. Visão Geral

Este frontend será um editor gráfico interativo para desenhar plantas baixas simplificadas. O objetivo é permitir que o usuário defina ambientes, insira elementos como portas e, crucialmente, use "Pins" para marcar a localização de defeitos físicos nos ambientes mapeados. A interface deve ser limpa e profissional, focada em usabilidade "drag-and-drop" e manipulação direta no Canvas.

## 2. Tech Stack

- **Framework:** Next.js 14+ (App Router).
- **Linguagem:** TypeScript (Strict Mode).
- **Canvas Engine:** Konva.js / `react-konva`.
- **Gerenciamento de Estado:** **Zustand** (para persistência do estado do editor).
- **Estilização:** Tailwind CSS.

## 3. Arquitetura de Layout (UI)

A interface será dividida em três colunas principais:

1.  **Sidebar Esquerda (Components Palette):**
    - Botão para ferramenta "Seleção".
    - Botão para ferramenta "Desenhar Área" (Ponto a ponto).
    - Draggable "Quadrado" (inicia polígono).
    - Draggable "Porta".
    - Draggable "Pin de Defeito".

2.  **Área Central (Konva Canvas):**
    - Grid de fundo visível (pontilhado).
    - Interações de desenho e manipulação de formas.

3.  **Sidebar Direita (Properties Panel):**
    - Exibe propriedades do objeto selecionado (ex: nome, id, cor de fundo, coordenadas `x, y`, dimensões `w, h`).
    - Permite editar o nome e escolher a cor do ambiente (a partir da paleta pré-definida).

## 4. Requisitos Funcionais e Geometria

### 4.1 Grid & Snap

- O Canvas deve renderizar um Grid de fundo (ex: células de 20px).
- **Snap:** Todo clique, criação de ponto ou arrasto de objeto deve "grudar" automaticamente na interseção mais próxima do Grid para garantir precisão e linhas retas.

### 4.2 Ambientes e Geometria (Polígonos)

- **Representação:** Todos os ambientes (mesmo o "Quadrado" inicial) devem ser persistidos como **Polígonos Fechados** (`Konva.Line` com `closed: true`).
- **Manipulação:** Ao selecionar um polígono, as arestas e vértices devem ficar visíveis.
  - O usuário pode arrastar vértices existentes.
  - **Criação de Vértice:** O usuário pode clicar duas vezes em qualquer ponto de uma **aresta** para criar um novo vértice, transformando a geometria (ex: de quadrado para L).
- **Criação Path (Ponto a Ponto):** A ferramenta "Desenhar Área" permite clicar no Canvas para definir vértices sucessivos até que o usuário clique novamente no ponto inicial para "fechar" a área. Ao fechar, o polígono é criado, preenchido com uma cor padrão e uma modal surge para definir `nome` e `id` do ambiente.

### 4.3 Porta Inteligente (Smart Door)

- O componente Porta deve ter a inteligência de fazer _snap_ (colisão) com as arestas dos polígonos de ambiente.
- Ao ser arrastada e encostar em uma aresta, a porta deve:
  1.  Girar automaticamente para se alinhar ao ângulo da aresta.
  2.  "Grudar" na posição para parecer inserida na parede.

### 4.4 Pin de Defeito

- Componente visual (ex: ícone de pin/alfinete).
- Arrastado da sidebar esquerda para qualquer local do Canvas (preferencialmente dentro de ambientes já mapeados).
- Deve possuir metadados editáveis na sidebar direita (ex: descrição do defeito, gravidade, id único).

### 4.5 Paleta de Cores (Definida)

O editor deve usar uma paleta de cores moderna e sutil (ex: Catppuccin flavor) para o preenchimento de ambientes:

- **Default:** `lavender` (Sutil para áreas não nomeadas).
- **Opções na Sidebar:** `green` (Áreas Verdes), `blue` (Quartos/Áreas Molhadas), `maroon` (Salas), `mauve` (Circulação).

## 5. Estrutura do Estado (Zustand Store)

```typescript
interface Point {
  x: number;
  y: number;
}

interface PolygonShape {
  id: string;
  name: string;
  points: Point[]; // Coordenadas Normalizadas (0-1)
  color: string;
}

interface DoorShape {
  id: string;
  x_norm: number;
  y_norm: number;
  rotation: number;
}

interface PinShape {
  id: string;
  x_norm: number;
  y_norm: number;
  description: string;
}

interface EditorState {
  currentTool: "select" | "draw_path" | "rectangle" | "door" | "pin";
  selectedObjectId: string | null;
  polygons: PolygonShape[];
  doors: DoorShape[];
  pins: PinShape[];
  // Actions
  addPointToPath: (p: Point) => void;
  // ...outras actions de manipulação geométrica
}
```
