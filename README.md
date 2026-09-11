# Fabrika Durum ve Görev Panosu

Plane → Kestra → test/coder/reviewer → GitHub CI → yerel yayın pilotu.

Bu depo yalnız ürün kodunu ve CI tanımını içerir. Fabrikanın özel ayarları ve oturumları yerel makinededir. Uygulama salt okunur bir durum snapshot'ı gösterir; dosya yolu `FACTORY_STATUS_FILE` ile operatör tarafından verilir.

Geliştirme: `python -m venv .venv`, `.venv/bin/pip install -r requirements-dev.txt`, `npm ci`, `npm run build:css`, `.venv/bin/python -m pytest -q`.

Çalıştırma: `.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000`.

Tasarım: DDD/modül sorumlulukları, TDD ve bağımsız review. Erişilebilirlik kontrolleri tam bir WCAG uyum sertifikası değildir.

