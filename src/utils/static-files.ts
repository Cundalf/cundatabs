import { readFileSync } from "fs";

export function serveStaticFile(filePath: string, contentType: string): Response {
    try {
        const content = readFileSync(filePath, "utf-8");
        return new Response(content, {
            headers: { "Content-Type": contentType }
        });
    } catch (error) {
        return new Response("File not found", { status: 404 });
    }
}

export const contentTypes: Record<string, string> = {
    'css': 'text/css',
    'js': 'application/javascript',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'svg': 'image/svg+xml'
};