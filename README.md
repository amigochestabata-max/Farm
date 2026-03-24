# Farm Projesi

## Projeyi Çalıştırmak için

### 1. Klonla veya İndir
Projeyi klonlamak için:
```sh
git clone https://github.com/amigochestabata-max/Farm.git
cd Farm
```
Veya ZIP olarak indirip ayıkla.

### 2. Yerel Sunucu Başlat (Önerilen)
Service worker, manifest gibi dosyalar tarayıcıda düzgün çalışsın diye bir web sunucusu zorunludur. En pratik yol:

#### Python (en kolay)
```sh
python -m http.server 8000
```
Sonra tarayıcıda http://localhost:8000 adresini aç.

#### Node.js (alternatif)
```sh
npx serve .
```
veya başka bir web sunucu aracı.

### 3. `index.html` Dosyasını Aç
Sunucu üzerinden (adres satırına) veya doğrudan dosyaya çift tıkla (bazı özellikler çalışmayabilir).

## Dosya Yapısı
- `index.html` : Ana uygulama arayüzü
- `farmos_ai_v4.js` : Ana JavaScript dosyası
- `manifest.json` : PWA ayarları
- `sw.js` : Service Worker (offline desteği)
- `404.html` : Hata sayfası
- `README.md` : Proje belgesi

## Bilgi ve Notlar
- Modern tarayıcı kullanın (Chrome, Firefox, Edge).
- Sorun yaşarsanız lütfen hata mesajını veya ekran görüntüsünü ekleyin.

---
Proje sahibi: [amigochestabata-max](https://github.com/amigochestabata-max)