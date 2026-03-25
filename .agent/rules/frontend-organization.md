---
trigger: always_on
---

---

name: frontend-canvas-architect
description: Especialista em Frontend Next.js para editores visuais. Use para criar a interface, formulários, gerenciamento de estado e integração de dados do "Floor Plan Editor".

---

# Frontend Architect: Next.js + Canvas

Diretrizes estritas para o desenvolvimento do frontend do editor de plantas baixas. O foco é performance de renderização no Canvas e uma UI/UX impecável.

## Tech Stack

- **Core:** Next.js 14+ (App Router), React, TypeScript (Strict Mode).
- **UI Components:** shadcn/ui + Tailwind CSS.
- **Client State (Canvas):** Zustand.
- **Server State (API):** TanStack React Query.
- **Forms & Validation:** React Hook Form + Zod.
- **Graphics Engine:** `react-konva`.

## When to use this skill

- Ao criar novos componentes de UI nas Sidebars (Esquerda/Direita).
- Ao implementar formulários para edição de metadados dos ambientes e Pinos.
- Ao fazer a ponte entre o Konva (Canvas) e as chamadas de API.

## How to use it

### 1. State Management Separation (Crucial)

- **Zustand:** Use EXCLUSIVAMENTE para estado efêmero e de alta frequência do cliente. Exemplo: posições de `x, y` durante o drag-and-drop, ferramenta atualmente selecionada (`currentTool`), e zoom/pan do Canvas.
- **React Query:** Use EXCLUSIVAMENTE para dados que vêm do backend ou vão para ele. Exemplo: `useQuery` para carregar o `konva_json` inicial do projeto, e `useMutation` para salvar as alterações da planta ou criar um novo projeto.

### 2. Forms & Validation (Zod + RHF)

- Todo formulário (ex: criar projeto, editar propriedades de um ambiente ou adicionar descrição em um Pin) deve usar `react-hook-form` integrado com o `zodResolver`.
- Os schemas do Zod devem ser a fonte da verdade para a tipagem do frontend e devem espelhar as validações (Pydantic) do backend.

### 3. UI, Styling & shadcn/ui

- Use componentes do `shadcn/ui` para toda a interface fora do Canvas (Sidebars, Modais, Popovers, Toasts).
- **Theming:** A paleta de cores principal do projeto deve utilizar variáveis CSS baseadas nos tons Catppuccin. Configure o `tailwind.config.ts` para usar o `ctp-blue` (Primary) para elementos de ação e `ctp-green` (Success/Highlight) para estados de confirmação ou áreas mapeadas com sucesso.
- Mantenha as sidebars com um visual "glassmorphism" leve ou painéis sólidos limpos para não ofuscar o Canvas central.

### 4. Konva Rendering Optimization

- Isole componentes do Konva. Nunca coloque dependências reativas pesadas no componente raiz do `<Stage />` para evitar re-renders em toda a árvore quando um único retângulo for arrastado.
- Use a propriedade `listening={false}` em formas geométricas do Canvas que servem apenas como fundo ou grid para poupar eventos de ponteiro da CPU.

### 5. Data Flow (Canvas -> API)

1. O usuário desenha/altera no Canvas (atualiza Zustand).
2. O usuário clica em "Salvar" ou o auto-save é engatilhado.
3. O componente lê o estado atualizado do Zustand e dispara uma mutação do React Query (`useMutation`) enviando o JSON estruturado e normalizado para a API.
