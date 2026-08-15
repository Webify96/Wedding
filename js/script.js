(function () {
  "use strict";

  /* =========================================================
     CONFIG — edit these before sending invitations
     ========================================================= */
  var CONFIG = {
    weddingDateISO: "2026-11-28T14:00:00", // ceremony date/time, used for countdown
    coupleEmail: "mashinda.ndalamba@gmail.com", // mailto fallback if RSVP endpoint isn't live yet
    // Once Resend is wired up, point this at your real endpoint (e.g. an API route
    // that calls Resend to send/store the RSVP). Until then, submissions fall back
    // to a pre-filled email so nothing is ever silently lost.
    rsvpEndpoint: "/api/rsvp",
  };

  /* ================= Sticky header ================= */
  var header = document.getElementById("siteHeader");
  function onScroll() {
    if (window.scrollY > 40) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ================= Mobile nav ================= */
  var hamburger = document.getElementById("hamburger");
  var mobileNav = document.getElementById("mobileNav");
  var mobileNavBackdrop = document.getElementById("mobileNavBackdrop");

  function closeMobileNav() {
    hamburger.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("open");
    mobileNavBackdrop.classList.remove("open");
    document.body.style.overflow = "";
    onScroll();
  }
  function openMobileNav() {
    hamburger.classList.add("open");
    hamburger.setAttribute("aria-expanded", "true");
    mobileNav.classList.add("open");
    mobileNavBackdrop.classList.add("open");
    header.classList.add("scrolled");
    document.body.style.overflow = "hidden";
  }
  hamburger.addEventListener("click", function () {
    if (mobileNav.classList.contains("open")) closeMobileNav();
    else openMobileNav();
  });
  mobileNavBackdrop.addEventListener("click", closeMobileNav);
  document.querySelectorAll(".mobile-link").forEach(function (link) {
    link.addEventListener("click", closeMobileNav);
  });

  /* ================= Generic reveal toggles ================= */
  function wireToggle(btnId, panelId, expandedLabel, collapsedLabel) {
    var btn = document.getElementById(btnId);
    var panel = document.getElementById(panelId);
    if (!btn || !panel) return;
    btn.addEventListener("click", function () {
      var isHidden = panel.hasAttribute("hidden");
      if (isHidden) {
        panel.removeAttribute("hidden");
        btn.textContent = expandedLabel;
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        panel.setAttribute("hidden", "");
        btn.textContent = collapsedLabel;
      }
    });
  }
  wireToggle("readStoryBtn", "storyFull", "Show less", "Read our story");
  wireToggle("moreDetailsBtn", "detailsFull", "Show less", "View more details");
  wireToggle(
    "giftDetailsBtn",
    "giftFull",
    "Hide gift details",
    "View gift details",
  );

  // "View gallery" opens the lightbox at the first photo so guests can
  // browse the full shoot — wired up below, once the lightbox exists.
  var viewGalleryBtn = document.getElementById("viewGalleryBtn");

  /* ================= FAQ accordion ================= */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var question = item.querySelector(".faq-question");
    question.addEventListener("click", function () {
      var wasOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach(function (openItem) {
        openItem.classList.remove("open");
      });
      if (!wasOpen) item.classList.add("open");
    });
  });

  /* ================= Countdown ================= */
  var targetDate = new Date(CONFIG.weddingDateISO).getTime();
  var cdDays = document.getElementById("cdDays");
  var cdHours = document.getElementById("cdHours");
  var cdMinutes = document.getElementById("cdMinutes");
  var cdSeconds = document.getElementById("cdSeconds");

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function tickCountdown() {
    var diff = targetDate - Date.now();
    if (diff < 0) diff = 0;
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    var minutes = Math.floor((diff / (1000 * 60)) % 60);
    var seconds = Math.floor((diff / 1000) % 60);
    cdDays.textContent = pad(days);
    cdHours.textContent = pad(hours);
    cdMinutes.textContent = pad(minutes);
    cdSeconds.textContent = pad(seconds);
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  /* ================= RSVP modal ================= */
  var rsvpBackdrop = document.getElementById("rsvpBackdrop");
  var rsvpModal = document.getElementById("rsvpModal");
  var rsvpNowBtn = document.getElementById("rsvpNowBtn");
  var rsvpClose = document.getElementById("rsvpClose");
  var rsvpForm = document.getElementById("rsvpForm");
  var rsvpFormWrap = document.getElementById("rsvpFormWrap");
  var rsvpSuccess = document.getElementById("rsvpSuccess");
  var rsvpSuccessClose = document.getElementById("rsvpSuccessClose");
  var rsvpFormError = document.getElementById("rsvpFormError");
  var rsvpSubmitBtn = document.getElementById("rsvpSubmitBtn");

  function openRsvp() {
    rsvpBackdrop.classList.add("open");
    rsvpModal.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeRsvp() {
    rsvpBackdrop.classList.remove("open");
    rsvpModal.classList.remove("open");
    document.body.style.overflow = "";
  }
  rsvpNowBtn.addEventListener("click", openRsvp);
  rsvpClose.addEventListener("click", closeRsvp);
  rsvpBackdrop.addEventListener("click", closeRsvp);
  rsvpSuccessClose.addEventListener("click", function () {
    closeRsvp();
    // reset for next open
    setTimeout(function () {
      rsvpForm.reset();
      rsvpFormWrap.hidden = false;
      rsvpSuccess.hidden = true;
    }, 300);
  });

  function buildMailtoFallback(data) {
    var subject = encodeURIComponent("RSVP from " + data.name);
    var bodyLines = [
      "Name: " + data.name,
      "Email: " + data.email,
      "Attending: " +
        (data.attending === "yes"
          ? "Joyfully accepts"
          : "Regretfully declines"),
      "Guests: " + data.guests,
      "Dietary requirements: " + (data.dietary || "None"),
      "Message: " + (data.message || "—"),
    ];
    var body = encodeURIComponent(bodyLines.join("\n"));
    return (
      "mailto:" + CONFIG.coupleEmail + "?subject=" + subject + "&body=" + body
    );
  }

  rsvpForm.addEventListener("submit", function (e) {
    e.preventDefault();
    rsvpFormError.hidden = true;

    var name = rsvpForm.name.value.trim();
    var email = rsvpForm.email.value.trim();
    if (!name || !email) {
      rsvpFormError.hidden = false;
      return;
    }

    var data = {
      name: name,
      email: email,
      attending: rsvpForm.attending.value,
      guests: rsvpForm.guests.value,
      dietary: rsvpForm.dietary.value.trim(),
      message: rsvpForm.message.value.trim(),
    };

    rsvpSubmitBtn.disabled = true;
    rsvpSubmitBtn.textContent = "Sending…";

    // Try the real backend first (wire this to Resend later via CONFIG.rsvpEndpoint).
    // Until that endpoint exists, the fetch fails fast and we fall back to a
    // pre-filled email so no RSVP is ever lost.
    fetch(CONFIG.rsvpEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("RSVP endpoint not ready");
        showRsvpSuccess();
      })
      .catch(function () {
        window.location.href = buildMailtoFallback(data);
        showRsvpSuccess();
      })
      .finally(function () {
        rsvpSubmitBtn.disabled = false;
        rsvpSubmitBtn.textContent = "Send RSVP";
      });
  });

  function showRsvpSuccess() {
    rsvpFormWrap.hidden = true;
    rsvpSuccess.hidden = false;
  }

  /* ================= Gallery lightbox ================= */
  // Full set of 12 photos from the shoot, in order — lets guests browse
  // beyond the 6 curated tiles shown in the grid via prev/next.
  var GALLERY_PHOTOS = [
    { index: 1, caption: "Hand in hand" },
    { index: 2, caption: "Just the two of us" },
    { index: 3, caption: "Every little detail" },
    { index: 4, caption: "The promise" },
    { index: 5, caption: "Her favourite embrace" },
    { index: 6, caption: "Caught smiling" },
    { index: 7, caption: "Lost in the moment" },
    { index: 8, caption: "Two hearts, one journey" },
    { index: 9, caption: "Holding on" },
    { index: 10, caption: "Side by side" },
    { index: 11, caption: "Heart to heart" },
    { index: 12, caption: "A gentle kiss" },
  ];

  var lightboxBackdrop = document.getElementById("lightboxBackdrop");
  var lightbox = document.getElementById("lightbox");
  var lightboxInner = document.getElementById("lightboxInner");
  var lightboxClose = document.getElementById("lightboxClose");
  var lightboxPrev = document.getElementById("lightboxPrev");
  var lightboxNext = document.getElementById("lightboxNext");
  var lightboxCaption = document.getElementById("lightboxCaption");
  var lightboxCount = document.getElementById("lightboxCount");

  var currentPhoto = 0;

  function renderLightbox() {
    var photo = GALLERY_PHOTOS[currentPhoto];
    lightboxInner.innerHTML =
      '<img src="css/img/web/full-' + photo.index + '.jpg" alt="' + photo.caption + '">';
    lightboxCaption.textContent = photo.caption;
    lightboxCount.textContent = (currentPhoto + 1) + " / " + GALLERY_PHOTOS.length;
  }
  function showPrev() {
    currentPhoto = (currentPhoto - 1 + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length;
    renderLightbox();
  }
  function showNext() {
    currentPhoto = (currentPhoto + 1) % GALLERY_PHOTOS.length;
    renderLightbox();
  }
  function openLightbox(startIndex) {
    currentPhoto = GALLERY_PHOTOS.findIndex(function (p) { return p.index === startIndex; });
    if (currentPhoto === -1) currentPhoto = 0;
    renderLightbox();
    lightboxBackdrop.classList.add("open");
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    lightboxBackdrop.classList.remove("open");
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
  }
  document.querySelectorAll(".gallery-item").forEach(function (tile) {
    tile.addEventListener("click", function () {
      openLightbox(parseInt(tile.dataset.index, 10));
    });
  });
  lightboxClose.addEventListener("click", closeLightbox);
  lightboxBackdrop.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", showPrev);
  lightboxNext.addEventListener("click", showNext);

  if (viewGalleryBtn) {
    viewGalleryBtn.addEventListener("click", function () {
      openLightbox(GALLERY_PHOTOS[0].index);
    });
  }

  /* ================= Escape key closes any open overlay ================= */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeMobileNav();
      closeRsvp();
      closeLightbox();
    }
    if (lightbox.classList.contains("open")) {
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    }
  });
})();
