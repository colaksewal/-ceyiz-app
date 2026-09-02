# Çeyiz Planlayıcı — Tasarım Dokümanı

## 1. Amaç

Gerçek bir çeyiz alışverişi problemini çözen, full-stack + mobil bir portföy projesi.
Sadece bir liste uygulaması değil: paylaşımlı liste yönetimi, mağaza gezerken anlık
fiyat/taksit toplama, set/paket fiyat karşılaştırması ve sorumlu şekilde entegre edilmiş
bir AI katmanı içerir.

**Hedef:** CV'de gerçek teknik derinlik gösteren, mülakatta detaylıca anlatılabilecek bir
proje — "AI kullandım" değil "her kararın gerekçesini biliyorum" hikayesi.

---

## 2. Temel özellikler

### 2.1 Liste, kategori, ürün yönetimi

Kullanıcı liste oluşturur, kategorilere (mutfak, yatak odası, salon, banyo vb.) ürün
ekler. Başlangıç şablonu manuel küratörlük ile seed veri olarak DB'ye konur; kullanıcı
isterse AI destekli kişiselleştirilmiş öneriyle de başlayabilir (bkz. 2.6).

### 2.2 Paylaşımlı liste

`LIST_SHARES` tablosu ile owner/editor/viewer rollerine dayalı yetkilendirme. Birden
fazla kişi (eş, anne, kayınvalide) aynı listeyi WebSocket (STOMP) üzerinden anlık
günceller.

### 2.3 Bütçe takibi

Planlanan bütçe vs kategori/ürün bazlı gerçek harcama karşılaştırması. Deterministik
hesaplama; AI katmanı bunun üzerine yorum ekler (bkz. 2.6).

### 2.4 Fiyat toplama aracı (mobil, asıl değer önerisi)

Mağazada gezerken:
1. Kullanıcı fiyat etiketinin/ürünün fotoğrafını çeker (kayıt olarak saklanır).
2. Ürün adı ve markayı **elle girer**.
3. Fiyatı, ödeme tipini (peşin/taksitli/elden kredi kartı), taksit sayısı/tutarını ve
   esnek ödeme planı notunu ("3 ay sonra 500 TL, kalanı 6 taksit") elle girer.
4. **Offline-first:** internet olmasa da kayıt local'de tutulur (local storage + sync
   queue), bağlantı gelince backend'e senkronize olur.

Bir ürün için birden fazla mağazadan fiyat notu tutulabilir (`PriceEntry`, 1 ürün : N
fiyat notu).

### 2.5 Set/paket karşılaştırma

"12 parça yemek takımı" gibi toplu setlerin, parça parça almaya göre mantıklı olup
olmadığının hesaplanması.

**Eşleştirme:** kullanıcı set içeriğini girerken autocomplete ile kendi listesindeki
mevcut ürünler arasında arama yapılır (`GET /lists/{listId}/products/search?query=...`).
Öneriyi onaylarsa `SetItem.product_id` o ürüne bağlanır. Onaylamazsa serbest metin +
tahmini fiyat girilir.

**Hangi fiyat kullanılır:** kullanıcı istediği fiyat notunu "bunu kullan" diye işaretler
(`PriceEntry.isPreferred`). İşaretli fiyat varsa o kullanılır; yoksa en düşük peşin fiyat
fallback olarak kullanılır. Bir üründe aynı anda yalnızca bir fiyat notu işaretli olabilir.

**Hesaplama (deterministik):**

```
her SetItem için:
  eğer product_id varsa:
    eğer o ürünün işaretli (isPreferred=true) bir PriceEntry'si varsa:
      birim_fiyat = o fiyat
    değilse:
      birim_fiyat = en düşük cash_price (fallback)
  değilse:
    birim_fiyat = estimated_individual_price (kullanıcı elle girdi)

  eğer birim_fiyat yoksa:
    missingItems++
  değilse:
    individualTotal += birim_fiyat × quantity

sonuç: set_price vs individualTotal, fark, missingItems sayısı
```

`missingItems > 0` olduğunda arayüz "N üründen M'si için fiyat verisi eksik" uyarısı
gösterir. AI burada kullanılmıyor.

### 2.6 AI katmanı — sadece iki net senaryo

AI, uygulamanın çekirdeği değil; deterministik backend'in üzerine eklenen, opsiyonel bir
yorum/öneri katmanı. Kullanıcı açıkça tetiklemeden hiçbir AI çağrısı yapılmaz.

**Senaryo 1 — Kişiselleştirilmiş liste önerisi:** ev tipi, bütçe, öncelikler girilir; AI
kategori bazlı bütçe dağılımı + örnek ürünler + kısa gerekçe döner. Kullanıcı aynen kabul
edebilir, düzenleyebilir ya da yok sayıp elle liste kurabilir.

**Senaryo 2 — Bütçe analizi:** kategori bazlı toplam harcanan/planlanan verisi **agregat**
halde AI'ya gönderilir, AI kullanıcının fark etmeyebileceği örüntüleri yorumlar.

**Mimari:** `AiController → AiService → AnthropicClient (WebClient) → Anthropic API`.
`AiService` controller'dan tamamen ayrı bir katman; sağlayıcı değişirse yalnızca bu katman
değişir.

**Tasarım ilkeleri:**
- Modelden yalnızca yapılandırılmış JSON istenir, doğrudan DTO'lara map edilir.
- Promptlar kod içine gömülmez, `resources/prompts/` altında versiyonlanır.
- Aynı girdi kombinasyonu cache'lenir (Caffeine/Redis, TTL ~7 gün), kullanıcı başına
  günlük çağrı limiti uygulanır (Bucket4j).
- AI çağrısı başarısız olursa uygulama çökmez — `Optional` döner, frontend seed şablona
  düşer. AI hiçbir zaman tek nokta arıza olmamalı.
- API key yalnızca backend'de; her çağrı backend üzerinden proxy'lenir.
- `AiService`, mock'lanabilir bir arayüze bağımlı tasarlanır (test edilebilirlik).

---

## 3. Teknoloji yığını

| Katman | Teknoloji |
|---|---|
| Backend | Spring Boot 3.x, Java 21, Spring Security (JWT), Spring Data JPA |
| Veritabanı | PostgreSQL |
| Migration | Flyway |
| Web frontend | React + TypeScript + Vite, React Query, Zustand |
| Mobil | React Native (Expo), monorepo (Turborepo/Nx) ile web ile ortak business logic |
| Gerçek zamanlı | WebSocket (STOMP) — paylaşımlı liste senkronizasyonu |
| AI (opsiyonel, düşük hacim) | Ayrı `AiService` katmanı, liste önerisi + bütçe analizi |
| DevOps | Docker + docker-compose, GitHub Actions (CI/CD). **Not:** geliştirme makinesinde
yerel bir Postgres kurulumu 5432 portunu kullandığı için, Docker Compose'daki Postgres
dış portu 5433'e taşındı (`5433:5432`) — container içi iletişim etkilenmedi, sadece
host makineden erişim (DBeaver vb.) artık 5433 üzerinden. |
| Test | JUnit + Mockito (backend), Jest + React Testing Library (frontend) |
| Deployment | Backend: Railway/Render · Frontend: Vercel/Netlify · DB: kendi Postgres container'ı |

---

## 4. Veritabanı şeması

```
USERS ──< LISTS ──< LIST_SHARES >── USERS
LISTS ──< CATEGORIES ──< PRODUCTS ──< PRICE_ENTRIES
LISTS ──< PRODUCT_SETS ──< SET_ITEMS >── PRODUCTS (opsiyonel eşleşme)
```

| Tablo | Önemli alanlar |
|---|---|
| USERS | id, email, name, created_at |
| LISTS | id, owner_id (FK), name, wedding_date, created_at |
| LIST_SHARES | id, list_id (FK), user_id (FK), role (owner/editor/viewer) |
| CATEGORIES | id, list_id (FK), name |
| PRODUCTS | id, category_id (FK), name, status |
| PRICE_ENTRIES | id, product_id (FK), store_name, price_type (PEŞİN/TAKSİTLİ/ELDEN_KREDİ_KARTI), cash_price, installment_count, installment_amount, payment_plan_note, photo_url, visited_at, **is_preferred** |
| PRODUCT_SETS | id, list_id (FK), name, store_name, set_price |
| SET_ITEMS | id, set_id (FK), product_id (FK, nullable), item_name, quantity, estimated_individual_price |

Ayrıntılı ER diyagramı sohbet içinde ayrıca oluşturuldu.

---

## 5. Yol haritası — genel bakış

| # | Aşama | Durum |
|---|---|---|
| 1 | Domain modelleme ve veritabanı şeması | ✅ Tamamlandı |
| 2 | İçerik/kapsam stratejisi | ✅ Tamamlandı |
| 3 | Docker Compose ortamı | ⬜ Sırada |
| 4 | Spring Boot backend çekirdeği | ✅ Çekirdek tamamlandı (kalanlar Faz 2) |
| 5 | React web arayüzü + paylaşım/realtime | 🔶 Çekirdek tamamlandı (paylaşım/WS Faz 2'de) |
| 6 | AI katmanı | ⬜ |
| 7 | React Native mobil uygulama | ⬜ |
| 8 | Test, CI/CD ve yayına alma | ⬜ |

---

## 6. İş tablosu — backend ile başlayarak

### Aşama 3 — Docker Compose ortamı ✅

| Görev | Ne işe yarar |
|---|---|
| ✅ Postgres servisi tanımla (docker-compose.yml) | Yerel veritabanı, tek komutla ayağa kalkar |
| ✅ `.env` dosyası ve `.env.example` oluştur | Sırların (DB şifresi, API key) koddan ayrılması |
| ✅ Backend servisini Dockerfile ile paketle | Backend'in container içinde çalışabilmesi |
| ✅ Frontend servisini Dockerfile ile paketle | Frontend'in container içinde çalışabilmesi |
| ✅ Servisler arası ağ/bağımlılık sırasını ayarla (depends_on, healthcheck) | Backend, DB hazır olmadan başlamasın |
| ✅ `docker compose up` ile uçtan uca test et | Ortamın gerçekten tek komutla çalıştığını doğrula |

### Aşama 4 — Spring Boot backend çekirdeği

| Görev | Ne işe yarar |
|---|---|
| ✅ Spring Initializr ile proje iskeletini oluştur (Web, JPA, Security, Postgres, Validation) | Temel bağımlılıklarla boş ama çalışan bir proje |
| ✅ Flyway kurulumu + ilk migration (şema) | Veritabanı şemasının versiyonlu, izlenebilir şekilde kurulması |
| ⬜ Seed data migration'ı (kategori/ürün şablonları) | Kullanıcı ilk açtığında boş ekranla karşılaşmasın |
| ✅ `User`, `TrousseauList`, `Category`, `Product`, `PriceEntry`, `ProductSet`, `SetItem` entity'lerini yaz | Veritabanı tablolarının Java tarafındaki karşılığı — tüm entity'ler tamamlandı |
| ✅ Repository katmanı (Spring Data JPA) — `UserRepository` | Veritabanına CRUD erişimi |
| ✅ Kullanıcı kayıt/giriş endpoint'leri + JWT üretimi/doğrulama + şifre hashleme | Kimlik doğrulamanın temeli |
| ✅ Spring Security konfigürasyonu — JWT doğrulama filtresi (`JwtAuthFilter`) ile gerçek endpoint koruması | Yetkisiz erişimi engellemek — token'sız istek 403, token'lı istek 200 olarak doğrulandı |
| ✅ Liste CRUD endpoint'leri (oluştur, kendi listelerini getir) | Uygulamanın temel işlevselliği — JWT'den kullanıcı kimliği okuma deseni burada kuruldu |
| ✅ Kategori CRUD endpoint'leri (yetki kontrolüyle: sadece liste sahibi ekleyebilir/görebilir) | Aynı deseni ürün için tekrarlamak, ayrıca owner/yetki kontrolü deseni burada kuruldu |
| ✅ Ürün CRUD endpoint'i (üç basamaklı yetki kontrolü: Product → Category → List → owner) | Liste → Kategori → Ürün zinciri tamamlandı |
| ✅ `PriceEntry` CRUD + "bunu kullan" (isPreferred) işaretleme endpoint'i | Fiyat toplama özelliğinin backend tarafı — dört basamaklı yetki zinciri (PriceEntry→Product→Category→List) kuruldu |
| 🔜 Faz 2: `LIST_SHARES` endpoint'leri (paylaşım, rol atama) | Paylaşımlı liste özelliğinin backend tarafı |
| ✅ `ProductSet`/`SetItem` CRUD + `SetComparisonService` — deterministik hesaplama mantığı | Set tanımlama, set kalemi ekleme (@Transactional ile), ve gerçek bir senaryoyla doğrulanmış set karşılaştırma (isPreferred fiyat + fallback + tahmini fiyat zinciri) |
| 🔜 Faz 2: Ürün arama/autocomplete endpoint'i (`/products/search`) | Set kalemi eşleştirme için (frontend'de kullanılacak) |
| 🔜 Faz 2: Set karşılaştırma endpoint'ine yetki kontrolü ekleme | Şu an `/api/sets/{setId}/comparison` owner kontrolü yapmıyor |
| 🔜 Faz 2: DTO'lar + MapStruct mapping | Elle yazılan `from(...)` metodları şimdilik yeterli |
| ✅ Global exception handling (`@ControllerAdvice`) | Tutarlı, okunabilir hata mesajları — IllegalArgumentException→404, SecurityException→403 olarak doğrulandı |
| 🔜 Faz 2: Swagger/OpenAPI dokümantasyonu | API'yi görsel olarak keşfedilebilir kılmak |
| 🔜 Faz 2: Temel birim testleri (özellikle `SetComparisonService` için) | İş mantığının doğruluğunu garanti altına almak |

### Aşama 5 — React web arayüzü + paylaşım/realtime

| Görev | Ne işe yarar |
|---|---|
| ✅ Vite + React + TypeScript proje kurulumu | Frontend'in temeli |
| ✅ Giriş/kayıt ekranları + JWT saklama | Kullanıcı kimlik doğrulaması — login/register artık ortak `axios` istemcisi (`lib/api.ts`) üzerinden çalışıyor; JWT `zustand` store + localStorage'da tutuluyor, 401 yanıtında otomatik logout+redirect var |
| ✅ Liste/kategori/ürün yönetim ekranları | Temel kullanıcı akışı — `ListsPage` → `ListDetailPage` (kategori CRUD) → `CategorySection` (ürün CRUD, genişler/daralır) → `ProductPage` (fiyat notları) |
| ✅ React Query ile API entegrasyonu | Sunucu verisinin cache/senkronizasyon yönetimi — tüm sayfalar `@tanstack/react-query` ile `useQuery`/`useMutation` kullanıyor |
| ✅ Fiyat notu ekleme formu | Fiyat toplama özelliğinin web tarafı — `ProductPage` içinde mağaza/ödeme tipi/peşin-taksit/not formu + "bunu kullan" (isPreferred) işaretleme |
| ✅ Set karşılaştırma ekranı | Set/paket özelliğinin görselleştirilmesi — `SetsPage`: set oluşturma (kalemler için listedeki ürünlerden seçim ya da serbest metin + tahmini fiyat), `SetComparisonView`: set vs parça parça toplam, fark, eksik ürün sayısı |
| 🔜 Faz 2: Paylaşım/izin yönetimi ekranı | Liste paylaşma arayüzü — backend'de `LIST_SHARES` endpoint'leri henüz yok (bkz. Aşama 4), bu yüzden frontend'i şimdilik eklenmedi |
| 🔜 Faz 2: WebSocket (STOMP) bağlantısı ve canlı güncelleme | Gerçek zamanlı senkronizasyon — backend'de WebSocket/STOMP konfigürasyonu henüz yok |

Not: Set kalemi eşleştirmesi için backend'deki `/products/search` autocomplete endpoint'i henüz olmadığından (🔜 Faz 2, Aşama 4), `SetsPage` şimdilik listenin tüm kategori/ürünlerini çekip bir seçim listesi (`getListProductOptions`) olarak sunuyor. Endpoint eklendiğinde bununla değiştirilebilir.

Uçtan uca doğrulama: tam yığın `docker compose up` ile ayağa kaldırılıp register → login → liste/kategori/ürün/fiyat notu oluşturma → "bunu kullan" işaretleme → set oluşturma (eşleşen ürün + serbest metin kalemi) → karşılaştırma endpoint'i, gerçek backend'e karşı curl ile doğrulandı; tüm payload/response şekilleri frontend tipleriyle eşleşiyor.

### Aşama 6 — AI katmanı

| Görev | Ne işe yarar |
|---|---|
| ⬜ `AnthropicClient` (WebClient tabanlı) | AI sağlayıcısıyla iletişim katmanı |
| ⬜ Prompt dosyalarını `resources/prompts/` altında oluştur | Versiyonlanabilir, test edilebilir promptlar |
| ⬜ `AiService` — liste önerisi metodu | Senaryo 1 |
| ⬜ `AiService` — bütçe analizi metodu | Senaryo 2 |
| ⬜ Cache katmanı (Caffeine) | Maliyet kontrolü |
| ⬜ Rate limiting (Bucket4j) | Kötüye kullanımı önleme |
| ⬜ Hata toleransı / fallback mantığı | AI çökse de uygulamanın ayakta kalması |
| ⬜ Frontend'de "Liste Öner" ve "Bütçe Analizi" butonları | Kullanıcının özelliği tetiklemesi |
| ⬜ `AiService` için mock'lu birim testleri | Gerçek API çağrısı yapmadan mantığı doğrulama |

### Aşama 7 — React Native mobil uygulama

| Görev | Ne işe yarar |
|---|---|
| ⬜ Monorepo kurulumu (Turborepo/Nx) | Web ve mobil arasında kod paylaşımı |
| ⬜ Expo proje kurulumu | RN geliştirme ortamı |
| ⬜ Giriş ve liste görüntüleme ekranları | Temel mobil akış |
| ⬜ Kamera ile fotoğraf çekme entegrasyonu | Fiyat etiketi/ürün fotoğrafı |
| ⬜ Fiyat notu ekleme formu (hızlı, 3 adımlı) | Mağazada anlık kullanım |
| ⬜ Local storage + sync queue | Offline-first çalışma |
| ⬜ Bağlantı gelince otomatik senkronizasyon | Offline kayıtların backend'e aktarılması |

### Aşama 8 — Test, CI/CD ve yayına alma

| Görev | Ne işe yarar |
|---|---|
| ⬜ Backend entegrasyon testleri | Uçtan uca doğruluk garantisi |
| ⬜ Frontend bileşen testleri (Jest + RTL) | UI davranışının doğruluğu |
| ⬜ GitHub Actions pipeline (test + build) | Her push'ta otomatik doğrulama |
| ⬜ Backend'i Railway/Render'a deploy et | Canlı, erişilebilir backend |
| ⬜ Frontend'i Vercel/Netlify'a deploy et | Canlı, erişilebilir web arayüzü |
| ⬜ README yaz (mimari diyagram, tech tablosu, demo linki, ekran görüntüleri) | CV'ye hazır sunum |

---

## 7. CV sunumu için notlar

README'de bulunması gerekenler: mimari diyagram, teknoloji tablosu, canlı demo linki,
ekran görüntüleri/GIF'ler.

Önerilen CV satırı:
> Spring Boot backend, React web ve React Native mobil istemcileriyle çok platformlu,
> gerçek zamanlı paylaşımlı liste yönetimi sunan full-stack uygulama; JWT auth, WebSocket
> senkronizasyonu, offline-first mobil veri toplama, sorumlu şekilde entegre edilmiş AI
> katmanı, CI/CD pipeline ve Docker containerization içerir.
