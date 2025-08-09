import { serve } from "bun";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const PORT = 3000;

interface TabData {
    name: string;
    stringCount: number;
    measures: string[][][];
    timestamp: string;
}

interface SavedTab {
    filename: string;
    name: string;
    stringCount: number;
    timestamp: string;
}

// Crear directorio de tablaturas si no existe
if (!existsSync("tablaturas")) {
    mkdirSync("tablaturas");
}

// Funciones helper
function serveStaticFile(filePath: string, contentType: string): Response {
    try {
        const content = readFileSync(filePath, "utf-8");
        return new Response(content, {
            headers: { "Content-Type": contentType }
        });
    } catch (error) {
        return new Response("File not found", { status: 404 });
    }
}

function handleSave(tabData: TabData): Response {
    try {
        const filename = `${Date.now()}_${tabData.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        const filepath = join("tablaturas", filename);

        writeFileSync(filepath, JSON.stringify(tabData, null, 2));

        return new Response(JSON.stringify({ success: true, filename }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Error al guardar" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

function handleGetTabs(): Response {
    try {
        const { readdirSync } = require("fs");
        const files = readdirSync("tablaturas").filter((f: string) => f.endsWith('.json'));

        const tabs: SavedTab[] = files.map((filename: string) => {
            try {
                const data = JSON.parse(readFileSync(join("tablaturas", filename), "utf-8"));
                return {
                    filename: filename.replace('.json', ''),
                    name: data.name,
                    stringCount: data.stringCount,
                    timestamp: data.timestamp
                };
            } catch (e) {
                return null;
            }
        }).filter(Boolean);

        return new Response(JSON.stringify(tabs), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json" }
        });
    }
}

function handleLoadTab(filename: string): Response {
    const filepath = join("tablaturas", filename + ".json");

    try {
        const data = readFileSync(filepath, "utf-8");
        return new Response(data, {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Tablatura no encontrada" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
        });
    }
}

function handleDeleteTab(filename: string): Response {
    const filepath = join("tablaturas", filename + ".json");

    try {
        const { unlinkSync } = require("fs");
        unlinkSync(filepath);
        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Error al eliminar" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

// Servidor principal
const server = serve({
    port: PORT,
    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // Servir página principal
        if (url.pathname === "/") {
            return serveStaticFile("public/index.html", "text/html");
        }

        // Servir archivos estáticos
        if (url.pathname.startsWith("/static/")) {
            const filePath = url.pathname.replace("/static/", "static/");
            const ext = filePath.split('.').pop();
            
            const contentTypes: Record<string, string> = {
                'css': 'text/css',
                'js': 'application/javascript',
                'png': 'image/png',
                'jpg': 'image/jpeg',
                'svg': 'image/svg+xml'
            };

            return serveStaticFile(filePath, contentTypes[ext || ''] || 'text/plain');
        }

        // API endpoints
        if (url.pathname === "/save" && request.method === "POST") {
            try {
                const tabData: TabData = await request.json();
                return handleSave(tabData);
            } catch (error) {
                return new Response(JSON.stringify({ error: "Invalid JSON" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }
        }

        if (url.pathname === "/tabs" && request.method === "GET") {
            return handleGetTabs();
        }

        if (url.pathname.startsWith("/load/") && request.method === "GET") {
            const filename = url.pathname.replace("/load/", "");
            return handleLoadTab(filename);
        }

        if (url.pathname.startsWith("/delete/") && request.method === "DELETE") {
            const filename = url.pathname.replace("/delete/", "");
            return handleDeleteTab(filename);
        }

        return new Response("Not found", { status: 404 });
    }
});

console.log(`🎸 CundaTabs servidor corriendo en http://localhost:${PORT}`);
console.log(`📁 Las tablaturas se guardan en: ./tablaturas/`);
console.log(`🚀 Usa 'bun run dev' para desarrollo con hot reload`);