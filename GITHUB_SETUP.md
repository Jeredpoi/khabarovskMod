# Инструкция по созданию GitHub репозитория

Локальный git репозиторий уже инициализирован и первый коммит сделан! ✅

Теперь нужно создать репозиторий на GitHub и подключить его:

## 📝 Шаги для создания GitHub репозитория:

### 1. Создайте репозиторий на GitHub

1. Откройте [GitHub](https://github.com) и войдите в свой аккаунт
2. Нажмите на кнопку **"+"** в правом верхнем углу → **"New repository"**
3. Заполните форму:
   - **Repository name**: `khabarovskMod`
   - **Description**: `Плагин модерации для BlackRush Discord сервера через контекстное меню пользователя`
   - Выберите **Public** или **Private** (на ваше усмотрение)
   - **НЕ** ставьте галочки на "Initialize this repository with a README", "Add .gitignore", "Choose a license" (у нас уже есть файлы)
4. Нажмите **"Create repository"**

### 2. Подключите локальный репозиторий к GitHub

После создания репозитория GitHub покажет вам URL репозитория. Выполните следующие команды:

**Если ваш GitHub username - Jeredpoi:**

```bash
cd "c:\Users\B-ZONE\Documents\Visual Studio\another_Projects"
git remote add origin https://github.com/Jeredpoi/khabarovskMod.git
git branch -M main
git push -u origin main
```

**Если ваш GitHub username другой, замените `Jeredpoi` на ваш username:**

```bash
cd "c:\Users\B-ZONE\Documents\Visual Studio\another_Projects"
git remote add origin https://github.com/YOUR_USERNAME/khabarovskMod.git
git branch -M main
git push -u origin main
```

**Или используйте SSH (если настроен):**

```bash
git remote add origin git@github.com:YOUR_USERNAME/khabarovskMod.git
git branch -M main
git push -u origin main
```

### 3. Обновите ссылки в плагине

После создания репозитория обновите ссылки в файле `khabarovskMod.plugin.js`:

Замените:

- `https://github.com/Jeredpoi/khabarovskMod` → на ваш реальный URL
- `https://github.com/Jeredpoi/khabarovskMod/blob/main/khabarovskMod.plugin.js` → на ваш реальный URL

### 4. После обновления ссылок - сделайте коммит:

```bash
git add khabarovskMod.plugin.js
git commit -m "Обновлены ссылки на GitHub репозиторий"
git push
```

## 🔄 Дальнейшая работа с репозиторием

### Добавление изменений:

```bash
git add .
git commit -m "Описание изменений"
git push
```

### Проверка статуса:

```bash
git status
```

### Просмотр истории:

```bash
git log
```

## ⚠️ Примечания

- Файл `khabarovskMod.config.json` не будет добавлен в репозиторий (он в .gitignore), так как содержит личные настройки пользователя
- Не забудьте обновить ссылки на GitHub в метаданных плагина после создания репозитория

## 📚 Полезные ссылки

- [GitHub Documentation](https://docs.github.com/)
- [Git Documentation](https://git-scm.com/doc)
- [BetterDiscord Documentation](https://docs.betterdiscord.app/)
