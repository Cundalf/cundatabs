import { serve } from "bun";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Rate limiting configuration
interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

interface ClientRecord {
    requests: number;
    resetTime: number;
}

class RateLimiter {
    private clients = new Map<string, ClientRecord>();
    private config: RateLimitConfig;

    constructor(config: RateLimitConfig) {
        this.config = config;
        // Clean up expired entries every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    private cleanup() {
        const now = Date.now();
        for (const [ip, record] of this.clients.entries()) {
            if (now > record.resetTime) {
                this.clients.delete(ip);
            }
        }
    }

    private getClientIP(request: Request): string {
        const forwarded = request.headers.get('x-forwarded-for');
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }
        const realIp = request.headers.get('x-real-ip');
        if (realIp) {
            return realIp;
        }
        return 'unknown';
    }

    public checkLimit(request: Request): { allowed: boolean; remaining: number; resetTime: number } {
        const ip = this.getClientIP(request);
        const now = Date.now();
        
        let record = this.clients.get(ip);
        
        if (!record || now > record.resetTime) {
            record = {
                requests: 0,
                resetTime: now + this.config.windowMs
            };
            this.clients.set(ip, record);
        }

        const allowed = record.requests < this.config.maxRequests;
        
        if (allowed) {
            record.requests++;
        }

        return {
            allowed,
            remaining: Math.max(0, this.config.maxRequests - record.requests),
            resetTime: record.resetTime
        };
    }
}

// Different rate limits for different endpoints
const generalLimiter = new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 100 }); // 100 requests per 15 minutes
const saveLimiter = new RateLimiter({ windowMs: 60 * 1000, maxRequests: 10 }); // 10 saves per minute
const deleteLimiter = new RateLimiter({ windowMs: 60 * 1000, maxRequests: 5 }); // 5 deletes per minute

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

// Helper function to create rate limit response
function createRateLimitResponse(remaining: number, resetTime: number): Response {
    return new Response(JSON.stringify({ 
        error: "Rate limit exceeded", 
        remaining: 0,
        resetTime: Math.ceil((resetTime - Date.now()) / 1000)
    }), {
        status: 429,
        headers: { 
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": Math.ceil(resetTime / 1000).toString(),
            "Retry-After": Math.ceil((resetTime - Date.now()) / 1000).toString()
        }
    });
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
            // Apply save-specific rate limiting
            const saveLimit = saveLimiter.checkLimit(request);
            if (!saveLimit.allowed) {
                return createRateLimitResponse(saveLimit.remaining, saveLimit.resetTime);
            }

            try {
                const tabData: TabData = await request.json();
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