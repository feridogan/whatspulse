# WhatsPulse - Kurulum, Geliştirme ve Dağıtım Raporu

WhatsPulse WhatsApp Mesaj, Şablon ve İletişim SaaS Platformunun mimarisi, mobil öncelikli arayüzü, Evolution API entegrasyonu, BullMQ Anti-Ban motoru ve Docker Compose yapılandırması başarıyla tamamlanmış ve GitHub reposuna pushlanmıştır.

---

## 🔗 Entegrasyon ve Erişim Bilgileri

- **GitHub Deposu**: [https://github.com/feridogan/whatspulse.git](https://github.com/feridogan/whatspulse.git) (`main` branch)
- **Hedef Canlı Domain**: [https://mesaj.cakirlar.net](https://mesaj.cakirlar.net)
- **Varsayılan Yönetici Girişi**:
  - **E-Posta**: `admin@whatspulse.com`
  - **Şifre**: `Admin123!`
- **Harici Evolution API**: `http://10.0.201.201:3800` (Instance: `sedat2`)
  - **Instance Key**: `CC3C74FD6208-4756-87F3-133CFA796603`
  - **Global Key**: `16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824`

---

## 🛠️ Tamamlanan Modüller ve Mimari

### 1. Mobil Öncelikli & PWA Arayüzü (Next.js 14 App Router + Tailwind CSS)
- **PWA Desteği**: `manifest.json`, `sw.js` ve mobil tam ekran (standalone) web uygulaması desteği.
- **Alt Navigasyon Barı (Bottom Navigation)**: Mobil cihazlarda tek elle hızlı kullanım için Pano, Canlı Sohbet, Rehber, Kampanyalar, Şablonlar ve Ayarlar sekmeleri.
- **Web Contact Picker API**: Destekleyen mobil tarayıcılarda tek tıkla doğrudan telefonun kendi rehberini açarak kişi seçme ve panele aktarma (`navigator.contacts.select`).
- **vCard (.vcf) & Excel (.xlsx / .csv) Ayrıştırıcı**: Sürükle-bırak dosya yükleme ve grup eşleştirme desteği.

### 2. Canlı Sohbet & Team Inbox
- WhatsApp Web benzeri iki panelli (mobilde duyarlı tek panelli) canlı gelen kutusu.
- Anlık mesajlaşma, şablon seçerek hızlı yanıt verme, görsel/medya iletimi.
- Çift tik okundu (`READ`) ve iletildi (`DELIVERED`) durum göstergeleri.
- Tek tıkla kişiyi engelleme / kara listeye ekleme.

### 3. WhatsApp Evolution API Entegrasyonu & 1-Tık Eşitleme
- Harici Evolution API (`sedat2` instance) bağlantı durumu ve anlık QR kod üretme/görüntüleme.
- **Tek Tıkla Senkronizasyon (1-Click Sync)**: WhatsApp üzerindeki tüm kişileri, grupları ve son sohbetleri WhatsPulse PostgreSQL veritabanına otomatik çekme.
- **Webhook Motoru**: `/api/webhook/evolution` uç noktası ile gelen mesajları, teslim ve okundu bildirimlerini anlık işleme.

### 4. Akıllı Anti-Ban Kuyruk Motoru (BullMQ + Redis)
- Dinamik değişkenli (`{isim}`, `{telefon}`, `{tarih}`, `{saat}`, `{sirket}`, `{ozel_1}`) şablon motoru ve canlı telefon önizlemesi.
- **İnsansı Gecikme (Humanized Delay)**: Mesajlar arasında 8 - 20 saniye rastgele bekleme.
- **Parti Bazlı Gönderim**: Örn. her 25 mesajda bir 60 saniye dinlenme molası.
- **Otomatik Opt-Out Koruması**: "IPTAL", "STOP", "RED", "ÇIK" yazan kişileri otomatik olarak kara listeye alarak ceza ve ban riskini sıfırlama.

### 5. PostgreSQL & Prisma ORM
- `User`, `Contact`, `Group`, `ContactGroup`, `Template`, `Campaign`, `Message`, `Chat`, `ChatMessage`, `Blacklist`, `Setting` modelleri.
- Otomatik seed betiği ile hazır admin hesabı, varsayılan ayarlar ve örnek şablonlar.

### 6. Coolify & Docker Compose Dağıtımı
- `Dockerfile` (Next.js Multi-stage build)
- `Dockerfile.worker` (BullMQ Anti-Ban Queue Worker)
- `entrypoint.sh` (Otomatik veritabanı push ve seed)
- `docker-compose.coolify.yml` (App, Worker, PostgreSQL 16, Redis 7 ve Traefik `mesaj.cakirlar.net` etiketleri)

---

## 🚀 Coolify Panelinden Dağıtım Adımları

GitHub reposu (`https://github.com/feridogan/whatspulse.git`) hazır olduğundan, Coolify panelinde (`https://coolify.cakirlar.net`) aşağıdaki 1 dakikalık adımla yayına alabilirsiniz:

1. **Coolify Paneline Giriş Yapın**: `https://coolify.cakirlar.net`
2. **Yeni Kaynak Ekleyin**:
   - `Projects` > İlgili Projenizi seçin > `+ New Resource`
   - **Docker Compose** veya **Public Repository** seçeneğini seçin.
   - Repository URL: `https://github.com/feridogan/whatspulse.git` (Branch: `main`)
   - Docker Compose Konumu: `docker-compose.coolify.yml`
3. **Domain / FQDN Tanımı**:
   - `https://mesaj.cakirlar.net`
4. **Deploy Butonuna Basın**:
   - Coolify tüm servisleri (`app`, `worker`, `postgres`, `redis`) ayağa kaldıracak, SSL sertifikasını otomatik oluşturacak ve `https://mesaj.cakirlar.net` üzerinden yayına başlayacaktır.
