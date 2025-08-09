import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export interface TabData {
    name: string;
    stringCount: number;
    measures: string[][][];
    timestamp: string;
}

export interface SavedTab {
    filename: string;
    name: string;
    stringCount: number;
    timestamp: string;
}

export function handleSave(tabData: TabData): Response {
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

export function handleGetTabs(): Response {
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

export function handleLoadTab(filename: string): Response {
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

export function handleDeleteTab(filename: string): Response {
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