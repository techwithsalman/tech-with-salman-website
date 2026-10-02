(function () {
  "use strict";

  var VERSION = "2026-09-07-tws-6";
  var NAV_LINKS = [
    { href: "#services", label: "SERVICES" },
    { href: "#projects", label: "PROJECTS" },
    { href: "#honors", label: "AI & AUTOMATION" },
    { href: "#awards", label: "PRODUCTS" },
    { href: "#skills", label: "SKILLS" },
    { href: "#experience", label: "EXPERIENCE" },
    { href: "#social-media-os", label: "SOCIAL MEDIA OS" },
    { href: "#contact", label: "CONTACT" }
  ];
  var SOCIALS = [
    {
      key: "linkedin",
      label: "LinkedIn",
      text: "Salman Khan",
      detail: "Salman Khan",
      url: "https://www.linkedin.com/in/salman-khan-151a53430?utm_source=share_via&utm_content=profile&utm_medium=member_android",
      icon: '<path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z"></path>'
    },
    {
      key: "instagram",
      label: "Instagram",
      text: "@salman.aicreator",
      detail: "@salman.aicreator",
      url: "https://www.instagram.com/salman.aicreator?igsi=eGdnNWtzd2M1aHFn",
      icon: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>',
      outline: true
    },
    {
      key: "facebook",
      label: "Facebook",
      text: "Tech With Salman",
      detail: "Tech With Salman",
      url: "https://www.facebook.com/share/19Qq9k3cSA/",
      icon: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3.4l.6-4H14V7a1 1 0 0 1 1-1h3z"></path>'
    },
    {
      key: "tiktok",
      label: "TikTok",
      text: "@salmaneditz25",
      detail: "Salman Editz",
      url: "https://www.tiktok.com/@salmaneditz25?_r=1&_t=ZS-99ApsSZXez7",
      icon: '<path d="M13.4 2h3.1c.25 1.45 1.03 2.64 2.18 3.45.75.52 1.62.82 2.62.9v3.15a7 7 0 0 1-4.3-1.35v6.2a6.15 6.15 0 1 1-5.28-6.1v3.25a2.95 2.95 0 1 0 2.1 2.82V2z"></path>'
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      text: "+923152181308",
      detail: "+923152181308",
      url: "https://wa.me/923152181308",
      icon: '<path d="M20.5 11.8a8.4 8.4 0 0 1-12.4 7.4L3 20.7l1.6-4.9A8.4 8.4 0 1 1 20.5 11.8z"></path><path d="M9.2 8.1c.2-.45.42-.46.62-.46h.53c.18 0 .46.07.7.35.24.28.92.9.92 2.18s-.94 2.52-1.07 2.7c-.13.17-.18.32-.05.56.13.24.58.95 1.25 1.54.86.77 1.58 1.01 1.82 1.13.24.12.38.1.52-.06.15-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.42.67 1.66.79.24.12.4.18.46.28.06.1.06.58-.14 1.14-.2.55-1.12 1.06-1.55 1.1-.4.04-.92.06-1.5-.1-.34-.1-.78-.25-1.35-.5-2.37-1.02-3.93-3.4-4.05-3.56-.12-.16-.97-1.3-.97-2.48s.62-1.75.84-1.99c.22-.24.48-.3.64-.3z"></path>',
      outline: true
    },
    {
      key: "github",
      label: "GitHub",
      text: "Tech With Salman",
      detail: "Tech With Salman",
      url: "https://github.com/TechWithSalman",
      icon: '<path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"></path>'
    }
  ];

  function iconMarkup(item, size) {
    var attrs = item.outline
      ? 'fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
      : 'fill="#ffffff"';
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" ' + attrs + ' aria-hidden="true">' + item.icon + "</svg>";
  }

  function externalAttrs(label) {
    return ' target="_blank" rel="noopener noreferrer" aria-label="' + label + '"';
  }

  function dockItem(item) {
    return '<a href="' + item.url + '"' + externalAttrs(item.label + " - " + item.text) + ' class="dock-item" data-social="' + item.key + '">' + iconMarkup(item, 20) + '<span class="dock-tooltip">' + item.text + "</span></a>";
  }

  function qrItem(item) {
    return '<a href="' + item.url + '"' + externalAttrs(item.label + " - " + item.text) + ' class="qr-card" data-social="' + item.key + '"><div class="qr-placeholder" style="background:var(--accent-red);width:44px;height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center">' + iconMarkup(item, 24) + '</div><div class="qr-text"><h4>' + item.label.toUpperCase() + "</h4><p>" + item.text + "</p></div></a>";
  }

  function contactItem(item) {
    return '<a href="' + item.url + '"' + externalAttrs(item.label + " - " + item.text) + ' class="contact-item" data-social="' + item.key + '"><span class="contact-icon-box">' + iconMarkup(item, 16) + "</span>" + item.text + "</a>";
  }

  function menuIcon(item) {
    return '<a href="' + item.url + '"' + externalAttrs(item.label + " - " + item.text) + ' data-social="' + item.key + '">' + iconMarkup(item, 20) + "</a>";
  }

  function closeFallbackMobileMenu(button) {
    var fallback = document.querySelector(".mobile-menu-overlay.tws-fallback-menu");
    if (fallback) fallback.remove();
    if (button) button.classList.remove("open");
    document.body.classList.remove("mobile-menu-open");
    if (window.__twsFallbackEscape) {
      document.removeEventListener("keydown", window.__twsFallbackEscape);
      window.__twsFallbackEscape = null;
    }
  }

  function openFallbackMobileMenu(button) {
    closeFallbackMobileMenu(button);
    var overlay = document.createElement("div");
    overlay.className = "mobile-menu-overlay tws-fallback-menu";
    var nav = document.createElement("nav");
    nav.className = "mobile-menu-dropdown";
    NAV_LINKS.forEach(function (item) {
      var link = document.createElement("a");
      link.href = item.href;
      link.textContent = item.label;
      link.addEventListener("click", function () {
        closeFallbackMobileMenu(button);
      });
      nav.appendChild(link);
    });
    var aiLink = document.createElement("a");
    aiLink.href = "#social-media-os";
    aiLink.className = "nav-ai-cta";
    aiLink.innerHTML = '<span>EXPLORE SOCIAL MEDIA OS</span><span class="nav-cta-arrow">-&gt;</span>';
    aiLink.addEventListener("click", function () {
      closeFallbackMobileMenu(button);
    });
    nav.appendChild(aiLink);
    var row = document.createElement("div");
    row.className = "mobile-social-row";
    row.innerHTML = SOCIALS.map(menuIcon).join("");
    nav.appendChild(row);
    overlay.appendChild(nav);
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) closeFallbackMobileMenu(button);
    });
    window.__twsFallbackEscape = function (event) {
      if (event.key === "Escape") closeFallbackMobileMenu(button);
    };
    document.addEventListener("keydown", window.__twsFallbackEscape);
    document.body.appendChild(overlay);
    document.body.classList.add("mobile-menu-open");
    if (button) button.classList.add("open");
  }

  function installMobileMenuFallback() {
    var button = document.querySelector(".mobile-menu-btn");
    if (!button || button.getAttribute("data-tws-fallback") === VERSION) return;
    button.setAttribute("data-tws-fallback", VERSION);
    button.addEventListener("click", function () {
      var fallback = document.querySelector(".mobile-menu-overlay.tws-fallback-menu");
      if (fallback) {
        closeFallbackMobileMenu(button);
        return;
      }
      var hadOverlay = Boolean(document.querySelector(".mobile-menu-overlay"));
      setTimeout(function () {
        var overlay = document.querySelector(".mobile-menu-overlay");
        if (overlay) {
          updateMobileMenu();
          return;
        }
        if (!hadOverlay) openFallbackMobileMenu(button);
      }, 80);
    });
  }

  function installCursorFallback() {
    if (window.__twsCursorFallback) return;
    var isFine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    if (!isFine) return;
    var dot = document.querySelector(".cursor-dot");
    var ring = document.querySelector(".cursor-ring");
    var canvas = document.getElementById("spider-web-cursor-canvas");
    if (!dot || !ring || !canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    window.__twsCursorFallback = true;
    var mouseX = -100;
    var mouseY = -100;
    var ringX = -100;
    var ringY = -100;
    var particles = [];

    function resizeCanvas() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function addParticle(x, y, burst) {
      if (burst) {
        var count = 14;
        for (var s = 0; s < count; s++) {
          var angle = (s / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
          var speed = 2.5 + Math.random() * 4.5;
          particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            decay: 0.032 + Math.random() * 0.018,
            size: 2.2 + Math.random() * 2
          });
        }
      } else {
        particles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          life: 1,
          decay: 0.018 + Math.random() * 0.02,
          size: 2 + Math.random() * 2
        });
      }
      if (particles.length > 48) particles.splice(0, particles.length - 48);
    }

    function spawnRipple(x, y) {
      var ripple = document.createElement("div");
      ripple.className = "cursor-ripple";
      ripple.style.left = x + "px";
      ripple.style.top = y + "px";
      ripple.style.width = "40px";
      ripple.style.height = "40px";
      document.body.appendChild(ripple);
      setTimeout(function () {
        if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
      }, 650);
    }

    function onMove(event) {
      mouseX = event.clientX;
      mouseY = event.clientY;
      dot.style.left = mouseX + "px";
      dot.style.top = mouseY + "px";
      if (Math.random() < 0.4) addParticle(mouseX, mouseY, false);
    }

    function onDown(event) {
      if (event.button !== 0 && event.button !== undefined) return;
      spawnRipple(event.clientX, event.clientY);
      addParticle(event.clientX, event.clientY, true);
    }

    function bindHoverTargets() {
      var selector = "a, button, .project-card, .cert-card, .qr-card, .tool-card, .service-card, .shimmer-btn, .dock-item, .contact-item, .view-all-link";
      document.querySelectorAll(selector).forEach(function (node) {
        if (node.getAttribute("data-tws-hover-bound") === VERSION) return;
        node.setAttribute("data-tws-hover-bound", VERSION);
        node.addEventListener("mouseenter", function () {
          dot.classList.add("hovered");
          ring.classList.add("hovered");
        });
        node.addEventListener("mouseleave", function () {
          dot.classList.remove("hovered");
          ring.classList.remove("hovered");
        });
      });
    }

    function disableOnTouch() {
      dot.style.display = "none";
      ring.style.display = "none";
      canvas.style.display = "none";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
    }

    window.addEventListener("touchstart", disableOnTouch, { once: true, passive: true });

    function draw() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.left = ringX + "px";
      ring.style.top = ringY + "px";
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) {
          particles.splice(i, 1);
          i--;
          continue;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(232, 0, 26, " + (0.85 * p.life) + ")";
        ctx.fill();

        var distCursor = Math.hypot(mouseX - p.x, mouseY - p.y);
        if (distCursor < 180) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouseX, mouseY);
          ctx.strokeStyle = "rgba(232, 0, 26, " + ((1 - distCursor / 180) * p.life * 0.7) + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        for (var j = i + 1; j < particles.length; j++) {
          var p2 = particles[j];
          var distP = Math.hypot(p2.x - p.x, p2.y - p.y);
          if (distP < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = "rgba(255, 255, 255, " + ((1 - distP / 110) * Math.min(p.life, p2.life) * 0.35) + ")";
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }

    resizeCanvas();
    bindHoverTargets();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    setInterval(bindHoverTargets, 1200);
    requestAnimationFrame(draw);
  }

  function installHeroCanvasFallback() {
    var canvas = document.getElementById("hero-canvas");
    if (!canvas || canvas.getAttribute("data-tws-canvas") === VERSION) return;
    var ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    canvas.setAttribute("data-tws-canvas", VERSION);
    var dpr = 1;
    var progress = 0;
    var eased = 0;
    var points = [];

    function seedPoints() {
      points = [];
      for (var i = 0; i < 34; i++) {
        var xSeed = Math.sin(i * 12.9898) * 43758.5453;
        var ySeed = Math.sin(i * 78.233) * 23454.21;
        points.push({
          x: xSeed - Math.floor(xSeed),
          y: ySeed - Math.floor(ySeed),
          phase: i * 0.47
        });
      }
    }

    function resizeHeroCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function updateProgress() {
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress = Math.max(0, Math.min(1, (window.scrollY || document.documentElement.scrollTop || 0) / max));
    }

    function drawHeroCanvas() {
      var width = window.innerWidth;
      var height = window.innerHeight;
      eased += (progress - eased) * 0.08;
      ctx.fillStyle = "#0a0404";
      ctx.fillRect(0, 0, width, height);
      var glow = ctx.createRadialGradient(width * 0.78, height * 0.18, 0, width * 0.78, height * 0.18, Math.max(width, height) * 0.72);
      glow.addColorStop(0, "rgba(232, 0, 26, 0.24)");
      glow.addColorStop(0.48, "rgba(120, 0, 18, 0.12)");
      glow.addColorStop(1, "rgba(10, 4, 4, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      var mapped = points.map(function (point, index) {
        return {
          x: point.x * width + Math.sin(eased * 8 + point.phase) * 38,
          y: point.y * height + Math.cos(eased * 7 + point.phase) * 32,
          index: index
        };
      });
      for (var i = 0; i < mapped.length; i++) {
        for (var j = i + 1; j < mapped.length; j++) {
          var distance = Math.hypot(mapped[i].x - mapped[j].x, mapped[i].y - mapped[j].y);
          if (distance < 230) {
            ctx.beginPath();
            ctx.moveTo(mapped[i].x, mapped[i].y);
            ctx.lineTo(mapped[j].x, mapped[j].y);
            ctx.strokeStyle = "rgba(255, 255, 255, " + ((1 - distance / 230) * 0.13) + ")";
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      mapped.forEach(function (point) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1.5 + Math.sin(eased * 12 + point.index) * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(232, 0, 26, 0.55)";
        ctx.fill();
      });
      requestAnimationFrame(drawHeroCanvas);
    }

    seedPoints();
    resizeHeroCanvas();
    updateProgress();
    window.addEventListener("resize", resizeHeroCanvas);
    window.addEventListener("scroll", updateProgress, { passive: true });
    requestAnimationFrame(drawHeroCanvas);
  }

  function installLanyardFallback() {
    var wrapper = document.getElementById("id-card-lanyard-wrapper");
    var card = document.getElementById("hanging-id-card");
    var strap = document.getElementById("lanyard-strap");
    var heroRight = document.querySelector(".hero-right");
    if (!wrapper || !card || wrapper.getAttribute("data-tws-lanyard") === VERSION) return;
    wrapper.setAttribute("data-tws-lanyard", VERSION);
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var x = 0;
    var y = 0;
    var vx = 0;
    var vy = 0;
    var stretch = 0;
    var targetTiltX = 0;
    var targetTiltY = 0;
    var currentTiltX = 0;
    var currentTiltY = 0;

    function point(event) {
      var touch = event.touches && event.touches[0];
      return { x: touch ? touch.clientX : event.clientX, y: touch ? touch.clientY : event.clientY };
    }

    function onHeroMouseMove(event) {
      if (dragging) return;
      var targetElem = heroRight || wrapper;
      var rect = targetElem.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = (event.clientX - cx) / (rect.width / 2);
      var dy = (event.clientY - cy) / (rect.height / 2);
      targetTiltX = Math.max(-7, Math.min(7, -dy * 7));
      targetTiltY = Math.max(-9, Math.min(9, dx * 9));
    }

    function onHeroMouseLeave() {
      targetTiltX = 0;
      targetTiltY = 0;
    }

    if (heroRight) {
      heroRight.addEventListener("mousemove", onHeroMouseMove, { passive: true });
      heroRight.addEventListener("mouseleave", onHeroMouseLeave);
    }

    function render() {
      var rotate = 0.16 * x;
      var rotateX = Math.min(22, Math.max(-22, -0.07 * y));
      var rotateY = Math.min(22, Math.max(-22, 0.07 * x));
      wrapper.style.transform = "translate3d(" + x + "px, " + y + "px, 0) rotate(" + rotate + "deg)";
      card.style.transform = "perspective(900px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg)";
      if (strap) strap.style.transform = "scaleY(" + (1 + stretch) + ")";
    }

    function animateIdle(time) {
      if (!dragging) {
        vx = (vx + -0.048 * x) * 0.915;
        vy = (vy + -0.048 * y) * 0.915;
        x += vx;
        y += vy;
        stretch = Math.max(-0.1, 0.0035 * y);

        currentTiltX += (targetTiltX - currentTiltX) * 0.08;
        currentTiltY += (targetTiltY - currentTiltY) * 0.08;

        if (Math.abs(x) < 0.08 && Math.abs(y) < 0.08 && Math.abs(vx) < 0.08 && Math.abs(vy) < 0.08) {
          x = 0;
          y = 0;
          var floatY = Math.sin(time * 0.0016) * 4.2;
          var sway = 2.2 * Math.sin(time * 0.0012);
          wrapper.style.transform = "translate3d(0, " + floatY.toFixed(2) + "px, 0) rotate(" + sway.toFixed(2) + "deg)";
          card.style.transform = "perspective(900px) rotateX(" + currentTiltX.toFixed(2) + "deg) rotateY(" + currentTiltY.toFixed(2) + "deg)";
          if (strap) strap.style.transform = "scaleY(1)";
        } else {
          render();
        }
      }
      requestAnimationFrame(animateIdle);
    }

    function onStart(event) {
      if (event.cancelable) event.preventDefault();
      var p = point(event);
      dragging = true;
      startX = p.x - x;
      startY = p.y - y;
      wrapper.style.transition = "none";
      card.style.transition = "none";
      if (strap) strap.style.transition = "none";
    }

    function onMove(event) {
      if (!dragging) return;
      if (event.cancelable) event.preventDefault();
      var p = point(event);
      var nextX = (p.x - startX) * 0.85;
      var nextY = (p.y - startY) * 0.85;
      var distance = Math.hypot(nextX, nextY);
      var limit = distance > 380 ? (380 + (distance - 380) * 0.3) / distance : 1;
      vx = (nextX * limit - x) * 0.7;
      vy = (nextY * limit - y) * 0.7;
      x = nextX * limit;
      y = nextY * limit;
      stretch = Math.max(-0.1, 0.0035 * y);
      render();
    }

    function onEnd() {
      dragging = false;
    }

    wrapper.addEventListener("mousedown", onStart);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    wrapper.addEventListener("touchstart", onStart, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    requestAnimationFrame(animateIdle);
  }

  function installContactModalFallback() {
    var modal = document.querySelector(".modal-backdrop");
    var buttons = Array.prototype.slice.call(document.querySelectorAll("button, a")).filter(function (node) {
      return node.textContent.replace(/\s+/g, " ").trim().toUpperCase().indexOf("GET IN TOUCH") >= 0;
    });
    if (!modal || !buttons.length) return;

    function closeModal() {
      modal.classList.remove("active");
      document.body.classList.remove("modal-open");
    }

    function openModal() {
      modal.classList.add("active");
      document.body.classList.add("modal-open");
      var firstInput = modal.querySelector("input, textarea, button");
      if (firstInput) setTimeout(function () { firstInput.focus(); }, 80);
    }

    buttons.forEach(function (button) {
      if (button.getAttribute("data-tws-modal-fallback") === VERSION) return;
      button.setAttribute("data-tws-modal-fallback", VERSION);
      button.addEventListener("click", function () {
        openModal();
      });
    });

    if (modal.getAttribute("data-tws-modal-bound") === VERSION) return;
    modal.setAttribute("data-tws-modal-bound", VERSION);
    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeModal();
    });
    var closeButton = modal.querySelector(".modal-close");
    if (closeButton) closeButton.addEventListener("click", closeModal);
    var form = modal.querySelector("form");
    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var card = modal.querySelector(".modal-card");
        if (!card) return;
        card.innerHTML = '<button class="modal-close" aria-label="Close contact modal">x</button><div style="text-align:center;padding:30px 10px"><span style="font-size:48px;color:var(--accent-red)">OK</span><h3 style="font-family:Bebas Neue, sans-serif;font-size:28px;color:#fff;margin-top:10px">MESSAGE READY</h3><p style="font-size:13px;color:var(--text-muted);margin-top:6px">Thanks. Use the contact links on the page to send your project details directly.</p></div>';
        var freshClose = card.querySelector(".modal-close");
        if (freshClose) freshClose.addEventListener("click", closeModal);
      });
    }
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeModal();
    });
  }

  function installGalleryFallback() {
    if (document.body.getAttribute("data-tws-gallery-fallback") === VERSION) return;
    var items = document.querySelectorAll(".gallery-grid .project-card, .gallery-grid [title*='Click']");
    if (!items.length) return;
    document.body.setAttribute("data-tws-gallery-fallback", VERSION);
    items.forEach(function (item) {
      item.addEventListener("click", function () {
        setTimeout(function () {
          if (document.querySelector(".tws-lightbox")) return;
          var image = item.querySelector("img");
          if (!image) return;
          var overlay = document.createElement("div");
          overlay.className = "tws-lightbox";
          overlay.innerHTML = '<button class="tws-lightbox-close" aria-label="Close photo preview">x</button><figure><img src="' + image.src + '" alt="' + (image.alt || "Project preview") + '"><figcaption>' + (image.alt || "Project preview") + "</figcaption></figure>";
          overlay.addEventListener("click", function (event) {
            if (event.target === overlay || event.target.className === "tws-lightbox-close") overlay.remove();
          });
          document.body.appendChild(overlay);
        }, 80);
      });
    });
  }

  function ensureBranding() {
    document.title = "Tech With Salman - Salman Khan Developer";
    var brand = document.querySelector(".nav-brand");
    if (brand && brand.getAttribute("data-tws-version") !== VERSION) {
      brand.innerHTML = '<span class="brand-name">TECH WITH SALMAN</span><span class="separator">/</span><span class="brand-person">SALMAN KHAN</span><span class="separator">/</span><span class="brand-sub">DEVELOPER</span>';
      brand.setAttribute("data-tws-version", VERSION);
    }

    var metaUpdates = [
      ['meta[name="author"]', "content", "Salman Khan"],
      ['meta[name="description"]', "content", "Developer portfolio for Salman Khan and Tech With Salman, featuring premium web, WordPress, UI, and AI project work from Karachi, Pakistan."],
      ['meta[property="og:title"]', "content", "Tech With Salman - Salman Khan Developer"],
      ['meta[property="og:description"]', "content", "Premium developer portfolio for Salman Khan, focused on web experiences, WordPress builds, UI systems, and AI projects."],
      ['meta[property="og:site_name"]', "content", "Tech With Salman"],
      ['meta[name="twitter:title"]', "content", "Tech With Salman - Salman Khan Developer"],
      ['meta[name="twitter:description"]', "content", "Premium developer portfolio for Salman Khan, focused on web experiences, WordPress builds, UI systems, and AI projects."]
    ];
    metaUpdates.forEach(function (entry) {
      var node = document.querySelector(entry[0]);
      if (node) node.setAttribute(entry[1], entry[2]);
    });

    var heroName = document.getElementById("site-hero-name");
    if (heroName && heroName.textContent.trim() === "SALMAN") {
      heroName.textContent = "SALMAN KHAN";
    }

    var cardName = document.querySelector(".card-name-block span");
    if (cardName) {
      cardName.textContent = "SALMAN";
    }
  }

  function ensureAiProjectsAnchor() {
    if (document.getElementById("ai-projects")) return;
    var projects = document.getElementById("projects");
    if (!projects || !projects.parentNode) return;
    var anchor = document.createElement("div");
    anchor.id = "ai-projects";
    anchor.className = "ai-projects-anchor";
    anchor.setAttribute("aria-hidden", "true");
    projects.parentNode.insertBefore(anchor, projects.nextSibling);
  }

  function ensureAiNavLink() {
    var desktopNav = document.querySelector(".nav-desktop");
    if (desktopNav && !desktopNav.querySelector('a[href="#social-media-os"]')) {
      var oldLink = desktopNav.querySelector('.nav-ai-cta');
      if (oldLink) oldLink.remove();
      var link = document.createElement("a");
      link.href = "#social-media-os";
      link.className = "nav-ai-cta";
      link.innerHTML = '<span>EXPLORE SOCIAL MEDIA OS</span><span class="nav-cta-arrow">-&gt;</span>';
      desktopNav.appendChild(link);
    }

    var mobileNav = document.querySelector(".mobile-menu-dropdown");
    if (mobileNav && !mobileNav.querySelector('a[href="#social-media-os"]')) {
      var oldMobile = mobileNav.querySelector('.nav-ai-cta');
      if (oldMobile) oldMobile.remove();
      var mobileLink = document.createElement("a");
      mobileLink.href = "#social-media-os";
      mobileLink.className = "nav-ai-cta";
      mobileLink.innerHTML = '<span>EXPLORE SOCIAL MEDIA OS</span><span class="nav-cta-arrow">-&gt;</span>';
      mobileLink.addEventListener("click", function () {
        document.body.classList.remove("mobile-menu-open");
      });
      mobileNav.appendChild(mobileLink);
    }
  }

  function updateDock() {
    var dock = document.getElementById("vengence-glass-dock");
    if (!dock || dock.getAttribute("data-tws-version") === VERSION) return;
    var cv = '<a href="Salman_CV.pdf" download="Salman_CV.pdf" class="dock-item" aria-label="Download CV"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><polyline points="9 15 12 18 15 15"></polyline></svg><span class="dock-tooltip">Download CV</span></a>';
    dock.innerHTML = SOCIALS.map(dockItem).join("") + cv;
    dock.setAttribute("data-tws-version", VERSION);
  }

  function updateProfileCards() {
    var headings = Array.prototype.slice.call(document.querySelectorAll(".section-title"));
    var heading = headings.find(function (node) {
      return node.textContent.trim().toUpperCase() === "CONNECT & PROFILES";
    });
    if (!heading) return;
    var column = heading.closest(".info-column");
    var grid = column && column.querySelector(".qr-grid");
    if (!grid || grid.getAttribute("data-tws-version") === VERSION) return;
    grid.innerHTML = SOCIALS.map(qrItem).join("");
    grid.setAttribute("data-tws-version", VERSION);
  }

  function updateContactList() {
    var list = document.querySelector("#contact .contact-list");
    if (!list || list.getAttribute("data-tws-version") === VERSION) return;
    var email = '<a href="mailto:hello@salman.design" class="contact-item"><span class="contact-icon-box"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></span>hello@salman.design</a>';
    var location = '<div class="contact-item"><span class="contact-icon-box"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span>Karachi, Pakistan</div>';
    list.innerHTML = email + SOCIALS.map(contactItem).join("") + location;
    list.setAttribute("data-tws-version", VERSION);
  }

  function updateMobileMenu() {
    var overlay = document.querySelector(".mobile-menu-overlay");
    document.body.classList.toggle("mobile-menu-open", Boolean(overlay));
    if (!overlay) return;
    ensureAiNavLink();
    var dropdown = overlay.querySelector(".mobile-menu-dropdown");
    if (dropdown && !dropdown.querySelector(".mobile-social-row")) {
      var row = document.createElement("div");
      row.className = "mobile-social-row";
      row.innerHTML = SOCIALS.map(menuIcon).join("");
      dropdown.appendChild(row);
    }
  }

  function installNavScrollspy() {
    var nav = document.getElementById("vengence-nav-links");
    var pill = document.getElementById("nav-spotlight-pill");
    var links = nav ? Array.prototype.slice.call(nav.querySelectorAll("a:not(.nav-ai-cta)")) : [];
    if (!nav || !links.length) return;
    if (nav.getAttribute("data-tws-scrollspy") === VERSION) return;
    nav.setAttribute("data-tws-scrollspy", VERSION);

    var activeId = "";

    function positionPill(link) {
      if (!pill || !link) {
        if (pill) pill.style.opacity = "0";
        return;
      }
      var navRect = nav.getBoundingClientRect();
      var linkRect = link.getBoundingClientRect();
      if (linkRect.width === 0 || linkRect.height === 0) return;
      var left = linkRect.left - navRect.left;
      var top = linkRect.top - navRect.top;
      pill.style.transform = "translate3d(" + left + "px, " + top + "px, 0)";
      pill.style.width = linkRect.width + "px";
      pill.style.height = linkRect.height + "px";
      pill.style.opacity = "1";
    }

    function setActive(id) {
      if (!id || id === activeId) return;
      activeId = id;
      links.forEach(function (l) {
        var isMatch = l.getAttribute("href") === "#" + id;
        l.classList.toggle("active", isMatch);
        if (isMatch && !nav.matches(":hover")) positionPill(l);
      });
      document.querySelectorAll(".mobile-menu-dropdown a:not(.nav-ai-cta)").forEach(function (ml) {
        ml.classList.toggle("active", ml.getAttribute("href") === "#" + id);
      });
    }

    links.forEach(function (link) {
      link.addEventListener("mouseenter", function () {
        positionPill(link);
      });
      link.addEventListener("click", function (e) {
        var href = link.getAttribute("href");
        if (href && href.charAt(0) === "#") {
          var target = document.querySelector(href);
          if (target) {
            e.preventDefault();
            var headerHeight = 72;
            var targetTop = target.getBoundingClientRect().top + window.scrollY - headerHeight;
            window.scrollTo({ top: targetTop, behavior: "smooth" });
            setActive(href.substring(1));
          }
        }
      });
    });

    nav.addEventListener("mouseleave", function () {
      var currentActive = links.find(function (l) { return l.classList.contains("active"); }) || links[0];
      if (currentActive) positionPill(currentActive);
      else if (pill) pill.style.opacity = "0";
    });

    var sectionIds = ["services", "projects", "honors", "awards", "skills", "experience", "social-media-os", "gallery", "contact"];
    var sections = sectionIds.map(function (id) {
      return document.getElementById(id);
    }).filter(Boolean);

    function onScroll() {
      var scrollPos = window.scrollY + 160;
      var current = "";
      for (var i = sections.length - 1; i >= 0; i--) {
        var sec = sections[i];
        var top = sec.getBoundingClientRect().top + window.scrollY;
        if (scrollPos >= top - 60) {
          current = sec.id;
          break;
        }
      }
      if (current) {
        setActive(current);
      } else {
        activeId = "";
        links.forEach(function (l) { l.classList.remove("active"); });
        if (pill) pill.style.opacity = "0";
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    setTimeout(function () {
      onScroll();
    }, 200);
  }

  function markRevealTargets() {
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var selector = [
      ".section-wrapper:not(.hero-section)",
      ".section-header",
      ".section-title",
      ".service-card",
      ".pillar-card",
      ".project-card",
      ".cert-card",
      ".timeline-item",
      ".testimonial-box",
      ".tools-box",
      ".contact-section",
      ".contact-left",
      ".hero-quote-card",
      ".stats-container",
      ".shimmer-btn:not(.hero-actions .shimmer-btn)",
      ".view-all-link"
    ].join(", ");

    var targets = document.querySelectorAll(selector);
    var windowH = window.innerHeight || document.documentElement.clientHeight;

    targets.forEach(function (node) {
      if (!node.classList.contains("reveal-up")) {
        node.classList.add("reveal-up");
        var parentGrid = node.closest(".services-grid, .pillars-grid, .projects-grid, .certs-grid, .certs-grid-4, .gallery-grid, .qr-grid");
        if (parentGrid) {
          var childIdx = Array.prototype.indexOf.call(parentGrid.children, node);
          if (childIdx >= 0) {
            node.classList.add("reveal-stagger-" + ((childIdx % 4) + 1));
          }
        }
      }

      var rect = node.getBoundingClientRect();
      var isVisibleNow = rect.top < windowH && rect.bottom > 0;
      if (reduceMotion || isVisibleNow) {
        node.classList.add("in-view");
      }
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach(function (node) { node.classList.add("in-view"); });
      return;
    }

    if (!window.__twsRevealObserver) {
      window.__twsRevealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            window.__twsRevealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    }

    targets.forEach(function (node) {
      if (!node.classList.contains("in-view")) {
        window.__twsRevealObserver.observe(node);
      }
    });
  }

  function installCanvasImageSequence() {
    var canvas = document.getElementById("salman-scroll-canvas");
    var cinemaBg = document.getElementById("global-cinema-bg-layer");
    if (!canvas || !cinemaBg) return;

    if (cinemaBg.getAttribute("data-tws-canvas-seq") === VERSION) return;
    cinemaBg.setAttribute("data-tws-canvas-seq", VERSION);

    var ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    var TOTAL_FRAMES = 333;
    var CANVAS_WIDTH = 1440;
    var CANVAS_HEIGHT = 810;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    function getFrameSrc(index) {
      var num = index + 1;
      var pad = num < 10 ? "000" + num : (num < 100 ? "00" + num : (num < 1000 ? "0" + num : "" + num));
      return "assets/salman-frames/frame_" + pad + ".webp?v=salman-final-clean-3";
    }

    // Bounded in-memory frame cache (LRU)
    var MAX_CACHE_SIZE = 120;
    var imageCache = new Map();
    var lastRenderedImg = null;
    var lastRenderedIndex = -1;

    function getOrLoadFrame(index) {
      if (index < 0) index = 0;
      if (index >= TOTAL_FRAMES) index = TOTAL_FRAMES - 1;

      if (imageCache.has(index)) {
        var existing = imageCache.get(index);
        // Refresh LRU order
        imageCache.delete(index);
        imageCache.set(index, existing);
        return existing;
      }

      var img = new Image();
      img.src = getFrameSrc(index);
      img.onload = function () {
        img._loaded = true;
        if (Math.round(displayFrame) === index || lastRenderedIndex === -1) {
          drawFrame(index);
        }
      };
      if (img.complete && img.naturalWidth > 0) {
        img._loaded = true;
      }

      if (imageCache.size >= MAX_CACHE_SIZE) {
        // Evict oldest unused entry
        var oldestKey = imageCache.keys().next().value;
        imageCache.delete(oldestKey);
      }

      imageCache.set(index, img);
      return img;
    }

    function preloadWindow(centerIndex) {
      var start = Math.max(0, centerIndex - 20);
      var end = Math.min(TOTAL_FRAMES - 1, centerIndex + 35);
      for (var i = start; i <= end; i++) {
        getOrLoadFrame(i);
      }
    }

    function drawFrame(index) {
      var img = imageCache.get(index);
      if (img && img.complete && img.naturalWidth > 0) {
        img._loaded = true;
      }

      if (!img || !img._loaded) {
        // Find closest cached & loaded neighbor to prevent blank canvas or flicker
        var bestImg = lastRenderedImg;
        if (!bestImg || !bestImg._loaded) {
          var minDelta = 9999;
          imageCache.forEach(function (cachedImg, cachedIdx) {
            if (cachedImg._loaded || (cachedImg.complete && cachedImg.naturalWidth > 0)) {
              cachedImg._loaded = true;
              var delta = Math.abs(cachedIdx - index);
              if (delta < minDelta) {
                minDelta = delta;
                bestImg = cachedImg;
              }
            }
          });
        }
        if (bestImg && bestImg._loaded) {
          ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.drawImage(bestImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
        return;
      }

      lastRenderedImg = img;
      lastRenderedIndex = index;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // Initial poster frame
    var initialImg = getOrLoadFrame(0);
    if (initialImg.complete && initialImg.naturalWidth > 0) {
      initialImg._loaded = true;
      drawFrame(0);
    }

    // Preload initial buffer
    for (var f = 0; f < Math.min(30, TOTAL_FRAMES); f++) {
      getOrLoadFrame(f);
    }

    // Cached layout boundaries
    var animStartY = 0;
    var animEndY = 1;
    var animScrollRange = 1;

    var targetProgress = 0;
    var smoothProgress = 0;
    var targetFrame = 0;
    var displayFrame = 0;

    function updateLayoutBounds() {
      var heroEl = document.getElementById("hero");
      var galleryEl = document.getElementById("gallery");
      var experienceEl = document.getElementById("experience");
      var contactEl = document.getElementById("contact");

      animStartY = heroEl ? heroEl.offsetTop : 0;
      if (galleryEl) {
        animEndY = galleryEl.offsetTop + galleryEl.offsetHeight;
      } else if (experienceEl) {
        animEndY = experienceEl.offsetTop + experienceEl.offsetHeight;
      } else if (contactEl) {
        animEndY = contactEl.offsetTop;
      } else {
        animEndY = (document.documentElement.scrollHeight - window.innerHeight) * 0.88;
      }

      animScrollRange = Math.max(1, animEndY - animStartY);
    }

    function updateScrollTarget() {
      var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      var rawProgress = (scrollY - animStartY) / animScrollRange;
      targetProgress = Math.min(1, Math.max(0, rawProgress));
      targetFrame = targetProgress * (TOTAL_FRAMES - 1);

      preloadWindow(Math.round(targetFrame));

      // Graceful fade out after gallery toward contact/footer
      if (rawProgress > 1.06) {
        var fadeOut = (rawProgress - 1.06) / 0.28;
        cinemaBg.style.opacity = Math.max(0, 1 - fadeOut).toFixed(3);
      } else {
        cinemaBg.style.opacity = "1";
      }
    }

    window.addEventListener("scroll", updateScrollTarget, { passive: true });
    window.addEventListener("resize", function () {
      updateLayoutBounds();
      updateScrollTarget();
    }, { passive: true });
    window.addEventListener("orientationchange", function () {
      updateLayoutBounds();
      updateScrollTarget();
    }, { passive: true });

    updateLayoutBounds();
    updateScrollTarget();

    // Subtle 3D Mouse Parallax
    var targetTiltX = 0;
    var targetTiltY = 0;
    var currentTiltX = 0;
    var currentTiltY = 0;

    window.addEventListener("mousemove", function (e) {
      var cx = window.innerWidth / 2;
      var cy = window.innerHeight / 2;
      var dx = (e.clientX - cx) / cx;
      var dy = (e.clientY - cy) / cy;
      targetTiltX = Math.max(-2.5, Math.min(2.5, -dy * 2.5));
      targetTiltY = Math.max(-3, Math.min(3, dx * 3));
    }, { passive: true });

    // Smooth inertia interpolation constant (0.16 = buttery smooth & responsive frame easing)
    var LERP_FACTOR = 0.16;

    function rafLoop() {
      var fDiff = targetFrame - displayFrame;
      if (Math.abs(fDiff) > 0.001) {
        displayFrame += fDiff * LERP_FACTOR;
      } else {
        displayFrame = targetFrame;
      }

      var pDiff = targetProgress - smoothProgress;
      if (Math.abs(pDiff) > 0.0001) {
        smoothProgress += pDiff * LERP_FACTOR;
      } else {
        smoothProgress = targetProgress;
      }

      var renderIndex = Math.round(displayFrame);
      if (renderIndex !== lastRenderedIndex) {
        drawFrame(renderIndex);
      }

      // Smooth subtle zoom toward Salman as scroll progresses
      var zoomScale = 1.0 + smoothProgress * 0.05;
      canvas.style.transform = "translate(-50%, -50%) scale(" + zoomScale.toFixed(4) + ")";

      // Apply subtle 3D mouse parallax
      if (cinemaBg) {
        currentTiltX += (targetTiltX - currentTiltX) * 0.08;
        currentTiltY += (targetTiltY - currentTiltY) * 0.08;
        cinemaBg.style.transform = "translate(-50%, -50%) perspective(1000px) rotateX(" + currentTiltX.toFixed(2) + "deg) rotateY(" + currentTiltY.toFixed(2) + "deg)";
      }

      requestAnimationFrame(rafLoop);
    }

    requestAnimationFrame(rafLoop);
  }

  function enhance() {
    ensureBranding();
    ensureAiProjectsAnchor();
    ensureAiNavLink();
    updateDock();
    updateProfileCards();
    updateContactList();
    updateMobileMenu();
    installMobileMenuFallback();
    installCursorFallback();
    installHeroCanvasFallback();
    installLanyardFallback();
    installCanvasImageSequence();
    installNavScrollspy();
    installContactModalFallback();
    installGalleryFallback();
    markRevealTargets();
  }

  var scheduled = false;
  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      enhance();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhance, { once: true });
  } else {
    enhance();
  }
  window.addEventListener("load", enhance, { once: true });
  new MutationObserver(scheduleEnhance).observe(document.documentElement, { childList: true, subtree: true });
})();
