import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const DEFAULT_FORM_TEMPLATE = [
    "1) Ваш Nick_Name: {moderatorNick}",
    "2) ID Discord и тег нарушителя: {userId} / {userTag}",
    "3) Пункт правил, который был нарушен: {ruleId}",
    "4) Выданное наказание: {punishment}",
    "5) Дата выдачи: {dateIssued}",
    "6) Дата снятия: {dateEnd}",
    "7) Доказательства: "
].join("\n");

export const settings = definePluginSettings({
    moderatorNick: {
        type: OptionType.STRING,
        description: "Ваш ник как модератора. Подставляется в формы наказаний.",
        default: ""
    },
    rulesChannelId: {
        type: OptionType.STRING,
        description: "ID канала с правилами. Подставляется в конец сообщения ссылкой. Пусто — ссылки не будет.",
        default: ""
    },

    // ── Тексты наказаний ────────────────────────────────────────────────────
    oralWarningText: {
        type: OptionType.STRING,
        description: "Текст устного предупреждения",
        default: "<@{userId}>, прошу больше не нарушать правила сервера. {rulesChannel}",
        multiline: true
    },
    warningText: {
        type: OptionType.STRING,
        description: "Текст предупреждения",
        default: "<@{userId}>, здравствуйте, уважаемый пользователь. Выдаю вам предупреждение согласно пункту {ruleId} правил. {rulesChannel}",
        multiline: true
    },
    genericText: {
        type: OptionType.STRING,
        description: "Текст остальных наказаний",
        default: "<@{userId}> +{punishment} по пункту {ruleId} правил",
        multiline: true
    },

    // ── Команды ─────────────────────────────────────────────────────────────
    warnCommand: {
        type: OptionType.STRING,
        description: "Команда предупреждения",
        default: "/warn user:<@{userId}> reason:{ruleId}"
    },
    muteCommand: {
        type: OptionType.STRING,
        description: "Команда мута",
        default: "/mute user:<@{userId}> time:90 reason:{ruleId}"
    },
    banCommand: {
        type: OptionType.STRING,
        description: "Команда бана",
        default: "/ban user:<@{userId}> time: reason:{ruleId}"
    },
    permbanCommand: {
        type: OptionType.STRING,
        description: "Команда перманентной блокировки",
        default: "/ban user:<@{userId}> time:365 reason:{ruleId}"
    },
    userCommand: {
        type: OptionType.STRING,
        description: "Команда проверки пользователя",
        default: "/user user:<@{userId}>"
    },
    punishCommand: {
        type: OptionType.STRING,
        description: "Команда punish",
        default: "/punish user:<@{userId}>"
    },
    clearOneCommand: {
        type: OptionType.STRING,
        description: "Команда очистки одного сообщения",
        default: "/clear one message_id:{messageId}"
    },
    clearMemberCommand: {
        type: OptionType.STRING,
        description: "Команда очистки сообщений пользователя",
        default: "/clear member user:<@{userId}>"
    },

    // ── Сроки ───────────────────────────────────────────────────────────────
    defaultMuteTime: {
        type: OptionType.NUMBER,
        description: "Время мута по умолчанию, минут",
        default: 90
    },
    defaultBanTime: {
        type: OptionType.NUMBER,
        description: "Время бана по умолчанию, дней",
        default: 7
    },

    // ── Формы наказаний ─────────────────────────────────────────────────────
    formTemplate: {
        type: OptionType.STRING,
        description: "Шаблон формы наказания. Переменные: {moderatorNick}, {userId}, {userTag}, {ruleId}, {punishment}, {dateIssued}, {dateEnd}",
        default: DEFAULT_FORM_TEMPLATE,
        multiline: true
    },

    // ── Канал форм наказаний ────────────────────────────────────────────────
    approveCopyEnabled: {
        type: OptionType.BOOLEAN,
        description: "Копировать команду при нажатии «Одобрить» в канале форм",
        default: true
    },
    approveChannelId: {
        type: OptionType.STRING,
        description: "ID канала форм наказаний. Пусто — работает в любом канале.",
        default: ""
    },
    approveLabels: {
        type: OptionType.STRING,
        description: "Названия кнопок для копирования, через запятую",
        default: "Одобрить"
    },


    // ── Новости и объявления ────────────────────────────────────────────────
    newsChannelId: {
        type: OptionType.STRING,
        description: "ID канала новостей. Объявления уходят только туда.",
        default: ""
    },
    newsConfirmBeforeSend: {
        type: OptionType.BOOLEAN,
        description: "Показывать предпросмотр перед публикацией. Объявление видно всему серверу.",
        default: true
    },
    newsTemplates: {
        type: OptionType.STRING,
        description: "Шаблоны объявлений. Название — строкой вида --- Название ---, под ней текст. Переменные: {everyone}, {moderator}, {date}, {time}",
        default: "--- Объявление ---\n{everyone}\n\n**Заголовок**\n\nТекст объявления.\n\n*Опубликовал: {moderator} — {date}*\n\n--- Партнёрка ---\n{everyone}\n\n**Новый партнёр**\n\nОписание.\n\nПриглашение:\n\n*Опубликовал: {moderator} — {date}*",
        multiline: true
    },

    // ── Поведение ───────────────────────────────────────────────────────────
    confirmActions: {
        type: OptionType.BOOLEAN,
        description: "Показывать подтверждение перед выдачей наказания",
        default: true
    },
    maxHistory: {
        type: OptionType.NUMBER,
        description: "Сколько записей хранить в истории наказаний",
        default: 50
    },
    recentLimit: {
        type: OptionType.NUMBER,
        description: "Сколько последних наказаний показывать для быстрого повтора",
        default: 7
    }
});

/** Числовая настройка с защитой от мусора и выхода за границы. */
export function num(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

/** Из введённого значения оставляем только цифры: принимаем и «123», и «<#123>». */
export function channelId(value: unknown): string {
    return String(value ?? "").replace(/\D/g, "");
}
