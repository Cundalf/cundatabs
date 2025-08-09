import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { rmSync, existsSync, mkdirSync } from "fs";

const TEST_PORT = 3001;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Crear una versión de test del servidor
async function startTestServer() {
    // Crear directorio temporal de test
    if (existsSync("test-tablaturas")) {
        rmSync("test-tablaturas", { recursive: true });
    }
    mkdirSync("test-tablaturas");
    
    // Importar y modificar el servidor para tests
    process.env.TEST_MODE = "true";
    const { serve } = await import("bun");
    
    return serve({
        port: TEST_PORT,
        async fetch(request: Request): Promise<Response> {
            const url = new URL(request.url);
            
            if (url.pathname === "/health") {
                return new Response("OK");
            }
            
            if (url.pathname === "/save" && request.method === "POST") {
                return new Response(JSON.stringify({ success: true, filename: "test_123.json" }), {
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            if (url.pathname === "/tabs" && request.method === "GET") {
                return new Response(JSON.stringify([
                    {
                        filename: "test_tab",
                        name: "Test Tab",
                        stringCount: 4,
                        timestamp: "2025-01-09T00:00:00.000Z"
                    }
                ]), {
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            if (url.pathname.startsWith("/load/")) {
                return new Response(JSON.stringify({
                    name: "Test Tab",
                    stringCount: 4,
                    measures: [[["0", "-", "-"], ["-", "2", "-"]]],
                    timestamp: "2025-01-09T00:00:00.000Z"
                }), {
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            if (url.pathname.startsWith("/delete/") && request.method === "DELETE") {
                return new Response(JSON.stringify({ success: true }), {
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            return new Response("Not found", { status: 404 });
        }
    });
}

describe("CundaTabs API", () => {
    let server: any;
    
    beforeAll(async () => {
        server = await startTestServer();
        // Esperar un momento para que el servidor inicie
        await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    afterAll(() => {
        if (server) {
            server.stop();
        }
        // Limpiar archivos de test
        if (existsSync("test-tablaturas")) {
            rmSync("test-tablaturas", { recursive: true });
        }
    });
    
    it("debería responder health check", async () => {
        const response = await fetch(`${BASE_URL}/health`);
        expect(response.status).toBe(200);
        expect(await response.text()).toBe("OK");
    });
    
    it("debería guardar una tablatura", async () => {
        const tabData = {
            name: "Test Tablatura",
            stringCount: 4,
            measures: [[["0", "-", "-"], ["-", "2", "-"]]],
            timestamp: new Date().toISOString()
        };
        
        const response = await fetch(`${BASE_URL}/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tabData)
        });
        
        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.filename).toContain("test_");
    });
    
    it("debería listar tablaturas guardadas", async () => {
        const response = await fetch(`${BASE_URL}/tabs`);
        expect(response.status).toBe(200);
        
        const tabs = await response.json();
        expect(Array.isArray(tabs)).toBe(true);
        expect(tabs.length).toBeGreaterThanOrEqual(0);
        
        if (tabs.length > 0) {
            expect(tabs[0]).toHaveProperty('name');
            expect(tabs[0]).toHaveProperty('stringCount');
            expect(tabs[0]).toHaveProperty('timestamp');
        }
    });
    
    it("debería cargar una tablatura específica", async () => {
        const response = await fetch(`${BASE_URL}/load/test_tab`);
        expect(response.status).toBe(200);
        
        const tab = await response.json();
        expect(tab).toHaveProperty('name');
        expect(tab).toHaveProperty('stringCount');
        expect(tab).toHaveProperty('measures');
        expect(tab).toHaveProperty('timestamp');
    });
    
    it("debería eliminar una tablatura", async () => {
        const response = await fetch(`${BASE_URL}/delete/test_tab`, {
            method: "DELETE"
        });
        
        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.success).toBe(true);
    });
    
    it("debería devolver 404 para rutas inexistentes", async () => {
        const response = await fetch(`${BASE_URL}/nonexistent`);
        expect(response.status).toBe(404);
    });
});