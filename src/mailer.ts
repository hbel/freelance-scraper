import nodemailer from "nodemailer";
import { Project } from "./Project.ts";
import { config } from "./Config.ts";

const transporter = nodemailer.createTransport({
    host: Deno.env.get("SMTP_HOST"),
    port: Number.parseInt(Deno.env.get("SMTP_PORT") ?? "0"),
    secure: Deno.env.get("SMTP_USE_TLS") === "true",
    auth: {
        user: Deno.env.get("SMTP_USERNAME"),
        pass: Deno.env.get("SMTP_PASSWORD"),
    },
});

export async function sendEmail(projects: Project[]) {
    try {
        const emailContent = projects
            .map(
                (project) =>
                    `Titel: ${project.title}\nLink: ${project.link}\nKeywords: ${
                        project.keywords.join(", ")
                    }\n`,
            )
            .join("\n---\n\n");

        await transporter.sendMail({
            from: Deno.env.get("SMTP_FROM"),
            to: config.targetEmail!,
            subject: `Neue passende Projekte gefunden (${projects.length})`,
            text: emailContent,
            html: "<pre>" + emailContent + "</pre>",
        });
    } catch (error) {
        console.error("Error sending emails:", error);
    }
}
