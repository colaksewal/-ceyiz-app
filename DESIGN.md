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

**Mimari:** `AiController → AiService → AiClient (WebClient) → sağlayıcı API`.
`AiService` controller'dan tamamen ayrı bir katman; sağlayıcı değişirse yalnızca bu katman
değişir. Ücretli bir API yerine ücretsiz/self-host bir model (ör. Gemma, Ollama üzerinden)
kullanmak için bkz. §7.

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
| 3 | Docker Compose ortamı | ✅ Tamamlandı (yerel + Oracle Cloud sunucusunda) |
| 4 | Spring Boot backend çekirdeği | ✅ Çekirdek + paylaşım (`list_shares`) tamamlandı (kalanlar Faz 2) |
| 5 | React web arayüzü + paylaşım/realtime | 🔶 Çekirdek + "Aile" paylaşım ekranı tamamlandı (WS Faz 2'de, görsel yenileme Faz 3'te) |
| 6 | AI katmanı | 🔶 Senaryo 1 (liste önerisi) uçtan uca çalışıyor (kalanlar Faz 2) |
| 7 | React Native mobil uygulama | ⬜ |
| 8 | Test, CI/CD ve yayına alma | 🔶 Backend+frontend Oracle Cloud'a deploy edildi (testler/CI, domain+HTTPS Faz 3'te) |

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
| ✅ `ShareRole` enum + `ListShare` entity + repository | `list_shares` tablosuna Java tarafı bağlandı |
| ✅ Merkezi yetki kontrol servisi (`ListAccessService`) | `requireAtLeastViewer`/`requireAtLeastEditor`/`requireOwner` — owner + `list_shares` rolünü tek yerden değerlendiriyor |
| ✅ Mevcut 4 servisi merkezi yetki kontrolüne geçirme | `CategoryService`/`ProductService`/`PriceEntryService`/`ProductSetService` artık `ListAccessService` kullanıyor — editor ekleyip düzenleyebiliyor, viewer sadece görüntülüyor |
| ✅ `ListShareController`/`Service` — davet etme (e-posta ile), üye listeleme, rol değiştirme, çıkarma | Uçtan uca doğrulandı: curl ile (davet→üye listesi→görünürlük→rol değiştirme→çıkarma) ve tarayıcıdan "Aile" ekranı üzerinden test edildi |
| ✅ `ListService.getMyLists` paylaşılan listeleri de döndürüyor | Owner + `list_shares` birleştirilip her listenin rolüyle (`ListWithRole`) döndürülüyor — davet edilen kullanıcı listeyi kendi "Listelerim" sayfasında görebiliyor |
| ✅ `/api/auth/register` yanıtından `passwordHash` sızıntısını düzeltme | `UserResponse` DTO'su eklendi — entity artık doğrudan dönmüyor |
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
| ✅ "Aile" ekranı (paylaşım/izin yönetimi) | `ListSharesPage` — üye listesi (rol rozetleriyle), davet formu, rol değiştirme, çıkarma. Sadece owner yönetim butonlarını görüyor (JWT'den decode edilen `userId` ile kontrol ediliyor). Tarayıcıdan uçtan uca test edildi. `ListsPage`'de her liste satırında da rol rozeti gösteriliyor |
| 🔜 Faz 2: WebSocket (STOMP) bağlantısı ve canlı güncelleme | Gerçek zamanlı senkronizasyon — backend'de WebSocket/STOMP konfigürasyonu henüz yok |
| 🔜 Faz 3: Mevcut ekranların görsel yenilenmesi | `ListsPage`/`ListDetailPage`/`CategorySection`/`ProductPage` şu an fonksiyonel ama sade |

Not: Set kalemi eşleştirmesi için backend'deki `/products/search` autocomplete endpoint'i henüz olmadığından (🔜 Faz 2, Aşama 4), `SetsPage` şimdilik listenin tüm kategori/ürünlerini çekip bir seçim listesi (`getListProductOptions`) olarak sunuyor. Endpoint eklendiğinde bununla değiştirilebilir.

Uçtan uca doğrulama: tam yığın `docker compose up` ile ayağa kaldırılıp register → login → liste/kategori/ürün/fiyat notu oluşturma → "bunu kullan" işaretleme → set oluşturma (eşleşen ürün + serbest metin kalemi) → karşılaştırma endpoint'i, gerçek backend'e karşı curl ile doğrulandı; tüm payload/response şekilleri frontend tipleriyle eşleşiyor.

### Aşama 6 — AI katmanı

| Görev | Ne işe yarar |
|---|---|
| ✅ `AiClient` (WebClient tabanlı, sağlayıcıdan bağımsız arayüz) | AI sağlayıcısıyla iletişim katmanı |
| ✅ `OllamaClient` implementasyonu (ücretsiz self-host, bkz. §7) | Oracle Cloud'daki Ollama/gemma2:9b'ye bağlanıyor; Docker Compose ağı ile host arasındaki `host.docker.internal` + iptables sorunu çözüldü (bkz. §7.3) |
| ✅ Prompt dosyalarını `resources/prompts/` altında oluştur | `list-suggestion.txt` — versiyonlanabilir, test edilebilir promptlar |
| ✅ `AiService` — liste önerisi metodu | Senaryo 1 — uçtan uca doğrulandı: gerçek Ollama'ya karşı curl ile test edildi, doğru JSON şeması döndü |
| ⬜ `AiService` — bütçe analizi metodu | Senaryo 2 — DB şemasında "planlanan bütçe" alanı henüz yok, önce küçük bir migration gerekiyor. Faz 2'ye ertelendi |
| ⬜ Cache katmanı (Caffeine) | Maliyet kontrolü — Faz 2'ye ertelendi |
| ⬜ Rate limiting (Bucket4j) | Kötüye kullanımı önleme — Faz 2'ye ertelendi |
| ✅ Hata toleransı / fallback mantığı | `Optional` tabanlı: `AiClient.complete()` hiçbir zaman exception fırlatmaz, `AiController` AI kullanılamadığında `204 No Content` döner |
| ✅ Frontend'de "Liste Öner" butonu | `AiListSuggestion` component'i, `ListsPage`'e bağlandı — tarayıcıdan uçtan uca test edildi |
| ⬜ Frontend'de "Bütçe Analizi" butonu | Senaryo 2 backend'i bitince eklenecek |
| ⬜ `AiService` için mock'lu birim testleri | Gerçek API çağrısı yapmadan mantığı doğrulama — Faz 2'ye ertelendi |

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
| ✅ Backend'i deploy et | Railway/Render yerine kendi Oracle Cloud sunucumuza (bkz. §7) Docker Compose ile deploy edildi — `http://84.8.158.225:8080` |
| ✅ Frontend'i deploy et | Aynı sunucuda, Vite dev server container'ı olarak — `http://84.8.158.225:5173`. Not: prod build (nginx ile statik dosya servisi) henüz yok, şimdilik dev server yeterli |
| 🔜 Faz 3: Domain + HTTPS | Şu an düz IP:port ve HTTP — DuckDNS (ücretsiz alt alan adı) + Caddy (otomatik Let's Encrypt) ile `https://...duckdns.org` adresine geçilecek |
| ⬜ README yaz (mimari diyagram, tech tablosu, demo linki, ekran görüntüleri) | CV'ye hazır sunum |

---

## 7. Ek — Ücretsiz self-host AI altyapısı (Oracle Cloud + Ollama)

Aşama 6'daki AI katmanı için ücretli bir API (Anthropic/OpenAI vb.) yerine, açık kaynak
bir modeli (ör. **Gemma**) kendi barındırdığımız bir sunucuda çalıştırmak istersek
izlenecek yol budur. `AiService` zaten sağlayıcıdan bağımsız tasarlandığından (bkz. 2.6),
bu sadece `AiClient` arayüzüne yeni bir implementasyon (`OllamaClient`) eklemek anlamına
gelir; prompt'lar ve iş mantığı değişmez.

### 7.1 Neden Oracle Cloud

- **Always Free, süresiz kota** (deneme kredisi değil): 4 OCPU + 24 GB RAM'e kadar
  Ampere A1 (ARM) instance. Diğer büyük sağlayıcıların (AWS/GCP/Azure) her zaman ücretsiz
  katmanları genelde ~1GB RAM ile sınırlı — bir LLM çalıştırmaya yetmiyor. 24GB RAM,
  `gemma2:9b` gibi modelleri (quantized haliyle ~6-9GB RAM ister) rahatça çalıştırır.
- 200GB'a kadar blok depolama da ücretsiz kotaya dahil.
- Kaynak: https://www.oracle.com/cloud/free/

### 7.2 Adım adım kurulum

1. **Hesap aç.** oracle.com/cloud/free üzerinden kayıt ol. Kredi kartı doğrulaması
   istenir ama Always Free kaynaklar için ücretlendirme yapılmaz.
2. **Compute instance oluştur.** Console → *Compute → Instances → Create Instance*:
   - Image: Ubuntu 22.04 (ARM uyumlu)
   - Shape: `VM.Standard.A1.Flex` (Ampere ailesi), 4 OCPU / 24GB RAM (Always Free limiti)
   - SSH anahtar çifti oluştur/yükle
   - Not: bazı region/AD'lerde A1 kapasitesi anlık dolu olabilir; hata alırsan birkaç kez
     dene ya da farklı Availability Domain seç.
3. **Güvenlik kuralları ayarla.** VCN → Security Lists içinde:
   - SSH (22) — yalnızca kendi IP'ne açık
   - Backend HTTP portu (ör. 8080) — dışa açık
   - Ollama portu (11434) — **dışa açma**; backend aynı VM'de olacağı için yalnızca
     `localhost` üzerinden erişilecek (Ollama'nın kendi auth mekanizması yok, dışa açık
     bırakmak başkalarının senin ücretsiz kotanı kullanmasına yol açar)
4. **SSH ile bağlan:** `ssh -i <private_key> ubuntu@<instance_public_ip>`
5. **Ollama kur:**
   ```
   curl -fsSL https://ollama.com/install.sh | sh
   ```
   Kaynak: https://ollama.com/download/linux
6. **Modeli çek:**
   ```
   ollama pull gemma2:9b
   ```
   RAM'i zorlarsa daha hafif `gemma2:2b` alternatifi kullanılabilir.
   Model kartı/boyutları: https://ollama.com/library/gemma2
7. **Test et:**
   ```
   ollama run gemma2:9b "Merhaba, kendini tanıt"
   ```
8. **Kalıcılığı doğrula.** Kurulum Ollama'yı systemd servisi olarak ayarlar
   (`systemctl status ollama`) — VM yeniden başlasa da otomatik ayağa kalkar.
9. **Backend'i aynı VM'e kur.**
   - Docker + Docker Compose kur: https://docs.docker.com/engine/install/ubuntu/
   - Repoyu VM'e çek (`git clone ...`), `.env` dosyasını doldur
   - `docker compose up -d --build`
   - `OllamaClient`'ı `http://localhost:11434/api/chat` adresine işaret et
   - API formatı için kaynak: https://github.com/ollama/ollama/blob/main/docs/api.md
10. **Domain/HTTPS (opsiyonel, CV/canlı demo için önerilir).** Instance'a bir domain
    bağlayıp Caddy ile otomatik ücretsiz Let's Encrypt sertifikası almak mümkün:
    https://caddyserver.com/docs/quick-starts/https

### 7.3 Backend container'ının host'taki Ollama'ya erişimi (çözülmüş sorun)

Backend, `docker-compose` ile ayrı bir container'da; Ollama ise host'ta (VM'in kendisinde)
systemd servisi olarak çalışıyor. İkisi arasında bağlantı kurarken iki ayrı sorunla
karşılaşıldı, ikisi de çözüldü:

1. **Ollama sadece `127.0.0.1`'i dinliyordu.** Varsayılan kurulum host'un kendisinden
   gelen istekleri kabul ediyor, container'dan gelenleri kabul etmiyordu. Çözüm:
   `sudo systemctl edit ollama.service` ile `Environment="OLLAMA_HOST=0.0.0.0:11434"`
   eklenip servis yeniden başlatıldı — artık tüm arayüzlerden dinliyor.
2. **`host.docker.internal` yanlış ağın gateway'ine işaret ediyordu.** Docker'daki
   `host-gateway` özel değeri her zaman varsayılan `docker0` bridge'ine (`172.17.0.1`)
   çözülüyor — `docker-compose`'un kendi oluşturduğu özel ağa (`ceyiz-app_default`,
   `172.18.0.0/16`) değil. Container bu IP'ye ulaşmaya çalıştığında host'un iptables
   `INPUT` zincirindeki genel `REJECT` kuralına takılıyordu (`Host is unreachable`).
   Çözüm: `sudo iptables -I INPUT -p tcp -s 172.16.0.0/12 --dport 11434 -j ACCEPT` ile
   Docker'ın kullandığı tüm özel IP aralığından (`172.16.0.0/12`) gelen 11434 trafiğine
   izin verildi — internetten hâlâ tamamen kapalı (Security List'te hiç açılmadı),
   sadece host'un kendi Docker ağları erişebiliyor.

`docker-compose.yml`'de backend servisine `extra_hosts: ["host.docker.internal:host-gateway"]`
eklenmesi gerekiyor (bu olmadan `host.docker.internal` hiç çözülmez).

### 7.4 Kaynaklar

- Oracle Cloud Always Free: https://www.oracle.com/cloud/free/
- Oracle Ampere A1 shape dokümantasyonu: https://docs.oracle.com/en-us/iaas/Content/Compute/References/computeshapes.htm
- Ollama resmi site ve kurulum: https://ollama.com
- Ollama model kütüphanesi (Gemma dahil): https://ollama.com/library
- Ollama REST API referansı: https://github.com/ollama/ollama/blob/main/docs/api.md
- Docker Engine kurulumu (Ubuntu): https://docs.docker.com/engine/install/ubuntu/
- Caddy (otomatik HTTPS): https://caddyserver.com/docs/quick-starts/https

---

## 8. CV sunumu için notlar

README'de bulunması gerekenler: mimari diyagram, teknoloji tablosu, canlı demo linki,
ekran görüntüleri/GIF'ler.

Önerilen CV satırı:
> Spring Boot backend, React web ve React Native mobil istemcileriyle çok platformlu,
> gerçek zamanlı paylaşımlı liste yönetimi sunan full-stack uygulama; JWT auth, WebSocket
> senkronizasyonu, offline-first mobil veri toplama, sorumlu şekilde entegre edilmiş AI
> katmanı, CI/CD pipeline ve Docker containerization içerir.
