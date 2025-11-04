window.addEventListener("DOMContentLoaded", () => {

  // === Элементы экранов ===
  const screens = {
    start: document.getElementById("start-screen"),
    signature: document.getElementById("signature-screen"),
    analyzing: document.getElementById("analyzing-screen"),
    result: document.getElementById("result-screen"),
  };

  const box = document.getElementById("signatureBox");
  const canvas = document.getElementById("signature-pad");
  const ctx = canvas.getContext("2d");

  const savedCanvas = document.getElementById("saved-signature");
  const savedCtx = savedCanvas.getContext("2d");
  const bullets = document.getElementById("bullets");

  const s = JSON.parse(localStorage.getItem("settings") || "{}");

  // === Цвета и стили ===
  document.body.style.backgroundColor = s.themeColor || "#0f172a";
  document.documentElement.style.setProperty("--main-color", s.mainColor || "#2563eb");
  document.documentElement.style.setProperty("--text-color", s.textColor || "#ffffff");
  document.documentElement.style.setProperty("--square-color", s.squareColor || "#cccccc");
  document.documentElement.style.setProperty("--square-radius", (s.squareRadius ?? 20) + "px");
  document.documentElement.style.setProperty("--square-bg", s.squareBgColor || "#ffffff");

  const setText = (id, val, def) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || def;
  };
  setText("start-text", s.startTitle, "Нажми на экран");
  setText("start-subtext", s.startSubtitle, "Чтобы расшифровать свою подпись");
  setText("sign-instruction", s.signInstruction, "Распишитесь в квадрате ниже");
  setText("analyzing-text", s.analyzingText, "Анализирую вашу подпись...");

  const mapButtons = {
    back: s.btnStart || "В начало",
    restart: s.btnStart || "В начало",
    reset: s.btnClear || "Стереть",
    analyze: s.btnAnalyze || "Анализировать",
    print: s.btnPrint || "Напечатать",
  };
  for (const id in mapButtons) {
    const el = document.getElementById(id);
    if (el) el.textContent = mapButtons[id];
  }

  // === Заставка ===
  const bgImg = document.getElementById("bg-image");
  const bgVid = document.getElementById("bg-video");
  if (s.splashType === "video" && s.splashFile) {
    bgVid.src = s.splashFile;
    bgVid.style.display = "block";
  } else if (s.splashType === "image" && s.splashFile) {
    bgImg.src = s.splashFile;
    bgImg.style.display = "block";
  }

  // === Переходы ===
  function resizeSavedCanvas() {
    const preview = document.querySelector(".signature-preview");
    if (!preview) return;

    const rect = preview.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = window.devicePixelRatio || 1;
    savedCanvas.style.width = rect.width + "px";
    savedCanvas.style.height = rect.height + "px";
    savedCanvas.width = rect.width * dpr;
    savedCanvas.height = rect.height * dpr;

    savedCtx.setTransform(1, 0, 0, 1, 0, 0);
    savedCtx.fillStyle = s.squareBgColor || "#ffffff";
    savedCtx.fillRect(0, 0, savedCanvas.width, savedCanvas.height);
  }

  function showScreen(target) {
    Object.values(screens).forEach(x => x.classList.remove("active"));
    target.classList.add("active");
    if (target === screens.signature) setTimeout(fitCanvas, 50);
    if (target === screens.result) setTimeout(resizeSavedCanvas, 50);
  }

  screens.start.addEventListener("click", () => showScreen(screens.signature));
  document.getElementById("back").addEventListener("click", () => showScreen(screens.start));
  document.getElementById("restart").addEventListener("click", () => showScreen(screens.start));
  document.getElementById("print").addEventListener("click", () => window.print());

  // === Настройка Canvas ===
  function fitCanvas() {
    const rect = box.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = s.mainColor || "#2563eb";
    ctx.fillStyle = s.squareBgColor || "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }

  window.addEventListener("resize", () => {
    fitCanvas();
    resizeSavedCanvas();
  });
  window.addEventListener("load", fitCanvas);
  fitCanvas();
  setTimeout(fitCanvas, 150);

  // === Плавное рисование с идеальным сглаживанием и толщиной ===
  let drawing = false;
  let points = [];
  let lastWidth = 2;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x, y, time: Date.now() };
  }

  function distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function calcLineWidth(velocity) {
    const minWidth = 0.8;
    const maxWidth = 4.5;
    const maxVelocity = 3.0;
    const v = Math.min(velocity, maxVelocity);
    const newWidth = maxWidth - (v / maxVelocity) * (maxWidth - minWidth);
    const smoothWidth = lastWidth * 0.7 + newWidth * 0.3;
    lastWidth = smoothWidth;
    return smoothWidth;
  }

  function drawBezierCurve(p0, p1, p2) {
    const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    const len = distance(mid1, mid2);
    const timeDiff = p2.time - p0.time;
    const velocity = len / (timeDiff || 1);
    const lineWidth = calcLineWidth(velocity);

    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(mid1.x, mid1.y);
    ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
    ctx.stroke();
  }

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    points = [getPos(e)];
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = getPos(e);
    points.push(p);

    if (points.length < 3) {
      const p1 = points[0];
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, ctx.lineWidth / 2, 0, Math.PI * 2, true);
      ctx.fillStyle = s.mainColor || "#2563eb";
      ctx.fill();
      ctx.closePath();
      return;
    }

    ctx.strokeStyle = s.mainColor || "#2563eb";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const p0 = points[points.length - 3];
    const p1 = points[points.length - 2];
    const p2 = points[points.length - 1];
    drawBezierCurve(p0, p1, p2);
  }

  function stopDraw() {
    drawing = false;
    points = [];
  }

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDraw);
  canvas.addEventListener("mouseleave", stopDraw);
  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove", draw, { passive: false });
  canvas.addEventListener("touchend", stopDraw);

  document.getElementById("reset").addEventListener("click", fitCanvas);

  // === Анализ подписи ===
  const OFFLINE = [
    "Вы человек, который доводит начатое до конца.",
    "Ваша подпись отражает уверенность и внутреннюю гармонию.",
    "Вы открыты к новому и не боитесь перемен.",
    "В вас чувствуется ответственность и креативность.",
    "Подпись указывает на лидерские качества и независимость.",
  ];

  document.getElementById("analyze").addEventListener("click", async () => {
    const dataURL = canvas.toDataURL("image/png");
    showScreen(screens.analyzing);

    const analyzeVideo = document.getElementById("analyze-video");
    const analyzeImage = document.getElementById("analyze-image");
    analyzeVideo.style.display = "none";
    analyzeImage.style.display = "none";
    if (s.analyzeSplashType === "video" && s.analyzeSplashFile) {
      analyzeVideo.src = s.analyzeSplashFile;
      analyzeVideo.style.display = "block";
    } else if (s.analyzeSplashType === "image" && s.analyzeSplashFile) {
      analyzeImage.src = s.analyzeSplashFile;
      analyzeImage.style.display = "block";
    }

    const duration = (s.analyzeDuration || 3) * 1000;
    await wait(duration);

    let pointsList = [];
    if (s.mode === "gpt" && s.apiKey) {
      try {
        const prompt = "Проанализируй подпись и выдай 3–4 коротких позитивных тезиса о характере.";
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + s.apiKey,
          },
          body: JSON.stringify({
            model: s.model || "gpt-4o-mini",
            messages: [
              { role: "system", content: "Ты эксперт-графолог, отвечай кратко списком." },
              { role: "user", content: prompt },
            ],
          }),
        });
        const json = await res.json();
        const text = json?.choices?.[0]?.message?.content || "";
        pointsList = text.split(/\n|•|-/).map(t => t.trim()).filter(Boolean).slice(0, 4);
      } catch {
        pointsList = randomPoints(OFFLINE, 4);
      }
    } else {
      pointsList = randomPoints(OFFLINE, 4);
    }

    showScreen(screens.result);
    resizeSavedCanvas();
    await wait(60);
    await drawColoredSignature(
      dataURL,
      savedCtx,
      savedCanvas.width,
      savedCanvas.height,
      s.mainColor || "#2563eb",
      s.squareBgColor || "#ffffff"
    );

    // === АНИМАЦИЯ ПИШУЩЕГО ТЕКСТА ===
    bullets.innerHTML = "";
    if (pointsList.length === 0) pointsList = randomPoints(OFFLINE, 4);

    if (s.mode !== "gpt") {
        // офлайн — эффект пишущего текста
        let i = 0;
        function typeNext() {
            if (i >= pointsList.length) return;
            const li = document.createElement("li");
            bullets.appendChild(li);
            const text = pointsList[i];
            let j = 0;
            const interval = setInterval(() => {
                li.textContent = text.slice(0, j++);
                if (j > text.length) {
                    clearInterval(interval);
                    i++;
                    setTimeout(typeNext, 400);
                }
            }, 40);
        }
        typeNext();
    } else {
        // GPT — выводим сразу
        pointsList.forEach(text => {
            const li = document.createElement("li");
            li.textContent = text;
            bullets.appendChild(li);
        });
    }

  }); // ←←← ЗАКРЫВАЕМ ОБРАБОТЧИК analyze

  // === Утилиты ===
  function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function randomPoints(arr, n) {
    const copy = [...arr];
    const out = [];
    while (copy.length && out.length < n) {
      const i = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(i, 1)[0]);
    }
    return out;
  }

  function drawColoredSignature(dataURL, ctx, w, h, color, background) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "source-over";
        if (background) {
          ctx.globalCompositeOperation = "destination-over";
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, w, h);
          ctx.globalCompositeOperation = "source-over";
        }
        resolve();
      };
      img.src = dataURL;
    });
  }
}); // ←←← ЗАКРЫВАЕМ DOMContentLoaded
