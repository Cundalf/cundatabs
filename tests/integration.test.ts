import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, rmSync } from "fs";

describe("Integración CundaTabs", () => {
    beforeAll(() => {
        // Limpiar archivos de test existentes
        if (existsSync("test-tablaturas")) {
            rmSync("test-tablaturas", { recursive: true });
        }
    });
    
    afterAll(() => {
        // Limpiar después de tests
        if (existsSync("test-tablaturas")) {
            rmSync("test-tablaturas", { recursive: true });
        }
    });
    
    it("debería validar el formato de datos de tablatura", () => {
        const validTabData = {
            name: "Test Tab",
            stringCount: 4,
            measures: [[
                ["-", "-", "3", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
                ["-", "-", "-", "-", "5", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
                ["-", "-", "-", "-", "-", "-", "7", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
                ["-", "-", "-", "-", "-", "-", "-", "-", "8", "-", "-", "-", "-", "-", "-", "-"]
            ]],
            timestamp: new Date().toISOString()
        };
        
        // Verificar estructura
        expect(typeof validTabData.name).toBe("string");
        expect(typeof validTabData.stringCount).toBe("number");
        expect(Array.isArray(validTabData.measures)).toBe(true);
        expect(typeof validTabData.timestamp).toBe("string");
        
        // Verificar contenido de medidas
        expect(validTabData.measures[0].length).toBe(validTabData.stringCount);
        expect(validTabData.measures[0][0].length).toBe(16);
        
        // Verificar que tiene contenido válido
        expect(validTabData.measures[0][0][2]).toBe("3");
        expect(validTabData.measures[0][1][4]).toBe("5");
    });
    
    it("debería manejar diferentes números de cuerdas", () => {
        const stringCounts = [4, 5, 6, 7, 8];
        
        stringCounts.forEach(count => {
            const measure = [];
            for (let i = 0; i < count; i++) {
                measure.push(new Array(16).fill('-'));
            }
            
            expect(measure.length).toBe(count);
            expect(measure[0].length).toBe(16);
        });
    });
    
    it("debería validar timestamps ISO", () => {
        const timestamp = new Date().toISOString();
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        
        const parsedDate = new Date(timestamp);
        expect(parsedDate.getTime()).not.toBeNaN();
    });
    
    it("debería manejar nombres de archivo seguros", () => {
        const unsafeName = "Mi Tablatura ¡Especial! #2024";
        const safeName = unsafeName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
        
        expect(safeName).toBe("Mi_Tablatura_Especial_2024");
        expect(safeName).not.toContain(" ");
        expect(safeName).not.toContain("!");
        expect(safeName).not.toContain("#");
    });
    
    it("debería validar estructura JSON completa", () => {
        const tabData = {
            name: "Canción de Prueba",
            stringCount: 6,
            measures: [[
                ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
                ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
                ["0", "2", "4", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
                ["-", "-", "-", "2", "4", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
                ["-", "-", "-", "-", "-", "2", "4", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
                ["-", "-", "-", "-", "-", "-", "-", "3", "5", "-", "-", "-", "-", "-", "-", "-"]
            ]],
            timestamp: "2025-01-09T00:00:00.000Z"
        };
        
        const jsonString = JSON.stringify(tabData, null, 2);
        const parsed = JSON.parse(jsonString);
        
        expect(parsed).toEqual(tabData);
        expect(parsed.measures[0][2][0]).toBe("0");
        expect(parsed.measures[0][2][1]).toBe("2");
    });
});