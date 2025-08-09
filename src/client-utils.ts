// Funciones utilitarias del cliente que pueden ser testeadas

export interface Measure {
    [stringIndex: number]: string[];
}

export interface TabData {
    name: string;
    stringCount: number;
    measures: string[][][];
    timestamp: string;
}

export const stringNames: Record<number, string[]> = {
    4: ['G', 'D', 'A', 'E'],      // Bajo 4 cuerdas
    5: ['G', 'D', 'A', 'E', 'B'], // Bajo 5 cuerdas  
    6: ['e', 'B', 'G', 'D', 'A', 'E'], // Guitarra
    7: ['e', 'B', 'G', 'D', 'A', 'E', 'B'], // 7 cuerdas
    8: ['e', 'B', 'G', 'D', 'A', 'E', 'B', 'F#'] // 8 cuerdas
};

export function validateFretInput(value: string): boolean {
    return value === '' || /^\d{1,2}$/.test(value);
}

export function createEmptyMeasure(stringCount: number): string[][] {
    const measure: string[][] = [];
    for (let i = 0; i < stringCount; i++) {
        measure.push(new Array(16).fill('-'));
    }
    return measure;
}

export function hasContentInMeasure(measure: string[][]): boolean {
    for (let stringIndex = 0; stringIndex < measure.length; stringIndex++) {
        for (let position = 0; position < measure[stringIndex].length; position++) {
            if (measure[stringIndex][position] !== '-') {
                return true;
            }
        }
    }
    return false;
}

export function generateFilename(name: string, withDate: boolean = false): string {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
    
    if (!withDate) {
        return cleanName;
    }
    
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0');
    
    return `${cleanName}__${dateStr}`;
}

export function calculateFocusIndex(
    measureIndex: number, 
    stringIndex: number, 
    position: number, 
    totalStrings: number
): number {
    return measureIndex * (totalStrings * 16) + stringIndex * 16 + position;
}

export function getNextFocusPosition(
    measureIndex: number,
    stringIndex: number,
    position: number,
    delta: { measure?: number; string?: number; position?: number },
    limits: { maxMeasures: number; maxStrings: number }
): { measureIndex: number; stringIndex: number; position: number } | null {
    let newMeasureIndex = measureIndex + (delta.measure || 0);
    let newStringIndex = stringIndex + (delta.string || 0);
    let newPosition = position + (delta.position || 0);
    
    // Ajustar posición
    if (newPosition >= 16) {
        newPosition = 0;
        newMeasureIndex++;
    } else if (newPosition < 0) {
        newPosition = 15;
        newMeasureIndex--;
    }
    
    // Ajustar string
    if (newStringIndex >= limits.maxStrings) {
        newStringIndex = 0;
        newPosition++;
        if (newPosition >= 16) {
            newPosition = 0;
            newMeasureIndex++;
        }
    } else if (newStringIndex < 0) {
        newStringIndex = limits.maxStrings - 1;
        newPosition--;
        if (newPosition < 0) {
            newPosition = 15;
            newMeasureIndex--;
        }
    }
    
    // Verificar límites de medidas
    if (newMeasureIndex >= limits.maxMeasures || newMeasureIndex < 0) {
        return null;
    }
    
    return {
        measureIndex: newMeasureIndex,
        stringIndex: newStringIndex,
        position: newPosition
    };
}