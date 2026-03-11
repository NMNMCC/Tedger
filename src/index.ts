import { webhookCallback } from "grammy";
import { createBot } from "./bot";

export default {
	async fetch(
		request: Request,
		env: Env,
		_ctx: ExecutionContext,
	): Promise<Response> {
		if (request.method === "GET") {
			return new Response("Tedger bot is running 🧾", { status: 200 });
		}

		const bot = createBot(env);
		return webhookCallback(bot, "cloudflare-mod")(request);
	},
};
