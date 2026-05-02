<h1 align="center">⚡ ai</h1>

<p align="center">
  <strong>Генерация текста, изображений и видео прямо из терминала.</strong><br>
  Простые команды. 400+ моделей. Один API-ключ.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@polza-ai/ai-cli"><img src="https://img.shields.io/npm/v/@polza-ai/ai-cli" alt="npm"></a>
  <a href="https://polza.ai"><img src="https://img.shields.io/badge/powered%20by-polza.ai-blue" alt="Polza AI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/@polza-ai/ai-cli" alt="license"></a>
</p>

---

<p align="center">
  <img src="demo.gif" alt="AI CLI Demo" width="100%">
</p>

```bash
npm install -g @polza-ai/ai-cli
ai login
ai text "Объясни квантовые вычисления одним предложением"
```

## Зачем

- **Один инструмент** для текста, картинок и видео — без жонглирования API
- **400+ моделей** — GPT, Claude, Gemini, Flux, Kling, Sora и другие
- **Стриминг** — текст появляется по мере генерации
- **Дружит с пайпами** — работает со `stdin`, `stdout`, `--json`
- **Динамические параметры** — подтягиваются из API, кешируются локально, валидируются до отправки

## Быстрый старт

```bash
# Установка
npm install -g @polza-ai/ai-cli

# Авторизация (откроется браузер, OAuth PKCE)
ai login

# Генерация текста
ai text "Напиши хайку про TypeScript"

# Генерация изображения
ai image "Киберпанк-кот хакает терминал" -o cat.png

# Генерация видео
ai video "Закат над океаном, кинематографично" --aspect-ratio 16:9
```

## Команды

### `ai text`

```bash
# Базовое использование
ai text "Переведи на японский: привет мир"

# С выбором модели и температуры
ai text "Напиши стихотворение" -m anthropic/claude-sonnet-4 --temperature 0.9

# Системный промпт
ai text "Проверь этот код" --system-prompt "Ты senior Go-разработчик"

# Пайп из stdin
cat error.log | ai text "Объясни эту ошибку и предложи исправление"
git diff | ai text "Напиши коммит-сообщение для этого диффа"

# JSON-вывод для скриптов
ai text "Перечисли 5 цветов" --json --no-stream
```

**Опции:**

| Флаг | Описание |
|------|----------|
| `-m, --model` | Модель (по умолчанию: `openai/gpt-4o`) |
| `--temperature` | Креативность 0–2 |
| `--max-tokens` | Максимальная длина ответа |
| `--system-prompt` | Системное сообщение |
| `--no-stream` | Дождаться полного ответа |
| `--json` | Машиночитаемый вывод |

### `ai image`

```bash
# Базовое — aspect ratio и quality подставятся из дефолтов модели
ai image "Минималистичный логотип кофейни"

# С параметрами
ai image "Северное сияние" --aspect-ratio 3:2 --quality high -o aurora.png

# 4 картинки параллельно
ai image "Абстрактное искусство" -n 4 -p 4

# Любой параметр модели через --set
ai image "Пейзаж" -m black-forest-labs/flux.2-pro -s image_resolution=2K

# Посмотреть параметры модели
ai image --params
ai image --params -m black-forest-labs/flux.2-pro
```

**Опции:**

| Флаг | Описание |
|------|----------|
| `-m, --model` | Модель (по умолчанию: `openai/gpt-image-1.5`) |
| `-o, --output` | Путь для сохранения файла |
| `-n, --count` | Количество изображений |
| `--aspect-ratio` | Соотношение сторон (1:1, 16:9, ...) |
| `--quality` | Качество |
| `--size` | Размер (1024x1024, ...) |
| `-s, --set` | Любой параметр модели (`key=value`) |
| `-p, --concurrency` | Параллельная генерация |
| `--params` | Показать доступные параметры модели |
| `--json` | Машиночитаемый вывод |

### `ai video`

```bash
# Базовое
ai video "Таймлапс распускающегося цветка"

# С параметрами
ai video "Погоня на машинах" -m kling/v3 --duration 10 --aspect-ratio 16:9

# Любой параметр
ai video "Танец" -m kling/v3 -s mode=pro -s sound=true

# Посмотреть параметры
ai video --params -m kling/v3
```

**Опции:**

| Флаг | Описание |
|------|----------|
| `-m, --model` | Модель (по умолчанию: `kling/v2.5-turbo`) |
| `-o, --output` | Путь для сохранения файла |
| `-n, --count` | Количество видео |
| `--aspect-ratio` | Соотношение сторон |
| `--duration` | Длительность |
| `--resolution` | Разрешение (480p, 720p, 1080p) |
| `-s, --set` | Любой параметр модели (`key=value`) |
| `-p, --concurrency` | Параллельная генерация |
| `--params` | Показать доступные параметры модели |
| `--json` | Машиночитаемый вывод |

### `ai models`

```bash
# Все модели
ai models

# Фильтр по типу
ai models --type image
ai models --type video
ai models --type chat

# JSON для скриптов
ai models --type image --json
```

### `ai login` / `ai logout`

```bash
# Вход — откроется браузер, OAuth PKCE, никаких секретов в терминале
ai login

# Выход — удаление токена
ai logout
```

## Пайпы и скрипты

`ai` спроектирован для Unix-пайплайнов:

```bash
# Резюмировать файл
cat README.md | ai text "Сделай краткое саммари в 3 пунктах"

# Описать и сгенерировать
ai text "Опиши фэнтези-пейзаж" | ai image

# Цепочка с другими инструментами
ai text "Сгенерируй 10 тестовых email в виде JSON-массива" --no-stream --json | jq '.data.text'

# Пакетная генерация изображений из файла
while read prompt; do
  ai image "$prompt" -o "$(echo $prompt | tr ' ' '_').png"
done < prompts.txt
```

## Динамические параметры моделей

У каждой модели свои параметры. Вместо угадывания `ai` подтягивает их из API и кеширует локально:

```bash
$ ai image --params -m openai/gpt-image-1.5
Параметры модели openai/gpt-image-1.5:
  aspect_ratio (обязательный) [1:1, 2:3, 3:2]
  images — URL изображений для редактирования (до 16 шт.)
  quality (обязательный) [medium, high] default: medium

$ ai video --params -m kling/v3
Параметры модели kling/v3:
  aspect_ratio [16:9, 9:16, 1:1] default: 1:1
  duration (обязательный) — Длительность видео 3-15 секунд
  mode (обязательный) [std, pro] default: std
  sound (обязательный) [true, false] default: false
```

- **Дефолты подставляются автоматически** — обязательные параметры с дефолтами просто работают
- **Валидация до запроса** — неверные значения ловятся локально, а не на стороне API
- **Кеш на 1 час** в `~/.ai-cli/models-cache.json`
- **Именованные флаги маппятся автоматически** — `--aspect-ratio 16:9` → `aspect_ratio=16:9`
- **Запасной выход** — `-s key=value` для любого параметра

## JSON-режим

Каждая команда поддерживает `--json` для машиночитаемого вывода:

```json
{
  "ok": true,
  "data": {
    "text": "TypeScript — это типизированное надмножество JavaScript.",
    "model": "openai/gpt-4o",
    "usage": { "prompt_tokens": 12, "completion_tokens": 15, "total_tokens": 27 }
  }
}
```

Ошибки тоже в едином формате:

```json
{
  "ok": false,
  "error": { "code": "AUTH_ERROR", "message": "Неверный токен авторизации." }
}
```

## Коды выхода

| Код | Значение |
|-----|----------|
| `0` | Успех |
| `1` | Ошибка |
| `2` | Частичный успех (часть генераций не удалась) |

## Конфигурация

Конфиг хранится в `~/.ai-cli/config.json`:

```json
{
  "token": "pza_...",
  "userId": "...",
  "defaultModel": {
    "text": "anthropic/claude-sonnet-4",
    "image": "black-forest-labs/flux.2-pro",
    "video": "kling/v3"
  },
  "apiBaseUrl": "https://polza.ai/api/v1"
}
```

Укажите модели по умолчанию, чтобы не писать `-m` каждый раз.

## Доступные модели

**331 текстовая модель** — GPT-4o, GPT-5.5, Claude Sonnet/Opus, Gemini, Qwen, DeepSeek, Llama, Mistral и другие

**19 моделей изображений** — GPT Image, DALL-E, Flux, Seedream, YandexArt, Grok Imagine, Qwen Image

**15 моделей видео** — Sora, Kling, Veo, Seedance, Wan

Полный список: [polza.ai/models](https://polza.ai/models) или `ai models`

## Требования

- Node.js ≥ 20
- Аккаунт на [Polza AI](https://polza.ai)

## Лицензия

MIT
