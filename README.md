# Cancha de Fútbol — Cristal

Proyecto Three.js con Vite. Superficie de cristal y líneas reglamentarias FIFA.

## Estructura

```
excercise/
├── package.json
├── vite.config.js
├── static/              ← assets estáticos (texturas, modelos, etc.)
└── src/
    ├── index.html
    ├── script.js        ← entry point
    ├── style.css
    └── cancha/          ← módulos Three.js
        ├── scene.js
        ├── lights.js
        ├── field.js
        ├── lines.js
        ├── goals.js
        ├── particles.js
        └── controls.js
```

## Instalación y uso

```bash
# 1. Instalar dependencias
npm install

# 2. Servidor de desarrollo con hot reload
npm run dev

# 3. Build para producción
npm run build
```

Abre http://localhost:5173 en tu navegador.

## Controles

| Acción              | Control                          |
|---------------------|----------------------------------|
| Rotar cámara        | Clic + arrastrar                 |
| Zoom                | Scroll del ratón                 |
| Color de líneas     | Botones blancas / cyan / doradas |
| Modo cristal/sólido | Botón "Cristal / Sólido"         |
| Auto-rotar          | Botón "Auto-rotar"               |
