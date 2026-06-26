# Реализация — Twenty App

Twenty App для отдела реализации: настраиваемая таблица сделок с вложенными позициями, inline-редактированием и views.

Спецификация: [docs/superpowers/specs/2026-06-26-deals-board-twenty-app-design.md](docs/superpowers/specs/2026-06-26-deals-board-twenty-app-design.md)

## Локальная разработка

**Требования:** Node.js 24+, Yarn 4 (через Corepack), Docker.

```bash
corepack enable
yarn install
yarn twenty docker:start    # локальный Twenty на http://localhost:2020
yarn twenty dev             # live-sync изменений
```

Демо-аккаунт локального сервера: `tim@apple.dev` / `tim@apple.dev`

## CD (GitHub Actions)

В репозитории настроен workflow деплоя:

| Workflow | Файл | Триггер | Назначение |
|----------|------|---------|------------|
| **CD** | `.github/workflows/cd.yml` | push в `main`, PR с меткой `deploy` | Публикация и установка app на сервер |

### Настройка деплоя

1. **Repository variable** `TWENTY_DEPLOY_URL` — публичный URL вашего Twenty-сервера  
   Settings → Secrets and variables → Actions → Variables

2. **Repository secret** `TWENTY_DEPLOY_API_KEY` — API-ключ с правом deploy  
   Settings → Secrets and variables → Actions → Secrets

3. Push в `main` — автоматический deploy + install.

**Preview-деплой из PR:** добавьте метку `deploy` на pull request.

## Полезные команды

```bash
yarn twenty help
yarn twenty dev --once      # одноразовый sync
yarn test                   # интеграционные тесты
yarn lint
```

## Документация Twenty

- [Twenty Apps Quick Start](https://docs.twenty.com/developers/extend/apps/getting-started/quick-start)
- [Publishing & CI/CD](https://docs.twenty.com/developers/extend/apps/operations/publishing)
