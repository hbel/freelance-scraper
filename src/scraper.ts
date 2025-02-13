import { DOMParser } from "deno_dom";
import { load as loadEnv } from "dotenv";
import { Cache } from "./Cache.ts";
import { Project } from "./Project.ts";
import { config } from "./Config.ts";

await loadEnv({ export: true });

const RocketChat = config.enableRocketChat ? await import("./rocketChatApi.ts") : undefined;
const Mailer = config.enableEmail ? await import("./mailer.ts") : undefined;

const cache = await Cache.create();

async function scrapeProjects(): Promise<void> {
    const result: Project[][] = await Promise.all(
        Array.from({ length: config.pages }, (_, i) => i + 1).map((page) => scrapePage(page)),
    );

    const matchedProjects = result.flat();

    if (matchedProjects.length > 0) {
        console.log(
            `\n${matchedProjects.length} matching new projects were found.`,
        );

        if (config.enableEmail) {
            await Mailer?.sendEmail(matchedProjects);
            console.log("Sent email.");
        }
        if (config.enableRocketChat) {
            await RocketChat?.sendMessages(matchedProjects);
            console.log("Sent chat message");
        }
        cache.saveCache();
    } else {
        console.log("No new projects were found.");
    }
}

async function scrapePage(page: number): Promise<Project[]> {
    try {
        const response = await fetch(`${config.targetUrl}${page}`, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "de,en-US;q=0.7,en;q=0.3",
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const matchedProjects: Project[] = [];

        const html = await response.text();
        const parser = new DOMParser();
        const document = parser.parseFromString(html, "text/html");

        if (!document) {
            throw new Error("Unable to parse website");
        }

        const projectCards = document.querySelectorAll(".project-container");

        projectCards.forEach((card) => {
            const titleElement = card.querySelector("a.project-title");

            const title = titleElement?.textContent?.trim() || "";

            const description = card.querySelector(".description")?.textContent?.trim() || "";

            const link = titleElement?.getAttribute("href") || "";

            const fullLink = link.startsWith("http") ? link : `https://www.freelancermap.de${link}`;

            const hash = cache.generateHash(title, description);

            // Skip if we've seen this project before
            if (cache.has(hash)) {
                return;
            }

            const content = `${title} ${description}`.toLowerCase();

            for (const keyword of config.keywords) {
                if (
                    content.includes(keyword.toLowerCase()) ||
                    title.includes(keyword.toLocaleLowerCase())
                ) {
                    matchedProjects.push({
                        title,
                        description,
                        link: fullLink,
                        hash,
                        keywords: [keyword],
                    });
                    cache.add(hash);
                    break;
                }
            }
        });

        return matchedProjects;
    } catch (error) {
        console.error("Error on scraping:", error);
        return [];
    }
}

console.log("Starting scraper...");
try {
    await scrapeProjects();
} catch (error) {
    console.error(error);
}

setInterval(async () => {
    console.log("\nPerforming periodic scan...");

    try {
        await scrapeProjects();
    } catch (error) {
        console.error(error);
    }
}, config.scanInterval * 1000 * 60);
