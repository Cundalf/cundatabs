# 🎸 CundaTabs

Editor de tablaturas rápido y moderno para bajo y guitarra, construido con Bun y TypeScript.

## ✨ Características

- **Editor en tiempo real** con navegación por teclado
- **Múltiples instrumentos**: Bajo (4-5 cuerdas), Guitarra (6-8 cuerdas)
- **Guardar/Cargar** tablaturas en formato JSON
- **Exportar a PNG** con formato de fecha automático
- **Interfaz moderna** con modales personalizados
- **Responsive design** para móvil y desktop

## 🚀 Instalación

```bash
# Clonar el repositorio
git clone [tu-repo]
cd cundatabs

# Instalar dependencias (requiere Bun)
bun install

# Ejecutar en modo desarrollo
bun run dev

# O ejecutar en producción
bun start
```

## 📁 Estructura del Proyecto

```
cundatabs/
├── src/
│   ├── server.ts          # Servidor TypeScript
│   └── client-utils.ts    # Utilidades del cliente
├── tests/
│   ├── server.test.ts     # Tests del servidor
│   ├── client-utils.test.ts # Tests de utilidades
│   └── integration.test.ts # Tests de integración
├── public/
│   └── index.html         # HTML principal
├── static/
│   ├── styles.css         # Estilos CSS
│   └── app.js             # JavaScript del cliente
├── tablaturas/            # Archivos guardados
├── package.json
├── tsconfig.json
└── README.md
```

## 🎮 Uso

1. **Selecciona el instrumento** (4-8 cuerdas)
2. **Escribir números** en los campos para indicar trastes
3. **Navegar** con flechas del teclado o Tab
4. **Agregar/quitar compases** con los botones + y -
5. **Guardar** con nombre personalizado
6. **Exportar** como PNG con formato: `nombre_tablatura__yyyy-mm-dd.png`

## 🔧 Scripts Disponibles

- `bun run dev` - Desarrollo con hot reload
- `bun start` - Producción
- `bun run build` - Build para distribución
- `bun test` - Ejecutar tests
- `bun test --watch` - Tests en modo watch
- `bun test --coverage` - Tests con coverage

## 🌐 Rutas API

- `GET /` - Página principal
- `GET /static/*` - Archivos estáticos
- `POST /save` - Guardar tablatura
- `GET /tabs` - Listar tablaturas guardadas
- `GET /load/:filename` - Cargar tablatura específica
- `DELETE /delete/:filename` - Eliminar tablatura

## 📝 Formato de Tablatura

Las tablaturas se guardan en formato JSON:

```json
{
  "name": "Mi Tablatura",
  "stringCount": 4,
  "measures": [...],
  "timestamp": "2025-01-09T..."
}
```

## 🧪 Testing

El proyecto incluye una suite de tests completa usando Bun Test:

### Tipos de Tests
- **Unit Tests**: Funciones utilitarias del cliente
- **API Tests**: Endpoints del servidor  
- **Integration Tests**: Validación de datos y flujos

### Ejecutar Tests
```bash
# Ejecutar todos los tests
bun test

# Tests en modo watch (se ejecutan al cambiar archivos)
bun test --watch

# Tests con reporte de coverage
bun test --coverage
```

### Estructura de Tests
- `tests/client-utils.test.ts` - Tests de utilidades (validación, navegación, etc.)
- `tests/server.test.ts` - Tests de API endpoints
- `tests/integration.test.ts` - Tests de integración y validación de datos

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver el archivo LICENSE para más detalles.