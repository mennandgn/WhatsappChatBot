"""
seed_master_flow.py
Bilgisayar Mühendisliği Bölüm Asistanı Master Akışını
öğrencilerin karşılaşabileceği tüm soruları kapsayacak şekilde
eksiksiz, profesyonel ve resmi verilerle inşa eder.
"""

import json
from app.database import SessionLocal
import app.models as models

def build_master_flow():
    nodes = []
    edges = []

    def make_edge(src, tgt, opt_idx=None):
        edge_id = f"e_{src}_{tgt}"
        if opt_idx is not None:
            edge_id += f"_opt_{opt_idx}"
            return {
                "id": edge_id,
                "source": src,
                "target": tgt,
                "sourceHandle": f"opt-{opt_idx}",
                "type": "smoothstep",
                "animated": True,
                "style": {"stroke": "#6366f1", "strokeWidth": 2},
                "markerEnd": {"type": "arrowclosed", "color": "#6366f1"}
            }
        return {
            "id": edge_id,
            "source": src,
            "target": tgt,
            "type": "smoothstep",
            "animated": True,
            "style": {"stroke": "#6366f1", "strokeWidth": 2},
            "markerEnd": {"type": "arrowclosed", "color": "#6366f1"}
        }

    # =========================================================================
    # 0. BAŞLANGIÇ & ANA MENÜ (x: 200)
    # =========================================================================
    nodes.append({
        "id": "node_ceng_start",
        "type": "custom",
        "position": {"x": 200, "y": 100},
        "data": {
            "type": "startNode",
            "label": "Giriş Karşılama",
            "message": "👋 Merhaba! Adıyaman Üniversitesi Bilgisayar Mühendisliği Bölümü Resmi Danışman Asistanına hoş geldiniz.\n\nAkademik süreçler, staj, sınavlar, ÇAP, dersler ve laboratuvarlar hakkındaki tüm sorularınıza resmi mevzuat ve yönergeler doğrultusunda anında yardımcı olabilirim."
        }
    })

    main_menu_options = [
        "💻 CENG Stajı (Zorunlu Esaslar)",
        "💼 Uygulamalı Mühendislik (UME)",
        "📚 CENG Dersleri & Müfredat",
        "📝 Sınav, Not & Mazeret Yönetmeliği",
        "🎓 Bitirme Tezi (CENG401/402)",
        "🔄 ÇAP, Yandal, Yatay Geçiş & DGS",
        "🌍 Erasmus & Değişim Programları",
        "☀️ Yaz Okulu Esasları",
        "🧪 Laboratuvarlar, Eduroam & Lisanslar",
        "🏢 Bölüm Sekreterliği & İletişim"
    ]

    nodes.append({
        "id": "node_ceng_main_menu",
        "type": "custom",
        "position": {"x": 200, "y": 380},
        "data": {
            "type": "buttonReply",
            "label": "Ana Menü",
            "message": "👇 Lütfen bilgi almak istediğiniz Bilgisayar Mühendisliği konusunu seçiniz:",
            "options": main_menu_options
        }
    })
    edges.append(make_edge("node_ceng_start", "node_ceng_main_menu"))

    # =========================================================================
    # 1. CENG STAJI (x: 800)
    # =========================================================================
    nodes.append({
        "id": "node_ceng_staj_menu",
        "type": "custom",
        "position": {"x": 800, "y": 80},
        "data": {
            "type": "buttonReply",
            "label": "Staj Menüsü",
            "message": "💻 *Bilgisayar Mühendisliği Zorunlu Staj İşlemleri:*\n\nBölümümüzde stajlar Donanım ve Yazılım olmak üzere 2 aşamada yapılır. Detaylı bilgi için bir başlık seçiniz:",
            "options": [
                "Staj Süresi (Kaç Gün & Dağılım?)",
                "Staj Defteri Kılavuzu & Teslim (PDF)",
                "SGK Sigortası & Devamsızlık Sınırı",
                "1. Sınıfta Staj Yapılır mı?",
                "Cumartesi & Uzaktan Çalışma Kuralı"
            ]
        }
    })
    edges.append(make_edge("node_ceng_main_menu", "node_ceng_staj_menu", 0))

    nodes.append({
        "id": "node_ceng_staj_1",
        "type": "custom",
        "position": {"x": 1150, "y": 40},
        "data": {
            "type": "linkButton",
            "label": "Staj Esasları (URL)",
            "message": "📅 *Staj Süresi ve Şartları:*\n\n• Toplam zorunlu staj süresi **40 iş günüdür**.\n• Staj 2 eşit parçaya bölünür: **20 gün Donanım/Sistem/Ağ**, **20 gün Yazılım/Veritabanı**.\n• Öğrenci en erken **4. yarıyılın (2. sınıfın) sonunda** stajına başlayabilir.\n• Kurumda en az 1 Bilgisayar/Yazılım/Elektrik-Elektronik Mühendisi bulunması zorunludur.",
            "buttonText": "Resmi Staj Yönergesini Aç 🌐",
            "url": "https://muhendislik.adiyaman.edu.tr/tr/bolumler/bilgisayar-muhendisligi/staj-esaslari"
        }
    })
    edges.append(make_edge("node_ceng_staj_menu", "node_ceng_staj_1", 0))

    nodes.append({
        "id": "node_ceng_staj_2",
        "type": "custom",
        "position": {"x": 1150, "y": 240},
        "data": {
            "type": "sendMedia",
            "label": "Staj Defteri (PDF)",
            "message": "📑 *Staj Defteri ve Mülakat Süreci:*\n\n• Staj defteri her iş günü için teknik detaylarla doldurulmalı ve yetkili mühendise kaşeletilip imzalatılmalıdır.\n• Defterler takip eden Güz döneminin **ilk 4 haftası içinde** Bölüm Staj Komisyonuna teslim edilir.\n• Komisyon her öğrenciyle sözlü mülakat yaparak stajı KABUL / RET olarak onaylar.",
            "mediaUrl": "https://muhendislik.adiyaman.edu.tr/tr/bolumler/bilgisayar-muhendisligi/staj-defteri-klavuzu.pdf",
            "mediaType": "document"
        }
    })
    edges.append(make_edge("node_ceng_staj_menu", "node_ceng_staj_2", 1))

    nodes.append({
        "id": "node_ceng_staj_3",
        "type": "custom",
        "position": {"x": 1150, "y": 440},
        "data": {
            "type": "textMessage",
            "label": "Devamsızlık & Sigorta",
            "message": "🛡️ *SGK Sigortası & Devamsızlık:* \n\n• Staj süresince 'İş Kazası ve Meslek Hastalığı Sigortası' primleri **Üniversite Rektörlüğü tarafından ödenir**.\n• Staj süresince devamsızlık oranı en fazla **%10 (yani 2 gün)** olabilir. Sağlık raporu olsa dahi 2 günü aşan devamsızlıklarda telafi yapılması zorunludur."
        }
    })
    edges.append(make_edge("node_ceng_staj_menu", "node_ceng_staj_3", 2))

    nodes.append({
        "id": "node_ceng_staj_4",
        "type": "custom",
        "position": {"x": 1150, "y": 640},
        "data": {
            "type": "textMessage",
            "label": "1. Sınıf Staj",
            "message": "⚠️ *1. Sınıfta Staj Yapılabilir mi?*\n\n• **HAYIR.** Bölüm Staj Yönergesi gereğince 1. sınıf (ilk 2 yarıyıl) sonunda zorunlu staj yapılamaz.\n• Staj yapabilmek için 4. yarıyıl derslerini tamamlamış olmak esastır."
        }
    })
    edges.append(make_edge("node_ceng_staj_menu", "node_ceng_staj_4", 3))

    nodes.append({
        "id": "node_ceng_staj_5",
        "type": "custom",
        "position": {"x": 1150, "y": 840},
        "data": {
            "type": "textMessage",
            "label": "Cumartesi Stajı",
            "message": "🏢 *Cumartesi ve Pazar Günleri Staj:*\n\n• Pazar günleri ve resmi bayram tatillerinde staj yapılamaz.\n• Cumartesi günleri ise, yalnızca ilgili kurumun **haftada 6 gün fiilen çalıştığına dair resmi onaylı yazı vermesi durumunda** staj gününden sayılır."
        }
    })
    edges.append(make_edge("node_ceng_staj_menu", "node_ceng_staj_5", 4))

    # =========================================================================
    # 2. UYGULAMALI MÜHENDİSLİK EĞİTİMİ (UME / 7+1) (x: 1550)
    # =========================================================================
    nodes.append({
        "id": "node_ceng_ume_menu",
        "type": "custom",
        "position": {"x": 1550, "y": 80},
        "data": {
            "type": "buttonReply",
            "label": "UME Menüsü",
            "message": "💼 *Uygulamalı Mühendislik Eğitimi (UME - 7+1 Modeli):*\n\nSon sınıf öğrencilerimizin mezun olmadan önce tam zamanlı sektör deneyimi kazandığı 1 dönemlik programdır. İlgilendiğiniz konuyu seçiniz:",
            "options": [
                "UME Nedir & Süresi?",
                "Başvuru & Portal (ume.adiyaman.edu.tr)",
                "UME'nin Stajdan Farkı Nedir?",
                "Öğrenci Ücreti & SGK Sigortası",
                "Değerlendirme & Dönem Notu"
            ]
        }
    })
    edges.append(make_edge("node_ceng_main_menu", "node_ceng_ume_menu", 1))

    nodes.append({
        "id": "node_ceng_ume_1",
        "type": "custom",
        "position": {"x": 1900, "y": 40},
        "data": {
            "type": "textMessage",
            "label": "UME Nedir & Süresi",
            "message": "⏳ *UME Nedir ve Ne Zaman Yapılır?*\n\n• UME, lisans eğitiminin **8. yarıyılında (son sınıfın Bahar dönemi)** tam 14 hafta boyunca haftada 5 iş günü tam zamanlı uygulanır.\n• Öğrenci bu dönemde fakültede teorik ders almaz, doğrudan AR-GE merkezleri, teknokent firmaları veya kurumsal yazılım şirketlerinde mühendis olarak çalışır."
        }
    })
    edges.append(make_edge("node_ceng_ume_menu", "node_ceng_ume_1", 0))

    nodes.append({
        "id": "node_ceng_ume_2",
        "type": "custom",
        "position": {"x": 1900, "y": 240},
        "data": {
            "type": "linkButton",
            "label": "UME Portalı (URL)",
            "message": "🌐 *UME Başvuru Portalı ve Koşulları:*\n\n• Başvurular resmi UME portalı üzerinden protokol imzalanmış firmalara yapılır.\n• **Şartlar:** AGNO en az 2.00 olmalı, alttan ders yükü UME'yi aksatmayacak düzeyde olmalıdır.",
            "buttonText": "UME Portalına Git (ume.adiyaman.edu.tr) 🚀",
            "url": "https://ume.adiyaman.edu.tr"
        }
    })
    edges.append(make_edge("node_ceng_ume_menu", "node_ceng_ume_2", 1))

    nodes.append({
        "id": "node_ceng_ume_3",
        "type": "custom",
        "position": {"x": 1900, "y": 440},
        "data": {
            "type": "textMessage",
            "label": "Stajdan Farkı",
            "message": "⚖️ *UME'nin Yaz Stajından Farkı:*\n\n1. Staj tatilde 20+20 iş günüdür; UME ise eğitim-öğretim dönemi içinde **tam 14 hafta (30 AKTS)** sürer.\n2. UME ders yerine geçer ve transkriptte kredili ders olarak harf notu üretir.\n3. UME mezuniyet öncesi doğrudan iş teklifi alma olanağı sunar."
        }
    })
    edges.append(make_edge("node_ceng_ume_menu", "node_ceng_ume_3", 2))

    nodes.append({
        "id": "node_ceng_ume_4",
        "type": "custom",
        "position": {"x": 1900, "y": 640},
        "data": {
            "type": "textMessage",
            "label": "Ücret & SGK",
            "message": "💰 *UME Ücreti & Sigorta:* \n\n• 3308 Sayılı Kanun gereğince UME yapan öğrencilere net asgari ücretin en az **üçte biri (1/3)** oranında ücret ödenir (işletme ve devlet katkısıyla).\n• SGK primleri stajda olduğu gibi üniversite tarafından karşılanır."
        }
    })
    edges.append(make_edge("node_ceng_ume_menu", "node_ceng_ume_4", 3))

    nodes.append({
        "id": "node_ceng_ume_5",
        "type": "custom",
        "position": {"x": 1900, "y": 840},
        "data": {
            "type": "textMessage",
            "label": "Raporlama & Not",
            "message": "📝 *Değerlendirme Sistemi:*\n\n• Öğrenci haftalık faaliyet raporu hazırlar.\n• Firma mentörü ve bölüm UME koordinatörü öğretim üyesi ortak puanlama yapar.\n• Dönem sonunda yapılan sunum ile harf notu kesinleşir."
        }
    })
    edges.append(make_edge("node_ceng_ume_menu", "node_ceng_ume_5", 4))

    # =========================================================================
    # 3. CENG DERSLERİ, MÜFREDAT & ÖNKOŞULLAR (x: 2300)
    # =========================================================================
    nodes.append({
        "id": "node_ceng_ders_menu",
        "type": "custom",
        "position": {"x": 2300, "y": 80},
        "data": {
            "type": "buttonReply",
            "label": "Dersler Menüsü",
            "message": "📚 *Bilgisayar Mühendisliği Müfredat ve Ders Yönetimi:*\n\nToplam 240 AKTS'lik lisans ders programımız, önkoşullar ve kayıt kuralları hakkında bilgi almak için seçim yapınız:",
            "options": [
                "1. ve 2. Sınıf Dersleri & Müfredat (URL)",
                "3. ve 4. Sınıf Uzmanlaşma Dersleri",
                "Önkoşullu Dersler Listesi",
                "Üstten Ders Alma Şartı (AGNO 3.00)",
                "Teknik ve Sosyal Seçmeli Dersler"
            ]
        }
    })
    edges.append(make_edge("node_ceng_main_menu", "node_ceng_ders_menu", 2))

    nodes.append({
        "id": "node_ceng_ders_1",
        "type": "custom",
        "position": {"x": 2650, "y": 40},
        "data": {
            "type": "linkButton",
            "label": "1-2. Sınıf Müfredatı (URL)",
            "message": "💻 *1. ve 2. Sınıf Temel Dersleri:*\n\n• Algoritma ve Programlama I-II (C/C++), Bilgisayar Mühendisliğine Giriş, Fizik I-II, Matematik I-II, Diferansiyel Denklemler.\n• Veri Yapıları, Nesneye Yönelik Programlama (Java/C#), Sayısal Mantık Tasarımı, Ayrık Matematik, Elektrik Devre Temelleri.",
            "buttonText": "Tüm CENG Müfredatını İncele (Resmi) 📖",
            "url": "https://muhendislik.adiyaman.edu.tr/tr/bolumler/bilgisayar-muhendisligi/mufredat-ve-ders-planlari"
        }
    })
    edges.append(make_edge("node_ceng_ders_menu", "node_ceng_ders_1", 0))

    nodes.append({
        "id": "node_ceng_ders_2",
        "type": "custom",
        "position": {"x": 2650, "y": 240},
        "data": {
            "type": "textMessage",
            "label": "3-4. Sınıf Dersleri",
            "message": "🚀 *3. ve 4. Sınıf İleri Seviye Dersleri:*\n\n• Algoritma Analizi, İşletim Sistemleri, Bilgisayar Mimarisi ve Organizasyonu, Veritabanı Yönetim Sistemleri (SQL/NoSQL).\n• Bilgisayar Ağları, Yazılım Mühendisliği, Mikroişlemciler, Siber Güvenlik Temelleri, Yapay Zekaya Giriş, CENG401/402 Bitirme Projesi."
        }
    })
    edges.append(make_edge("node_ceng_ders_menu", "node_ceng_ders_2", 1))

    nodes.append({
        "id": "node_ceng_ders_3",
        "type": "custom",
        "position": {"x": 2650, "y": 440},
        "data": {
            "type": "textMessage",
            "label": "Önkoşullu Dersler",
            "message": "🔗 *Kritik Önkoşul Zinciri:*\n\n1. **Algoritma II:** Algoritma I dersinden en az DD veya şartlı geçmiş olmayı gerektirir.\n2. **Nesneye Yönelik Programlama:** Algoritma ve Programlama II önkoşuludur.\n3. **Algoritma Analizi:** Veri Yapıları önkoşuludur.\nÖnkoşul dersi başarılmadan zincirdeki sonraki ders ÖBS'de seçilemez!"
        }
    })
    edges.append(make_edge("node_ceng_ders_menu", "node_ceng_ders_3", 2))

    nodes.append({
        "id": "node_ceng_ders_4",
        "type": "custom",
        "position": {"x": 2650, "y": 640},
        "data": {
            "type": "textMessage",
            "label": "Üstten Ders Alma",
            "message": "⭐ *Üstten Ders Alma Koşulları:*\n\n• Genel Not Ortalaması (AGNO) **en az 3.00** olmalıdır.\n• Alt yarıyıllardan hiçbir başarısız dersi (FF, FD, DZ) bulunmamalıdır.\n• Danışman onayı ile bir üst sınıftan en fazla **2 ders** veya dönemlik toplam 40-42 AKTS limitine kadar ders alınabilir."
        }
    })
    edges.append(make_edge("node_ceng_ders_menu", "node_ceng_ders_4", 3))

    nodes.append({
        "id": "node_ceng_ders_5",
        "type": "custom",
        "position": {"x": 2650, "y": 840},
        "data": {
            "type": "textMessage",
            "label": "Teknik Seçmeliler",
            "message": "🎯 *Teknik Seçmeli Ders Alanları:*\n\n• Web Geliştirme Teknolojileri (React/Node.js)\n• Mobil Uygulama Geliştirme (Flutter/Kotlin/Swift)\n• Derin Öğrenme ve Görüntü İşleme\n• Bulut Bilişim ve DevOps\n• Blokzincir ve Kriptografi\n• Gömülü Sistemler ve IoT"
        }
    })
    edges.append(make_edge("node_ceng_ders_menu", "node_ceng_ders_5", 4))

    # =========================================================================
    # 4. SINAV, NOT & MAZERET YÖNETMELİĞİ (x: 3050)
    # =========================================================================
    nodes.append({
        "id": "node_ceng_sinav_menu",
        "type": "custom",
        "position": {"x": 3050, "y": 80},
        "data": {
            "type": "buttonReply",
            "label": "Sınavlar Menüsü",
            "message": "📝 *Sınav, Notlandırma & Mazeret Yönetmeliği:*\n\nAdıyaman Üniversitesi Önlisans ve Lisans Eğitim-Öğretim ve Sınav Yönetmeliği kuralları için bir başlık seçiniz:",
            "options": [
                "Üstten Ders Alma & AKTS Sınırı",
                "Vize & Final Ağırlık Oranları",
                "Devamsızlık & Ders Tekrarı Kuralı",
                "Bütünleme & Tek Ders Sınavı",
                "Mazeret Sınavı (Rapor 5 Gün Kuralı)",
                "Not İtirazı Süreci (5 İş Günü Kuralı)"
            ]
        }
    })
    edges.append(make_edge("node_ceng_main_menu", "node_ceng_sinav_menu", 3))

    nodes.append({
        "id": "node_ceng_sinav_1",
        "type": "custom",
        "position": {"x": 3400, "y": 40},
        "data": {
            "type": "linkButton",
            "label": "Ders Alma & Yönetmelik",
            "message": "📚 *Üstten Ders Alma & Dönemlik AKTS Sınırı:*\n\n• Normal bir yarıyılda ders yükü **30 AKTS**'dir. Alt yarıyıllardan başarısız veya eksik dersi olan öğrenciler bu limiti en fazla **40 AKTS**'ye kadar çıkarabilir.\n• **Üstten Ders Alma:** 3. yarıyıldan itibaren önceki yarıyıllardan başarısız dersi (FF, FD) bulunmayan ve **AGNO'su 3.00 ve üzerinde** olan öğrenciler danışman onayıyla üst sınıftan en fazla 2 ders alabilir.",
            "buttonText": "Resmi Sınav Yönetmeliğini Oku 📑",
            "url": "https://muhendislik.adiyaman.edu.tr/tr/ogrenci/yonetmelikler"
        }
    })
    edges.append(make_edge("node_ceng_sinav_menu", "node_ceng_sinav_1", 0))

    nodes.append({
        "id": "node_ceng_sinav_2",
        "type": "custom",
        "position": {"x": 3400, "y": 240},
        "data": {
            "type": "textMessage",
            "label": "Sınav Oranları",
            "message": "📊 *Not Ağırlıkları ve Geçme Notu:*\n\n• Ara Sınav (Vize): **%40** (Ödev veya laboratuvar uygulaması varsa vize diliminde hesaplanır).\n• Yarıyıl Sonu (Final): **%60**.\n• Bağıl Değerlendirme Sistemi (BDS) uygulanır; ham başarı notu alt sınırı fakültemizde 60'tır. Altında kalanlar doğrudan FF alır."
        }
    })
    edges.append(make_edge("node_ceng_sinav_menu", "node_ceng_sinav_2", 1))

    nodes.append({
        "id": "node_ceng_sinav_3",
        "type": "custom",
        "position": {"x": 3400, "y": 440},
        "data": {
            "type": "textMessage",
            "label": "Devamsızlık & Tekrar",
            "message": "🚫 *Devamsızlık Sınırı ve Ders Tekrarı Kuralı:*\n\n• Teorik ders saatlerinin en az **%70'ine**,\n• Laboratuvar/Uygulama saatlerinin en az **%80'ine** devam zorunludur. Sınırı aşan öğrenciye **DZ (Devamsız)** verilir ve sınavlara giremez.\n• **Önemli İstisna:** Bir dersin devam şartını daha önce başarıyla yerine getiren (devamsızlıktan kalmayan) öğrencilerin, bu dersi tekrar almaları durumunda **yeniden derse devam etme zorunlulukları yoktur**; yalnızca ara sınav, final ve ödevlere katılmaları gerekir."
        }
    })
    edges.append(make_edge("node_ceng_sinav_menu", "node_ceng_sinav_3", 2))

    nodes.append({
        "id": "node_ceng_sinav_4",
        "type": "custom",
        "position": {"x": 3400, "y": 640},
        "data": {
            "type": "textMessage",
            "label": "Büt ve Tek Ders",
            "message": "🔄 *Bütünleme ve Tek Ders Sınavı:*\n\n• Finalde FF, FD alanlar ile not yükseltmek isteyenler (DD, DC) bütünlemeye girebilir. Büt notu final yerine geçer.\n• **Tek Ders Sınavı:** Mezuniyet için tüm dersleri başarmış ancak sadece 1 dersten başarısız kalmış (ve devamsızlıktan kalmamış) öğrencilere her dönem sonunda tek ders sınav hakkı tanınır."
        }
    })
    edges.append(make_edge("node_ceng_sinav_menu", "node_ceng_sinav_4", 3))

    nodes.append({
        "id": "node_ceng_sinav_5",
        "type": "custom",
        "position": {"x": 3400, "y": 840},
        "data": {
            "type": "textMessage",
            "label": "Mazeret Sınavı",
            "message": "🏥 *Mazeret Sınavı Başvuru Kuralı:*\n\n• Yalnızca ara sınavlar (Vize) için mazeret sınavı hakkı verilir (Final ve büt için mazeret sınavı yoktur).\n• Sağlık raporu veya resmi mazeret belgesi, mazeretin bitiminden itibaren en geç **5 İŞ GÜNÜ İÇİNDE** dekanlığa/bölüm sekreterliğine yazılı dilekçe ekinde teslim edilmelidir."
        }
    })
    edges.append(make_edge("node_ceng_sinav_menu", "node_ceng_sinav_5", 4))

    nodes.append({
        "id": "node_ceng_sinav_6",
        "type": "custom",
        "position": {"x": 3400, "y": 1040},
        "data": {
            "type": "textMessage",
            "label": "Not İtirazı",
            "message": "✍️ *Not İtirazı Süreci (Maddi Hata):*\n\n• Sınav sonuçlarının ÖBS'de ilan edilmesinden itibaren **5 İŞ GÜNÜ İÇİNDE** ilgili bölüm başkanlığına yazılı dilekçe ile maddi hata itirazında bulunulabilir.\n• Dersin öğretim elemanı sınav evrakını inceler ve sonuç en geç 5 iş günü içerisinde ilgili birim yönetim kuruluna iletilir."
        }
    })
    edges.append(make_edge("node_ceng_sinav_menu", "node_ceng_sinav_6", 5))

    # =========================================================================
    # 5. BİTİRME PROJESİ & TEZİ (CENG 401/402) (x: 3800)
    # =========================================================================
    nodes.append({
        "id": "node_ceng_proje_menu",
        "type": "custom",
        "position": {"x": 3800, "y": 80},
        "data": {
            "type": "buttonReply",
            "label": "Bitirme Projesi Menüsü",
            "message": "🎓 *Bitirme Tasarım Projesi ve Lisans Tezi (CENG 401 / 402):*\n\nMezuniyet için zorunlu olan mühendislik tasarım ve bitirme tezi süreçleri hakkında bilgi seçiniz:",
            "options": [
                "Bitirme Projesi Alma Şartları (180 AKTS)",
                "Danışman & Proje Konusu Seçimi",
                "Jüri Savunması, Demo & Poster",
                "Tez Yazım Kılavuzu & Şablon (PDF)"
            ]
        }
    })
    edges.append(make_edge("node_ceng_main_menu", "node_ceng_proje_menu", 4))

    nodes.append({
        "id": "node_ceng_proje_1",
        "type": "custom",
        "position": {"x": 4150, "y": 40},
        "data": {
            "type": "textMessage",
            "label": "Bitirme Şartları",
            "message": "📋 *Bitirme Projesini Kimler Alabilir?*\n\n• Bitirme Tasarımı (CENG 401) dersini alabilmek için öğrencinin en az **180 tamamlanmış AKTS kredisine** sahip olması ve 4. sınıfa geçmiş olması gerekmektedir.\n• CENG 401 Güz döneminde, CENG 402 Bahar döneminde birbirini tamamlayan 2 aşamalı proje olarak yürütülür."
        }
    })
    edges.append(make_edge("node_ceng_proje_menu", "node_ceng_proje_1", 0))

    nodes.append({
        "id": "node_ceng_proje_2",
        "type": "custom",
        "position": {"x": 4150, "y": 240},
        "data": {
            "type": "textMessage",
            "label": "Danışman Seçimi",
            "message": "👨‍🏫 *Danışman ve Konu Belirleme:*\n\n• Güz dönemi başında bölüm öğretim üyeleri çalışma alanlarına göre (Yapay Zeka, Gömülü Sistem, Web/Mobil, Güvenlik) proje konularını ilan eder.\n• Öğrenci danışman tercih formu doldurarak bölüm başkanlığına iletir veya kendi özgün AR-GE fikrini danışman hocasına onaylatır."
        }
    })
    edges.append(make_edge("node_ceng_proje_menu", "node_ceng_proje_2", 1))

    nodes.append({
        "id": "node_ceng_proje_3",
        "type": "custom",
        "position": {"x": 4150, "y": 440},
        "data": {
            "type": "textMessage",
            "label": "Jüri Sunumu",
            "message": "🎤 *Jüri Sunumu, Demo ve Teslim:*\n\n• Dönem sonunda projenin çalışan prototipi / yazılım demosu ve teknik posteri hazırlanır.\n• Öğretim üyelerinden oluşan 3 kişilik jüri önünde 20 dakikalık sözlü sunum ve canlı demo gerçekleştirilir.\n• Tez nüshaları ve CD/GitHub bağlantısı kütüphane ve bölüm arşivine teslim edilir."
        }
    })
    edges.append(make_edge("node_ceng_proje_menu", "node_ceng_proje_3", 2))

    nodes.append({
        "id": "node_ceng_proje_4",
        "type": "custom",
        "position": {"x": 4150, "y": 640},
        "data": {
            "type": "sendMedia",
            "label": "Tez Kılavuzu (PDF)",
            "message": "📑 *Fakülte Tez ve Proje Yazım Şablonu:*\n\nTezinizi yazarken Fakülte Yönetim Kurulu tarafından onaylanmış resmi sayfa düzeni, kaynakça kuralları ve LaTeX/Word şablonuna birebir uymanız zorunludur.",
            "mediaUrl": "https://muhendislik.adiyaman.edu.tr/tr/ogrenci/tez-ve-proje-yazim-kilavuzu.pdf",
            "mediaType": "document"
        }
    })
    edges.append(make_edge("node_ceng_proje_menu", "node_ceng_proje_4", 3))

    # =========================================================================
    # 6. ÇAP, YANDAL, YATAY GEÇİŞ & DGS (x: 4550)
    # =========================================================================
    nodes.append({
        "id": "node_ceng_cap_menu",
        "type": "custom",
        "position": {"x": 4550, "y": 80},
        "data": {
            "type": "buttonReply",
            "label": "ÇAP & Geçiş Menüsü",
            "message": "🔄 *Çift Anadal (ÇAP), Yandal, Yatay Geçiş ve DGS İşlemleri:*\n\nİkinci bir diploma almak, bölüm değiştirmek veya DGS intibak kurallarını öğrenmek için bir başlık seçiniz:",
            "options": [
                "Çift Anadal (ÇAP) Şartları & Bölümler",
                "Yandal Programı Şartları",
                "Merkezi Puanla Yatay Geçiş (Ek Madde-1)",
                "AGNO ile Kurumlararası Yatay Geçiş",
                "DGS İntibak ve Ders Muafiyeti"
            ]
        }
    })
    edges.append(make_edge("node_ceng_main_menu", "node_ceng_cap_menu", 5))

    nodes.append({
        "id": "node_ceng_cap_1",
        "type": "custom",
        "position": {"x": 4900, "y": 40},
        "data": {
            "type": "textMessage",
            "label": "ÇAP Şartları",
            "message": "🎓 *Çift Anadal (ÇAP) Şartları:*\n\n• Bilgisayar Mühendisliği öğrencileri Elektrik-Elektronik, Makine ve Çevre Mühendisliği bölümleriyle ÇAP yapabilir.\n• **Şartlar:** AGNO en az **3.00** olmalı, sınıfında ilk **%20 başarı diliminde** yer almalı ve alttan başarısız dersi bulunmamalıdır.\n• En erken 3., en geç 5. yarıyılın başında başvurulur. Mezuniyette her iki bölümün de diploması alınır."
        }
    })
    edges.append(make_edge("node_ceng_cap_menu", "node_ceng_cap_1", 0))

    nodes.append({
        "id": "node_ceng_cap_2",
        "type": "custom",
        "position": {"x": 4900, "y": 240},
        "data": {
            "type": "textMessage",
            "label": "Yandal Programı",
            "message": "📜 *Yandal Programı:*\n\n• Belirli bir uzmanlık alanında (örn. Elektronik veya Yönetim Bilişim) ek sertifika kazanılmasını sağlar.\n• **Şartlar:** AGNO en az **2.50** olmalı ve alttan dersi bulunmamalıdır.\n• En erken 3., en geç 6. yarıyılın başında başvurulur."
        }
    })
    edges.append(make_edge("node_ceng_cap_menu", "node_ceng_cap_2", 1))

    nodes.append({
        "id": "node_ceng_cap_3",
        "type": "custom",
        "position": {"x": 4900, "y": 440},
        "data": {
            "type": "textMessage",
            "label": "Ek Madde-1 Yatay Geçiş",
            "message": "⚡ *Merkezi Yerleştirme Puanı ile Yatay Geçiş (Ek Madde-1):*\n\n• Üniversiteye yerleştiğiniz yıldaki YKS sayısal puanınız, geçmek istediğiniz üniversitenin o yıldaki CENG taban puanına eşit veya yüksekse AGNO'ya bakılmaksızın geçiş yapılabilir.\n• Her yıl Ağustos ayında başvurular alınır; öğrencinin eğitim süresi boyunca yalnızca 1 kez bu haktan yararlanma hakkı vardır."
        }
    })
    edges.append(make_edge("node_ceng_cap_menu", "node_ceng_cap_3", 2))

    nodes.append({
        "id": "node_ceng_cap_4",
        "type": "custom",
        "position": {"x": 4900, "y": 640},
        "data": {
            "type": "textMessage",
            "label": "AGNO ile Yatay Geçiş",
            "message": "📈 *Ortalama (AGNO) ile Kurumlararası Yatay Geçiş:*\n\n• Başka bir üniversitenin Bilgisayar Mühendisliğinden geçiş için AGNO'nun **en az 2.29 / 4.00** olması ve alttan başarısız ders bulunmaması gerekir.\n• YÖK kontenjanları dahilinde sıralamaya göre asil ve yedek liste ilan edilir."
        }
    })
    edges.append(make_edge("node_ceng_cap_menu", "node_ceng_cap_4", 3))

    nodes.append({
        "id": "node_ceng_cap_5",
        "type": "custom",
        "position": {"x": 4900, "y": 840},
        "data": {
            "type": "textMessage",
            "label": "DGS İntibak & Muafiyet",
            "message": "📑 *DGS ile Gelen Öğrencilerin İntibakı:*\n\n• Dikey Geçiş Sınavı (DGS) ile bölümümüze yerleşen öğrencilerin önlisans transkripti Bölüm İntibak Komisyonunca incelenir.\n• İçerik ve AKTS uyumu sağlanan dersler (Matematik, Programlama vb.) muaf edilir.\n• Kalan ders yüküne göre öğrencinin intibak ettirileceği sınıf ve dönem belirlenir."
        }
    })
    edges.append(make_edge("node_ceng_cap_menu", "node_ceng_cap_5", 4))

    # =========================================================================
    # 7. ERASMUS+ & DEĞİŞİM PROGRAMLARI (x: 5300)
    # =========================================================================
    nodes.append({
        "id": "node_ceng_erasmus_menu",
        "type": "custom",
        "position": {"x": 5300, "y": 80},
        "data": {
            "type": "buttonReply",
            "label": "Erasmus Menüsü",
            "message": "🌍 *Erasmus+ ve Uluslararası Değişim Programları:*\n\nYurt dışı eğitim, staj hareketliliği ve Farabi programları hakkında bilgi almak için seçim yapınız:",
            "options": [
                "Erasmus+ Öğrenim Hareketliliği Şartları",
                "Erasmus+ Yaz Stajı Hareketliliği",
                "Farabi Yurt İçi Değişim Programı",
                "Ders Eşdeğerliği (Learning Agreement)"
            ]
        }
    })
    edges.append(make_edge("node_ceng_main_menu", "node_ceng_erasmus_menu", 6))

    nodes.append({
        "id": "node_ceng_erasmus_1",
        "type": "custom",
        "position": {"x": 5650, "y": 40},
        "data": {
            "type": "textMessage",
            "label": "Erasmus Öğrenim",
            "message": "✈️ *Erasmus+ Öğrenim Hareketliliği:*\n\n• Avrupa'daki anlaşmalı üniversitelerde 1 veya 2 yarıyıl eğitim görme imkanı sağlar.\n• **Şartlar:** AGNO en az **2.20 / 4.00** olmalı ve Üniversite Yabancı Dil Yeterlilik Sınavından geçer not alınmalıdır.\n• Seçilen öğrencilere AB tarafından aylık hibe (burs) desteği sağlanır."
        }
    })
    edges.append(make_edge("node_ceng_erasmus_menu", "node_ceng_erasmus_1", 0))

    nodes.append({
        "id": "node_ceng_erasmus_2",
        "type": "custom",
        "position": {"x": 5650, "y": 240},
        "data": {
            "type": "textMessage",
            "label": "Erasmus Stajı",
            "message": "💼 *Erasmus+ Staj Hareketliliği:*\n\n• Yaz döneminde Avrupa'daki bir yazılım şirketinde veya üniversite laboratuvarında en az 2 ay staj yapma imkanıdır.\n• Yapılan staj bölüm staj komisyonu onayıyla zorunlu Yazılım veya Donanım stajı yerine saydırılabilir."
        }
    })
    edges.append(make_edge("node_ceng_erasmus_menu", "node_ceng_erasmus_2", 1))

    nodes.append({
        "id": "node_ceng_erasmus_3",
        "type": "custom",
        "position": {"x": 5650, "y": 440},
        "data": {
            "type": "textMessage",
            "label": "Farabi Programı",
            "message": "🇹🇷 *Farabi Değişim Programı:*\n\n• Türkiye içindeki diğer devlet üniversitelerinin Bilgisayar Mühendisliği bölümlerinde 1 ya da 2 dönem eğitim alma imkanıdır.\n• **Şart:** AGNO'nun en az **2.00** olması ve alttan ders bulunmaması gerekmektedir."
        }
    })
    edges.append(make_edge("node_ceng_erasmus_menu", "node_ceng_erasmus_3", 2))

    nodes.append({
        "id": "node_ceng_erasmus_4",
        "type": "custom",
        "position": {"x": 5650, "y": 640},
        "data": {
            "type": "textMessage",
            "label": "Learning Agreement",
            "message": "📝 *Ders Eşdeğerliği (Learning Agreement):*\n\n• Değişim programına gitmeden önce karşı üniversitede alınacak dersler Bölüm Erasmus Koordinatörü ile belirlenir ve sözleşme imzalanır.\n• Karşı üniversitede başarılan tüm dersler döndüğünüzde transkriptinize birebir intibak ettirilir; dönem kaybı yaşanmaz."
        }
    })
    edges.append(make_edge("node_ceng_erasmus_menu", "node_ceng_erasmus_4", 3))

    # =========================================================================
    # 8. YAZ OKULU ESASLARI (x: 6050)
    # =========================================================================
    nodes.append({
        "id": "node_ceng_yazokulu_menu",
        "type": "custom",
        "position": {"x": 6050, "y": 80},
        "data": {
            "type": "buttonReply",
            "label": "Yaz Okulu Menüsü",
            "message": "☀️ *Yaz Okulunda Ders Alma Esasları:*\n\nFakültemizde veya başka bir üniversitede açılan yaz okullarından ders alma kuralları hakkında bilgi seçiniz:",
            "options": [
                "Başka Üniversiteden Ders Alma Kriteri",
                "Maksimum AKTS & Ders Sınırı (16 AKTS)",
                "Dilekçe ve Ön Onay Süreci (Zorunlu!)"
            ]
        }
    })
    edges.append(make_edge("node_ceng_main_menu", "node_ceng_yazokulu_menu", 7))

    nodes.append({
        "id": "node_ceng_yazokulu_1",
        "type": "custom",
        "position": {"x": 6400, "y": 40},
        "data": {
            "type": "textMessage",
            "label": "Yaz Okulu Durumu",
            "message": "🏛️ *ADYÜ Yaz Okulu Durumu & Başka Üniversiteden Ders Alma:*\n\n• **Adıyaman Üniversitesi bünyesinde yaz okulu AÇILMAMAKTADIR.**\n• Ancak öğrenciler, senato esasları çerçevesinde diğer üniversitelerin açtığı yaz okullarından ders alabilmektedir."
        }
    })
    edges.append(make_edge("node_ceng_yazokulu_menu", "node_ceng_yazokulu_1", 0))

    nodes.append({
        "id": "node_ceng_yazokulu_2",
        "type": "custom",
        "position": {"x": 6400, "y": 240},
        "data": {
            "type": "textMessage",
            "label": "Ders Alma Şartları",
            "message": "📊 *Başka Üniversiteden Yaz Okulu Şartları:*\n\n1. **Taban Puan Şartı:** Gidilecek üniversite programının taban puanı, öğrencinin kayıt yılındaki ADYÜ CENG puanına **EŞİT VEYA DAHA YÜKSEK** olmalıdır.\n2. **Ders Türü Kısıtı:** Sadece daha önce alınıp devam şartı sağlanmış ancak **başarısız olunmuş (FF veya FD)** dersler alınabilir. Laboratuvar, uygulamalı dersler ve bitirme projeleri yaz okulunda ALINAMAZ!\n3. **Kredi Limiti:** En fazla **10 ulusal kredi** alınabilir.\n4. **Geçme Notu:** Alınan dersten başarılı sayılmak için en az **CC** harf notu alınmalıdır."
        }
    })
    edges.append(make_edge("node_ceng_yazokulu_menu", "node_ceng_yazokulu_2", 1))

    nodes.append({
        "id": "node_ceng_yazokulu_3",
        "type": "custom",
        "position": {"x": 6400, "y": 440},
        "data": {
            "type": "textMessage",
            "label": "Dilekçe & Ön Onay",
            "message": "⚠️ *Ön Onay Dilekçesi & Staj Çakışması:*\n\n• Başka üniversiteden ders almadan önce onaylı ders içeriği ve kredi bilgisiyle **Bölüm Başkanlığına yazılı dilekçe verilerek Yönetim Kurulu onayı alınması ZORUNLUDUR**.\n• Onaysız alınan dersler kesinlikle sayılmaz.\n• Yaz döneminde zorunlu staj yapan öğrenciler aynı dönemde yaz okulundan ders ALAMAZ."
        }
    })
    edges.append(make_edge("node_ceng_yazokulu_menu", "node_ceng_yazokulu_3", 2))

    # =========================================================================
    # 9. LABORATUVARLAR, EDUROAM & LİSANSLAR (x: 6800)
    # =========================================================================
    nodes.append({
        "id": "node_ceng_lab_menu",
        "type": "custom",
        "position": {"x": 6800, "y": 80},
        "data": {
            "type": "buttonReply",
            "label": "Laboratuvarlar & Lisanslar",
            "message": "🧪 *Laboratuvarlar, Teknik Donanım ve Ücretsiz Lisanslar:*\n\nBölümümüzün sunduğu teknik imkanlar, Wi-Fi ve yazılım lisansları hakkında bilgi almak için seçim yapınız:",
            "options": [
                "Yazılım Laboratuvarı & Kurulu IDE'ler",
                "Donanım & Mikroişlemci Labı",
                "Eduroam Wi-Fi Kurulum Rehberi",
                "Ücretsiz Öğrenci Lisansları (GitHub, JetBrains, Azure)"
            ]
        }
    })
    edges.append(make_edge("node_ceng_main_menu", "node_ceng_lab_menu", 8))

    nodes.append({
        "id": "node_ceng_lab_1",
        "type": "custom",
        "position": {"x": 7150, "y": 40},
        "data": {
            "type": "textMessage",
            "label": "Yazılım Lab",
            "message": "💻 *Yazılım Laboratuvarı Özellikleri:*\n\n• Mühendislik Fakültesi 2. katta yer almaktadır.\n• Yüksek performanslı iş istasyonları, çift monitör desteği ve Ubuntu Linux / Windows 11 Dual-Boot sistemi kuruludur.\n• **Yüklü Araçlar:** VS Code, IntelliJ IDEA, PyCharm, CLion, MATLAB, Android Studio, Docker, Cisco Packet Tracer, Wireshark."
        }
    })
    edges.append(make_edge("node_ceng_lab_menu", "node_ceng_lab_1", 0))

    nodes.append({
        "id": "node_ceng_lab_2",
        "type": "custom",
        "position": {"x": 7150, "y": 240},
        "data": {
            "type": "textMessage",
            "label": "Donanım Lab",
            "message": "⚙️ *Donanım ve Gömülü Sistemler Laboratuvarı:*\n\n• Sayısal Mantık Tasarımı ve Mikroişlemciler dersleri için ayrılmıştır.\n• Osiloskoplar, lojik analizörler, FPGA geliştirme kitleri, Arduino, STM32 ve Raspberry Pi deney setleri mevcuttur."
        }
    })
    edges.append(make_edge("node_ceng_lab_menu", "node_ceng_lab_2", 1))

    nodes.append({
        "id": "node_ceng_lab_3",
        "type": "custom",
        "position": {"x": 7150, "y": 440},
        "data": {
            "type": "textMessage",
            "label": "Eduroam Wi-Fi",
            "message": "📶 *Eduroam Wi-Fi Kurulumu:*\n\n• Ağ Adı: **eduroam**\n• Kullanıcı Adı: `ogrencino@adiyaman.edu.tr`\n• Şifre: **ÖBS şifreniz**\n• EAP Yöntemi: PEAP | Doğrulama: MSCHAPv2 | Sertifika: Doğrulama yapma.\nKurulum sonrasında dünya genelindeki tüm anlaşmalı üniversitelerde otomatik bağlanır."
        }
    })
    edges.append(make_edge("node_ceng_lab_menu", "node_ceng_lab_3", 2))

    nodes.append({
        "id": "node_ceng_lab_4",
        "type": "custom",
        "position": {"x": 7150, "y": 640},
        "data": {
            "type": "linkButton",
            "label": "Öğrenci Lisansları (URL)",
            "message": "🎁 *Ücretsiz Öğrenci Lisansları ve Bulut Kredileri:*\n\n• **GitHub Student Pack:** Ücretsiz GitHub Copilot, ücretsiz alan adı, Canva Pro vb.\n• **JetBrains:** IntelliJ, PyCharm, CLion tüm IDE'ler ücretsiz lisanslı.\n• **Microsoft Azure:** 100$ ücretsiz bulut sunucu kredisi.\n• **Office 365:** Üniversite e-postanız ile Word, Excel, Teams ücretsizdir.",
            "buttonText": "GitHub Student Pack'e Başvur 🚀",
            "url": "https://education.github.com/pack"
        }
    })
    edges.append(make_edge("node_ceng_lab_menu", "node_ceng_lab_4", 3))

    # =========================================================================
    # 10. BÖLÜM SEKRETERLİĞİ & İLETİŞİM (x: 7550)
    # =========================================================================
    nodes.append({
        "id": "node_ceng_iletisim_menu",
        "type": "custom",
        "position": {"x": 7550, "y": 80},
        "data": {
            "type": "buttonReply",
            "label": "İletişim Menüsü",
            "message": "🏢 *Bilgisayar Mühendisliği Bölüm Sekreterliği & İletişim:*\n\nBölüm idaresi, danışmanlıklar ve fakülteye ulaşım için bir başlık seçiniz:",
            "options": [
                "Sekreterlik Dahili Tel & Çalışma Saatleri",
                "Fakülte ve Bölüm Konumu (Harita)",
                "CENG Resmi Web Sitesi & İletişim"
            ]
        }
    })
    edges.append(make_edge("node_ceng_main_menu", "node_ceng_iletisim_menu", 9))

    nodes.append({
        "id": "node_ceng_iletisim_1",
        "type": "custom",
        "position": {"x": 7900, "y": 40},
        "data": {
            "type": "textMessage",
            "label": "Dahili Telefon & İletişim",
            "message": "📞 *CENG Bölüm Sekreterliği & İletişim Bilgileri:*\n\n• **Bölüm Sekreteri:** Kadriye GÜNDÜZ (Bilgisayar İşletmeni)\n• **Telefon (Santral):** 0 (416) 223 38 00 (Dahili: **2710**)\n• **Fakülte Hatları:** 0 (416) 219 73 69 / 0 (416) 223 38 08\n• **Kurumsal E-Posta:** `bilgisayar@adiyaman.edu.tr`\n• **Konum:** Mühendislik Fakültesi Dekanlık Binası, 2. Kat, Bölüm Sekreterliği Odası\n• **Mesai Saatleri:** Hafta içi 08:00 - 12:00 ve 13:00 - 17:00"
        }
    })
    edges.append(make_edge("node_ceng_iletisim_menu", "node_ceng_iletisim_1", 0))

    nodes.append({
        "id": "node_ceng_iletisim_2",
        "type": "custom",
        "position": {"x": 7900, "y": 240},
        "data": {
            "type": "linkButton",
            "label": "Fakülte Konumu (URL)",
            "message": "📍 *Fakülte Adresi:*\n\nAdıyaman Üniversitesi Merkez Külliyesi, Mühendislik Fakültesi, Altınşehir Mh., 02040 Merkez / Adıyaman.",
            "buttonText": "Google Haritalarda Aç 🗺️",
            "url": "https://maps.google.com/?q=Adıyaman+Üniversitesi+Mühendislik+Fakültesi"
        }
    })
    edges.append(make_edge("node_ceng_iletisim_menu", "node_ceng_iletisim_2", 1))

    nodes.append({
        "id": "node_ceng_iletisim_3",
        "type": "custom",
        "position": {"x": 7900, "y": 440},
        "data": {
            "type": "linkButton",
            "label": "Web Sitesi (URL)",
            "message": "🌐 *Bölüm Duyuru ve Etkinlik Sayfası:*\n\nGüncel ders programları, vize-final takvimleri ve komisyon duyuruları için resmi bölüm web sitemizi ziyaret edebilirsiniz.",
            "buttonText": "Resmi CENG Web Sayfasını Aç 💻",
            "url": "https://muhendislik.adiyaman.edu.tr/tr/bolumler/bilgisayar-muhendisligi"
        }
    })
    edges.append(make_edge("node_ceng_iletisim_menu", "node_ceng_iletisim_3", 2))

    return nodes, edges

def run_seed():
    db = SessionLocal()
    nodes, edges = build_master_flow()

    print(f"Toplam Üretilen Düğüm (Node): {len(nodes)}")
    print(f"Toplam Üretilen Kenar (Edge): {len(edges)}")

    flow = db.query(models.ChatFlow).filter(models.ChatFlow.id == 16).first()
    if not flow:
        flow = models.ChatFlow(
            name="Bilgisayar Mühendisliği Bölüm Asistanı Master Akışı",
            description="merhaba, selam, menü, başlat, yardım, ceng, bilgisayar mühendisliği, staj, ume, uygulamalı mühendislik, 7+1, ders, proje, sınav, lab, sekreterlik, çap, yandal, yatay geçiş, dgs, intibak, erasmus, farabi, yaz okulu, mazeret, itiraz, eduroam, lisans",
            nodes=nodes,
            edges=edges,
            is_active=True
        )
        db.add(flow)
    else:
        flow.name = "Bilgisayar Mühendisliği Bölüm Asistanı Master Akışı"
        flow.description = "merhaba, selam, menü, başlat, yardım, ceng, bilgisayar mühendisliği, staj, ume, uygulamalı mühendislik, 7+1, ders, proje, sınav, lab, sekreterlik, çap, yandal, yatay geçiş, dgs, intibak, erasmus, farabi, yaz okulu, mazeret, itiraz, eduroam, lisans"
        flow.nodes = nodes
        flow.edges = edges
        flow.is_active = True

    db.commit()
    db.refresh(flow)
    print(f"BAŞARILI: Akış ID {flow.id} başarıyla güncellendi ve {len(flow.nodes)} düğümle aktif edildi!")
    db.close()

if __name__ == "__main__":
    run_seed()
