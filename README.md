# Fabrika Durum ve Görev Panosu

Plane → Kestra → test/coder/reviewer → GitHub CI → yerel yayın pilotu.

Bu depo yalnız ürün kodunu ve CI tanımını içerir. Fabrikanın özel ayarları ve oturumları yerel makinededir. Uygulama salt okunur bir durum snapshot'ı gösterir; dosya yolu `FACTORY_STATUS_FILE` ile operatör tarafından verilir.

Geliştirme: `python -m venv .venv`, `.venv/bin/pip install -r requirements-dev.txt`, `npm ci`, `npm run build`, `.venv/bin/python -m pytest -q`.

Çalıştırma: `.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000`.

Tasarım: DDD/modül sorumlulukları, TDD ve bağımsız review. Erişilebilirlik kontrolleri tam bir WCAG uyum sertifikası değildir.


## Adaptif UI ve katalog

`frontend/` ortak state, semantik HTML ve yalnız gerektiğinde yüklenen compact/wide sunumlarını içerir. Vite üretim paketini `app/dist` altına derler; FastAPI bu çıktıyı sunar. Eski tek dosyalı arayüz kaldırılmıştır. Pencere değişiminde filtre durumu ve odak korunur.

- Katalog: `npm run storybook` veya `npm run build:storybook`. Hikâyeler üretim bileşenini kullanır; kaynaklar bu depoda sürümlenir.
- Doğrulama: `npx playwright install chromium firefox webkit`, ardından `FACTORY_UI_SCOPE=full npm run test:ui`.
- Üretim modül grafiği ve gerçek ağ istekleri diğer profile ait JS/CSS'nin başlangıçta aktarılmadığını doğrular. Profil değişiminde ihtiyaç duyulan ek paket yüklenebilir.
- 320–1440 genişliklerde klavye/odak, reflow, axe, veri durumları ve profil geçişinde piksel karşılaştırması çalışır. İnsan WCAG denetimi veya gerçek cihaz sertifikasyonu değildir.
- Docker build frontend'i kendi Node aşamasında üretir; runtime yalnız Python ve derlenmiş ürünü içerir. Storybook prod'a girmez.

CI aynı üretim build'ini, Python testlerini, üç tarayıcı motorunu ve Storybook derlemesini doğrular. Ücretli katalog/test servisi gerekmez.
