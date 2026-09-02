# Çeyiz Planlayıcı

Tasarım detayları için bkz. `DESIGN.md`.

## Hızlı başlangıç (Aşama 3 — bu iskelet ile)

```bash
cp .env.example .env
# .env içindeki değerleri (özellikle şifre ve JWT_SECRET) kendi güvenli
# değerlerinle değiştir.

docker compose up --build
```

Ayağa kalktığında:
- Backend ping endpoint'i: http://localhost:8080/api/ping
- Frontend: http://localhost:5173 — ekranda backend bağlantı durumunu göreceksin.
- Postgres: localhost:5432 (kullanıcı adı/şifre `.env`'de)

Bu aşamada backend ve frontend sadece birbirine ve veritabanına ulaşabildiğini
kanıtlayan minimal bir iskelet. Gerçek özellikler (auth, CRUD, set karşılaştırma
vb.) Aşama 4 ve sonrasında bu temelin üzerine eklenecek — bkz. `DESIGN.md`
bölüm 6, iş tablosu.
