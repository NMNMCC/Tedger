import { webhookCallback } from "grammy";
import { createBot } from "./bot";
import { makeAppRuntime } from "./runtime";

export default {
	async fetch(
		request: Request,
		env: Env,
		_ctx: ExecutionContext,
	): Promise<Response> {
		if (request.method === "GET") {
			return new Response("Tedger bot is running 🧾", { status: 200 });
		}

		const runtime = makeAppRuntime(env);
		const bot = createBot(env, runtime);
		return webhookCallback(bot, "cloudflare-mod")(request);
	},
};
