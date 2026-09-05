import {
    ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal
} from "@utils/modal";
import { Button, Forms, React, TextArea, Toasts } from "@webpack/common";

import { fillTemplate, formatDate, formatTime } from "./punish";
import { channelId, settings } from "./settings";

export interface NewsTemplate {
    name: string;
    text: string;
}

/**
 * Разбирает шаблоны объявлений. Заголовок — строка вида `--- Название ---`,
 * под ней текст до следующего заголовка. Заголовок без текста отбрасывается,
 * чтобы случайная пустая заготовка не попала в список.
 */
export function parseTemplates(raw: string): NewsTemplate[] {
    if (typeof raw !== "string" || !raw.trim()) return [];

    const result: Array<{ name: string; lines: string[]; }> = [];
    let current: { name: string; lines: string[]; } | null = null;

    for (const line of raw.split(/\r?\n/)) {
        const header = line.match(/^\s*-{3,}\s*(.+?)\s*-{3,}\s*$/);
        if (header) {
            if (current) result.push(current);
            current = { name: header[1], lines: [] };
        } else if (current) {
            current.lines.push(line);
        }
    }
    if (current) result.push(current);

    return result
        .map(t => ({ name: t.name, text: t.lines.join("\n").trim() }))
        .filter(t => t.name && t.text);
}

/** Подставляет переменные объявления. {everyone} даёт @everyone. */
export function renderTemplate(text: string): string {
    const now = new Date();
    return fillTemplate(text, {
        moderatorNick: settings.store.moderatorNick || "",
        dateIssued: formatDate(now)
    })
        // Переменные объявлений отличаются от переменных наказаний,
        // поэтому подставляем их отдельно, поверх общего шаблонизатора.
        .replace(/\{everyone\}/g, "@everyone")
        .replace(/\{moderator\}/g, settings.store.moderatorNick || "")
        .replace(/\{date\}/g, formatDate(now))
        .replace(/\{time\}/g, formatTime(now));
}

function toast(message: string, type: number) {
    Toasts.show({ message, type, id: Toasts.genId() });
}

interface ComposerProps {
    modalProps: ModalProps;
    templates: NewsTemplate[];
    channel: string;
    onSend(content: string): void;
}

function Composer({ modalProps, templates, channel, onSend }: ComposerProps) {
    const [text, setText] = React.useState(
        templates.length ? renderTemplate(templates[0].text) : ""
    );
    const [confirming, setConfirming] = React.useState(false);

    const content = text.trim();

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Forms.FormTitle tag="h2">
                    {confirming ? "Опубликовать объявление?" : "Публикация в новости"}
                </Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                {confirming ? (
                    <Forms.FormText style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>
                        {content}
                    </Forms.FormText>
                ) : (
                    <>
                        <Forms.FormText style={{ marginBottom: 8 }}>
                            {`Объявление уйдёт в канал <#${channel}>`}
                        </Forms.FormText>

                        {templates.length > 1 && (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                                {templates.map((t, i) => (
                                    <Button
                                        key={`tpl-${i}`}
                                        size={Button.Sizes.SMALL}
                                        look={Button.Looks.OUTLINED}
                                        onClick={() => setText(renderTemplate(t.text))}
                                    >
                                        {t.name}
                                    </Button>
                                ))}
                            </div>
                        )}

                        <TextArea
                            value={text}
                            onChange={setText}
                            placeholder="Текст объявления"
                            rows={12}
                        />
                    </>
                )}
            </ModalContent>

            <ModalFooter>
                <Button
                    color={Button.Colors.BRAND}
                    disabled={!content}
                    onClick={() => {
                        if (!content) return;
                        // Публикация видна всему серверу, поэтому по умолчанию
                        // между «Отправить» и отправкой есть шаг предпросмотра.
                        if (!confirming && settings.store.newsConfirmBeforeSend) {
                            setConfirming(true);
                            return;
                        }
                        onSend(content);
                        modalProps.onClose();
                    }}
                >
                    {confirming ? "Опубликовать" : "Отправить"}
                </Button>
                <Button
                    color={Button.Colors.PRIMARY}
                    look={Button.Looks.LINK}
                    onClick={() => (confirming ? setConfirming(false) : modalProps.onClose())}
                >
                    {confirming ? "Назад" : "Отмена"}
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

/**
 * Открывает окно составления объявления.
 * @param send отправка готового текста в канал
 */
export function openNewsComposer(send: (channel: string, content: string) => void) {
    const channel = channelId(settings.store.newsChannelId);
    if (!channel) {
        toast("Укажите ID канала новостей в настройках", Toasts.Type.FAILURE);
        return;
    }

    const templates = parseTemplates(settings.store.newsTemplates);

    openModal(modalProps => (
        <Composer
            modalProps={modalProps}
            templates={templates}
            channel={channel}
            onSend={content => {
                send(channel, content);
                toast("Объявление опубликовано", Toasts.Type.SUCCESS);
            }}
        />
    ));
}
