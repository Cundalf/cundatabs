import { describe, it, expect } from "bun:test";
import {
    stringNames,
    validateFretInput,
    createEmptyMeasure,
    hasContentInMeasure,
    generateFilename,
    calculateFocusIndex,
    getNextFocusPosition
} from "../src/client-utils";

describe("Client Utils", () => {
    describe("stringNames", () => {
        it("debería tener configuraciones correctas para cada instrumento", () => {
            expect(stringNames[4]).toEqual(['G', 'D', 'A', 'E']);
            expect(stringNames[5]).toEqual(['G', 'D', 'A', 'E', 'B']);
            expect(stringNames[6]).toEqual(['e', 'B', 'G', 'D', 'A', 'E']);
            expect(stringNames[7]).toEqual(['e', 'B', 'G', 'D', 'A', 'E', 'B']);
            expect(stringNames[8]).toEqual(['e', 'B', 'G', 'D', 'A', 'E', 'B', 'F#']);
        });
    });
    
    describe("validateFretInput", () => {
        it("debería validar inputs de trastes correctos", () => {
            expect(validateFretInput('')).toBe(true);
            expect(validateFretInput('0')).toBe(true);
            expect(validateFretInput('1')).toBe(true);
            expect(validateFretInput('12')).toBe(true);
            expect(validateFretInput('24')).toBe(true);
        });
        
        it("debería rechazar inputs de trastes incorrectos", () => {
            expect(validateFretInput('a')).toBe(false);
            expect(validateFretInput('123')).toBe(false);
            expect(validateFretInput('-1')).toBe(false);
            expect(validateFretInput('1.5')).toBe(false);
        });
    });
    
    describe("createEmptyMeasure", () => {
        it("debería crear un compás vacío con el número correcto de cuerdas", () => {
            const measure4 = createEmptyMeasure(4);
            expect(measure4.length).toBe(4);
            expect(measure4[0].length).toBe(16);
            expect(measure4[0][0]).toBe('-');
            
            const measure6 = createEmptyMeasure(6);
            expect(measure6.length).toBe(6);
            expect(measure6[0].length).toBe(16);
        });
    });
    
    describe("hasContentInMeasure", () => {
        it("debería detectar compás vacío", () => {
            const emptyMeasure = createEmptyMeasure(4);
            expect(hasContentInMeasure(emptyMeasure)).toBe(false);
        });
        
        it("debería detectar compás con contenido", () => {
            const measure = createEmptyMeasure(4);
            measure[0][5] = '3';
            expect(hasContentInMeasure(measure)).toBe(true);
        });
    });
    
    describe("generateFilename", () => {
        it("debería generar nombre simple sin fecha", () => {
            expect(generateFilename("Mi Tablatura")).toBe("Mi_Tablatura");
            expect(generateFilename("Test   Spaces")).toBe("Test_Spaces");
        });
        
        it("debería generar nombre con fecha", () => {
            const filename = generateFilename("Test", true);
            expect(filename).toMatch(/^Test__\d{4}-\d{2}-\d{2}$/);
        });
    });
    
    describe("calculateFocusIndex", () => {
        it("debería calcular índices correctamente", () => {
            // Primer input (medida 0, cuerda 0, posición 0)
            expect(calculateFocusIndex(0, 0, 0, 4)).toBe(0);
            
            // Segunda posición en la misma cuerda
            expect(calculateFocusIndex(0, 0, 1, 4)).toBe(1);
            
            // Primera posición de la segunda cuerda
            expect(calculateFocusIndex(0, 1, 0, 4)).toBe(16);
            
            // Primera posición de la segunda medida
            expect(calculateFocusIndex(1, 0, 0, 4)).toBe(64);
        });
    });
    
    describe("getNextFocusPosition", () => {
        const limits = { maxMeasures: 2, maxStrings: 4 };
        
        it("debería moverse correctamente hacia la derecha", () => {
            const result = getNextFocusPosition(0, 0, 0, { position: 1 }, limits);
            expect(result).toEqual({ measureIndex: 0, stringIndex: 0, position: 1 });
        });
        
        it("debería moverse correctamente hacia abajo", () => {
            const result = getNextFocusPosition(0, 0, 0, { string: 1 }, limits);
            expect(result).toEqual({ measureIndex: 0, stringIndex: 1, position: 0 });
        });
        
        it("debería manejar el final de posición (ir a siguiente medida)", () => {
            const result = getNextFocusPosition(0, 0, 15, { position: 1 }, limits);
            expect(result).toEqual({ measureIndex: 1, stringIndex: 0, position: 0 });
        });
        
        it("debería manejar el final de cuerdas (ir a siguiente posición)", () => {
            const result = getNextFocusPosition(0, 3, 0, { string: 1 }, limits);
            expect(result).toEqual({ measureIndex: 0, stringIndex: 0, position: 1 });
        });
        
        it("debería devolver null para posiciones fuera de límites", () => {
            const result = getNextFocusPosition(1, 0, 15, { position: 1 }, limits);
            expect(result).toBeNull();
        });
        
        it("debería manejar movimiento hacia atrás", () => {
            const result = getNextFocusPosition(1, 0, 0, { position: -1 }, limits);
            expect(result).toEqual({ measureIndex: 0, stringIndex: 0, position: 15 });
        });
    });
});