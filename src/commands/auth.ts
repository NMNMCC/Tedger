import { Effect } from "effect";
import { AuthService } from "../services/auth";
import type { Role } from "../db/schema";

const HELP_TEXT = `🔐 权限管理命令:

\`/auth add @username admin\` - 添加管理员 (仅所有者)
\`/auth add @username user\` - 添加普通用户 (管理员及以上)
\`/auth add @username\` - 添加当前群组用户 (管理员及以上)
\`/auth remove @username\` - 移除用户权限
\`/auth list\` - 列出授权用户
\`/auth check\` - 查看自己的权限`;

const roleLabels: Record<Role, string> = {
	owner: "👑 所有者",
	admin: "🔧 管理员",
	user: "👤 用户",
};

export interface AuthInput {
	action: string;
	targetUsername?: string;
	role?: Role;
	chatId: string;
	isGroup: boolean;
	userId: string;
	userName: string;
}

export const handleAuth = (input: AuthInput) =>
	Effect.gen(function* () {
		const auth = yield* AuthService;

		const isOwner = yield* auth.isOwner(input.userId);
		const isAdmin = yield* auth.isAdmin(input.userId);

		switch (input.action) {
			case "help":
				return HELP_TEXT;

			case "check": {
				if (isOwner) {
					return `您的身份: ${roleLabels.owner}`;
				}
				const role = yield* auth.getRole(input.userId, input.isGroup ? input.chatId : null);
				if (!role) {
					return "⚠️ 您没有权限";
				}
				return `您的身份: ${roleLabels[role]}`;
			}

			case "list": {
				const chatId = input.isGroup ? input.chatId : null;
				const permissions = yield* auth.listPermissions(chatId);

				if (permissions.length === 0) {
					return "📋 暂无授权用户";
				}

				const lines = permissions.map((p) => {
					const label = roleLabels[p.role];
					const name = p.userName || p.userId;
					return `${label} ${name}`;
				});

				return `📋 授权用户列表:\n\n${lines.join("\n")}`;
			}

			case "add": {
				if (!input.targetUsername) {
					return "❌ 请指定用户名，例如: /auth add @username admin";
				}

				if (!input.role) {
					input.role = "user";
				}

				if (input.role === "owner") {
					return "❌ 无法添加所有者，所有者通过环境变量 OWNER_ID 配置";
				}

				if (input.role === "admin" && !isOwner) {
					return "❌ 只有所有者可以添加管理员";
				}

				if (input.role === "user" && !isAdmin) {
					return "❌ 只有管理员及以上可以添加用户";
				}

				const targetUserId = input.targetUsername.replace("@", "");
				const targetChatId = input.role === "user" && input.isGroup ? input.chatId : input.role === "user" ? "private" : null;

				yield* auth.grantPermission({
					userId: targetUserId,
					userName: input.targetUsername,
					role: input.role,
					chatId: targetChatId,
					grantedBy: input.userId,
				});

				const scopeText = targetChatId
					? input.isGroup
						? ` (当前群组)`
						: ` (私聊)`
					: ` (全局)`;

				return `✅ 已授权 ${input.targetUsername} 为 ${roleLabels[input.role]}${scopeText}`;
			}

			case "remove": {
				if (!input.targetUsername) {
					return "❌ 请指定用户名，例如: /auth remove @username";
				}

				const targetUserId = input.targetUsername.replace("@", "");
				const targetChatId = input.isGroup ? input.chatId : null;

				const currentRole = yield* auth.getRole(targetUserId, targetChatId);
				if (!currentRole) {
					return `❌ ${input.targetUsername} 没有权限`;
				}

				if (currentRole === "owner") {
					return "❌ 无法移除所有者";
				}

				if (currentRole === "admin" && !isOwner) {
					return "❌ 只有所有者可以移除管理员";
				}

				const removed = yield* auth.revokePermission(targetUserId, targetChatId);
				if (!removed) {
					return `❌ 移除失败`;
				}

				return `✅ 已移除 ${input.targetUsername} 的权限`;
			}

			default:
				return HELP_TEXT;
		}
	});

export { HELP_TEXT as AUTH_HELP_TEXT };