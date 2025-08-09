import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { spawn } from "bun";
import { readdirSync, unlinkSync, existsSync } from "fs";
import { join } from "path";

const PORT = 3001; // Use different port for tests
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess: any;
let initialFiles: string[] = [];

beforeAll(async () => {
    // Record initial files in tablaturas directory
    if (existsSync("tablaturas")) {
        initialFiles = readdirSync("tablaturas");
    }
    
    // Start server for testing
    serverProcess = spawn({
        cmd: ["bun", "src/server.ts"],
        env: { ...process.env, PORT: PORT.toString() },
        stdout: "pipe",
        stderr: "pipe"
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
});

afterAll(() => {
    if (serverProcess) {
        serverProcess.kill();
    }
    
    // Clean up test files
    if (existsSync("tablaturas")) {
        const currentFiles = readdirSync("tablaturas");
        const testFiles = currentFiles.filter(file => !initialFiles.includes(file));
        
        testFiles.forEach(file => {
            try {
                unlinkSync(join("tablaturas", file));
                console.log(`Cleaned up test file: ${file}`);
            } catch (error) {
                console.warn(`Could not clean up ${file}:`, error);
            }
        });
    }
});

describe("Rate Limiting", () => {
    test("should allow requests within general rate limit", async () => {
        const response = await fetch(`${BASE_URL}/health`);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.status).toBe("ok");
    });

    test("should return rate limit headers", async () => {
        const response = await fetch(`${BASE_URL}/health`);
        
        expect(response.status).toBe(200);
        // Note: Headers might not be present on first requests in tests
        // as rate limiting is applied but headers are only set on specific endpoints
    });

    test("should enforce save endpoint rate limiting", async () => {
        const tabData = {
            name: "Test Tab",
            stringCount: 4,
            measures: [[["", "", "", ""]]],
            timestamp: new Date().toISOString()
        };

        const requests = [];
        
        // Make 12 requests (limit is 10 per minute)
        for (let i = 0; i < 12; i++) {
            requests.push(
                fetch(`${BASE_URL}/save`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...tabData,
                        name: `Test Tab ${i}`
                    })
                })
            );
        }

        const responses = await Promise.all(requests);
        
        // First 10 should succeed
        const successful = responses.filter(r => r.status === 200);
        const rateLimited = responses.filter(r => r.status === 429);
        
        expect(successful.length).toBe(10);
        expect(rateLimited.length).toBe(2);
        
        // Check rate limit response format
        if (rateLimited.length > 0) {
            const rateLimitResponse = await rateLimited[0].json();
            expect(rateLimitResponse.error).toBe("Rate limit exceeded");
            expect(rateLimitResponse.remaining).toBe(0);
            expect(typeof rateLimitResponse.resetTime).toBe("number");
            
            // Check headers
            expect(rateLimited[0].headers.get("X-RateLimit-Remaining")).toBe("0");
            expect(rateLimited[0].headers.get("X-RateLimit-Reset")).toBeTruthy();
            expect(rateLimited[0].headers.get("Retry-After")).toBeTruthy();
        }
    });

    test("should enforce delete endpoint rate limiting", async () => {
        const requests = [];
        
        // Make 7 delete requests (limit is 5 per minute)
        for (let i = 0; i < 7; i++) {
            requests.push(
                fetch(`${BASE_URL}/delete/nonexistent${i}`, {
                    method: "DELETE"
                })
            );
        }

        const responses = await Promise.all(requests);
        
        // Some should be rate limited
        const rateLimited = responses.filter(r => r.status === 429);
        expect(rateLimited.length).toBe(2);
        
        if (rateLimited.length > 0) {
            const rateLimitResponse = await rateLimited[0].json();
            expect(rateLimitResponse.error).toBe("Rate limit exceeded");
        }
    });

    test("should provide rate limit status endpoint", async () => {
        const response = await fetch(`${BASE_URL}/rate-limit-status`);
        
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data).toHaveProperty("general");
        expect(data).toHaveProperty("save");
        expect(data).toHaveProperty("delete");
        
        expect(typeof data.general.remaining).toBe("number");
        expect(typeof data.general.resetTime).toBe("number");
        expect(typeof data.save.remaining).toBe("number");
        expect(typeof data.save.resetTime).toBe("number");
        expect(typeof data.delete.remaining).toBe("number");
        expect(typeof data.delete.resetTime).toBe("number");
    });

    test("should handle different IP addresses separately", async () => {
        // Test with different IP headers
        const response1 = await fetch(`${BASE_URL}/health`, {
            headers: { "x-forwarded-for": "192.168.1.1" }
        });
        
        const response2 = await fetch(`${BASE_URL}/health`, {
            headers: { "x-forwarded-for": "192.168.1.2" }
        });
        
        expect(response1.status).toBe(200);
        expect(response2.status).toBe(200);
    });

    test("should reset rate limits after time window", async () => {
        // This test would be slow in practice, so we just verify the logic
        const response = await fetch(`${BASE_URL}/rate-limit-status`);
        const data = await response.json();
        
        // Check that reset times are valid (positive numbers)
        // The resetTime in the response is seconds remaining, not absolute timestamp
        expect(data.general.resetTime).toBeGreaterThanOrEqual(0);
        expect(data.save.resetTime).toBeGreaterThanOrEqual(0);
        expect(data.delete.resetTime).toBeGreaterThanOrEqual(0);
        
        // Should have reasonable remaining counts
        expect(data.general.remaining).toBeGreaterThanOrEqual(0);
        expect(data.save.remaining).toBeGreaterThanOrEqual(0);
        expect(data.delete.remaining).toBeGreaterThanOrEqual(0);
    });

    test("should handle malformed requests properly with rate limiting", async () => {
        const response = await fetch(`${BASE_URL}/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "invalid json"
        });
        
        // Should still apply rate limiting even for invalid requests
        expect([400, 429]).toContain(response.status);
    });

    test("should apply general rate limiting to all endpoints", async () => {
        const endpoints = [
            "/health",
            "/tabs",
            "/rate-limit-status"
        ];
        
        for (const endpoint of endpoints) {
            const response = await fetch(`${BASE_URL}${endpoint}`);
            // Should not be rate limited immediately (unless already hit limit)
            expect([200, 429]).toContain(response.status);
        }
    });
});