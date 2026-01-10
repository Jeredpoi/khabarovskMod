/**
 * @name khabarovskMod
 * @author Jeredpoi(Максим Паль!?)
 * @version 0.0.1
 * @description Плагин модерации для Khabarovsk Discord сервера через контекстное меню пользователя. Поддерживает правила с пунктов 2.1-2.21, 3.1-3.5, 4.1-4.4
 * @website https://github.com/Jeredpoi/khabarovskMod
 * @source https://github.com/Jeredpoi/khabarovskMod/blob/main/khabarovskMod.plugin.js
 */

module.exports = (() => {
    const config = {
        info: {
            name: "khabarovskMod",
            authors: [{ name: "Jeredpoi(Максим Паль!?)" }],
            version: "2.4.1",
            description: "Плагин модерации для khabarovskMod"
        },
        changelog: [
            {
                title: "Исправления",
                type: "fixed",
                items: ["Добавлена панель настроек"]
            }
        ]
    };

    return !global.ZeresPluginLibrary ? class {
        constructor() { this._config = config; }
        getName() { return config.info.name; }
        getAuthor() { return config.info.authors.map(a => a.name).join(", "); }
        getVersion() { return config.info.version; }

        load() {
            BdApi.UI.showConfirmationModal("Библиотека отсутствует",
                `Для работы ${config.info.name} требуется ZeresPluginLibrary. Установить?`, {
                    confirmText: "Установить",
                    cancelText: "Отмена",
                    onConfirm: () => {
                        require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js",
                            (error, response, body) => {
                                if (error) return BdApi.UI.showToast("Ошибка загрузки", {type: "error"});
                                require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"),
                                    body, () => BdApi.UI.showToast("Библиотека установлена, перезапустите Discord", {type: "success"}));
                            });
                    }
                });
        }
        start() { this.load(); }
        stop() {}
    } : (([Plugin, Api]) => {
        const { DiscordModules, WebpackModules, Patcher } = Api;
        const fs = require("fs");
        const path = require("path");

        return class khabarovskMod extends Plugin {
            constructor() {
                super();
                this.contextMenuPatch = null;
                this.MessageActions = null;
                this.ChannelStore = null;
                this.configPath = path.join(BdApi.Plugins.folder, "khabarovskMod.config.json");
                this.settings = this.loadSettings();
                this.rules = {
                    "basic_rules": {
                        name: "Общие правила",
                        rules: {
                            "2.1": { text: "2.1. Запрещено неадекватное поведение", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}, {name: "Бан 7-15 дней"}] },
                            "2.2": { text: "2.2. Запрещен трансфер Discord валюты", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Перманентная блокировка"}, {name: "Обнуление"}] },
                            "2.3": { text: "2.3. Запрещена реклама", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}, {name: "Бан 7-15 дней"}, {name: "Перманентная блокировка"}, {name: "Глобальная блокировка"}] },
                            "2.4": { text: "2.4. Запрещен возрастной контент", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}, {name: "Бан 7-15 дней"}, {name: "Перманентная блокировка"}] },
                            "2.5": { text: "2.5. Запрещено распространение персональной информации", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Бан 7-15 дней"}, {name: "Перманентная блокировка"}] },
                            "2.6": { text: "2.6. Запрещен обман пользователей", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}, {name: "Бан 7-15 дней"}, {name: "Перманентная блокировка"}] },
                            "2.7": { text: "2.7. Запрещены споры о политике и религии", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}, {name: "Бан 7-15 дней"}] },
                            "2.8": { text: "2.8. Запрещена продажа за реальные деньги", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Бан 7-15 дней"}, {name: "Перманентная блокировка"}, {name: "Глобальная блокировка"}] },
                            "2.9": { text: "2.9. Запрещено использование уязвимостей", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Бан 7-15 дней"}, {name: "Перманентная блокировка"}, {name: "Глобальная блокировка"}, {name: "Обнуление"}] },
                            "2.10": { text: "2.10. Запрещено вымогательство и попрошайничество", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}] },
                            "2.11": { text: "2.11. Запрещены деструктивные действия", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Бан 7-15 дней"}, {name: "Перманентная блокировка"}, {name: "Глобальная блокировка"}] },
                            "2.12": { text: "2.12. Запрещен обход наказаний", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Перманентная блокировка"}] },
                            "2.13": { text: "2.13. Запрещены оскорбления родных", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}, {name: "Бан 7-15 дней"}] },
                            "2.14": { text: "2.14. Запрещено распространение файлов", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Бан 7-15 дней"}, {name: "Перманентная блокировка"}, {name: "Глобальная блокировка"}] },
                            "2.15": { text: "2.15. Запрещена пропаганда наркотиков и терроризма", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Перманентная блокировка"}, {name: "Глобальная блокировка"}] },
                            "2.16": { text: "2.16. Запрещены расизм, сексизм, нацизм", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}, {name: "Бан 7-15 дней"}] },
                            "2.17": { text: "2.17. Запрещены помехи работе модерации", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}] },
                            "2.18": { text: "2.18. Запрещена провокация к нарушениям", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}, {name: "Бан 7-15 дней"}] },
                            "2.19": { text: "2.19. Запрещены угрозы", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}, {name: "Бан 7-15 дней"}] },
                            "2.20": { text: "2.20. Запрещено многократное нарушение", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Бан 7-15 дней"}, {name: "Перманентная блокировка"}] },
                            "2.21": { text: "2.21. Запрещены приватные комнаты с нарушениями", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Бан создания приватных комнат 3-7 дней"}] }
                        }
                    },
                    "text_channels": {
                        name: "Правила текстовых каналов",
                        rules: {
                            "3.1": { text: "3.1. Запрещен флуд и спам", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}] },
                            "3.2": { text: "3.2. Запрещено упоминание без сообщения", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}] },
                            "3.3": { text: "3.3. Запрещен чрезмерный CapsLock", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}] },
                            "3.4": { text: "3.4. Запрещено злоупотребление символами", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}] },
                            "3.5": { text: "3.5. Запрещено многократное упоминание", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}] }
                        }
                    },
                    "voice_channels": {
                        name: "Правила голосовых каналов",
                        rules: {
                            "4.1": { text: "4.1. Запрещены помехи общению", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}] },
                            "4.2": { text: "4.2. Запрещены программы для воспроизведения звуков", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}] },
                            "4.3": { text: "4.3. Запрещен плохо настроенный микрофон", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}] },
                            "4.4": { text: "4.4. Запрещены программы изменения голоса", punishments: [{name: "Устное предупреждение"}, {name: "Предупреждение"}, {name: "Мут 90 минут"}] }
                        }
                    }
                };
            }

            loadSettings() {
                const defaultSettings = {
                    messageFormats: {
                        withText: "<@{userId}> +{punishment} по пункту {ruleId} правил",
                        commands: {
                            warn: "/warn user:<@{userId}> reason:{ruleId}",
                            mute: "/mute user:<@{userId}> time:90 reason:{ruleId}",
                            ban: "/ban user:<@{userId}> time: reason:{ruleId}",
                            permban: "/ban user:<@{userId}> time:365 reason:{ruleId}"
                        },
                        onlyMention: "<@{userId}>"
                    },
                    punishmentsWithText: ["Устное предупреждение"],
                    punishmentsWithTextAndCopy: ["Предупреждение"],
                    punishmentsWithCopy: ["Мут 90 минут", "Бан 7-15 дней", "Перманентная блокировка"]
                };

                try {
                    if (fs.existsSync(this.configPath)) {
                        const data = fs.readFileSync(this.configPath, "utf8");
                        const loadedSettings = JSON.parse(data);
                        // Объединяем с дефолтными настройками на случай если чего-то не хватает
                        return {
                            messageFormats: {
                                ...defaultSettings.messageFormats,
                                ...(loadedSettings.messageFormats || {})
                            },
                            punishmentsWithText: loadedSettings.punishmentsWithText || defaultSettings.punishmentsWithText,
                            punishmentsWithTextAndCopy: loadedSettings.punishmentsWithTextAndCopy || defaultSettings.punishmentsWithTextAndCopy,
                            punishmentsWithCopy: loadedSettings.punishmentsWithCopy || defaultSettings.punishmentsWithCopy
                        };
                    }
                } catch (error) {
                    console.error("Ошибка загрузки настроек:", error);
                }

                // Если файла нет или ошибка - создаем и возвращаем дефолтные
                this.saveSettings(defaultSettings);
                return defaultSettings;
            }

            saveSettings(settings) {
                try {
                    fs.writeFileSync(this.configPath, JSON.stringify(settings, null, 4), "utf8");
                } catch (error) {
                    console.error("Ошибка сохранения настроек:", error);
                }
            }

            onStart() {
                try {
                    this.MessageActions = BdApi.Webpack.getModule(m => m?.sendMessage && m?.receiveMessage);
                    this.ChannelStore = BdApi.Webpack.getModule(m => m?.getChannel && m?.getDMFromUserId);

                    if (!this.MessageActions) {
                        BdApi.UI.showToast("Ошибка: MessageActions не найден", {type: "error"});
                        console.error("MessageActions module not found");
                    }

                    if (!this.ChannelStore) {
                        BdApi.UI.showToast("Ошибка: ChannelStore не найден", {type: "error"});
                        console.error("ChannelStore module not found");
                    }

                    if (this.contextMenuPatch) {
                        this.contextMenuPatch();
                        this.contextMenuPatch = null;
                    }

                    this.contextMenuPatch = BdApi.ContextMenu.patch("user-context", (returnValue, props) => {
                        try {
                            const { user } = props;
                            if (!user) return;

                            const children = returnValue?.props?.children;
                            if (!Array.isArray(children)) return;

                            const exists = children.some(child =>
                                child?.props?.id === "khabarovsk-moderation-main"
                            );

                            if (exists) return;

                            const categoryItems = Object.keys(this.rules).map(categoryKey => {
                                const category = this.rules[categoryKey];
                                const ruleItems = Object.keys(category.rules).map(ruleId => {
                                    const rule = category.rules[ruleId];
                                    const punishmentItems = rule.punishments.map((punishment, idx) => ({
                                        type: "item",
                                        label: punishment.name,
                                        id: `punishment-${ruleId}-${idx}`,
                                        action: () => this.executePunishment(user, ruleId, punishment.name)
                                    }));

                                    return {
                                        type: "submenu",
                                        label: rule.text,
                                        id: `rule-${categoryKey}-${ruleId}`,
                                        items: punishmentItems
                                    };
                                });

                                return {
                                    type: "submenu",
                                    label: category.name,
                                    id: `category-${categoryKey}`,
                                    items: ruleItems
                                };
                            });

                            const moderationMenuItem = BdApi.ContextMenu.buildItem({
                                type: "submenu",
                                label: "Модерация",
                                id: "khabarovsk-moderation-main",
                                items: categoryItems
                            });

                            children.push(moderationMenuItem);
                        } catch (error) {
                            console.error("khabarovskMod patch error:", error);
                        }
                    });

                    BdApi.UI.showToast("khabarovskMod запущен", {type: "success"});
                } catch (error) {
                    console.error("khabarovskMod start error:", error);
                    BdApi.UI.showToast(`Ошибка запуска: ${error.message}`, {type: "error"});
                }
            }

            onStop() {
                if (this.contextMenuPatch) {
                    this.contextMenuPatch();
                    this.contextMenuPatch = null;
                }
                BdApi.UI.showToast("khabarovskMod остановлен", {type: "info"});
            }

            getSettingsPanel() {
                // Проверяем и загружаем настройки если их нет
                if (!this.settings || !this.settings.messageFormats) {
                    this.settings = this.loadSettings();
                }

                const panel = document.createElement("div");
                panel.style.padding = "20px";

                const title = document.createElement("h2");
                title.textContent = "Настройки khabarovskMod";
                title.style.marginBottom = "15px";
                panel.appendChild(title);

                // Формат с текстом
                const label1 = document.createElement("label");
                label1.textContent = "Формат для предупреждений (автоотправка):";
                label1.style.display = "block";
                label1.style.marginBottom = "5px";
                label1.style.fontWeight = "bold";
                panel.appendChild(label1);

                const input1 = document.createElement("input");
                input1.type = "text";
                input1.id = "withText";
                input1.value = this.settings.messageFormats.withText || "<@{userId}> +{punishment} по пункту {ruleId} правил";
                input1.style.width = "100%";
                input1.style.padding = "8px";
                input1.style.marginBottom = "5px";
                panel.appendChild(input1);

                const hint1 = document.createElement("small");
                hint1.textContent = "Доступные переменные: {userId}, {punishment}, {ruleId}";
                hint1.style.display = "block";
                hint1.style.marginBottom = "15px";
                hint1.style.opacity = "0.7";
                panel.appendChild(hint1);

                // Список наказаний с автоотправкой
                const label2 = document.createElement("label");
                label2.textContent = "Наказания с автоотправкой (через запятую):";
                label2.style.display = "block";
                label2.style.marginBottom = "5px";
                label2.style.fontWeight = "bold";
                panel.appendChild(label2);

                const input2 = document.createElement("input");
                input2.type = "text";
                input2.id = "punishmentsWithText";
                input2.value = (this.settings.punishmentsWithText || ["Устное предупреждение", "Предупреждение"]).join(", ");
                input2.style.width = "100%";
                input2.style.padding = "8px";
                input2.style.marginBottom = "5px";
                panel.appendChild(input2);

                const hint2 = document.createElement("small");
                hint2.textContent = "Остальные наказания будут копировать только упоминание пользователя";
                hint2.style.display = "block";
                hint2.style.marginBottom = "20px";
                hint2.style.opacity = "0.7";
                panel.appendChild(hint2);

                // Кнопка сохранения
                const saveButton = document.createElement("button");
                saveButton.textContent = "Сохранить настройки";
                saveButton.style.padding = "10px 20px";
                saveButton.style.background = "#5865F2";
                saveButton.style.color = "white";
                saveButton.style.border = "none";
                saveButton.style.borderRadius = "3px";
                saveButton.style.cursor = "pointer";
                saveButton.style.fontWeight = "bold";
                saveButton.style.marginRight = "10px";

                saveButton.onclick = () => {
                    try {
                        const withText = input1.value;
                        const punishmentsText = input2.value;

                        this.settings.messageFormats.withText = withText;
                        this.settings.punishmentsWithText = punishmentsText.split(",").map(s => s.trim()).filter(s => s);

                        this.saveSettings(this.settings);
                        BdApi.UI.showToast("Настройки сохранены!", {type: "success"});
                    } catch (error) {
                        console.error("Ошибка сохранения настроек:", error);
                        BdApi.UI.showToast("Ошибка сохранения: " + error.message, {type: "error"});
                    }
                };

                panel.appendChild(saveButton);

                // Кнопка открытия конфига
                const openButton = document.createElement("button");
                openButton.textContent = "Открыть конфиг-файл";
                openButton.style.padding = "10px 20px";
                openButton.style.background = "#4E5058";
                openButton.style.color = "white";
                openButton.style.border = "none";
                openButton.style.borderRadius = "3px";
                openButton.style.cursor = "pointer";

                openButton.onclick = () => {
                    try {
                        require("electron").shell.openPath(this.configPath);
                        BdApi.UI.showToast("Открываю конфиг-файл...", {type: "info"});
                    } catch (error) {
                        console.error("Ошибка открытия файла:", error);
                        BdApi.UI.showToast("Ошибка открытия файла: " + error.message, {type: "error"});
                    }
                };

                panel.appendChild(openButton);

                return panel;
            }

            getCurrentChannelId() {
                const SelectedChannelStore = BdApi.Webpack.getModule(m => m?.getChannelId && m?.getLastSelectedChannelId);
                if (!SelectedChannelStore) {
                    BdApi.UI.showToast("SelectedChannelStore не найден", {type: "error"});
                    return null;
                }
                const channelId = SelectedChannelStore.getChannelId();
                if (!channelId) {
                    BdApi.UI.showToast("ID канала не найден", {type: "error"});
                    return null;
                }
                return channelId;
            }

            sendMessageToChannel(channelId, messageContent) {
                this.MessageActions.sendMessage(channelId, {
                    content: messageContent,
                    tts: false,
                    invalidEmojis: [],
                    validNonShortcutEmojis: []
                }, undefined, {});
            }

            executePunishment(user, ruleId, punishment) {
                try {
                    if (!this.MessageActions || !this.ChannelStore) {
                        BdApi.UI.showToast("Discord модули не загружены", {type: "error"});
                        return;
                    }

                    // Проверяем наличие массива
                    if (!this.settings.punishmentsWithText) {
                        this.settings.punishmentsWithText = [];
                    }

                    let messageContent;
                    let commandContent;

                    // Проверяем, нужно ли отправлять автоматически
                    if (this.settings.punishmentsWithText.includes(punishment)) {
                        const channelId = this.getCurrentChannelId();
                        if (!channelId) return;

                        // Предупреждения - отправляем автоматически
                        messageContent = this.settings.messageFormats.withText
                            .replace("{userId}", user.id)
                            .replace("{punishment}", punishment)
                            .replace("{ruleId}", ruleId);

                        // Отправляем сообщение
                        this.sendMessageToChannel(channelId, messageContent);

                        BdApi.UI.showToast(`Отправлено: ${punishment} по пункту ${ruleId}`, {type: "success"});
                    } else if (this.settings.punishmentsWithTextAndCopy.includes(punishment)) {
                        const channelId = this.getCurrentChannelId();
                        if (!channelId) return;

                        // Предупреждения - отправляем автоматически
                        messageContent = this.settings.messageFormats.withText
                            .replace("{userId}", user.id)
                            .replace("{punishment}", punishment)
                            .replace("{ruleId}", ruleId);

                        commandContent = this.settings.messageFormats.commands.warn
                            .replace("{userId}", user.id)
                            .replace("{ruleId}", ruleId);

                        this.insertTextIntoChat(commandContent);

                        // Отправляем сообщение
                        this.sendMessageToChannel(channelId, messageContent);

                        BdApi.UI.showToast(`Отправлено: ${punishment} по пункту ${ruleId}`, {type: "success"});
                    } else if (this.settings.punishmentsWithCopy.includes(punishment)) {
                        if (punishment === "Мут 90 минут") {
                            commandContent = this.settings.messageFormats.commands.mute
                                .replace("{userId}", user.id)
                                .replace("{ruleId}", ruleId);
                        } else if (punishment === "Бан 7-15 дней") {
                            commandContent = this.settings.messageFormats.commands.ban
                                .replace("{userId}", user.id)
                                .replace("{ruleId}", ruleId);
                        } else if (punishment === "Перманентная блокировка") {
                            commandContent = this.settings.messageFormats.commands.permban
                                .replace("{userId}", user.id)
                                .replace("{ruleId}", ruleId);
                        }

                        if (commandContent) {
                            this.insertTextIntoChat(commandContent);
                        }
                    } else {
                        // Для остальных наказаний - копируем информацию в буфер
                        messageContent = this.settings.messageFormats.withText
                            .replace("{userId}", user.id)
                            .replace("{ruleId}", ruleId)
                            .replace("{punishment}", punishment);

                        this.insertTextIntoChat(messageContent);
                    }

                } catch (error) {
                    console.error("khabarovskMod executePunishment error:", error);
                    BdApi.UI.showToast(`Ошибка: ${error.message}`, {type: "error"});
                }
            }

            insertTextIntoChat(text) {
                try {
                    // Самый надежный способ - через буфер обмена
                    navigator.clipboard.writeText(text).then(() => {
                        BdApi.UI.showToast(`Скопировано в буфер: "${text}". Нажмите Ctrl+V в чате.`, {type: "info", timeout: 5000});
                    }).catch(err => {
                        console.error("Ошибка копирования:", err);

                        // Запасной метод - старый API буфера обмена
                        const textArea = document.createElement("textarea");
                        textArea.value = text;
                        textArea.style.position = "fixed";
                        textArea.style.left = "-999999px";
                        document.body.appendChild(textArea);
                        textArea.select();

                        try {
                            document.execCommand('copy');
                            BdApi.UI.showToast(`Скопировано в буфер: "${text}". Нажмите Ctrl+V в чате.`, {type: "info", timeout: 5000});
                        } catch (e) {
                            BdApi.UI.showToast("Не удалось скопировать текст", {type: "error"});
                        }

                        document.body.removeChild(textArea);
                    });

                } catch (error) {
                    console.error("Ошибка вставки текста:", error);
                    BdApi.UI.showToast(`Ошибка: ${error.message}`, {type: "error"});
                }
            }
        };
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();
