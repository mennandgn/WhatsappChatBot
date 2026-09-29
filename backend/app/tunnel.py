import os
import re
import time
import subprocess
from typing import Optional, Tuple

def find_cloudflared_path() -> Optional[str]:
    """Sistemde veya proje kökünde cloudflared.exe ikili dosyasını bulur."""
    current_dir = os.path.dirname(os.path.abspath(__file__)) # backend/app
    backend_dir = os.path.dirname(current_dir)               # backend
    project_root = os.path.dirname(backend_dir)              # project root
    
    candidates = [
        os.path.join(project_root, "cloudflared.exe"),
        os.path.join(backend_dir, "cloudflared.exe"),
        os.path.join(os.getcwd(), "cloudflared.exe"),
        os.path.join(os.getcwd(), "..", "cloudflared.exe"),
    ]
    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)
            
    # Son çare PATH üzerinde ara
    try:
        which = subprocess.check_output(["where", "cloudflared.exe"], text=True).strip()
        if which:
            first_line = which.splitlines()[0].strip()
            if os.path.exists(first_line):
                return first_line
    except Exception:
        pass

    return None

def is_cloudflared_running() -> bool:
    """Windows görev listesinde cloudflared.exe işleminin çalışıp çalışmadığını kontrol eder."""
    try:
        out = subprocess.check_output(['tasklist', '/FI', 'IMAGENAME eq cloudflared.exe'], text=True)
        return "cloudflared.exe" in out.lower()
    except Exception:
        return False

def stop_cloudflared_tunnel() -> bool:
    """Çalışan tüm cloudflared.exe işlemlerini güvenli şekilde sonlandırır."""
    try:
        if os.name == 'nt':
            subprocess.run(['taskkill', '/F', '/IM', 'cloudflared.exe'], capture_output=True)
        else:
            subprocess.run(['pkill', '-f', 'cloudflared'], capture_output=True)
    except Exception:
        pass

    # tunnel_url.txt dosyasını temizle
    for p in ["data/tunnel_url.txt", "../data/tunnel_url.txt"]:
        if os.path.exists(p):
            try:
                os.remove(p)
            except Exception:
                pass

    return not is_cloudflared_running()

def detect_active_tunnel_url() -> Optional[str]:
    """Aktif çalışan Cloudflare trycloudflare tünel adresini tespit eder."""
    if not is_cloudflared_running():
        return None

    # 1. Öncelik: data/tunnel_url.txt
    for path in ["data/tunnel_url.txt", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "tunnel_url.txt")]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    c = f.read().strip()
                    if c.startswith("http"):
                        return c
            except Exception:
                pass

    # 2. Öncelik: data/cloudflared.log dosyasını oku
    for log_path in ["data/cloudflared.log", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "cloudflared.log")]:
        if os.path.exists(log_path):
            try:
                with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                    matches = re.findall(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", f.read())
                    if matches:
                        return matches[-1]
            except Exception:
                pass

    # 3. Son çare: Gemini Brain log dosyaları
    try:
        user_home = os.path.expanduser("~")
        gemini_brain = os.path.join(user_home, ".gemini", "antigravity", "brain")
        if os.path.exists(gemini_brain):
            matches = []
            for root, dirs, files in os.walk(gemini_brain):
                for file in files:
                    if file.startswith("task-") and file.endswith(".log"):
                        full_path = os.path.join(root, file)
                        try:
                            mtime = os.path.getmtime(full_path)
                            matches.append((mtime, full_path))
                        except Exception:
                            pass
            matches.sort(key=lambda x: x[0], reverse=True)
            for _, fpath in matches[:20]:
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        text = f.read()
                        found = re.findall(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", text)
                        if found:
                            return found[-1]
                except Exception:
                    pass
    except Exception:
        pass

    return None

def start_cloudflared_tunnel(port: int = 8000, timeout: int = 18) -> Tuple[Optional[str], str]:
    """
    Cloudflare tünelini arka planda başlatır ve üretilen trycloudflare.com URL'sini bekler.
    """
    cf_path = find_cloudflared_path()
    if not cf_path:
        return None, "cloudflared.exe dosyası bulunamadı. Lütfen proje ana dizinine cloudflared.exe dosyasını ekleyin."

    # Önceki tüneli temizle
    stop_cloudflared_tunnel()
    time.sleep(0.5)

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(backend_dir, "data")
    os.makedirs(data_dir, exist_ok=True)
    log_path = os.path.join(data_dir, "cloudflared.log")

    # Log dosyasını sıfırla
    try:
        with open(log_path, "w", encoding="utf-8") as f:
            f.write("")
    except Exception as e:
        return None, f"Log dosyası oluşturulamadı: {str(e)}"

    creation_flags = 0
    if os.name == 'nt':
        creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP

    try:
        log_file = open(log_path, "a", encoding="utf-8")
        subprocess.Popen(
            [cf_path, "tunnel", "--url", f"http://localhost:{port}"],
            stdout=log_file,
            stderr=subprocess.STDOUT,
            creationflags=creation_flags
        )
    except Exception as e:
        return None, f"cloudflared başlatılamadı: {str(e)}"

    # URL gelene kadar log dosyasını izle
    start_time = time.time()
    detected_url = None
    while time.time() - start_time < timeout:
        try:
            if os.path.exists(log_path):
                with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    matches = re.findall(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", content)
                    if matches:
                        detected_url = matches[-1]
                        break
        except Exception:
            pass
        time.sleep(0.4)

    if detected_url:
        # Tünelin Cloudflare kenar sunucularına (edge proxy) tam bağlanmasını bekle
        ready_start = time.time()
        while time.time() - ready_start < 12:
            try:
                with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                    if "Registered tunnel connection" in f.read():
                        break
            except Exception:
                pass
            time.sleep(0.5)

        tunnel_url_file = os.path.join(data_dir, "tunnel_url.txt")
        try:
            with open(tunnel_url_file, "w", encoding="utf-8") as f:
                f.write(detected_url)
        except Exception:
            pass
        return detected_url, "Tünel başarıyla oluşturuldu."
    else:
        return None, f"Tünel başlatıldı ancak {timeout} saniye içinde Cloudflare URL yanıtı vermedi. Lütfen internet bağlantınızı kontrol edip tekrar deneyiniz."

