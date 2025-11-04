// === Вспомогательные функции ===
const $ = id => document.getElementById(id);
const readFile = input =>
  new Promise(resolve => {
    const file = input.files?.[0];
    if (!file) return resolve(null);
    const url = URL.createObjectURL(file);
    resolve(url);
  });

// === Загрузка сохранённых настроек ===
window.addEventListener("DOMContentLoaded", () => {
  const s = JSON.parse(localStorage.getItem("settings") || "{}");
  if (!Object.keys(s).length) return;

  const set = (id, val) => {
    const el = $(id);
    if (el && val !== undefined) el.value = val;
  };

  (document.querySelector(`input[name="orientation"][value="${s.orientation || "9:16"}"]`) || {}).checked = true;
  set("startTitle", s.startTitle);
  set("startSubtitle", s.startSubtitle);
  set("splashType", s.splashType);
  set("signInstruction", s.signInstruction);
  set("squareColor", s.squareColor);
  set("squareBgColor", s.squareBgColor);
  set("squareRadius", s.squareRadius);
  set("squareWidth", s.squareWidth);
  set("squareHeight", s.squareHeight);
  set("btnStart", s.btnStart);
  set("btnClear", s.btnClear);
  set("btnAnalyze", s.btnAnalyze);
  set("btnPrint", s.btnPrint);
  set("analyzingText", s.analyzingText);
  set("analyzeDuration", s.analyzeDuration);
  set("analyzeSplashType", s.analyzeSplashType);
  set("themeColor", s.themeColor);
  set("mainColor", s.mainColor);
  set("textColor", s.textColor);
  set("mode", s.mode);
  set("model", s.model);
  set("apiKey", s.apiKey || "");
});

// === Сохранение всех настроек ===
$("save").addEventListener("click", async () => {
  const splashFileUrl = await readFile($("splashFile"));
  const analyzeSplashFileUrl = await readFile($("analyzeSplashFile"));

  const data = {
    orientation: document.querySelector('input[name="orientation"]:checked').value,
    startTitle: $("startTitle").value.trim(),
    startSubtitle: $("startSubtitle").value.trim(),
    splashType: $("splashType").value,
    splashFile: splashFileUrl || null,
    signInstruction: $("signInstruction").value.trim(),
    squareColor: $("squareColor").value,
    squareBgColor: $("squareBgColor").value,
    squareRadius: +$("squareRadius").value,
    squareWidth: +$("squareWidth").value,
    squareHeight: +$("squareHeight").value,
    btnStart: $("btnStart").value.trim(),
    btnClear: $("btnClear").value.trim(),
    btnAnalyze: $("btnAnalyze").value.trim(),
    btnPrint: $("btnPrint").value.trim(),
    analyzingText: $("analyzingText").value.trim(),
    analyzeDuration: +$("analyzeDuration").value,
    analyzeSplashType: $("analyzeSplashType").value,
    analyzeSplashFile: analyzeSplashFileUrl || null,
    themeColor: $("themeColor").value,
    mainColor: $("mainColor").value,
    textColor: $("textColor").value,
    mode: $("mode").value,
    model: $("model").value.trim(),
    apiKey: $("apiKey").value.trim()
  };

  localStorage.setItem("settings", JSON.stringify(data));
  alert("✅ Настройки сохранены!");
});

// === Запуск интерактива ===
$("start").addEventListener("click", () => {
  const win = window.open("interactive.html", "_blank");
  if (!win) alert("Разрешите всплывающие окна, чтобы открыть интерактив!");
});

// === Показ/скрытие ключа ===
$("toggleKey").addEventListener("click", () => {
  const keyInput = $("apiKey");
  const visible = keyInput.type === "text";
  keyInput.type = visible ? "password" : "text";
});

// === Подключение iPad (универсальное определение IP + ручной ввод) ===
function detectLocalIP() {
  const ipField = document.getElementById("local-ip");
  const linkField = document.getElementById("ipad-link");

  let found = false;

  // Пробуем получить локальный IP через WebRTC
  try {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel("");
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(console.error);

    pc.onicecandidate = e => {
      if (!e.candidate || found) return;
      const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
      const match = ipRegex.exec(e.candidate.candidate);
      if (match) {
        const ip = match[1];
        if (ip.startsWith("192.") || ip.startsWith("10.") || ip.startsWith("172.")) {
          found = true;
          ipField.value = ip;
          ipField.readOnly = true;
          linkField.value = `http://${ip}:8000/html/interactive.html`;
          pc.close();
        }
      }
    };
  } catch (err) {
    console.warn("WebRTC IP detection failed:", err);
  }

  // Через 3 сек — если IP не найден, разрешаем ввод вручную
  setTimeout(() => {
    if (!found) {
      ipField.readOnly = false;
      ipField.placeholder = "Введите IP вручную (пример: 192.168.68.101)";
      linkField.placeholder = "Ссылка появится автоматически";
      ipField.addEventListener("input", () => {
        linkField.value = `http://${ipField.value}:8000/html/interactive.html`;
      });
    }
  }, 3000);
}

document.getElementById("copy-link").addEventListener("click", () => {
  const linkField = document.getElementById("ipad-link");
  linkField.select();
  document.execCommand("copy");
  alert("Ссылка скопирована! Отправьте её на iPad.");
});

detectLocalIP();
