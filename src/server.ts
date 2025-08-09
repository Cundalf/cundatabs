import { serve } from "bun";
import { existsSync, mkdirSync } from "fs";
import { generalLimiter, saveLimiter, deleteLimiter, createRateLimitResponse } from "./middleware/rate-limiter.js";
import { handleSave, handleGetTabs, handleLoadTab, handleDeleteTab, TabData } from "./handlers/tabs.js";
import { serveStaticFile, contentTypes } from "./utils/static-files.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;


// Crear directorio de tablaturas si no existe
if (!existsSync("tablaturas")) {
    mkdirSync("tablaturas");
}


// Servidor principal
const server = serve({
    port: PORT,
    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // Apply general rate limiting to all requests
        const generalLimit = generalLimiter.checkLimit(request);
        if (!generalLimit.allowed) {
            return createRateLimitResponse(generalLimit.remaining, generalLimit.resetTime);
        }

        // Servir página principal
        if (url.pathname === "/") {
            return serveStaticFile("public/index.html", "text/html");
        }

        // Servir archivos estáticos
        if (url.pathname.startsWith("/static/")) {
            const filePath = url.pathname.replace("/static/", "static/");
            const ext = filePath.split('.').pop();
            
            return serveStaticFile(filePath, contentTypes[ext || ''] || 'text/plain');
        }

        // API endpoints
        if (url.pathname === "/save" && request.method === "POST") {
            // Apply save-specific rate limiting
            const saveLimit = saveLimiter.checkLimit(request);
            if (!saveLimit.allowed) {
                return createRateLimitResponse(saveLimit.remaining, saveLimit.resetTime);
            }

            try {
                const tabData = await request.json() as TabData;
                const response = handleSave(tabData);
                
                // Add rate limit headers to successful responses
                response.headers.set("X-RateLimit-Remaining", saveLimit.remaining.toString());
                response.headers.set("X-RateLimit-Reset", Math.ceil(saveLimit.resetTime / 1000).toString());
                
                return response;
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
            // Apply delete-specific rate limiting
            const deleteLimit = deleteLimiter.checkLimit(request);
            if (!deleteLimit.allowed) {
                return createRateLimitResponse(deleteLimit.remaining, deleteLimit.resetTime);
            }

            const filename = url.pathname.replace("/delete/", "");
            const response = handleDeleteTab(filename);
            
            // Add rate limit headers to successful responses
            response.headers.set("X-RateLimit-Remaining", deleteLimit.remaining.toString());
            response.headers.set("X-RateLimit-Reset", Math.ceil(deleteLimit.resetTime / 1000).toString());
            
            return response;
        }

        if (url.pathname === "/health" && request.method === "GET") {
            return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (url.pathname === "/rate-limit-status" && request.method === "GET") {
            const generalStatus = generalLimiter.checkLimit(request);
            const saveStatus = saveLimiter.checkLimit(request);
            const deleteStatus = deleteLimiter.checkLimit(request);
            
            return new Response(JSON.stringify({
                general: {
                    remaining: generalStatus.remaining,
                    resetTime: Math.ceil((generalStatus.resetTime - Date.now()) / 1000)
                },
                save: {
                    remaining: saveStatus.remaining,
                    resetTime: Math.ceil((saveStatus.resetTime - Date.now()) / 1000)
                },
                delete: {
                    remaining: deleteStatus.remaining,
                    resetTime: Math.ceil((deleteStatus.resetTime - Date.now()) / 1000)
                }
            }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response("Not found", { status: 404 });
    }
});

console.log(`🎸 CundaTabs servidor corriendo en http://localhost:${PORT}`);
console.log(`📁 Las tablaturas se guardan en: ./tablaturas/`);
console.log(`🚀 Usa 'bun run dev' para desarrollo con hot reload`);