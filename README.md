# Обложки клубов из пабликов ВК

## Что внутри

    src/api/vkGroups.ts                    запрос groups.getById пачкой + кэш
    src/components/club/ClubCover.tsx      компонент обложки
    src/components/club/ClubCover.css      стили
    supabase/migrations/021_club_cover.sql колонка cover_url + функция set_club_cover

## Порядок подстановки

1. Обложка сообщества (широкая, `cover.images` — самая крупная версия)
2. Если её нет — аватарка `photo_400`, потом `photo_200`
3. Если сообщество закрыто или ничего не отдало — наш зал `/assets/rooms/club-neon.png`

## Правки в ClubList.tsx

Вверху файла:

```tsx
import ClubCover from './ClubCover';
import './ClubCover.css';
import { supabase } from '../../api/supabase';
```

Внутри карточки клуба меняешь картинку. Было:

```tsx
<img src="/assets/rooms/club-neon.png" alt={club.title} />
```

Стало:

```tsx
<ClubCover
  vkGroupId={club.vk_group_id}
  cachedUrl={club.cover_url}
  alt={club.title}
  onResolved={(url) =>
    supabase.rpc('set_club_cover', { p_club_id: club.id, p_url: url })
  }
/>
```

Обёртке карточки добавь класс `club-card` — от него работает лёгкое
приближение картинки при наведении.

В запросе списка клубов не забудь вытащить новые поля:

```ts
.select('id, title, vk_group_id, cover_url, owner_name, online_count, now_playing')
```

## Миграция

```powershell
cd C:\vk-club
npx supabase db push
```

Или руками: открыть SQL Editor проекта `sghgkhljvgrvhmmkihkh` и выполнить
содержимое `supabase/migrations/021_club_cover.sql`.

## Как это работает

Все карточки списка складывают свои id в общую очередь и уходят одним
запросом `groups.getById` — сколько бы клубов ни было, обращение к VK API
будет одно. Результат кладётся в память на время сессии и через
`set_club_cover` сохраняется в базу, так что при следующем заходе список
рисуется сразу, без обращения к VK.

Токен запрашивается со `scope: ''` — публичные данные сообществ отдаются
без дополнительных прав, окна с разрешениями пользователь не увидит.
