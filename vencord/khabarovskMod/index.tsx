import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Menu, React, SelectedChannelStore, Toasts } from "@webpack/common";

import {
    addEntry, clearHistory, historyForUser, HistoryEntry,
    loadHistory, recentPunishments, removeEntry
} from "./history";
import {
    buildForm, FormKind, fillTemplate, formatDate, formatTime,
    punishmentCommand, punishmentMessage, userTag
} from "./punish";
import { RULES } from "./rules";
import { channelId, num, settings } from "./settings";

const MessageActions = findByPropsLazy("sendMessage", "receiveMessage");

interface DiscordUser {
    id: string;
    username?: string;
    discriminator?: string;
    tag?: string;
    bot?: boolean;
}

// ── Мелкие утилиты ──────────────────────────────────────────────────────────

function toast(message: string, type: number = Toasts.Type.SUCCESS) {
    Toasts.show({ message, type, id: Toasts.genId() });
}

async function copy(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        toast(`Скопировано: ${text}`, Toasts.Type.MESSAGE);
    } catch {
        toast("Не удалось скопировать в буфер", Toasts.Type.FAILURE);
    }
}

function currentChannelId(): string | null {
    return SelectedChannelStore.getChannelId() ?? null;
}

function send(channel: string, content: string) {
    MessageActions.sendMessage(channel, {
        content,
        tts: false,
        invalidEmojis: [],
        validNonShortcutEmojis: []
    }, undefined, {});
}

/**
 * Выполняет действие, при включённом подтверждении — спросив пользователя.
 * Vencord не даёт синхронного confirm, поэтому используем нативное окно Discord
 * только там, где это действительно нужно: отправка видна другим.
 */
function run(preview: string, action: () => void) {
    if (!settings.store.confirmActions) {
        action();
        return;
    }
    // eslint-disable-next-line no-alert
    if (confirm(`Подтвердите действие:\n\n${preview}`)) action();
}

// ── Выдача наказания ────────────────────────────────────────────────────────

async function executePunishment(user: DiscordUser, ruleId: string, punishment: string) {
    const now = new Date();
    const entry: HistoryEntry = {
        userId: user.id,
        userTag: userTag(user),
        ruleId,
        punishment,
        dateIssued: formatDate(now),
        timeIssued: formatTime(now)
    };

    const message = punishmentMessage(punishment, user.id, ruleId);
    const command = punishmentCommand(punishment, user.id, ruleId);
    const channel = currentChannelId();

    if (!channel) {
        toast("Не удалось определить текущий канал", Toasts.Type.FAILURE);
        return;
    }

    const preview = [command && `Команда: ${command}`, message && `Сообщение: ${message}`]
        .filter(Boolean).join("\n");

    run(preview, () => {
        if (command) void copy(command);
        if (message) send(channel, message);
        toast(`${punishment} по пункту ${ruleId}`);
    });

    await addEntry(entry);
}

// ── Пункты меню ─────────────────────────────────────────────────────────────

function ruleItems(user: DiscordUser) {
    return RULES.map(category => (
        <Menu.MenuItem
            key={category.id}
            id={`khab-cat-${category.id}`}
            label={category.name}
        >
            {category.rules.map(rule => (
                <Menu.MenuItem
                    key={rule.id}
                    id={`khab-rule-${rule.id}`}
                    label={rule.text}
                >
                    {rule.punishments.map((punishment, i) => (
                        <Menu.MenuItem
                            key={`${rule.id}-${i}`}
                            id={`khab-p-${rule.id}-${i}`}
                            label={punishment}
                            action={() => void executePunishment(user, rule.id, punishment)}
                        />
                    ))}
                </Menu.MenuItem>
            ))}
        </Menu.MenuItem>
    ));
}

function formItems(user: DiscordUser) {
    const kinds: Array<[FormKind, string]> = [
        ["oralWarning", "Устное предупреждение"],
        ["warning", "Предупреждение"],
        ["mute", "Мут"],
        ["ban", "Бан"]
    ];

    return kinds.map(([kind, label]) => (
        <Menu.MenuItem key={kind} id={`khab-form-${kind}`} label={label}>
            {RULES.flatMap(c => c.rules).map(rule => (
                <Menu.MenuItem
                    key={`${kind}-${rule.id}`}
                    id={`khab-form-${kind}-${rule.id}`}
                    label={rule.text}
                    action={() => {
                        const text = buildForm({
                            kind,
                            userId: user.id,
                            userTag: userTag(user),
                            ruleId: rule.id
                        });
                        if (!text) {
                            toast("Шаблон формы не настроен", Toasts.Type.FAILURE);
                            return;
                        }
                        void copy(text);
                    }}
                />
            ))}
        </Menu.MenuItem>
    ));
}

/**
 * История нарушений этого пользователя. В BetterDiscord-версии история была
 * общей и по конкретному человеку не фильтровалась — здесь она сразу под рукой,
 * потому что от прошлых наказаний зависит выбор следующей ступени.
 */
function historyItems(user: DiscordUser) {
    const entries = historyForUser(user.id);
    if (!entries.length) {
        return (
            <Menu.MenuItem
                id="khab-history-empty"
                label="Нарушений нет"
                disabled
            />
        );
    }

    return [
        ...entries.slice(0, 15).map((entry, i) => (
            <Menu.MenuItem
                key={`hist-${i}`}
                id={`khab-hist-${i}`}
                label={`${entry.dateIssued} ${entry.timeIssued} — ${entry.punishment} (${entry.ruleId})`}
                action={() => void removeEntry(entry).then(() => toast("Запись удалена"))}
            />
        )),
        <Menu.MenuSeparator key="hist-sep" />,
        <Menu.MenuItem
            key="hist-clear"
            id="khab-hist-clear"
            label="Очистить всю историю"
            color="danger"
            action={() => void clearHistory().then(() => toast("История очищена"))}
        />
    ];
}

function toolItems(user: DiscordUser, messageId?: string) {
    const s = settings.store;
    const insert = (template: string, label: string) => {
        if (!template) {
            toast(`Команда «${label}» не настроена`, Toasts.Type.FAILURE);
            return;
        }
        void copy(fillTemplate(template, { userId: user.id, messageId: messageId ?? "" }));
    };

    const recent = recentPunishments(num(s.recentLimit, 7, 1, 25));

    return [
        <Menu.MenuItem
            key="tool-user"
            id="khab-tool-user"
            label="Проверка пользователя"
            action={() => insert(s.userCommand, "проверка")}
        />,
        <Menu.MenuItem
            key="tool-punish"
            id="khab-tool-punish"
            label="Punish"
            action={() => insert(s.punishCommand, "punish")}
        />,
        <Menu.MenuItem
            key="tool-id"
            id="khab-tool-id"
            label="Копировать ID"
            action={() => void copy(user.id)}
        />,
        <Menu.MenuItem
            key="tool-mention"
            id="khab-tool-mention"
            label="Копировать упоминание"
            action={() => void copy(`<@${user.id}>`)}
        />,
        <Menu.MenuSeparator key="tool-sep-1" />,
        <Menu.MenuItem key="tool-forms" id="khab-tool-forms" label="Формы наказаний">
            {formItems(user)}
        </Menu.MenuItem>,
        <Menu.MenuItem
            key="tool-history"
            id="khab-tool-history"
            label={`История нарушений (${historyForUser(user.id).length})`}
        >
            {historyItems(user)}
        </Menu.MenuItem>,
        ...(recent.length
            ? [
                <Menu.MenuItem key="tool-recent" id="khab-tool-recent" label="Недавние наказания">
                    {recent.map((r, i) => (
                        <Menu.MenuItem
                            key={`recent-${i}`}
                            id={`khab-recent-${i}`}
                            label={`${r.punishment} — ${r.ruleId}`}
                            action={() => void executePunishment(user, r.ruleId, r.punishment)}
                        />
                    ))}
                </Menu.MenuItem>
            ]
            : []),
        <Menu.MenuSeparator key="tool-sep-2" />,
        <Menu.MenuItem key="tool-clear" id="khab-tool-clear" label="Очистка">
            {[
                ...(messageId
                    ? [
                        <Menu.MenuItem
                            key="clear-one"
                            id="khab-clear-one"
                            label="Очистить сообщение"
                            action={() => insert(s.clearOneCommand, "очистка сообщения")}
                        />
                    ]
                    : []),
                <Menu.MenuItem
                    key="clear-member"
                    id="khab-clear-member"
                    label="Очистить сообщения пользователя"
                    action={() => insert(s.clearMemberCommand, "очистка пользователя")}
                />
            ]}
        </Menu.MenuItem>
    ];
}

function moderationMenu(user: DiscordUser, messageId?: string) {
    return (
        <Menu.MenuItem id="khab-moderation" label="Модерация">
            {ruleItems(user)}
            <Menu.MenuSeparator />
            <Menu.MenuItem id="khab-tools" label="Инструменты модерации">
                {toolItems(user, messageId)}
            </Menu.MenuItem>
        </Menu.MenuItem>
    );
}

// ── Патчи контекстных меню ──────────────────────────────────────────────────

const userContextPatch: NavContextMenuPatchCallback = (children, props: { user?: DiscordUser; }) => {
    const user = props?.user;
    if (!user || user.bot) return;
    children.push(moderationMenu(user));
};

const messageContextPatch: NavContextMenuPatchCallback = (
    children,
    props: { message?: { id?: string; author?: DiscordUser; }; }
) => {
    const author = props?.message?.author;
    if (!author || author.bot) return;
    children.push(moderationMenu(author, props.message?.id));
};

// ── Копирование команды по кнопке «Одобрить» ────────────────────────────────

let approveHandler: ((event: MouseEvent) => void) | null = null;

/** Текст команды из блока кода того же сообщения, что и нажатая кнопка. */
function commandFromMessage(button: Element): string {
    const message =
        button.closest('li[id^="chat-messages-"]') ??
        button.closest('[id^="chat-messages-"]') ??
        button.closest('[class*="messageListItem"]');
    if (!message) return "";

    const blocks = Array.from(message.querySelectorAll("code, pre"));
    for (const block of blocks) {
        const text = (block.textContent ?? "").replace(/\s+/g, " ").trim();
        if (text.startsWith("/")) return text;
    }
    return blocks.length ? (blocks[0].textContent ?? "").replace(/\s+/g, " ").trim() : "";
}

function registerApproveCopy() {
    approveHandler = (event: MouseEvent) => {
        try {
            const s = settings.store;
            if (!s.approveCopyEnabled) return;

            const target = event.target as Element | null;
            const button = target?.closest?.('button, [role="button"]');
            if (!button) return;

            const label = (button.textContent ?? "").trim().toLowerCase();
            const wanted = String(s.approveLabels || "Одобрить")
                .split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
            if (!wanted.includes(label)) return;

            const want = channelId(s.approveChannelId);
            if (want && currentChannelId() !== want) return;

            const command = commandFromMessage(button);
            if (!command) return;

            void copy(command);
        } catch (error) {
            console.error("[khabarovskMod] approve copy failed", error);
        }
    };
    // Перехват без отмены события: нажатие уходит боту как обычно.
    document.addEventListener("click", approveHandler, true);
}

// ── Плагин ──────────────────────────────────────────────────────────────────

export default definePlugin({
    name: "khabarovskMod",
    description:
        "Модерация сервера Хабаровск (BlackRussia): выдача наказаний по пунктам правил " +
        "из контекстного меню, формы наказаний, история нарушений по пользователю.",
    authors: [{ name: "Jeredpoi", id: 0n }],
    settings,

    contextMenus: {
        "user-context": userContextPatch,
        "message": messageContextPatch
    },

    async start() {
        await loadHistory();
        registerApproveCopy();
    },

    stop() {
        if (approveHandler) {
            document.removeEventListener("click", approveHandler, true);
            approveHandler = null;
        }
    }
});
