---
name: ai-cli
description: Генерация текста, изображений и видео из терминала через Polza AI.
---

# ai-cli

Генерация текста, изображений и видео из терминала через 400+ AI-моделей.

## Когда использовать

- Сгенерировать текст (саммари, объяснение, код-ревью) из промпта или пайпа
- Сгенерировать изображение из текстового описания
- Сгенерировать видео из текста или изображения
- Оживить картинку в видео (image-to-video pipeline)
- Собрать цепочку генераций через stdin/stdout

## Установка

```bash
npm install -g @polza-ai/ai-cli
```

После установки доступна команда `ai`. Первый запуск — авторизация:

```bash
ai login
```

OAuth PKCE — откроется браузер, токен сохранится в `~/.ai-cli/config.json`.

## Команды

```bash
ai text "объясни этот код"               # генерация текста (streaming)
ai image "закат над горами"              # генерация изображения
ai video "вращающийся логотип"           # генерация видео
ai models --type image                   # список доступных моделей
ai login                                 # авторизация
ai logout                                # выход
```

## Основные флаги

```
-m, --model <id>       ID модели (provider/name)
-o, --output <path>    Путь для сохранения файла
-n, --count <n>        Количество генераций
-s, --set <key=value>  Параметр модели (динамический, из API)
--json                 Структурированный JSON-вывод
--params               Показать доступные параметры модели
```

## Паттерны пайпов

Цепочки команд для AI-агентов:

```bash
# Контент из файла → AI
cat notes.txt | ai text "сделай краткое саммари"
git diff | ai text "напиши коммит-сообщение"
git log --oneline -10 | ai text "объясни над чем работали"

# Картинка → видео (image-to-video)
ai image "дракон на скале" | ai video "дракон взлетает"

# Текст → картинка
ai text "придумай промпт для картинки: космос" --no-stream | ai image
```

## Динамические параметры

Параметры моделей подтягиваются из API и кешируются локально на 1 час:

```bash
# Посмотреть параметры модели
ai image --params -m google/gemini-3.1-flash-image-preview
ai video --params -m kling/v3

# Передать параметры
ai image "пейзаж" --aspect-ratio 16:9 --quality high
ai video "танец" -s mode=pro -s sound=true
ai image "лого" -s image_resolution=2K -m black-forest-labs/flux.2-pro
```

Обязательные параметры с дефолтами подставляются автоматически. Значения валидируются до отправки.

## JSON-вывод

```bash
ai text "привет" --json --no-stream
```

Успех:
```json
{
  "ok": true,
  "data": {
    "text": "Привет! Чем могу помочь?",
    "model": "google/gemini-3.1-flash-lite-preview",
    "usage": { "prompt_tokens": 3, "completion_tokens": 8, "cost_rub": 0.001 }
  }
}
```

Ошибка:
```json
{
  "ok": false,
  "error": { "code": "PAYMENT_REQUIRED", "message": "Недостаточно средств на балансе" }
}
```

## Стоимость и баланс

После каждой генерации выводится стоимость запроса и оставшийся баланс:

```
✔ Сгенерировано 1 изображений
✓ image-1234.png
  стоимость: 1.50 ₽ · баланс: 7741.98 ₽
```

## Поведение вывода

- **Интерактивный (TTY)**: сохраняет файл, показывает превью (iTerm2/Kitty/chafa), выводит путь
- **Pipe (non-TTY)**: пишет URL в stdout для цепочек
- **`--json`**: структурированный JSON с метаданными

## Image-to-Video

```bash
# Через пайп
ai image "кот" | ai video "кот гуляет"

# Через флаг
ai video "кот гуляет" --image https://example.com/cat.png

# Полная цепочка: текст → картинка → видео
ai text "промпт для картинки: дракон" --no-stream | ai image | ai video "дракон летит"
```

## Модели по умолчанию

- Текст: `google/gemini-3.1-flash-lite-preview`
- Изображения: `google/gemini-3.1-flash-image-preview`
- Видео: `google/veo3_fast`

Изменить: `~/.ai-cli/config.json` → `defaultModel.text/image/video`

## Коды выхода

- `0` — успех
- `1` — все генерации не удались
- `2` — частичный успех
