# WhatsPulse - WhatsApp CRM & Anti-Ban SaaS Platform

WhatsPulse; harici Evolution API sunucusuna entegre çalışan, mobil öncelikli (PWA), Web Contact Picker API ve vCard/Excel ile telefon rehberini eşitleyebilen, BullMQ + Redis tabanlı akıllı anti-ban kuyruk motoruna sahip kurumsal bir WhatsApp mesajlaşma ve CRM platformudur.

## 🚀 Temel Özellikler

1. **Mobil Öncelikli PWA & Team Inbox**:
   - iOS ve Android için optimize edilmiş Bottom Navigation (Alt Navigasyon).
   - WhatsApp Web benzeri iki panelli canlı sohbet arayüzü, okundu ve iletildi çift tik bildirimleri.
   - `navigator.contacts.select` ile tek tıkla doğrudan telefon rehberinden kişi aktarma.
   - `.vcf` (vCard), `.xlsx` ve `.csv` dosyalarından toplu kişi ve grup içe aktarma.

2. **Evolution API Entegrasyonu**:
   - Canlı bağlantı ve QR Kod görüntüleme.
   - Tek tıkla WhatsApp kişi, grup ve sohbet geçmişini PostgreSQL veritabanına senkronize etme.
   - Webhook motoru ile gelen mesajları, `DELIVERY_ACK` ve `READ_ACK` durumlarını anlık işleme.

3. **Akıllı Anti-Ban Kuyruk Motoru (BullMQ + Redis)**:
   - Dinamik etiketli (`{isim}`, `{telefon}`, `{tarih}`, `{saat}`) ve medyalı şablon desteği.
   - 8-20 saniye rastgele insansı gecikme (Humanized delay).
   - Parti bazlı gönderim ve mola verme (ör: her 25 mesajda 60 sn mola).
   - Canlı kuyruk izleme, duraklatma, devam ettirme ve iptal kontrolleri.
   - **Otomatik Opt-Out Koruması**: "IPTAL", "STOP" yazan numaralar otomatik kara listeye eklenir ve ceza riski sıfırlanır.

4. **Dağıtım & Coolify**:
   - `docker-compose.coolify.yml` ile tek komutla Coolify üzerinde yayına alma.
   - Hedef Canlı Adres: `https://mesaj.cakirlar.net`
   - Varsayılan Giriş: `admin@whatspulse.com` / `Admin123!`
