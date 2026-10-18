# Archivo del plan de herramienta — tramos cerrados (CERRADO)

Los cuerpos de los tramos ya DONE del andamio. **Este documento no gobierna
nada**: se lee para saber qué entregó un tramo y con qué propiedad se cerró.
Manda `../TOOLING.md`, donde cada tramo conserva su cabecera, su marcador y la
lápida que apunta aquí. Solo crece por el final.

## H0 — Adoptar el andamio en el repositorio existente (DONE)

- **Propiedad entregada:** el repositorio se explica por sí solo ante cualquier
  agente, sus puertas salen en verde con `../../verify.py`, y sus decisiones y
  entregas viven en `../registry/`.
- **Partes:**
  1. **Instanciar el andamio y la capa — DONE.** Instanciación oficial desde
     `templates` (`39bead6c761666ac5f5648e83bf89a4265d07aaf`), activación de
     hooks (`.githooks/commit-msg` y `.githooks/pre-push`) y decisión de
     adopción `#this-repository-uses-the-agentic-scaffold` registrada en
     `#2026-10-18-adopt-agentic-scaffold-and-react-fsd`. La activación por clon
     queda en `#hook-activation-is-a-per-clone-step`.
  2. **Conciliar documentos y skills del proyecto — DONE.** Conciliados
     `../../AGENTS.md`, `../../README.md`, `../ARCHITECTURE.md` y
     `../../tools/board/documents.txt` en
     `#2026-10-18-adopt-agentic-scaffold-and-react-fsd`.

## H1 — Incorporar las puertas y el stack React (DONE)

- **Propiedad entregada:** cada estándar del §3 de `../../AGENTS.md` para el
  producto React lo sostiene una puerta en `../../gates.txt` (`dependencies`,
  `format`, `lint`, `typecheck`, `tests`, `build`) y queda registrado en
  `../../tools/board/components.txt` (`layer:react-vite` y `stack:react-fsd`),
  verificado en `#2026-10-18-adopt-agentic-scaffold-and-react-fsd`.
