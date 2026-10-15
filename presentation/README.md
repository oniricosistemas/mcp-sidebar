# MCP Sidebar · Presentación social

Presentación en español del trabajo de ingeniería de [mcp-sidebar](../README.md): qué se construyó,
con qué restricciones, cómo se verificó y cómo se entregó. Pensada para LinkedIn, X y Discord.

**Todo el pack es local.** No está publicado en Gist, Pages ni en ninguna red.

## Quick path

1. Ver el deck: abrir `index.html` en un navegador (o `python3 -m http.server` y navegar).
2. Regenerar tras editar contenido: `node presentation/tools/build-deck.mjs`.
3. Exportar assets sociales: `node presentation/tools/export-social.mjs`.
4. Validar exports: `node presentation/tools/export-social.mjs --check` (incluido en `pnpm test`).

## Contenido

| Pieza | Archivo | Para qué |
|-------|---------|----------|
| Fuente narrativa | `content.json` | Slides, evidencia, tokens de color y datos de gráficos |
| Deck interactivo | `index.html` | Navegación por teclado/touch/hash, fullscreen, impresión |
| Capturas ANSI crudas | `captures/*.ansi` | Evidencia reproducible de los estados reales |
| Capturas renderizadas | `assets/presentation/*.png` | Imágenes embebidas en el deck (1487×962) |
| Copy | `copy/linkedin.md`, `copy/x.md`, `copy/discord.md` | Textos por plataforma, dentro de sus límites |
| Exports sociales | `exports/` | PNGs por plataforma, cover y PDF |

## Estructura del deck

`content.json` es la única fuente de verdad. Cada slide declara `id`, `kicker`, `title`,
`purpose`, `layout` (`cover`, `grid-2`, `grid-3`, `grid-4`, `split`, `bars`), `points`,
`evidence` y opcionalmente `asset` (captura) o `chart` (barras con datos reales).

El builder (`tools/build-deck.mjs`) genera un único `index.html` autocontenido:

- CSS y JS inline, sin dependencias externas.
- Las 4 capturas van embebidas como `data:` URIs.
- Navegación: `←` `→` `PageUp` `PageDown` `Home` `End`, botones táctiles, hash `#1…#13`.
- `F` pantalla completa · `P` imprimir/exportar PDF.
- `prefers-reduced-motion` y etiquetas ARIA respetadas.
- Impresión: una slide por página (`@page 1600px 900px`).

## Modos de export

El deck acepta canvases deterministas para redes sociales:

| URL | Canvas | Uso |
|-----|--------|-----|
| `?export=linkedin&slide=N` | 1080×1350 | Carrusel LinkedIn |
| `?export=x&slide=N` | 1600×900 | Carrusel X |
| `?export=cover&slide=1` | 1200×630 | Cover / preview de enlace |

## Reproducir los exports

```bash
node presentation/tools/build-deck.mjs     # regenera index.html desde content.json
node presentation/tools/export-social.mjs  # renderiza PNGs + cover + PDF con Chrome headless
node presentation/tools/export-social.mjs --check
```

Salida en `exports/`:

- `linkedin/slide-01.png … slide-13.png` — 1080×1350
- `x/slide-01.png … slide-13.png` — 1600×900
- `cover.png` — 1200×630
- `mcp-sidebar-deck.pdf` — 13 páginas (una por slide)
- `manifest.json` — mapa slide → archivo

Requisito: `google-chrome` disponible (o `CHROME_BIN=/ruta/a/chrome`).

## Verificación

```bash
pnpm test   # 35 tests: contenido, deck y exports (incluye build-deck --check y export-social --check)
google-chrome --headless=new --no-sandbox --allow-file-access-from-files \
  --virtual-time-budget=5000 --dump-dom presentation/tools/nav-check.html | grep '<title>'
# esperado: RESULT problem constraints problem end=cta home=cover overflows=none
```

`nav-check.html` navega el deck con teclado (`ArrowRight`, `ArrowLeft`, `End`, `Home`) y comprueba
que ninguna slide se desborde horizontalmente. `--allow-file-access-from-files` es necesario porque
el iframe cruza orígenes `file://` opacos.

## Regenerar las capturas del deck

Las capturas de `assets/presentation/` vienen de sesiones reales, no de maquetas:

1. `tmux new-session -d -s shots -x 140 -y 40 'cd <repo> && gentle-shell -- -e . --offline'`
2. Ejecutar `/mcp-tools context7` (modal), `/mcp-sidebar-collapse` (colapsado), etc.
3. `tmux capture-pane -e -p -t shots > presentation/captures/NN-nombre.ansi`
4. `node presentation/tools/render-capture.mjs <captura.ansi> <salida.png> <cols> <rows>`

`render-capture.mjs` convierte el ANSI a un frame PNG con Chrome headless. Para Pi standalone
usar `node_modules/.bin/pi -e . --offline --theme <themes> --use-theme Gentleman-Cute` y capturar
el overlay flotante.

## Honestidad

El copy y el deck nunca afirman que los servers MCP estén conectados: el estado de conexión real
lo decide `/mcp`. Solo se documenta lo observado (`tools registered`, comportamiento del rail,
resultados de tests). Si una captura muestra estado de sesión, es literal a la sesión real.

## Checklist

- [x] `content.json` define 13 slides con evidencia observable
- [x] `build-deck.mjs --check` pasa (deck sincronizado con la fuente)
- [x] Deck navegable en desktop y móvil, sin overflow ni overlaps
- [x] Exports con dimensiones exactas por plataforma
- [x] PDF con una página por slide
- [x] Copy dentro de los límites de cada plataforma y sin claims de conectividad
- [x] `pnpm test` cubre contenido, deck y exports

## Next step

Publicar solo con autorización explícita: Gist Preview (`gistpreview.github.io`) o GitHub Pages.
El copy está en `copy/` listo para pegar, con el link al repositorio incluido.
