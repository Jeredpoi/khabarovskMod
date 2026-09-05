import { channelId, num, settings } from "./settings";

/** Наказания, которые отправляются в чат сообщением. */
export const ORAL_WARNING = "Устное предупреждение";
export const WARNING = "Предупреждение";

export interface TemplateVars {
    userId?: string;
    userTag?: string;
    ruleId?: string;
    punishment?: string;
    messageId?: string;
    moderatorNick?: string;
    dateIssued?: string;
    dateEnd?: string;
    rulesChannel?: string;
}

export function pad(n: number): string {
    return String(n).padStart(2, "0");
}

export function formatDate(d: Date): string {
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function formatTime(d: Date): string {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Ссылка на канал правил. Пустая строка, если ID не задан. */
export function rulesChannelMention(): string {
    const id = channelId(settings.store.rulesChannelId);
    return id ? `<#${id}>` : "";
}

/**
 * Подставляет переменные вида {name}. Неизвестные плейсхолдеры остаются как есть,
 * чтобы опечатка в шаблоне была заметна, а не молча съедалась.
 */
export function fillTemplate(template: string, vars: TemplateVars): string {
    if (typeof template !== "string" || !template) return "";
    const all: TemplateVars = { rulesChannel: rulesChannelMention(), ...vars };
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
        if (!Object.prototype.hasOwnProperty.call(all, key)) return match;
        const value = all[key as keyof TemplateVars];
        return value === undefined || value === null ? "" : String(value);
    });
}

/**
 * Текст наказания. У устного предупреждения и предупреждения свои формулировки,
 * у остальных — общий шаблон.
 */
export function punishmentMessage(punishment: string, userId: string, ruleId: string): string {
    const s = settings.store;
    const template =
        punishment === ORAL_WARNING ? s.oralWarningText :
        punishment === WARNING ? s.warningText :
        s.genericText;

    // Незаполненный канал правил схлопывает {rulesChannel} в пустоту —
    // убираем повисшие пробелы, чтобы точка не оставалась в воздухе.
    return fillTemplate(template, { userId, ruleId, punishment })
        .replace(/[ \t]{2,}/g, " ")
        .trim();
}

/** Команда, соответствующая наказанию. Пустая строка, если наказание её не требует. */
export function punishmentCommand(punishment: string, userId: string, ruleId: string): string {
    const s = settings.store;
    const lower = punishment.toLowerCase();

    let template = "";
    if (punishment === WARNING) template = s.warnCommand;
    else if (lower.includes("мут")) template = s.muteCommand;
    else if (lower.includes("перманент")) template = s.permbanCommand;
    else if (lower.includes("бан")) template = s.banCommand;

    return template ? fillTemplate(template, { userId, ruleId }) : "";
}

export type FormKind = "oralWarning" | "warning" | "mute" | "ban";

const FORM_LABELS: Record<FormKind, string> = {
    oralWarning: ORAL_WARNING,
    warning: WARNING,
    mute: "Мут",
    ban: "Бан"
};

/** Убирает строку с датой снятия — она не нужна для устного предупреждения. */
function dropDateEndLine(text: string): string {
    return text
        .split(/\r?\n/)
        .filter(line => {
            const lower = line.toLowerCase();
            if (!lower.trim()) return true;
            return !lower.includes("{dateend}") && !lower.includes("дата снятия");
        })
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export interface FormOptions {
    kind: FormKind;
    userId: string;
    userTag: string;
    ruleId: string;
    dateIssued?: string;
    dateEnd?: string;
}

/** Собирает форму наказания по шаблону из настроек. */
export function buildForm(opts: FormOptions): string {
    const s = settings.store;
    const template = s.formTemplate;
    if (!template) return "";

    const now = new Date();
    const dateIssued = opts.dateIssued || formatDate(now);

    let dateEnd = opts.dateEnd ?? "";
    if (!dateEnd) {
        if (opts.kind === "mute") {
            const minutes = num(s.defaultMuteTime, 90, 0, 60 * 24 * 365);
            dateEnd = formatDate(new Date(now.getTime() + minutes * 60_000));
        } else if (opts.kind === "ban") {
            const days = num(s.defaultBanTime, 7, 0, 3650);
            dateEnd = formatDate(new Date(now.getTime() + days * 86_400_000));
        } else if (opts.kind === "warning") {
            dateEnd = dateIssued;
        }
    }

    const rendered = fillTemplate(template, {
        userId: opts.userId,
        userTag: opts.userTag,
        ruleId: opts.ruleId || "____",
        punishment: FORM_LABELS[opts.kind],
        moderatorNick: s.moderatorNick || "Ваш_Nick_Name",
        dateIssued,
        dateEnd
    });

    // У устного предупреждения даты снятия нет.
    return opts.kind === "oralWarning" ? dropDateEndLine(rendered) : rendered;
}

/** Тег пользователя: с дискриминатором для старых аккаунтов, иначе просто ник. */
export function userTag(user: { username?: string; discriminator?: string; tag?: string; id?: string; }): string {
    if (!user) return "Unknown";
    if (typeof user.tag === "string" && user.tag.includes("#")) return user.tag;
    if (user.username && user.discriminator && user.discriminator !== "0") {
        return `${user.username}#${user.discriminator}`;
    }
    return user.username || `ID${user.id ?? "0"}`;
}
