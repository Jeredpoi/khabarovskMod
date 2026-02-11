/**
 * @name khabarovskMod
 * @author Jeredpoi(Максим Паль!?)
 * @version 1.2.0
 * @description Плагин модерации для сервера Хабаровск (проект BlackRussia) через контекстное меню пользователя. Поддерживает правила с пунктов 2.1-2.21, 3.1-3.5, 4.1-4.4. Добавлены инструменты модерации: /user и /punish
 * @website https://github.com/Jeredpoi/khabarovskMod
 * @source https://raw.githubusercontent.com/Jeredpoi/khabarovskMod/main/khabarovskMod.plugin.js
 */

module.exports = (() => {
    const config = {
        info: {
            name: "khabarovskMod",
            authors: [{ name: "Jeredpoi(Максим Паль!?)" }],
                version: "1.2.0",
            description: "Плагин модерации для khabarovskMod. Добавлены инструменты модерации: /user и /punish"
        },
        changelog: [
                {
                    title: "Улучшения",
                    type: "improved",
                    items: [
                        "Добавлен единый шаблонизатор переменных для команд, сообщений и форм (меньше дублирования кода)",
                        "Оптимизирована генерация команд в инструментах модерации и выдаче наказаний"
                    ]
                },
                {
                    title: "Новые инструменты",
                    type: "added",
                    items: [
                        "В меню модерации добавлены быстрые действия: копировать ID пользователя и упоминание"
                    ]
                },
            {
                title: "Новые функции",
                type: "added",
                items: [
                    "Расширены настройки интерфейса в конфиге (ширина панели, шрифты, отступы, скругления, акцентный цвет, скорость анимаций)",
                    "Панель настроек использует новые UI-параметры (размеры, паддинги, анимации, цвета)",
                    "Параметр showIcons управляет иконками в меню и заголовках секций"
                ]
            },
            {
                title: "Исправления",
                type: "fixed",
                items: [
                    "Для устного предупреждения и предупреждения скрыта дата снятия, дата выдачи ставится автоматически"
                ]
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
                this.messageMenuPatches = [];
                this.MessageActions = null;
                this.ChannelStore = null;
                this._ruleOptionsCache = null;
                this._ruleOptionsHash = null;
                this._formTemplateCache = null;
                this._formTemplateRaw = null;
                this.configPath = path.join(BdApi.Plugins.folder, "khabarovskMod.config.json");
                this.settings = this.loadSettings();
                this.defaultRules = {
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

                // Загружаем кастомные правила из конфига и объединяем с дефолтными
                this.rules = this.loadCustomRules();
            }

            loadCustomRules() {
                const rules = {...this.defaultRules};

                try {
                    if (this.settings._customRules && this.settings._customRules.enabled) {
                        const customCategories = this.settings._customRules.categories || [];

                        // Добавляем кастомные категории к дефолтным
                        customCategories.forEach(category => {
                            if (category.id && category.name && category.rules) {
                                // Преобразуем формат из конфига в формат плагина
                                const categoryRules = {};
                                Object.keys(category.rules).forEach(ruleId => {
                                    const rule = category.rules[ruleId];
                                    categoryRules[ruleId] = {
                                        text: rule.text || ruleId,
                                        punishments: Array.isArray(rule.punishments)
                                            ? rule.punishments.map(p => typeof p === 'string' ? {name: p} : p)
                                            : []
                                    };
                                });

                                rules[category.id] = {
                                    name: category.name,
                                    rules: categoryRules
                                };
                            }
                        });
                    }
                } catch (error) {
                    console.error("Ошибка загрузки кастомных правил:", error);
                }

                // Сброс кэша правил при изменении
                this._ruleOptionsCache = null;
                this._ruleOptionsHash = null;
                return rules;
            }

            loadSettings() {
                const defaultSettings = {
                    messageFormats: {
                        withText: "<@{userId}> +{punishment} по пункту {ruleId} правил",
                        commands: {
                            warn: "/warn user:<@{userId}> reason:{ruleId}",
                            mute: "/mute user:<@{userId}> time:90 reason:{ruleId}",
                            ban: "/ban user:<@{userId}> time: reason:{ruleId}",
                            permban: "/ban user:<@{userId}> time:365 reason:{ruleId}",
                            user: "/user user:<@{userId}>",
                            punish: "/punish user:<@{userId}>",
                            clearOne: "/clear one message_id:{messageId}",
                            clearMember: "/clear member user:<@{userId}>"
                        },
                        onlyMention: "<@{userId}>"
                    },
                    punishmentsWithText: ["Устное предупреждение"],
                    punishmentsWithTextAndCopy: ["Предупреждение"],
                    punishmentsWithCopy: ["Мут 90 минут", "Бан 7-15 дней", "Перманентная блокировка"],
                    showNotifications: true,
                    autoSave: true,
                    commandSettings: {
                        defaultMuteTime: 90,
                        defaultBanTime: 7,
                        timeUnit: "minutes",
                        useCustomTimeFormat: false
                    },
                    notificationSettings: {
                        timeout: 3000,
                        position: "top",
                        showSuccess: true,
                        showError: true,
                        showInfo: true
                    },
                    logging: {
                        enabled: false,
                        logToConsole: true,
                        logToFile: false,
                        logFilePath: ""
                    },
                    permissions: {
                        requiredRoles: [],
                        bypassRoles: [],
                        checkPermissions: false
                    },
                    ui: {
                        theme: "dark",
                        compactMode: false,
                        showIcons: true,
                        animationSpeed: "normal",
                        panelMaxWidth: 800,
                        baseFontSize: 14,
                        sectionSpacing: 10,
                        sectionPadding: 15,
                        inputPaddingY: 10,
                        inputPaddingX: 12,
                        borderRadius: 8,
                        accentColor: "#5865F2",
                        panelBackground: "#1F2024",
                        sectionBackground: "rgba(79, 84, 92, 0.3)",
                        sectionBorderColor: "rgba(79, 84, 92, 0.5)",
                        inputBackground: "rgba(4, 4, 5, 0.3)",
                        textColor: "#FFFFFF",
                        mutedTextColor: "#B9BBBE",
                        hintTextColor: "#72767D"
                    },
                    advanced: {
                        confirmActions: false,
                        showPreview: true,
                        maxHistory: 50
                    },
                    formConfig: {
                        moderatorNick: "Ваш_Nick_Name",
                        template: "1) Ваш Nick_Name: {moderatorNick}\n2) ID Discord и тег нарушителя: {userId} / {userTag}\n3) Пункт правил, который был нарушен: {ruleId}\n4) Выданное наказание: {punishment}\n5) Дата выдачи: {dateIssued}\n6) Дата снятия: {dateEnd}\n7) Доказательства: "
                    }
                };

                const defaultConfig = {
                    settings: defaultSettings,
                    customRules: {
                        enabled: false,
                        categories: []
                    }
                };

                try {
                    if (fs.existsSync(this.configPath)) {
                        const data = fs.readFileSync(this.configPath, "utf8");
                        const loadedConfig = JSON.parse(data);

                        // Поддержка старого формата (обратная совместимость)
                        let loadedSettings;
                        if (loadedConfig.settings) {
                            // Новый формат с секциями
                            loadedSettings = loadedConfig.settings;
                        } else {
                            // Старый формат (без секции settings)
                            loadedSettings = loadedConfig;
                        }

                        // Функция глубокого слияния объектов
                        const deepMerge = (target, source) => {
                            const result = {...target};
                            for (const key in source) {
                                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                                    result[key] = deepMerge(target[key] || {}, source[key]);
                                } else if (source[key] !== undefined) {
                                    result[key] = source[key];
                                }
                            }
                            return result;
                        };

                        // Объединяем с дефолтными настройками
                        const mergedSettings = {
                            ...defaultSettings,
                            ...loadedSettings,
                            messageFormats: {
                                ...defaultSettings.messageFormats,
                                ...(loadedSettings.messageFormats || {}),
                                commands: {
                                    ...defaultSettings.messageFormats.commands,
                                    ...(loadedSettings.messageFormats?.commands || {})
                                }
                            },
                            punishmentsWithText: Array.isArray(loadedSettings.punishmentsWithText)
                                ? loadedSettings.punishmentsWithText
                                : (loadedSettings.punishmentsWithText?.list || defaultSettings.punishmentsWithText),
                            punishmentsWithTextAndCopy: Array.isArray(loadedSettings.punishmentsWithTextAndCopy)
                                ? loadedSettings.punishmentsWithTextAndCopy
                                : (loadedSettings.punishmentsWithTextAndCopy?.list || defaultSettings.punishmentsWithTextAndCopy),
                            punishmentsWithCopy: Array.isArray(loadedSettings.punishmentsWithCopy)
                                ? loadedSettings.punishmentsWithCopy
                                : (loadedSettings.punishmentsWithCopy?.list || defaultSettings.punishmentsWithCopy),
                            // Глубокое слияние вложенных объектов
                            commandSettings: deepMerge(defaultSettings.commandSettings || {}, loadedSettings.commandSettings || {}),
                            notificationSettings: deepMerge(defaultSettings.notificationSettings || {}, loadedSettings.notificationSettings || {}),
                            logging: deepMerge(defaultSettings.logging || {}, loadedSettings.logging || {}),
                            permissions: deepMerge(defaultSettings.permissions || {}, loadedSettings.permissions || {}),
                            ui: deepMerge(defaultSettings.ui || {}, loadedSettings.ui || {}),
                            advanced: deepMerge(defaultSettings.advanced || {}, loadedSettings.advanced || {})
                        };

                        // Совместимость ключей очистки
                        if (!mergedSettings.messageFormats.commands.clearOne && mergedSettings.messageFormats.commands.clear1) {
                            mergedSettings.messageFormats.commands.clearOne = mergedSettings.messageFormats.commands.clear1;
                        }
                        if (!mergedSettings.messageFormats.commands.clearMember && mergedSettings.messageFormats.commands.clearUser) {
                            mergedSettings.messageFormats.commands.clearMember = mergedSettings.messageFormats.commands.clearUser;
                        }

                        // Нормализация шаблона форм: ID должен быть числом без упоминания
                        if (mergedSettings.formConfig?.template) {
                            mergedSettings.formConfig.template = mergedSettings.formConfig.template
                                .replaceAll("<@{userId}>", "{userId}")
                                .replaceAll("<@!{userId}>", "{userId}");
                        }

                        // Загружаем кастомные правила
                        const customRules = loadedConfig.customRules || defaultConfig.customRules;

                        return {
                            ...mergedSettings,
                            _customRules: customRules
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
                    // Извлекаем кастомные правила, если они есть
                    const customRules = settings._customRules || { enabled: false, categories: [] };
                    delete settings._customRules;
                    const uiSettings = settings.ui || {};
                    const normalizeNumber = (value, fallback, min = null, max = null) => {
                        const num = parseInt(value, 10);
                        if (!Number.isFinite(num)) return fallback;
                        if (min !== null && num < min) return min;
                        if (max !== null && num > max) return max;
                        return num;
                    };
                    const normalizeColor = (value, fallback) => {
                        if (typeof value !== "string") return fallback;
                        const trimmed = value.trim();
                        if (/^#([0-9a-f]{3}){1,2}$/i.test(trimmed)) return trimmed;
                        if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(\s*,\s*(0|0?\.\d+|1(\.0)?))?\s*\)$/i.test(trimmed)) {
                            return trimmed;
                        }
                        return fallback;
                    };
                    const normalizeAnimationSpeed = (value) => {
                        const v = String(value || "").trim().toLowerCase();
                        return (v === "fast" || v === "normal" || v === "slow") ? v : "normal";
                    };

                    // Создаем красивую структурированную версию конфига с секциями
                    const configWithSections = {
                        settings: {
                            messageFormats: {
                                withText: settings.messageFormats?.withText || "<@{userId}> +{punishment} по пункту {ruleId} правил",
                                onlyMention: settings.messageFormats?.onlyMention || "<@{userId}>",
                                commands: {
                                    warn: settings.messageFormats?.commands?.warn || "/warn user:<@{userId}> reason:{ruleId}",
                                    mute: settings.messageFormats?.commands?.mute || "/mute user:<@{userId}> time:90 reason:{ruleId}",
                                    ban: settings.messageFormats?.commands?.ban || "/ban user:<@{userId}> time: reason:{ruleId}",
                                    permban: settings.messageFormats?.commands?.permban || "/ban user:<@{userId}> time:365 reason:{ruleId}",
                                    user: settings.messageFormats?.commands?.user || "/user user:<@{userId}>",
                                    punish: settings.messageFormats?.commands?.punish || "/punish user:<@{userId}>"
                                }
                            },
                            punishmentsWithText: Array.isArray(settings.punishmentsWithText)
                                ? settings.punishmentsWithText
                                : (settings.punishmentsWithText?.list || ["Устное предупреждение"]),
                            punishmentsWithTextAndCopy: Array.isArray(settings.punishmentsWithTextAndCopy)
                                ? settings.punishmentsWithTextAndCopy
                                : (settings.punishmentsWithTextAndCopy?.list || ["Предупреждение"]),
                            punishmentsWithCopy: Array.isArray(settings.punishmentsWithCopy)
                                ? settings.punishmentsWithCopy
                                : (settings.punishmentsWithCopy?.list || ["Мут 90 минут", "Бан 7-15 дней", "Перманентная блокировка"]),
                            showNotifications: settings.showNotifications !== false,
                            autoSave: settings.autoSave === true,
                            commandSettings: settings.commandSettings || {
                                defaultMuteTime: 90,
                                defaultBanTime: 7,
                                timeUnit: "minutes",
                                useCustomTimeFormat: false
                            },
                            notificationSettings: settings.notificationSettings || {
                                timeout: 3000,
                                position: "top",
                                showSuccess: true,
                                showError: true,
                                showInfo: true
                            },
                            logging: settings.logging || {
                                enabled: false,
                                logToConsole: true,
                                logToFile: false,
                                logFilePath: ""
                            },
                            permissions: settings.permissions || {
                                requiredRoles: [],
                                bypassRoles: [],
                                checkPermissions: false
                            },
                            ui: {
                                theme: uiSettings.theme || "dark",
                                compactMode: uiSettings.compactMode === true,
                                showIcons: uiSettings.showIcons !== false,
                                animationSpeed: normalizeAnimationSpeed(uiSettings.animationSpeed),
                                panelMaxWidth: normalizeNumber(uiSettings.panelMaxWidth, 800, 420, 1400),
                                baseFontSize: normalizeNumber(uiSettings.baseFontSize, 14, 11, 20),
                                sectionSpacing: normalizeNumber(uiSettings.sectionSpacing, 10, 4, 24),
                                sectionPadding: normalizeNumber(uiSettings.sectionPadding, 15, 8, 30),
                                inputPaddingY: normalizeNumber(uiSettings.inputPaddingY, 10, 4, 18),
                                inputPaddingX: normalizeNumber(uiSettings.inputPaddingX, 12, 6, 24),
                                borderRadius: normalizeNumber(uiSettings.borderRadius, 8, 0, 20),
                                accentColor: normalizeColor(uiSettings.accentColor, "#5865F2"),
                                panelBackground: normalizeColor(uiSettings.panelBackground, "#1F2024"),
                                sectionBackground: normalizeColor(uiSettings.sectionBackground, "rgba(79, 84, 92, 0.3)"),
                                sectionBorderColor: normalizeColor(uiSettings.sectionBorderColor, "rgba(79, 84, 92, 0.5)"),
                                inputBackground: normalizeColor(uiSettings.inputBackground, "rgba(4, 4, 5, 0.3)"),
                                textColor: normalizeColor(uiSettings.textColor, "#FFFFFF"),
                                mutedTextColor: normalizeColor(uiSettings.mutedTextColor, "#B9BBBE"),
                                hintTextColor: normalizeColor(uiSettings.hintTextColor, "#72767D")
                            },
                            advanced: settings.advanced || {
                                confirmActions: false,
                                showPreview: true,
                                maxHistory: 50,
                                enableShortcuts: false
                            }
                        },
                        customRules: customRules
                    };

                    // Сохраняем с красивым форматированием (4 пробела для отступов)
                    fs.writeFileSync(this.configPath, JSON.stringify(configWithSections, null, 4), "utf8");
                } catch (error) {
                    console.error("Ошибка сохранения настроек:", error);
                }
            }

            onStart() {
                try {
                    this.showChangelogIfNeeded();
                    this.MessageActions = BdApi.Webpack.getModule(m => m?.sendMessage && m?.receiveMessage);
                    this.ChannelStore = BdApi.Webpack.getModule(m => m?.getChannel && m?.getDMFromUserId);

                    if (!this.MessageActions) {
                        this.showToast("Ошибка: MessageActions не найден", "error");
                        console.error("MessageActions module not found");
                    }

                    if (!this.ChannelStore) {
                        this.showToast("Ошибка: ChannelStore не найден", "error");
                        console.error("ChannelStore module not found");
                    }

                    if (this.contextMenuPatch) {
                        this.contextMenuPatch();
                        this.contextMenuPatch = null;
                    }
                    if (this.messageMenuPatches && this.messageMenuPatches.length) {
                        this.messageMenuPatches.forEach(unpatch => {
                            try { unpatch(); } catch (e) {}
                        });
                        this.messageMenuPatches = [];
                    }

                    this.contextMenuPatch = BdApi.ContextMenu.patch("user-context", (returnValue, props) => {
                        try {
                            const { user } = props;
                            if (!user) return;

                            const children = this.getMenuChildren(returnValue);
                            if (!Array.isArray(children)) return;

                            const exists = children.some(child =>
                                child?.props?.id === "khabarovsk-moderation-main"
                            );

                            if (exists) return;

                            const allItems = this.buildModerationMenuItems(user, null);

                            const moderationMenuItem = BdApi.ContextMenu.buildItem({
                                type: "submenu",
                                label: "Модерация",
                                id: "khabarovsk-moderation-main",
                                items: allItems
                            });

                            children.push(moderationMenuItem);
                        } catch (error) {
                            console.error("khabarovskMod patch error:", error);
                        }
                    });

                    const messagePatch = BdApi.ContextMenu.patch("message", (returnValue, props) => {
                        try {
                            const message = this.getMessageFromProps(props);
                            const user = message?.author;
                            if (!user) return;

                            const children = this.getMenuChildren(returnValue);
                            if (!Array.isArray(children)) return;

                            const exists = children.some(child =>
                                child?.props?.id === "khabarovsk-moderation-main"
                            );
                            if (exists) return;

                            const messageId = message?.id || message?.message?.id;
                            const allItems = this.buildModerationMenuItems(user, messageId);

                            const moderationMenuItem = BdApi.ContextMenu.buildItem({
                                type: "submenu",
                                label: "Модерация",
                                id: "khabarovsk-moderation-main",
                                items: allItems
                            });

                            children.push(moderationMenuItem);
                        } catch (error) {
                            console.error("khabarovskMod message patch error:", error);
                        }
                    });
                    this.messageMenuPatches.push(messagePatch);

                    const messageContextPatch = BdApi.ContextMenu.patch("message-context", (returnValue, props) => {
                        try {
                            const message = this.getMessageFromProps(props);
                            const user = message?.author;
                            if (!user) return;

                            const children = this.getMenuChildren(returnValue);
                            if (!Array.isArray(children)) return;

                            const exists = children.some(child =>
                                child?.props?.id === "khabarovsk-moderation-main"
                            );
                            if (exists) return;

                            const messageId = message?.id || message?.message?.id;
                            const allItems = this.buildModerationMenuItems(user, messageId);

                            const moderationMenuItem = BdApi.ContextMenu.buildItem({
                                type: "submenu",
                                label: "Модерация",
                                id: "khabarovsk-moderation-main",
                                items: allItems
                            });

                            children.push(moderationMenuItem);
                        } catch (error) {
                            console.error("khabarovskMod message-context patch error:", error);
                        }
                    });
                    this.messageMenuPatches.push(messageContextPatch);

                    this.showToast("khabarovskMod запущен", "success");
                } catch (error) {
                    console.error("khabarovskMod start error:", error);
                    this.showToast(`Ошибка запуска: ${error.message}`, "error");
                }
            }

            onStop() {
                if (this.contextMenuPatch) {
                    this.contextMenuPatch();
                    this.contextMenuPatch = null;
                }
                if (this.messageMenuPatches && this.messageMenuPatches.length) {
                    this.messageMenuPatches.forEach(unpatch => {
                        try { unpatch(); } catch (e) {}
                    });
                    this.messageMenuPatches = [];
                }
                this.showToast("khabarovskMod остановлен", "info");
            }

            getMessageFromProps(props) {
                if (!props) return null;
                return (
                    props.message ||
                    props.message?.message ||
                    props?.targetMessage ||
                    props?.targetMessage?.message ||
                    null
                );
            }

            formatDate(date) {
                const d = String(date.getDate()).padStart(2, "0");
                const m = String(date.getMonth() + 1).padStart(2, "0");
                const y = date.getFullYear();
                return `${d}.${m}.${y}`;
            }

            formatTime(date) {
                const h = String(date.getHours()).padStart(2, "0");
                const min = String(date.getMinutes()).padStart(2, "0");
                return `${h}:${min}`;
            }

            formatDateISO(date) {
                const d = String(date.getDate()).padStart(2, "0");
                const m = String(date.getMonth() + 1).padStart(2, "0");
                const y = date.getFullYear();
                return `${y}-${m}-${d}`;
            }

            formatDateFromISO(iso) {
                if (!iso || !iso.includes("-")) return "";
                const [y, m, d] = iso.split("-");
                if (!y || !m || !d) return "";
                return `${d}.${m}.${y}`;
            }

            getUserTag(user) {
                if (!user) return "Unknown";
                if (typeof user.tag === "string" && user.tag.includes("#")) {
                    return user.tag;
                }
                if (user.username && user.discriminator && user.discriminator !== "0") {
                    return `${user.username}#${user.discriminator}`;
                }
                return user.username || `ID${user.id || "0"}`;
            }

            formatTemplate(template, variables = {}) {
                if (typeof template !== "string" || !template) return "";
                return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
                    if (!Object.prototype.hasOwnProperty.call(variables, key)) return match;
                    const value = variables[key];
                    return value === undefined || value === null ? "" : String(value);
                });
            }

            removeDateEndLine(formText) {
                if (typeof formText !== "string" || !formText) return "";
                const lines = formText.split(/\r?\n/);
                const filtered = lines.filter((line) => {
                    const normalized = String(line || "").toLowerCase();
                    if (!normalized.trim()) return true;
                    if (normalized.includes("{dateend}")) return false;
                    return !normalized.includes("дата снятия");
                });
                return filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
            }

            buildPunishmentForm(typeKey, user, ruleIdOverride = null, dateIssuedOverride = null, dateEndOverride = null) {
                const formConfig = this.settings?.formConfig || {};
                const template = formConfig.template || "";
                if (!template) return "";

                if (this._formTemplateRaw !== template) {
                    this._formTemplateRaw = template;
                    this._formTemplateCache = template;
                }

                const now = new Date();
                let dateIssued = dateIssuedOverride || this.formatDate(now);

                let dateEnd = "";
                if (typeKey === "mute") {
                    const minutes = parseInt(this.settings?.commandSettings?.defaultMuteTime || 90, 10);
                    const end = new Date(now.getTime() + minutes * 60 * 1000);
                    dateEnd = this.formatDate(end);
                } else if (typeKey === "ban") {
                    const days = parseInt(this.settings?.commandSettings?.defaultBanTime || 7, 10);
                    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
                    dateEnd = this.formatDate(end);
                } else {
                    dateEnd = dateIssued;
                }
                if (dateEndOverride) {
                    dateEnd = dateEndOverride;
                }
                if (typeKey === "oralWarning") {
                    dateIssued = dateIssuedOverride || this.formatDate(now);
                    dateEnd = "";
                } else if (typeKey === "warning") {
                    dateIssued = dateIssuedOverride || this.formatDate(now);
                    dateEnd = dateEndOverride || dateIssued;
                }

                const ruleId = ruleIdOverride || "____";
                const userTag = this.getUserTag(user);
                const moderatorNick = formConfig.moderatorNick || "Ваш_Nick_Name";
                const punishmentLabel = typeKey === "oralWarning"
                    ? "Устное предупреждение"
                    : typeKey === "warning"
                        ? "Предупреждение"
                        : typeKey === "mute"
                            ? "Мут"
                            : "Бан";

                const renderedForm = this.formatTemplate(this._formTemplateCache, {
                    userId: user.id,
                    userTag,
                    ruleId,
                    punishment: punishmentLabel,
                    moderatorNick,
                    dateIssued,
                    dateEnd
                });
                if (typeKey === "oralWarning" && !dateEnd) {
                    return this.removeDateEndLine(renderedForm);
                }
                return renderedForm;
            }


            addHistoryEntry(entry) {
                try {
                    const key = "punishmentHistory";
                    const history = BdApi.Data.load(config.info.name, key) || [];
                    history.push(entry);
                    const max = this.settings?.advanced?.maxHistory || 50;
                    const trimmed = history.slice(-max);
                    BdApi.Data.save(config.info.name, key, trimmed);
                } catch (e) {
                    console.error("Ошибка сохранения истории:", e);
                }
            }

            deleteHistoryEntry(index) {
                try {
                    const key = "punishmentHistory";
                    const history = BdApi.Data.load(config.info.name, key) || [];
                    if (index >= 0 && index < history.length) {
                        history.splice(index, 1);
                        BdApi.Data.save(config.info.name, key, history);
                    }
                } catch (e) {
                    console.error("Ошибка удаления истории:", e);
                }
            }

            showAddHistoryModal() {
                const React = BdApi.React;
                let userId = "";
                let userTag = "";
                let ruleId = "";
                let punishment = "";
                let dateIssued = "";
                let timeIssued = "";
                let dateEnd = "";

                const input = (placeholder, onChange) =>
                    React.createElement("input", {
                        type: "text",
                        placeholder,
                        onChange: (e) => onChange(e.target.value.trim()),
                        style: {
                            width: "100%",
                            padding: "8px",
                            borderRadius: "6px",
                            border: "1px solid #4E5058",
                            background: "#2F3136",
                            color: "#FFFFFF",
                            fontSize: "14px",
                            marginTop: "8px"
                        }
                    });

                const content = React.createElement(
                    "div",
                    null,
                    input("User ID (цифры)", v => userId = v),
                    input("User Tag (name#0000)", v => userTag = v),
                    input("Пункт правил (например 2.3)", v => ruleId = v),
                    input("Наказание (например Мут)", v => punishment = v),
                    input("Дата выдачи (DD.MM.YYYY)", v => dateIssued = v),
                    input("Время выдачи (HH:MM)", v => timeIssued = v),
                    input("Дата снятия (DD.MM.YYYY)", v => dateEnd = v)
                );

                BdApi.UI.showConfirmationModal(
                    "Добавить запись истории",
                    content,
                    {
                        confirmText: "Добавить",
                        cancelText: "Отмена",
                        onConfirm: () => {
                            if (!userId || !punishment) {
                                this.showToast("Заполните хотя бы User ID и наказание", "error");
                                return;
                            }
                            this.addHistoryEntry({
                                userId,
                                userTag: userTag || `ID${userId}`,
                                ruleId: ruleId || "____",
                                punishment,
                                dateIssued: dateIssued || this.formatDate(new Date()),
                                timeIssued: timeIssued || this.formatTime(new Date()),
                                dateEnd: dateEnd || dateIssued || this.formatDate(new Date())
                            });
                            this.showHistoryModal();
                        }
                    }
                );
            }

            exportHistory(format) {
                try {
                    const history = BdApi.Data.load(config.info.name, "punishmentHistory") || [];
                    const ts = new Date();
                    const dateStamp = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, "0")}${String(ts.getDate()).padStart(2, "0")}`;
                    const baseName = `khabarovskMod_history_${dateStamp}`;

                    if (format === "json") {
                        const content = JSON.stringify(history, null, 2);
                        this.saveTextAsFile(`${baseName}.json`, content);
                        this.showToast("История экспортирована в JSON", "success");
                        return;
                    }

                    const lines = history.map((h, idx) => {
                        const timePart = h.timeIssued ? ` ${h.timeIssued}` : "";
                        return `${idx + 1}) ${h.dateIssued}${timePart} | ${h.punishment} | ${h.userId} | ${h.ruleId || "____"}`;
                    }).join("\n");
                    this.saveTextAsFile(`${baseName}.txt`, lines || "История пуста");
                    this.showToast("История экспортирована в TXT", "success");
                } catch (e) {
                    this.showToast("Ошибка экспорта истории", "error");
                }
            }

            saveTextAsFile(filename, content) {
                try {
                    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch (e) {
                    console.error("Ошибка сохранения файла:", e);
                }
            }

            showHistoryModal() {
                const history = BdApi.Data.load(config.info.name, "punishmentHistory") || [];
                if (!history.length) {
                    this.showToast("История пуста", "info");
                    return;
                }
                const React = BdApi.React;
                const items = history.map((h, idx) => {
                    const timePart = h.timeIssued ? ` ${h.timeIssued}` : "";
                    const line = `${idx + 1}) ${h.dateIssued}${timePart} | ${h.punishment} | ${h.userId} | ${h.ruleId || "____"}`;
                    return React.createElement(
                        "div",
                        {
                            key: `hist-${idx}`,
                            style: { display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "6px" }
                        },
                        React.createElement("div", { style: { color: "#B9BBBE", flex: "1" } }, line),
                        React.createElement("button", {
                            onClick: () => {
                                this.deleteHistoryEntry(idx);
                                this.showHistoryModal();
                            },
                            style: {
                                padding: "4px 8px",
                                borderRadius: "4px",
                                border: "1px solid #4E5058",
                                background: "#2F3136",
                                color: "#FFFFFF",
                                cursor: "pointer"
                            }
                        }, "Удалить")
                    );
                });

                const footer = React.createElement(
                    "div",
                    { style: { marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" } },
                    React.createElement("button", {
                        onClick: () => this.showAddHistoryModal(),
                        style: {
                            padding: "6px 12px",
                            borderRadius: "4px",
                            border: "1px solid #4E5058",
                            background: "#2F3136",
                            color: "#FFFFFF",
                            cursor: "pointer"
                        }
                    }, "Добавить запись"),
                    React.createElement("button", {
                        onClick: () => this.exportHistory("txt"),
                        style: {
                            padding: "6px 12px",
                            borderRadius: "4px",
                            border: "1px solid #4E5058",
                            background: "#2F3136",
                            color: "#FFFFFF",
                            cursor: "pointer"
                        }
                    }, "Экспорт TXT"),
                    React.createElement("button", {
                        onClick: () => this.exportHistory("json"),
                        style: {
                            padding: "6px 12px",
                            borderRadius: "4px",
                            border: "1px solid #4E5058",
                            background: "#2F3136",
                            color: "#FFFFFF",
                            cursor: "pointer"
                        }
                    }, "Экспорт JSON"),
                    React.createElement("button", {
                        onClick: () => {
                            BdApi.UI.showConfirmationModal(
                                "Очистить историю?",
                                "Это действие удалит все записи. Продолжить?",
                                {
                                    confirmText: "Очистить",
                                    cancelText: "Отмена",
                                    onConfirm: () => {
                                        BdApi.Data.save(config.info.name, "punishmentHistory", []);
                                        const list = document.getElementById("khab-history-list");
                                        if (list) {
                                            list.innerHTML = "";
                                            const empty = document.createElement("div");
                                            empty.style.color = "#B9BBBE";
                                            empty.textContent = "История пуста";
                                            list.appendChild(empty);
                                        }
                                    }
                                }
                            );
                        },
                        style: {
                            padding: "6px 12px",
                            borderRadius: "4px",
                            border: "1px solid #4E5058",
                            background: "#2F3136",
                            color: "#FFFFFF",
                            cursor: "pointer"
                        }
                    }, "Очистить всё")
                );

                BdApi.UI.showConfirmationModal(
                    "История наказаний",
                    React.createElement(
                        "div",
                        null,
                        React.createElement("div", { id: "khab-history-list" }, ...items),
                        footer
                    ),
                    { confirmText: "Закрыть", cancelText: "Отмена" }
                );
            }

            getMenuChildren(returnValue) {
                if (!returnValue || !returnValue.props) return null;
                const children = returnValue.props.children;
                if (Array.isArray(children)) return children;
                if (children && Array.isArray(children.props?.children)) return children.props.children;
                return null;
            }

            getRuleOptions() {
                const rules = this.rules || {};
                const hash = JSON.stringify(rules);
                if (this._ruleOptionsCache && this._ruleOptionsHash === hash) {
                    return this._ruleOptionsCache;
                }
                const options = [];
                Object.keys(rules).forEach(categoryKey => {
                    const category = rules[categoryKey];
                    Object.keys(category.rules || {}).forEach(ruleId => {
                        const rule = category.rules[ruleId];
                        options.push({
                            value: ruleId,
                            label: `${ruleId} — ${rule.text}`
                        });
                    });
                });
                this._ruleOptionsCache = options;
                this._ruleOptionsHash = hash;
                return options;
            }

            showRuleSelectModal(typeKey, user) {
                const options = this.getRuleOptions();
                if (!options.length) {
                    this.showToast("Список правил пуст", "error");
                    return;
                }

                let selectedRule = "";
                let manualRule = "";
                let dateIssuedISO = "";
                let dateEndISO = "";
                const React = BdApi.React;
                const now = new Date();
                const defaultIssuedISO = this.formatDateISO(now);
                let defaultEndISO = defaultIssuedISO;
                const includeDates = typeKey === "mute" || typeKey === "ban";
                if (typeKey === "mute") {
                    const minutes = parseInt(this.settings?.commandSettings?.defaultMuteTime || 90, 10);
                    defaultEndISO = this.formatDateISO(new Date(now.getTime() + minutes * 60 * 1000));
                } else if (typeKey === "ban") {
                    const days = parseInt(this.settings?.commandSettings?.defaultBanTime || 7, 10);
                    defaultEndISO = this.formatDateISO(new Date(now.getTime() + days * 24 * 60 * 60 * 1000));
                }
                const select = React.createElement(
                    "select",
                    {
                        defaultValue: "",
                        onChange: (e) => { selectedRule = e.target.value; },
                        style: {
                            width: "100%",
                            padding: "8px",
                            borderRadius: "6px",
                            border: "1px solid #4E5058",
                            background: "#2F3136",
                            color: "#FFFFFF",
                            fontSize: "14px"
                        }
                    },
                    [
                        React.createElement("option", { key: "placeholder", value: "", disabled: true }, "Выберите пункт правил"),
                        ...options.map((opt) => React.createElement("option", { key: opt.value, value: opt.value }, opt.label))
                    ]
                );

                const manualInput = React.createElement(
                    "input",
                    {
                        type: "text",
                        placeholder: "Вставить правило вручную (например 2.3)",
                        onChange: (e) => { manualRule = e.target.value.trim(); },
                        style: {
                            width: "100%",
                            padding: "8px",
                            borderRadius: "6px",
                            border: "1px solid #4E5058",
                            background: "#2F3136",
                            color: "#FFFFFF",
                            fontSize: "14px",
                            marginTop: "10px"
                        }
                    }
                );

                const content = React.createElement(
                    "div",
                    null,
                    React.createElement("div", { style: { marginBottom: "8px", color: "#B9BBBE" } }, "Выберите пункт правил для формы:"),
                    select,
                    React.createElement("div", { style: { marginTop: "10px", color: "#72767D", fontSize: "12px" } }, "Или укажите правило вручную:"),
                    manualInput,
                    includeDates
                        ? React.createElement(
                            React.Fragment,
                            null,
                            React.createElement("div", { style: { marginTop: "12px", color: "#B9BBBE" } }, "Дата выдачи:"),
                            React.createElement(
                                "input",
                                {
                                    type: "date",
                                    defaultValue: defaultIssuedISO,
                                    onChange: (e) => { dateIssuedISO = e.target.value; },
                                    style: {
                                        width: "100%",
                                        padding: "8px",
                                        borderRadius: "6px",
                                        border: "1px solid #4E5058",
                                        background: "#2F3136",
                                        color: "#FFFFFF",
                                        fontSize: "14px",
                                        marginTop: "10px"
                                    }
                                }
                            ),
                            React.createElement("div", { style: { marginTop: "12px", color: "#B9BBBE" } }, "Дата снятия:"),
                            React.createElement(
                                "input",
                                {
                                    type: "date",
                                    defaultValue: defaultEndISO,
                                    onChange: (e) => { dateEndISO = e.target.value; },
                                    style: {
                                        width: "100%",
                                        padding: "8px",
                                        borderRadius: "6px",
                                        border: "1px solid #4E5058",
                                        background: "#2F3136",
                                        color: "#FFFFFF",
                                        fontSize: "14px",
                                        marginTop: "10px"
                                    }
                                }
                            )
                        )
                        : null
                );

                BdApi.UI.showConfirmationModal(
                    "Выбор пункта правил",
                    content,
                    {
                        confirmText: "Продолжить",
                        cancelText: "Отмена",
                        onConfirm: () => {
                            const ruleValue = selectedRule || manualRule;
                            if (!ruleValue) {
                                this.showToast("Выберите пункт правил или введите вручную", "error");
                                return;
                            }
                            const issued = includeDates ? this.formatDateFromISO(dateIssuedISO || defaultIssuedISO) : this.formatDate(new Date());
                            const end = includeDates ? this.formatDateFromISO(dateEndISO || defaultEndISO) : "";
                            const text = this.buildPunishmentForm(typeKey, user, ruleValue, issued, end);
                            if (!text) {
                                this.showToast("Форма не настроена", "error");
                                return;
                            }
                            this.insertTextIntoChat(text);
                        }
                    }
                );
            }

            buildModerationMenuItems(user, messageId) {
                const showIcons = this.settings.ui?.showIcons !== false;
                const withIcon = (icon, text) => showIcons ? `${icon} ${text}` : text;
                const buildForUser = (template, extra = {}) => this.formatTemplate(template, {
                    userId: user.id,
                    userTag: this.getUserTag(user),
                    messageId: messageId || "",
                    ...extra
                });
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

                const toolsItems = [
                    {
                        type: "item",
                        label: withIcon("🔍", "Проверка пользователя"),
                        id: "khabarovsk-tool-user",
                        action: () => {
                            if (!this.settings.messageFormats?.commands?.user) {
                                this.showToast("Формат команды /user не найден в настройках", "error");
                                return;
                            }
                            const commandContent = buildForUser(this.settings.messageFormats.commands.user);
                            this.queueActionWithPreview(
                                "Инструмент /user",
                                `Команда: ${commandContent}`,
                                () => this.insertTextIntoChat(commandContent)
                            );
                        }
                    },
                    {
                        type: "item",
                        label: withIcon("⚖️", "Punish"),
                        id: "khabarovsk-tool-punish",
                        action: () => {
                            if (!this.settings.messageFormats?.commands?.punish) {
                                this.showToast("Формат команды /punish не найден в настройках", "error");
                                return;
                            }
                            const commandContent = buildForUser(this.settings.messageFormats.commands.punish);
                            this.queueActionWithPreview(
                                "Инструмент /punish",
                                `Команда: ${commandContent}`,
                                () => this.insertTextIntoChat(commandContent)
                            );
                        }
                    },
                    {
                        type: "item",
                        label: withIcon("🆔", "Копировать ID"),
                        id: "khabarovsk-tool-copy-id",
                        action: () => this.insertTextIntoChat(String(user.id))
                    },
                    {
                        type: "item",
                        label: withIcon("👤", "Копировать упоминание"),
                        id: "khabarovsk-tool-copy-mention",
                        action: () => this.insertTextIntoChat(`<@${user.id}>`)
                    }
                ];

                const formsItems = [
                    {
                        type: "item",
                        label: "Устное предупреждение",
                        id: "khabarovsk-form-oral",
                        action: () => {
                            this.showRuleSelectModal("oralWarning", user);
                        }
                    },
                    {
                        type: "item",
                        label: "Предупреждение",
                        id: "khabarovsk-form-warning",
                        action: () => {
                            this.showRuleSelectModal("warning", user);
                        }
                    },
                    {
                        type: "item",
                        label: "Мут",
                        id: "khabarovsk-form-mute",
                        action: () => {
                            this.showRuleSelectModal("mute", user);
                        }
                    },
                    {
                        type: "item",
                        label: "Бан",
                        id: "khabarovsk-form-ban",
                        action: () => {
                            this.showRuleSelectModal("ban", user);
                        }
                    }
                ];

                if (formsItems.length) {
                    toolsItems.push({
                        type: "submenu",
                        label: withIcon("📝", "Формы наказаний"),
                        id: "khabarovsk-punishment-forms",
                        items: formsItems
                    });
                }

                toolsItems.push({
                    type: "item",
                    label: withIcon("📜", "История наказаний"),
                    id: "khabarovsk-history",
                    action: () => this.showHistoryModal()
                });

                const cleanupItems = [];
                if (messageId) {
                    cleanupItems.push({
                        type: "item",
                        label: withIcon("🧹", "Очистить сообщение"),
                        id: "khabarovsk-clear-one",
                        action: () => {
                            const clearOne = this.settings.messageFormats?.commands?.clearOne || this.settings.messageFormats?.commands?.clear1;
                            if (!clearOne) {
                                this.showToast("Формат команды clear one не найден в настройках", "error");
                                return;
                            }
                            const commandContent = buildForUser(clearOne, { messageId });
                            this.queueActionWithPreview(
                                "Очистка сообщения",
                                `Команда: ${commandContent}`,
                                () => this.insertTextIntoChat(commandContent)
                            );
                        }
                    });
                }
                cleanupItems.push({
                    type: "item",
                    label: withIcon("🧹", "Очистить сообщения пользователя"),
                    id: "khabarovsk-clear-member",
                    action: () => {
                        if (!this.settings.messageFormats?.commands?.clearMember) {
                            this.showToast("Формат команды clear member не найден в настройках", "error");
                            return;
                        }
                        const commandContent = buildForUser(this.settings.messageFormats.commands.clearMember);
                        this.queueActionWithPreview(
                            "Очистка сообщений пользователя",
                            `Команда: ${commandContent}`,
                            () => this.insertTextIntoChat(commandContent)
                        );
                    }
                });

                if (cleanupItems.length) {
                    toolsItems.push({
                        type: "submenu",
                        label: withIcon("🧹", "Очистка"),
                        id: "khabarovsk-tool-cleanup",
                        items: cleanupItems
                    });
                }

                const toolsMenuItem = {
                    type: "submenu",
                    label: withIcon("🔧", "Инструменты модерации"),
                    id: "khabarovsk-moderation-tools",
                    items: toolsItems
                };

                return [...categoryItems, toolsMenuItem];
            }

            getSettingsPanel() {
                // Проверяем и загружаем настройки если их нет
                if (!this.settings || !this.settings.messageFormats) {
                    this.settings = this.loadSettings();
                }

                const uiDefaults = {
                    theme: "dark",
                    compactMode: false,
                    showIcons: true,
                    animationSpeed: "normal",
                    panelMaxWidth: 800,
                    baseFontSize: 14,
                    sectionSpacing: 10,
                    sectionPadding: 15,
                    inputPaddingY: 10,
                    inputPaddingX: 12,
                    borderRadius: 8,
                    accentColor: "#5865F2",
                    panelBackground: "#1F2024",
                    sectionBackground: "rgba(79, 84, 92, 0.3)",
                    sectionBorderColor: "rgba(79, 84, 92, 0.5)",
                    inputBackground: "rgba(4, 4, 5, 0.3)",
                    textColor: "#FFFFFF",
                    mutedTextColor: "#B9BBBE",
                    hintTextColor: "#72767D"
                };
                const uiRaw = this.settings.ui || {};
                const normalizeNumber = (value, fallback, min = null, max = null) => {
                    const num = parseInt(value, 10);
                    if (!Number.isFinite(num)) return fallback;
                    if (min !== null && num < min) return min;
                    if (max !== null && num > max) return max;
                    return num;
                };
                const normalizeColor = (value, fallback) => {
                    if (typeof value !== "string") return fallback;
                    const trimmed = value.trim();
                    if (/^#([0-9a-f]{3}){1,2}$/i.test(trimmed)) return trimmed;
                    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(\s*,\s*(0|0?\.\d+|1(\.0)?))?\s*\)$/i.test(trimmed)) {
                        return trimmed;
                    }
                    return fallback;
                };
                const normalizeAnimationSpeed = (value) => {
                    const v = String(value || "").trim().toLowerCase();
                    return (v === "fast" || v === "normal" || v === "slow") ? v : "normal";
                };
                const compactMode = uiRaw.compactMode === true;
                const showIcons = uiRaw.showIcons !== false;
                const panelMaxWidth = normalizeNumber(uiRaw.panelMaxWidth, uiDefaults.panelMaxWidth, 420, 1400);
                const baseFontSize = normalizeNumber(uiRaw.baseFontSize, uiDefaults.baseFontSize, 11, 20);
                const sectionSpacing = compactMode
                    ? 6
                    : normalizeNumber(uiRaw.sectionSpacing, uiDefaults.sectionSpacing, 4, 24);
                const sectionPadding = compactMode
                    ? 10
                    : normalizeNumber(uiRaw.sectionPadding, uiDefaults.sectionPadding, 8, 30);
                const inputPaddingY = compactMode
                    ? 6
                    : normalizeNumber(uiRaw.inputPaddingY, uiDefaults.inputPaddingY, 4, 18);
                const inputPaddingX = normalizeNumber(uiRaw.inputPaddingX, uiDefaults.inputPaddingX, 6, 24);
                const borderRadius = normalizeNumber(uiRaw.borderRadius, uiDefaults.borderRadius, 0, 20);
                const accentColor = normalizeColor(uiRaw.accentColor, uiDefaults.accentColor);
                const panelBackground = normalizeColor(uiRaw.panelBackground, uiDefaults.panelBackground);
                const sectionBackground = normalizeColor(uiRaw.sectionBackground, uiDefaults.sectionBackground);
                const sectionBorderColor = normalizeColor(uiRaw.sectionBorderColor, uiDefaults.sectionBorderColor);
                const inputBackground = normalizeColor(uiRaw.inputBackground, uiDefaults.inputBackground);
                const textColor = normalizeColor(uiRaw.textColor, uiDefaults.textColor);
                const mutedTextColor = normalizeColor(uiRaw.mutedTextColor, uiDefaults.mutedTextColor);
                const hintTextColor = normalizeColor(uiRaw.hintTextColor, uiDefaults.hintTextColor);
                const animationSpeed = normalizeAnimationSpeed(uiRaw.animationSpeed);
                const animationMs = animationSpeed === "fast" ? 120 : (animationSpeed === "slow" ? 320 : 200);
                const labelFontSize = baseFontSize;
                const hintFontSize = Math.max(baseFontSize - 2, 11);
                const sectionTitleFontSize = baseFontSize + 2;
                const inputPadding = `${inputPaddingY}px ${inputPaddingX}px`;
                const sectionPaddingCss = `${sectionPadding}px ${sectionPadding + 5}px`;
                const withIcon = (icon, text) => (showIcons && icon) ? `${icon} ${text}` : text;
                const accentHoverColor = accentColor === "#5865F2" ? "#4752C4" : accentColor;

                const panel = document.createElement("div");
                panel.style.padding = compactMode ? "16px" : "20px";
                panel.style.maxWidth = `${panelMaxWidth}px`;
                panel.style.margin = "0 auto";
                panel.style.background = panelBackground;
                panel.style.borderRadius = `${borderRadius}px`;

                // Заголовок
                const title = document.createElement("h2");
                title.textContent = withIcon("⚙️", "Настройки khabarovskMod");
                title.style.marginBottom = `${sectionSpacing + 10}px`;
                title.style.color = textColor;
                title.style.fontSize = `${baseFontSize + 10}px`;
                title.style.fontWeight = "600";
                panel.appendChild(title);

                // Функция создания раскрывающейся секции (accordion)
                const createCollapsibleSection = (titleText, icon = "📋", defaultOpen = false) => {
                    const sectionWrapper = document.createElement("div");
                    sectionWrapper.style.marginBottom = `${sectionSpacing}px`;
                    sectionWrapper.style.backgroundColor = sectionBackground;
                    sectionWrapper.style.borderRadius = `${borderRadius}px`;
                    sectionWrapper.style.border = `1px solid ${sectionBorderColor}`;
                    sectionWrapper.style.overflow = "hidden";

                    // Заголовок секции (кликабельный)
                    const sectionHeader = document.createElement("div");
                    sectionHeader.style.padding = sectionPaddingCss;
                    sectionHeader.style.cursor = "pointer";
                    sectionHeader.style.display = "flex";
                    sectionHeader.style.alignItems = "center";
                    sectionHeader.style.justifyContent = "space-between";
                    sectionHeader.style.userSelect = "none";
                    sectionHeader.style.transition = `background ${animationMs}ms`;
                    sectionHeader.onmouseenter = () => sectionHeader.style.backgroundColor = "rgba(79, 84, 92, 0.5)";
                    sectionHeader.onmouseleave = () => {
                        if (!sectionContent.style.display || sectionContent.style.display !== "none") {
                            sectionHeader.style.backgroundColor = "transparent";
                        }
                    };

                    const sectionTitle = document.createElement("div");
                    sectionTitle.textContent = withIcon(icon, titleText);
                    sectionTitle.style.color = textColor;
                    sectionTitle.style.fontSize = `${sectionTitleFontSize}px`;
                    sectionTitle.style.fontWeight = "600";
                    sectionHeader.appendChild(sectionTitle);

                    const arrow = document.createElement("div");
                    arrow.textContent = defaultOpen ? "▼" : "▶";
                    arrow.style.color = mutedTextColor;
                    arrow.style.fontSize = `${Math.max(baseFontSize - 2, 10)}px`;
                    arrow.style.marginLeft = "10px";
                    arrow.style.transition = `transform ${animationMs}ms`;
                    sectionHeader.appendChild(arrow);

                    // Контент секции
                    const sectionContent = document.createElement("div");
                    sectionContent.style.padding = sectionPaddingCss;
                    sectionContent.style.display = defaultOpen ? "block" : "none";
                    sectionContent.style.borderTop = `1px solid ${sectionBorderColor}`;

                    // Переключение видимости
                    sectionHeader.onclick = () => {
                        const isOpen = sectionContent.style.display !== "none";
                        sectionContent.style.display = isOpen ? "none" : "block";
                        arrow.textContent = isOpen ? "▶" : "▼";
                        sectionHeader.style.backgroundColor = isOpen ? "transparent" : "rgba(79, 84, 92, 0.5)";
                    };

                    sectionWrapper.appendChild(sectionHeader);
                    sectionWrapper.appendChild(sectionContent);

                    return { wrapper: sectionWrapper, content: sectionContent };
                };

                // Функция создания поля ввода
                const createInputField = (labelText, value, hintText, placeholder = "") => {
                    const container = document.createElement("div");
                    container.style.marginBottom = `${sectionSpacing + 10}px`;

                    const label = document.createElement("label");
                    label.textContent = labelText;
                    label.style.display = "block";
                    label.style.marginBottom = "8px";
                    label.style.color = mutedTextColor;
                    label.style.fontSize = `${labelFontSize}px`;
                    label.style.fontWeight = "500";
                    container.appendChild(label);

                    const input = document.createElement("input");
                    input.type = "text";
                    input.value = value || "";
                    input.placeholder = placeholder;
                    input.style.width = "100%";
                    input.style.padding = inputPadding;
                    input.style.marginBottom = "6px";
                    input.style.backgroundColor = inputBackground;
                    input.style.border = `1px solid ${sectionBorderColor}`;
                    input.style.borderRadius = `${borderRadius}px`;
                    input.style.color = textColor;
                    input.style.fontSize = `${labelFontSize}px`;
                    input.style.boxSizing = "border-box";
                    input.style.transition = `border-color ${animationMs}ms`;
                    input.onfocus = () => input.style.borderColor = accentColor;
                    input.onblur = () => input.style.borderColor = sectionBorderColor;
                    container.appendChild(input);

                    if (hintText) {
                        const hint = document.createElement("small");
                        hint.textContent = hintText;
                        hint.style.display = "block";
                        hint.style.marginTop = "4px";
                        hint.style.color = hintTextColor;
                        hint.style.fontSize = `${hintFontSize}px`;
                        hint.style.lineHeight = "1.4";
                        container.appendChild(hint);
                    }

                    return { container, input };
                };

                const createTextareaField = (labelText, value, hintText, placeholder = "") => {
                    const container = document.createElement("div");
                    container.style.marginBottom = `${sectionSpacing + 10}px`;

                    const label = document.createElement("label");
                    label.textContent = labelText;
                    label.style.display = "block";
                    label.style.marginBottom = "8px";
                    label.style.color = mutedTextColor;
                    label.style.fontSize = `${labelFontSize}px`;
                    label.style.fontWeight = "500";
                    container.appendChild(label);

                    const textarea = document.createElement("textarea");
                    textarea.value = value || "";
                    textarea.placeholder = placeholder;
                    textarea.style.width = "100%";
                    textarea.style.minHeight = "90px";
                    textarea.style.padding = inputPadding;
                    textarea.style.marginBottom = "6px";
                    textarea.style.backgroundColor = inputBackground;
                    textarea.style.border = `1px solid ${sectionBorderColor}`;
                    textarea.style.borderRadius = `${borderRadius}px`;
                    textarea.style.color = textColor;
                    textarea.style.fontSize = `${labelFontSize}px`;
                    textarea.style.resize = "vertical";
                    textarea.style.boxSizing = "border-box";
                    textarea.style.transition = `border-color ${animationMs}ms`;
                    textarea.onfocus = () => textarea.style.borderColor = accentColor;
                    textarea.onblur = () => textarea.style.borderColor = sectionBorderColor;
                    container.appendChild(textarea);

                    if (hintText) {
                        const hint = document.createElement("div");
                        hint.textContent = hintText;
                        hint.style.fontSize = `${hintFontSize}px`;
                        hint.style.color = hintTextColor;
                        container.appendChild(hint);
                    }

                    return { container, input: textarea };
                };

                // Секция: Форматы сообщений (раскрывающаяся)
                const formatsSection = createCollapsibleSection("Форматы сообщений", "💬", true);

                const withTextField = createInputField(
                    "Формат для автоотправки сообщений:",
                    this.settings.messageFormats?.withText || "<@{userId}> +{punishment} по пункту {ruleId} правил",
                    "Доступные переменные: {userId}, {punishment}, {ruleId}"
                );
                formatsSection.content.appendChild(withTextField.container);

                const onlyMentionField = createInputField(
                    "Формат только упоминания:",
                    this.settings.messageFormats?.onlyMention || "<@{userId}>",
                    "Используется для наказаний без автоотправки"
                );
                formatsSection.content.appendChild(onlyMentionField.container);

                panel.appendChild(formatsSection.wrapper);

                // Секция: Форматы команд (раскрывающаяся)
                const commandsSection = createCollapsibleSection("Форматы команд", "⚡", false);

                const warnField = createInputField(
                    "Команда /warn:",
                    this.settings.messageFormats?.commands?.warn || "/warn user:<@{userId}> reason:{ruleId}",
                    "Используется для наказания 'Предупреждение'"
                );
                commandsSection.content.appendChild(warnField.container);

                const muteField = createInputField(
                    "Команда /mute:",
                    this.settings.messageFormats?.commands?.mute || "/mute user:<@{userId}> time:90 reason:{ruleId}",
                    "Используется для наказания 'Мут 90 минут'"
                );
                commandsSection.content.appendChild(muteField.container);

                const banField = createInputField(
                    "Команда /ban:",
                    this.settings.messageFormats?.commands?.ban || "/ban user:<@{userId}> time: reason:{ruleId}",
                    "Используется для наказания 'Бан 7-15 дней'"
                );
                commandsSection.content.appendChild(banField.container);

                const permbanField = createInputField(
                    "Команда /ban (перманент):",
                    this.settings.messageFormats?.commands?.permban || "/ban user:<@{userId}> time:365 reason:{ruleId}",
                    "Используется для наказания 'Перманентная блокировка'"
                );
                commandsSection.content.appendChild(permbanField.container);

                const userField = createInputField(
                    "Команда /user:",
                    this.settings.messageFormats?.commands?.user || "/user user:<@{userId}>",
                    "Используется в инструментах модерации"
                );
                commandsSection.content.appendChild(userField.container);

                const punishField = createInputField(
                    "Команда /punish:",
                    this.settings.messageFormats?.commands?.punish || "/punish user:<@{userId}>",
                    "Используется в инструментах модерации"
                );
                commandsSection.content.appendChild(punishField.container);

                const clearOneField = createInputField(
                    "Команда clear one (по ID сообщения):",
                    this.settings.messageFormats?.commands?.clearOne || this.settings.messageFormats?.commands?.clear1 || "/clear one message_id:{messageId}",
                    "Доступные переменные: {messageId}, {userId}"
                );
                commandsSection.content.appendChild(clearOneField.container);

                const clearMemberField = createInputField(
                    "Команда clear member (по пользователю):",
                    this.settings.messageFormats?.commands?.clearMember || this.settings.messageFormats?.commands?.clearUser || "/clear member user:<@{userId}>",
                    "Доступная переменная: {userId}"
                );
                commandsSection.content.appendChild(clearMemberField.container);

                panel.appendChild(commandsSection.wrapper);

                // Секция: Конфигурация форм (раскрывающаяся)
                const formsSection = createCollapsibleSection("Конфигурация форм", "📝", false);

                const moderatorNickField = createInputField(
                    "Ваш Nick_Name (модератор):",
                    this.settings.formConfig?.moderatorNick || "Ваш_Nick_Name",
                    "Подставляется в шаблон как {moderatorNick}"
                );
                formsSection.content.appendChild(moderatorNickField.container);

                const formTemplateField = createTextareaField(
                    "Шаблон формы наказания:",
                    this.settings.formConfig?.template || "",
                    "Переменные: {moderatorNick}, {userId}, {userTag}, {ruleId}, {punishment}, {dateIssued}, {dateEnd}"
                );
                formsSection.content.appendChild(formTemplateField.container);

                const variablesHint = document.createElement("div");
                variablesHint.style.marginTop = `${sectionSpacing}px`;
                variablesHint.style.padding = `${Math.max(inputPaddingY, 8)}px`;
                variablesHint.style.background = sectionBackground;
                variablesHint.style.border = `1px solid ${sectionBorderColor}`;
                variablesHint.style.borderRadius = `${borderRadius}px`;
                variablesHint.style.color = mutedTextColor;
                variablesHint.style.fontSize = `${hintFontSize}px`;
                variablesHint.textContent = "Доступные переменные: {moderatorNick}, {userId}, {userTag}, {ruleId}, {punishment}, {dateIssued}, {dateEnd}";
                formsSection.content.appendChild(variablesHint);

                panel.appendChild(formsSection.wrapper);

                // Секция: Категории наказаний (раскрывающаяся)
                const punishmentsSection = createCollapsibleSection("Категории наказаний", "⚖️", false);

                const withTextField2 = createInputField(
                    "Наказания с автоотправкой (через запятую):",
                    (this.settings.punishmentsWithText || ["Устное предупреждение"]).join(", "),
                    "Эти наказания отправляют сообщение автоматически в чат"
                );
                punishmentsSection.content.appendChild(withTextField2.container);

                const withTextAndCopyField = createInputField(
                    "Наказания с автоотправкой + копированием команды (через запятую):",
                    (this.settings.punishmentsWithTextAndCopy || ["Предупреждение"]).join(", "),
                    "Эти наказания отправляют сообщение И копируют команду в буфер обмена"
                );
                punishmentsSection.content.appendChild(withTextAndCopyField.container);

                const withCopyField = createInputField(
                    "Наказания только с копированием команды (через запятую):",
                    (this.settings.punishmentsWithCopy || ["Мут 90 минут", "Бан 7-15 дней", "Перманентная блокировка"]).join(", "),
                    "Эти наказания только копируют команду в буфер обмена"
                );
                punishmentsSection.content.appendChild(withCopyField.container);

                panel.appendChild(punishmentsSection.wrapper);

                // Секция: Дополнительные настройки (раскрывающаяся)
                const advancedSection = createCollapsibleSection("Дополнительные настройки", "🔧", false);

                // Функция создания переключателя (toggle)
                const createToggle = (labelText, initialValue, hintText) => {
                    let currentValue = initialValue;
                    const container = document.createElement("div");
                    container.style.marginBottom = `${sectionSpacing + 10}px`;
                    container.style.display = "flex";
                    container.style.alignItems = "center";
                    container.style.justifyContent = "space-between";

                    const labelContainer = document.createElement("div");
                    labelContainer.style.flex = "1";

                    const label = document.createElement("label");
                    label.textContent = labelText;
                    label.style.display = "block";
                    label.style.marginBottom = "4px";
                    label.style.color = mutedTextColor;
                    label.style.fontSize = `${labelFontSize}px`;
                    label.style.fontWeight = "500";
                    label.style.cursor = "pointer";
                    labelContainer.appendChild(label);

                    if (hintText) {
                        const hint = document.createElement("small");
                        hint.textContent = hintText;
                        hint.style.display = "block";
                        hint.style.color = hintTextColor;
                        hint.style.fontSize = `${hintFontSize}px`;
                        labelContainer.appendChild(hint);
                    }

                    const toggleWidth = compactMode ? 38 : 44;
                    const toggleHeight = compactMode ? 20 : 24;
                    const toggleCircleSize = compactMode ? 14 : 18;
                    const togglePadding = 3;
                    const toggleOnLeft = toggleWidth - toggleCircleSize - togglePadding;

                    const toggle = document.createElement("div");
                    toggle.style.width = `${toggleWidth}px`;
                    toggle.style.height = `${toggleHeight}px`;
                    toggle.style.borderRadius = `${Math.floor(toggleHeight / 2)}px`;
                    toggle.style.backgroundColor = currentValue ? accentColor : "#4E5058";
                    toggle.style.position = "relative";
                    toggle.style.cursor = "pointer";
                    toggle.style.transition = `background ${animationMs}ms`;
                    toggle.style.flexShrink = "0";

                    const toggleCircle = document.createElement("div");
                    toggleCircle.style.width = `${toggleCircleSize}px`;
                    toggleCircle.style.height = `${toggleCircleSize}px`;
                    toggleCircle.style.borderRadius = "50%";
                    toggleCircle.style.backgroundColor = "#FFFFFF";
                    toggleCircle.style.position = "absolute";
                    toggleCircle.style.top = `${togglePadding}px`;
                    toggleCircle.style.left = currentValue ? `${toggleOnLeft}px` : `${togglePadding}px`;
                    toggleCircle.style.transition = `left ${animationMs}ms`;
                    toggle.appendChild(toggleCircle);

                    const updateToggle = (newValue) => {
                        currentValue = newValue;
                        toggle.style.backgroundColor = newValue ? accentColor : "#4E5058";
                        toggleCircle.style.left = newValue ? `${toggleOnLeft}px` : `${togglePadding}px`;
                    };

                    toggle.onclick = () => updateToggle(!currentValue);
                    label.onclick = () => toggle.onclick();

                    // Метод для получения значения
                    toggle.getValue = () => currentValue;
                    toggle.setValue = (val) => updateToggle(val);

                    container.appendChild(labelContainer);
                    container.appendChild(toggle);

                    return { container, toggle };
                };

                const showNotificationsToggle = createToggle(
                    "Показывать уведомления",
                    this.settings.showNotifications !== false,
                    "Показывать toast-уведомления при выполнении действий"
                );
                advancedSection.content.appendChild(showNotificationsToggle.container);

                const autoSaveToggle = createToggle(
                    "Автосохранение",
                    this.settings.autoSave === true,
                    "Автоматически сохранять настройки при изменении"
                );
                advancedSection.content.appendChild(autoSaveToggle.container);

                const confirmActionsToggle = createToggle(
                    "Подтверждение действий",
                    this.settings.advanced?.confirmActions === true,
                    "Запрашивать подтверждение перед выполнением действий"
                );
                advancedSection.content.appendChild(confirmActionsToggle.container);

                const showPreviewToggle = createToggle(
                    "Показывать превью",
                    this.settings.advanced?.showPreview !== false,
                    "Показывать превью команды перед выполнением"
                );
                advancedSection.content.appendChild(showPreviewToggle.container);

                // Если автосохранение включено, добавляем обработчики
                if (this.settings.autoSave) {
                    const allInputs = [
                        withTextField.input, onlyMentionField.input,
                        warnField.input, muteField.input, banField.input, permbanField.input,
                        userField.input, punishField.input, clearOneField.input, clearMemberField.input,
                        withTextField2.input, withTextAndCopyField.input, withCopyField.input,
                        moderatorNickField.input, formTemplateField.input
                    ];

                    allInputs.forEach(input => {
                        input.addEventListener('change', () => {
                            if (autoSaveToggle.toggle.getValue()) {
                                saveButton.onclick();
                            }
                        });
                    });
                }

                panel.appendChild(advancedSection.wrapper);

                // Секция: Настройки команд (раскрывающаяся)
                const commandSettingsSection = createCollapsibleSection("Настройки команд", "⚙️", false);

                const defaultMuteTimeField = createInputField(
                    "Время мута по умолчанию (минуты):",
                    this.settings.commandSettings?.defaultMuteTime || 90,
                    "Время мута в минутах, используемое по умолчанию"
                );
                defaultMuteTimeField.input.type = "number";
                defaultMuteTimeField.input.min = "1";
                commandSettingsSection.content.appendChild(defaultMuteTimeField.container);

                const defaultBanTimeField = createInputField(
                    "Время бана по умолчанию (дни):",
                    this.settings.commandSettings?.defaultBanTime || 7,
                    "Время бана в днях, используемое по умолчанию"
                );
                defaultBanTimeField.input.type = "number";
                defaultBanTimeField.input.min = "1";
                commandSettingsSection.content.appendChild(defaultBanTimeField.container);

                panel.appendChild(commandSettingsSection.wrapper);

                // Секция: Настройки уведомлений (раскрывающаяся)
                const notificationSettingsSection = createCollapsibleSection("Настройки уведомлений", "🔔", false);

                const notificationTimeoutField = createInputField(
                    "Таймаут уведомлений (мс):",
                    this.settings.notificationSettings?.timeout || 3000,
                    "Время отображения уведомлений в миллисекундах"
                );
                notificationTimeoutField.input.type = "number";
                notificationTimeoutField.input.min = "1000";
                notificationTimeoutField.input.max = "10000";
                notificationSettingsSection.content.appendChild(notificationTimeoutField.container);

                const showSuccessToggle = createToggle(
                    "Показывать успешные уведомления",
                    this.settings.notificationSettings?.showSuccess !== false,
                    "Показывать уведомления об успешных операциях"
                );
                notificationSettingsSection.content.appendChild(showSuccessToggle.container);

                const showErrorToggle = createToggle(
                    "Показывать ошибки",
                    this.settings.notificationSettings?.showError !== false,
                    "Показывать уведомления об ошибках"
                );
                notificationSettingsSection.content.appendChild(showErrorToggle.container);

                const showInfoToggle = createToggle(
                    "Показывать информационные уведомления",
                    this.settings.notificationSettings?.showInfo !== false,
                    "Показывать информационные уведомления"
                );
                notificationSettingsSection.content.appendChild(showInfoToggle.container);

                panel.appendChild(notificationSettingsSection.wrapper);

                // Секция: Логирование (раскрывающаяся)
                const loggingSection = createCollapsibleSection("Логирование", "📝", false);

                const loggingEnabledToggle = createToggle(
                    "Включить логирование",
                    this.settings.logging?.enabled === true,
                    "Включить запись логов действий"
                );
                loggingSection.content.appendChild(loggingEnabledToggle.container);

                const logToConsoleToggle = createToggle(
                    "Логировать в консоль",
                    this.settings.logging?.logToConsole !== false,
                    "Выводить логи в консоль браузера"
                );
                loggingSection.content.appendChild(logToConsoleToggle.container);

                const logToFileToggle = createToggle(
                    "Логировать в файл",
                    this.settings.logging?.logToFile === true,
                    "Сохранять логи в файл"
                );
                loggingSection.content.appendChild(logToFileToggle.container);

                const logFilePathField = createInputField(
                    "Путь к файлу логов:",
                    this.settings.logging?.logFilePath || "",
                    "Путь к файлу для сохранения логов (оставьте пустым для автоопределения)"
                );
                loggingSection.content.appendChild(logFilePathField.container);

                panel.appendChild(loggingSection.wrapper);

                // Секция: Интерфейс (раскрывающаяся)
                const uiSection = createCollapsibleSection("Настройки интерфейса", "🎨", false);

                const compactModeToggle = createToggle(
                    "Компактный режим",
                    this.settings.ui?.compactMode === true,
                    "Использовать компактный режим отображения"
                );
                uiSection.content.appendChild(compactModeToggle.container);

                const showIconsToggle = createToggle(
                    "Показывать иконки",
                    this.settings.ui?.showIcons !== false,
                    "Отображать иконки в меню и интерфейсе"
                );
                uiSection.content.appendChild(showIconsToggle.container);

                const panelMaxWidthField = createInputField(
                    "Макс. ширина панели (px):",
                    this.settings.ui?.panelMaxWidth || 800,
                    "Ширина панели настроек",
                    "800"
                );
                panelMaxWidthField.input.type = "number";
                panelMaxWidthField.input.min = "420";
                panelMaxWidthField.input.max = "1400";
                uiSection.content.appendChild(panelMaxWidthField.container);

                const baseFontSizeField = createInputField(
                    "Базовый размер шрифта (px):",
                    this.settings.ui?.baseFontSize || 14,
                    "Базовый размер текста в настройках",
                    "14"
                );
                baseFontSizeField.input.type = "number";
                baseFontSizeField.input.min = "11";
                baseFontSizeField.input.max = "20";
                uiSection.content.appendChild(baseFontSizeField.container);

                const sectionSpacingField = createInputField(
                    "Отступы между секциями (px):",
                    this.settings.ui?.sectionSpacing || 10,
                    "Вертикальный отступ между секциями",
                    "10"
                );
                sectionSpacingField.input.type = "number";
                sectionSpacingField.input.min = "4";
                sectionSpacingField.input.max = "24";
                uiSection.content.appendChild(sectionSpacingField.container);

                const sectionPaddingField = createInputField(
                    "Внутренние отступы секций (px):",
                    this.settings.ui?.sectionPadding || 15,
                    "Отступы внутри заголовка и содержимого секции",
                    "15"
                );
                sectionPaddingField.input.type = "number";
                sectionPaddingField.input.min = "8";
                sectionPaddingField.input.max = "30";
                uiSection.content.appendChild(sectionPaddingField.container);

                const inputPaddingYField = createInputField(
                    "Отступы полей ввода по вертикали (px):",
                    this.settings.ui?.inputPaddingY || 10,
                    "Внутренние отступы сверху/снизу",
                    "10"
                );
                inputPaddingYField.input.type = "number";
                inputPaddingYField.input.min = "4";
                inputPaddingYField.input.max = "18";
                uiSection.content.appendChild(inputPaddingYField.container);

                const inputPaddingXField = createInputField(
                    "Отступы полей ввода по горизонтали (px):",
                    this.settings.ui?.inputPaddingX || 12,
                    "Внутренние отступы слева/справа",
                    "12"
                );
                inputPaddingXField.input.type = "number";
                inputPaddingXField.input.min = "6";
                inputPaddingXField.input.max = "24";
                uiSection.content.appendChild(inputPaddingXField.container);

                const borderRadiusField = createInputField(
                    "Скругление углов (px):",
                    this.settings.ui?.borderRadius || 8,
                    "Скругление секций и полей",
                    "8"
                );
                borderRadiusField.input.type = "number";
                borderRadiusField.input.min = "0";
                borderRadiusField.input.max = "20";
                uiSection.content.appendChild(borderRadiusField.container);

                const accentColorField = createInputField(
                    "Цвет акцента (hex):",
                    this.settings.ui?.accentColor || "#5865F2",
                    "Используется для кнопок и фокуса полей (hex/rgb/rgba)",
                    "#5865F2"
                );
                uiSection.content.appendChild(accentColorField.container);

                const panelBackgroundField = createInputField(
                    "Фон панели (hex/rgb/rgba):",
                    this.settings.ui?.panelBackground || "#1F2024",
                    "Фон всей панели настроек",
                    "#1F2024"
                );
                uiSection.content.appendChild(panelBackgroundField.container);

                const sectionBackgroundField = createInputField(
                    "Фон секций (hex/rgb/rgba):",
                    this.settings.ui?.sectionBackground || "rgba(79, 84, 92, 0.3)",
                    "Фон заголовков и контента секций",
                    "rgba(79, 84, 92, 0.3)"
                );
                uiSection.content.appendChild(sectionBackgroundField.container);

                const sectionBorderColorField = createInputField(
                    "Цвет границ (hex/rgb/rgba):",
                    this.settings.ui?.sectionBorderColor || "rgba(79, 84, 92, 0.5)",
                    "Цвет рамок секций и полей",
                    "rgba(79, 84, 92, 0.5)"
                );
                uiSection.content.appendChild(sectionBorderColorField.container);

                const inputBackgroundField = createInputField(
                    "Фон полей ввода (hex/rgb/rgba):",
                    this.settings.ui?.inputBackground || "rgba(4, 4, 5, 0.3)",
                    "Фон input/textarea",
                    "rgba(4, 4, 5, 0.3)"
                );
                uiSection.content.appendChild(inputBackgroundField.container);

                const textColorField = createInputField(
                    "Основной цвет текста (hex/rgb/rgba):",
                    this.settings.ui?.textColor || "#FFFFFF",
                    "Цвет заголовков и кнопок",
                    "#FFFFFF"
                );
                uiSection.content.appendChild(textColorField.container);

                const mutedTextColorField = createInputField(
                    "Приглушенный текст (hex/rgb/rgba):",
                    this.settings.ui?.mutedTextColor || "#B9BBBE",
                    "Цвет подписей и второстепенного текста",
                    "#B9BBBE"
                );
                uiSection.content.appendChild(mutedTextColorField.container);

                const hintTextColorField = createInputField(
                    "Цвет подсказок (hex/rgb/rgba):",
                    this.settings.ui?.hintTextColor || "#72767D",
                    "Цвет мелких подсказок",
                    "#72767D"
                );
                uiSection.content.appendChild(hintTextColorField.container);

                const animationSpeedField = createInputField(
                    "Скорость анимаций (fast/normal/slow):",
                    this.settings.ui?.animationSpeed || "normal",
                    "Скорость анимаций интерфейса",
                    "normal"
                );
                uiSection.content.appendChild(animationSpeedField.container);

                panel.appendChild(uiSection.wrapper);

                // Кнопки действий
                const buttonsContainer = document.createElement("div");
                buttonsContainer.style.display = "flex";
                buttonsContainer.style.gap = "10px";
                buttonsContainer.style.marginTop = `${sectionSpacing + 20}px`;
                buttonsContainer.style.paddingTop = `${sectionSpacing + 10}px`;
                buttonsContainer.style.borderTop = `1px solid ${sectionBorderColor}`;

                const saveButton = document.createElement("button");
                saveButton.textContent = withIcon("💾", "Сохранить настройки");
                saveButton.style.padding = compactMode ? "10px 18px" : "12px 24px";
                saveButton.style.background = accentColor;
                saveButton.style.color = textColor;
                saveButton.style.border = "none";
                saveButton.style.borderRadius = "6px";
                saveButton.style.cursor = "pointer";
                saveButton.style.fontWeight = "600";
                saveButton.style.fontSize = `${labelFontSize}px`;
                saveButton.style.transition = `background ${animationMs}ms`;
                saveButton.onmouseenter = () => saveButton.style.background = accentHoverColor;
                saveButton.onmouseleave = () => saveButton.style.background = accentColor;

                saveButton.onclick = () => {
                    try {
                        // Убеждаемся, что структура настроек существует
                        if (!this.settings.messageFormats) {
                            this.settings.messageFormats = {};
                        }
                        if (!this.settings.messageFormats.commands) {
                            this.settings.messageFormats.commands = {};
                        }

                        // Сохраняем форматы сообщений
                        this.settings.messageFormats.withText = withTextField.input.value.trim();
                        this.settings.messageFormats.onlyMention = onlyMentionField.input.value.trim();

                        // Сохраняем команды
                        this.settings.messageFormats.commands.warn = warnField.input.value.trim();
                        this.settings.messageFormats.commands.mute = muteField.input.value.trim();
                        this.settings.messageFormats.commands.ban = banField.input.value.trim();
                        this.settings.messageFormats.commands.permban = permbanField.input.value.trim();
                        this.settings.messageFormats.commands.user = userField.input.value.trim();
                        this.settings.messageFormats.commands.punish = punishField.input.value.trim();
                        this.settings.messageFormats.commands.clearOne = clearOneField.input.value.trim();
                        this.settings.messageFormats.commands.clearMember = clearMemberField.input.value.trim();

                        // Сохраняем категории наказаний
                        this.settings.punishmentsWithText = withTextField2.input.value.split(",").map(s => s.trim()).filter(s => s);
                        this.settings.punishmentsWithTextAndCopy = withTextAndCopyField.input.value.split(",").map(s => s.trim()).filter(s => s);
                        this.settings.punishmentsWithCopy = withCopyField.input.value.split(",").map(s => s.trim()).filter(s => s);

                        // Сохраняем конфигурацию форм
                        if (!this.settings.formConfig) this.settings.formConfig = {};
                        this.settings.formConfig.moderatorNick = moderatorNickField.input.value.trim();
                        this.settings.formConfig.template = formTemplateField.input.value.trim();

                        // Сохраняем дополнительные настройки
                        this.settings.showNotifications = showNotificationsToggle.toggle.getValue();
                        this.settings.autoSave = autoSaveToggle.toggle.getValue();

                        // Сохраняем продвинутые настройки
                        if (!this.settings.advanced) this.settings.advanced = {};
                        this.settings.advanced.confirmActions = confirmActionsToggle.toggle.getValue();
                        this.settings.advanced.showPreview = showPreviewToggle.toggle.getValue();

                        // Сохраняем настройки команд
                        if (!this.settings.commandSettings) this.settings.commandSettings = {};
                        this.settings.commandSettings.defaultMuteTime = parseInt(defaultMuteTimeField.input.value) || 90;
                        this.settings.commandSettings.defaultBanTime = parseInt(defaultBanTimeField.input.value) || 7;

                        // Сохраняем настройки уведомлений
                        if (!this.settings.notificationSettings) this.settings.notificationSettings = {};
                        this.settings.notificationSettings.timeout = parseInt(notificationTimeoutField.input.value) || 3000;
                        this.settings.notificationSettings.showSuccess = showSuccessToggle.toggle.getValue();
                        this.settings.notificationSettings.showError = showErrorToggle.toggle.getValue();
                        this.settings.notificationSettings.showInfo = showInfoToggle.toggle.getValue();

                        // Сохраняем настройки логирования
                        if (!this.settings.logging) this.settings.logging = {};
                        this.settings.logging.enabled = loggingEnabledToggle.toggle.getValue();
                        this.settings.logging.logToConsole = logToConsoleToggle.toggle.getValue();
                        this.settings.logging.logToFile = logToFileToggle.toggle.getValue();
                        this.settings.logging.logFilePath = logFilePathField.input.value.trim();

                        // Сохраняем настройки интерфейса
                        if (!this.settings.ui) this.settings.ui = {};
                        this.settings.ui.compactMode = compactModeToggle.toggle.getValue();
                        this.settings.ui.showIcons = showIconsToggle.toggle.getValue();
                        this.settings.ui.panelMaxWidth = normalizeNumber(panelMaxWidthField.input.value, uiDefaults.panelMaxWidth, 420, 1400);
                        this.settings.ui.baseFontSize = normalizeNumber(baseFontSizeField.input.value, uiDefaults.baseFontSize, 11, 20);
                        this.settings.ui.sectionSpacing = normalizeNumber(sectionSpacingField.input.value, uiDefaults.sectionSpacing, 4, 24);
                        this.settings.ui.sectionPadding = normalizeNumber(sectionPaddingField.input.value, uiDefaults.sectionPadding, 8, 30);
                        this.settings.ui.inputPaddingY = normalizeNumber(inputPaddingYField.input.value, uiDefaults.inputPaddingY, 4, 18);
                        this.settings.ui.inputPaddingX = normalizeNumber(inputPaddingXField.input.value, uiDefaults.inputPaddingX, 6, 24);
                        this.settings.ui.borderRadius = normalizeNumber(borderRadiusField.input.value, uiDefaults.borderRadius, 0, 20);
                        this.settings.ui.accentColor = normalizeColor(accentColorField.input.value, uiDefaults.accentColor);
                        this.settings.ui.panelBackground = normalizeColor(panelBackgroundField.input.value, uiDefaults.panelBackground);
                        this.settings.ui.sectionBackground = normalizeColor(sectionBackgroundField.input.value, uiDefaults.sectionBackground);
                        this.settings.ui.sectionBorderColor = normalizeColor(sectionBorderColorField.input.value, uiDefaults.sectionBorderColor);
                        this.settings.ui.inputBackground = normalizeColor(inputBackgroundField.input.value, uiDefaults.inputBackground);
                        this.settings.ui.textColor = normalizeColor(textColorField.input.value, uiDefaults.textColor);
                        this.settings.ui.mutedTextColor = normalizeColor(mutedTextColorField.input.value, uiDefaults.mutedTextColor);
                        this.settings.ui.hintTextColor = normalizeColor(hintTextColorField.input.value, uiDefaults.hintTextColor);
                        this.settings.ui.animationSpeed = normalizeAnimationSpeed(animationSpeedField.input.value);

                        this.saveSettings(this.settings);
                        this.showToast("✅ Настройки успешно сохранены!", "success");
                    } catch (error) {
                        console.error("Ошибка сохранения настроек:", error);
                        this.showToast("❌ Ошибка сохранения: " + error.message, "error");
                    }
                };

                const resetButton = document.createElement("button");
                resetButton.textContent = withIcon("🔄", "Сбросить к умолчаниям");
                resetButton.style.padding = compactMode ? "10px 18px" : "12px 24px";
                resetButton.style.background = "#4E5058";
                resetButton.style.color = textColor;
                resetButton.style.border = "none";
                resetButton.style.borderRadius = "6px";
                resetButton.style.cursor = "pointer";
                resetButton.style.fontWeight = "600";
                resetButton.style.fontSize = `${labelFontSize}px`;
                resetButton.style.transition = `background ${animationMs}ms`;
                resetButton.onmouseenter = () => resetButton.style.background = "#5D5F66";
                resetButton.onmouseleave = () => resetButton.style.background = "#4E5058";

                resetButton.onclick = () => {
                    if (confirm("Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?")) {
                        this.settings = this.loadSettings();
                        // Перезагружаем панель
                        const newPanel = this.getSettingsPanel();
                        panel.parentNode.replaceChild(newPanel, panel);
                        this.showToast("⚙️ Настройки сброшены к умолчаниям", "info");
                    }
                };

                const openButton = document.createElement("button");
                openButton.textContent = "📂 Открыть конфиг-файл";
                openButton.style.padding = "12px 24px";
                openButton.style.background = "#4E5058";
                openButton.style.color = "white";
                openButton.style.border = "none";
                openButton.style.borderRadius = "6px";
                openButton.style.cursor = "pointer";
                openButton.style.fontWeight = "600";
                openButton.style.fontSize = "14px";
                openButton.style.transition = "background 0.2s";
                openButton.onmouseenter = () => openButton.style.background = "#5D5F66";
                openButton.onmouseleave = () => openButton.style.background = "#4E5058";

                openButton.onclick = () => {
                    try {
                        require("electron").shell.openPath(this.configPath);
                        this.showToast("📂 Открываю конфиг-файл...", "info");
                    } catch (error) {
                        console.error("Ошибка открытия файла:", error);
                        this.showToast("❌ Ошибка открытия файла: " + error.message, "error");
                    }
                };

                buttonsContainer.appendChild(saveButton);
                buttonsContainer.appendChild(resetButton);
                buttonsContainer.appendChild(openButton);
                panel.appendChild(buttonsContainer);

                return panel;
            }

            getCurrentChannelId() {
                const SelectedChannelStore = BdApi.Webpack.getModule(m => m?.getChannelId && m?.getLastSelectedChannelId);
                if (!SelectedChannelStore) {
                    this.showToast("SelectedChannelStore не найден", "error");
                    return null;
                }
                const channelId = SelectedChannelStore.getChannelId();
                if (!channelId) {
                    this.showToast("ID канала не найден", "error");
                    return null;
                }
                return channelId;
            }

            sendMessageToChannel(channelId, messageContent) {
                if (!this.MessageActions) {
                    this.showToast("MessageActions не загружен", "error");
                    return;
                }
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
                        this.showToast("Discord модули не загружены", "error");
                        return;
                    }

                    // Проверяем наличие массивов
                    if (!this.settings.punishmentsWithText) {
                        this.settings.punishmentsWithText = [];
                    }
                    if (!this.settings.punishmentsWithTextAndCopy) {
                        this.settings.punishmentsWithTextAndCopy = [];
                    }
                    if (!this.settings.punishmentsWithCopy) {
                        this.settings.punishmentsWithCopy = [];
                    }

                    let messageContent;
                    let commandContent;
                    const now = new Date();
                    const dateIssued = this.formatDate(now);
                    const timeIssued = this.formatTime(now);

                    // Проверяем, нужно ли отправлять автоматически
                    if (this.settings.punishmentsWithText.includes(punishment)) {
                        const channelId = this.getCurrentChannelId();
                        if (!channelId) return;

                        // Предупреждения - отправляем автоматически
                        messageContent = this.formatTemplate(this.settings.messageFormats.withText, {
                            userId: user.id,
                            punishment,
                            ruleId
                        });

                        this.queueActionWithPreview(
                            "Подтверждение наказания",
                            `Сообщение: ${messageContent}`,
                            () => {
                                this.sendMessageToChannel(channelId, messageContent);
                                this.showToast(`Отправлено: ${punishment} по пункту ${ruleId}`, "success");
                            }
                        );
                        this.addHistoryEntry({
                            userId: user.id,
                            userTag: this.getUserTag(user),
                            ruleId,
                            punishment,
                            dateIssued,
                            timeIssued,
                            dateEnd: dateIssued
                        });
                    } else if (this.settings.punishmentsWithTextAndCopy.includes(punishment)) {
                        const channelId = this.getCurrentChannelId();
                        if (!channelId) return;

                        // Проверяем наличие команды warn
                        if (!this.settings.messageFormats?.commands?.warn) {
                            this.showToast("Формат команды /warn не найден в настройках", "error");
                            return;
                        }

                        // Предупреждения - отправляем автоматически
                        messageContent = this.formatTemplate(this.settings.messageFormats.withText, {
                            userId: user.id,
                            punishment,
                            ruleId
                        });

                        commandContent = this.formatTemplate(this.settings.messageFormats.commands.warn, {
                            userId: user.id,
                            ruleId
                        });

                        const preview = `Команда: ${commandContent}\nСообщение: ${messageContent}`;
                        this.queueActionWithPreview(
                            "Подтверждение наказания",
                            preview,
                            () => {
                                this.insertTextIntoChat(commandContent);
                                this.sendMessageToChannel(channelId, messageContent);
                                this.showToast(`Отправлено: ${punishment} по пункту ${ruleId}`, "success");
                            }
                        );
                        this.addHistoryEntry({
                            userId: user.id,
                            userTag: this.getUserTag(user),
                            ruleId,
                            punishment,
                            dateIssued,
                            timeIssued,
                            dateEnd: dateIssued
                        });
                    } else if (this.settings.punishmentsWithCopy.includes(punishment)) {
                        // Проверяем наличие команд перед использованием
                        if (punishment === "Мут 90 минут") {
                            if (!this.settings.messageFormats?.commands?.mute) {
                                this.showToast("Формат команды /mute не найден в настройках", "error");
                                return;
                            }
                            commandContent = this.formatTemplate(this.settings.messageFormats.commands.mute, {
                                userId: user.id,
                                ruleId
                            });
                        } else if (punishment === "Бан 7-15 дней") {
                            if (!this.settings.messageFormats?.commands?.ban) {
                                this.showToast("Формат команды /ban не найден в настройках", "error");
                                return;
                            }
                            commandContent = this.formatTemplate(this.settings.messageFormats.commands.ban, {
                                userId: user.id,
                                ruleId
                            });
                        } else if (punishment === "Перманентная блокировка") {
                            if (!this.settings.messageFormats?.commands?.permban) {
                                this.showToast("Формат команды /permban не найден в настройках", "error");
                                return;
                            }
                            commandContent = this.formatTemplate(this.settings.messageFormats.commands.permban, {
                                userId: user.id,
                                ruleId
                            });
                        }

                        if (commandContent) {
                            this.queueActionWithPreview(
                                "Подтверждение команды",
                                `Команда: ${commandContent}`,
                                () => this.insertTextIntoChat(commandContent)
                            );
                        }
                        this.addHistoryEntry({
                            userId: user.id,
                            userTag: this.getUserTag(user),
                            ruleId,
                            punishment,
                            dateIssued,
                            timeIssued,
                            dateEnd: dateIssued
                        });
                    } else {
                        // Для остальных наказаний - копируем информацию в буфер
                        messageContent = this.formatTemplate(this.settings.messageFormats.withText, {
                            userId: user.id,
                            ruleId,
                            punishment
                        });

                        this.queueActionWithPreview(
                            "Подтверждение действия",
                            `Сообщение: ${messageContent}`,
                            () => this.insertTextIntoChat(messageContent)
                        );
                        this.addHistoryEntry({
                            userId: user.id,
                            userTag: this.getUserTag(user),
                            ruleId,
                            punishment,
                            dateIssued,
                            timeIssued,
                            dateEnd: dateIssued
                        });
                    }

                } catch (error) {
                    console.error("khabarovskMod executePunishment error:", error);
                    this.showToast(`Ошибка: ${error.message}`, "error");
                }
            }

            showToast(message, type = "info") {
                if (this.settings.showNotifications !== false) {
                    BdApi.UI.showToast(message, {type: type});
                }
            }

            queueActionWithPreview(title, previewText, action) {
                const confirmActions = this.settings?.advanced?.confirmActions === true;
                const showPreview = this.settings?.advanced?.showPreview !== false;

                if (!confirmActions && !showPreview) {
                    action();
                    return;
                }

                const confirmText = confirmActions ? "Выполнить" : "Продолжить";
                BdApi.UI.showConfirmationModal(
                    title || "Подтверждение",
                    previewText || "Подтвердите действие",
                    {
                        confirmText,
                        cancelText: "Отмена",
                        onConfirm: () => action()
                    }
                );
            }

            showChangelogIfNeeded() {
                try {
                    const lastVersion = BdApi.Data.load(config.info.name, "lastVersion");
                    if (lastVersion !== config.info.version) {
                        BdApi.UI.showChangelogModal({
                            title: config.info.name,
                            subtitle: `v${config.info.version}`,
                            blurb: "Список изменений текущего обновления",
                            changes: config.changelog || []
                        });
                        BdApi.Data.save(config.info.name, "lastVersion", config.info.version);
                    }
                } catch (error) {
                    console.error("Ошибка показа changelog:", error);
                }
            }

            insertTextIntoChat(text) {
                try {
                    // Самый надежный способ - через буфер обмена
                    navigator.clipboard.writeText(text).then(() => {
                        this.showToast(`Скопировано в буфер: "${text}". Нажмите Ctrl+V в чате.`, "info");
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
                            this.showToast(`Скопировано в буфер: "${text}". Нажмите Ctrl+V в чате.`, "info");
                        } catch (e) {
                            this.showToast("Не удалось скопировать текст", "error");
                        } finally {
                            // Удаляем textArea в любом случае
                            if (textArea.parentNode) {
                                document.body.removeChild(textArea);
                            }
                        }
                    });

                } catch (error) {
                    console.error("Ошибка вставки текста:", error);
                    this.showToast(`Ошибка: ${error.message}`, "error");
                }
            }
        };
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();
