import { encodeBase64 } from "base64";

export class Cache {
    #seenProjects = new Set<string>();

    private async loadCache() {
        try {
            const content = await Deno.readTextFile("./seenProjects.json");
            const cache = JSON.parse(content);
            if (Array.isArray(cache)) {
                this.#seenProjects.clear();
                for (const project of cache) {
                    this.#seenProjects.add(project);
                }
            } else {
                console.error(
                    "Invalid cache format. Please delete seenProjects.json after inspecting it by hand.",
                );
            }
        } catch (e) {
            if (e instanceof Deno.errors.NotFound) {
                // Does not exist yet
                return;
            }
            Deno.exit(1);
        }
    }

    public has(hash: string) {
        return this.#seenProjects.has(hash);
    }

    public add(hash: string) {
        if (!hash) return;
        this.#seenProjects.add(hash);
    }

    public async saveCache() {
        const content = JSON.stringify(Array.from(this.#seenProjects), null, 2);
        await Deno.writeTextFile("./seenProjects.json", content);
    }

    public generateHash(title: string, description: string): string {
        const encoder = new TextEncoder();
        const data = encoder.encode(title + description);
        return encodeBase64(data);
    }

    public static async create() {
        const cache = new Cache();
        await cache.loadCache();
        console.log(
            "Number of known projects since start:",
            cache.#seenProjects.size,
        );
        return cache;
    }
}
