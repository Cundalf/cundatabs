export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

export interface ClientRecord {
    requests: number;
    resetTime: number;
}

export class RateLimiter {
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
export const generalLimiter = new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 100 }); // 100 requests per 15 minutes
export const saveLimiter = new RateLimiter({ windowMs: 60 * 1000, maxRequests: 10 }); // 10 saves per minute
export const deleteLimiter = new RateLimiter({ windowMs: 60 * 1000, maxRequests: 5 }); // 5 deletes per minute

// Helper function to create rate limit response
export function createRateLimitResponse(remaining: number, resetTime: number): Response {
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