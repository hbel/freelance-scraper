import { parse } from "yaml";

export interface Config {
    targetUrl: string;
    pages: number;
    scanInterval: number;
    enableEmail?: boolean;
    enableRocketChat?: boolean;
    targetEmail?: string;
    chatUser?: string;
    keywords: string[];
}

const yamlConfig = await Deno.readTextFile("./config.yaml");
const _config = parse(yamlConfig) as { config: Config };
export const config = _config.config;
