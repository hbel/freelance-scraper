import { Project } from "./Project.ts";

async function sendDirectMessage(
  serverUrl: string,
  username: string,
  password: string,
  recipientUsername: string,
  message: string
): Promise<void> {
  serverUrl = serverUrl.replace(/\/$/, "");

  // Login
  const loginResponse = await fetch(`${serverUrl}/api/v1/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  if (!loginResponse.ok) {
    throw new Error(`Login error: ${await loginResponse.text()}`);
  }

  const {
    data: { authToken, userId },
  } = await loginResponse.json();

  const headers = {
    "X-Auth-Token": authToken,
    "X-User-Id": userId,
    "Content-Type": "application/json",
  };

  // Get user direct messaging "room"
  const roomResponse = await fetch(`${serverUrl}/api/v1/im.create`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      username: recipientUsername,
    }),
  });

  if (!roomResponse.ok) {
    throw new Error(`Error: ${await roomResponse.text()}`);
  }

  const {
    room: { _id: roomId },
  } = await roomResponse.json();

  // Send message
  const messageResponse = await fetch(`${serverUrl}/api/v1/chat.postMessage`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      roomId,
      text: message,
    }),
  });

  if (!messageResponse.ok) {
    throw new Error(`Error: ${await messageResponse.text()}`);
  }
}

export async function sendMessages(projects: Project[]) {
  const server = Deno.env.get("ROCKETCHAT_SERVER");
  const user = Deno.env.get("ROCKETCHAT_USER");
  const password = Deno.env.get("ROCKETCHAT_PASSWORD");

  if (!server || !user || !password) {
    return; // Rocketchat not configured
  }

  const content = projects
    .map(
      (project) =>
        `Titel: ${project.title}\nLink: ${
          project.link
        }\nKeywords: ${project.keywords.join(", ")}\n`
    )
    .join("\n---\n\n");
  await sendDirectMessage(server, user, password, user, content);
}
