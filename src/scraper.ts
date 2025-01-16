// Import required Deno modules
import { DOMParser } from "deno_dom";
import { encodeBase64 } from "base64";
import nodemailer from "nodemailer";
import { parse } from "yaml";
import { load as loadEnv } from "dotenv";

interface Config {
  targetUrl: string;
  pages: number;
  scanInterval: number;
  enableEmail: boolean;
  targetEmail?: string;
  keywords: string[];
}

const yamlConfig = await Deno.readTextFile("./config.yaml");
const _config = parse(yamlConfig) as { config: Config };
const config = _config.config;

await loadEnv({ export: true });

// Store for already seen projects
const seenProjects = new Set<string>();

// Types
interface Project {
  title: string;
  description: string;
  link: string;
  hash: string;
  keywords: string[];
}

// Email configuration
const transporter = nodemailer.createTransport({
  host: Deno.env.get("SMTP_HOST"),
  port: Number.parseInt(Deno.env.get("SMTP_PORT") ?? "0"),
  secure: Deno.env.get("SMTP_USE_TLS") === "true",
  auth: {
    user: Deno.env.get("SMTP_USERNAME"),
    pass: Deno.env.get("SMTP_PASSWORD"),
  },
});

function generateHash(title: string, description: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(title + description);
  return encodeBase64(data);
}

async function sendEmail(projects: Project[]) {
  try {
    const emailContent = projects
      .map(
        (project) =>
          `Titel: ${project.title}\nLink: ${
            project.link
          }\nKeywords: ${project.keywords.join(", ")}\n`
      )
      .join("\n---\n\n");

    await transporter.sendMail({
      from: "bot@mail.innovation-through-understanding.de",
      to: config.targetEmail!,
      subject: `Neue passende Projekte gefunden (${projects.length})`,
      text: emailContent,
      html: "<pre>" + emailContent + "</pre>",
    });

    console.log("E-Mail wurde erfolgreich versendet");
  } catch (error) {
    console.error("Fehler beim E-Mail-Versand:", error);
  }
}

async function scrapeProjects(): Promise<void> {
  const result: Project[][] = await Promise.all(
    Array.from({ length: config.pages }, (_, i) => i).map((page) =>
      scrapePage(page)
    )
  );

  const matchedProjects = result.flat();

  if (matchedProjects.length > 0) {
    console.log(`\n${matchedProjects.length} Neue passende Projekte gefunden.`);

    if (config.enableEmail) {
      await sendEmail(matchedProjects);
      console.log("E-Mail wurde versendet.");
    }
  } else {
    console.log("Keine neuen passenden Projekte gefunden.");
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
      throw new Error("Konnte Dokument nicht parsen");
    }

    const projectCards = document.querySelectorAll(".project-container");

    projectCards.forEach((card) => {
      const titleElement = card.querySelector("a.project-title");

      const title = titleElement?.textContent?.trim() || "";

      const description =
        card.querySelector(".description")?.textContent?.trim() || "";

      const link = titleElement?.getAttribute("href") || "";

      const fullLink = link.startsWith("http")
        ? link
        : `https://www.freelancermap.de${link}`;

      const hash = generateHash(title, description);

      // Skip if we've seen this project before
      if (seenProjects.has(hash)) {
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
          seenProjects.add(hash);
          break;
        }
      }
    });

    return matchedProjects;
  } catch (error) {
    console.error("Fehler beim Scraping:", error);
    return [];
  }
}

// Hauptprogramm
console.log("Starte Project Scanner...");
console.log("Bereits gesehene Projekte:", seenProjects.size);
await scrapeProjects(); // Initial scan

// Periodischer Scan
setInterval(async () => {
  console.log("\nFühre periodischen Scan durch...");
  console.log("Bereits gesehene Projekte:", seenProjects.size);
  await scrapeProjects();
}, config.scanInterval * 1000 * 60);
