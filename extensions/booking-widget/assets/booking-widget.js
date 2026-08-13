(function () {
  "use strict";

  var LOW_AVAILABILITY_THRESHOLD = 2;
  var WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  var FALLBACK_STRINGS = {
    loadingAvailability: "Loading availability…",
    availabilityError: "Unable to load availability right now.",
    noAvailability: "No availability this month.",
    loadingTimes: "Loading times…",
    timesError: "Unable to load times right now.",
    noTimes: "No times available on this date.",
    booked: "Booked",
    spotLeft: "1 spot left",
    spotsLeft: "{count} spots left",
    pleaseSelectSlot: "Please book a slot before adding this to your cart.",
    triggerBook: "Book your slot",
    triggerAddToCart: "Add to cart",
    modalTitle: "Appointment - Booking",
    modalSubtitle: "Select your preferred date & time",
    confirm: "Confirm",
    close: "Close",
    durationMinutes: "{count} Mins",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    availableTimes: "Available times",
  };

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function format(template, vars) {
    return template.replace(/\{(\w+)\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(vars, key)
        ? vars[key]
        : match;
    });
  }

  function readStrings(root) {
    var d = root.dataset;
    return {
      loadingAvailability:
        d.i18nLoadingAvailability || FALLBACK_STRINGS.loadingAvailability,
      availabilityError:
        d.i18nAvailabilityError || FALLBACK_STRINGS.availabilityError,
      noAvailability: d.i18nNoAvailability || FALLBACK_STRINGS.noAvailability,
      loadingTimes: d.i18nLoadingTimes || FALLBACK_STRINGS.loadingTimes,
      timesError: d.i18nTimesError || FALLBACK_STRINGS.timesError,
      noTimes: d.i18nNoTimes || FALLBACK_STRINGS.noTimes,
      booked: d.i18nBooked || FALLBACK_STRINGS.booked,
      spotLeft: d.i18nSpotLeft || FALLBACK_STRINGS.spotLeft,
      spotsLeft: d.i18nSpotsLeft || FALLBACK_STRINGS.spotsLeft,
      pleaseSelectSlot:
        d.i18nPleaseSelectSlot || FALLBACK_STRINGS.pleaseSelectSlot,
      triggerBook: d.i18nTriggerBook || FALLBACK_STRINGS.triggerBook,
      triggerAddToCart:
        d.i18nTriggerAddToCart || FALLBACK_STRINGS.triggerAddToCart,
      modalTitle: d.i18nModalTitle || FALLBACK_STRINGS.modalTitle,
      modalSubtitle: d.i18nModalSubtitle || FALLBACK_STRINGS.modalSubtitle,
      confirm: d.i18nConfirm || FALLBACK_STRINGS.confirm,
      close: d.i18nClose || FALLBACK_STRINGS.close,
      durationMinutes:
        d.i18nDurationMinutes || FALLBACK_STRINGS.durationMinutes,
      previousMonth: d.i18nPreviousMonth || FALLBACK_STRINGS.previousMonth,
      nextMonth: d.i18nNextMonth || FALLBACK_STRINGS.nextMonth,
      availableTimes: d.i18nAvailableTimes || FALLBACK_STRINGS.availableTimes,
    };
  }

  function formatTimeDisplay(time, timeFormat) {
    var m = /^(\d{2}):(\d{2})$/.exec(time);
    if (!m || timeFormat !== "12h") return time;
    var hour24 = Number(m[1]);
    var minute = m[2];
    var period = hour24 >= 12 ? "PM" : "AM";
    var hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return hour12 + ":" + minute + " " + period;
  }

  function formatTimeRangeDisplay(start, end, timeFormat) {
    return (
      formatTimeDisplay(start, timeFormat) +
      " \u2013 " +
      formatTimeDisplay(end, timeFormat)
    );
  }

  function slotDurationMinutes(slot) {
    var s = slot.start.split(":").map(Number);
    var e = slot.end.split(":").map(Number);
    return e[0] * 60 + e[1] - (s[0] * 60 + s[1]);
  }

  function formatSummaryDate(dateStr, locale) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!m) return dateStr;
    var d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    try {
      return new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(d);
    } catch (e) {
      return dateStr;
    }
  }

  function timezoneLabel() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      var offsetMinutes = -new Date().getTimezoneOffset();
      var sign = offsetMinutes >= 0 ? "+" : "-";
      var abs = Math.abs(offsetMinutes);
      var hh = pad(Math.floor(abs / 60));
      var mm = pad(abs % 60);
      return "(UTC" + sign + hh + ":" + mm + ") " + tz;
    } catch (e) {
      return "";
    }
  }

  function initWidget(root) {
    var productId = root.dataset.productId;
    var proxyBase = root.dataset.proxyBase;
    var locale = root.dataset.locale || "en";
    var strings = readStrings(root);
    var timeFormat = "24h";
    var monthFormatter;
    try {
      monthFormatter = new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch (e) {
      monthFormatter = new Intl.DateTimeFormat("en", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
    }

    var triggerEl = root.querySelector("[data-booking-trigger]");
    var openBtn = root.querySelector("[data-booking-open]");
    var cartTriggerBtn = root.querySelector("[data-booking-cart-trigger]");
    var errorEl = root.querySelector("[data-booking-error]");

    var summaryBlockEl = root.querySelector("[data-booking-summary-block]");
    var summaryBarEl = root.querySelector("[data-booking-summary-bar]");
    var cartConfirmedBtn = root.querySelector("[data-booking-cart-confirmed]");

    var overlayEl = root.querySelector("[data-booking-overlay]");
    var closeBtn = root.querySelector("[data-booking-close]");
    var timezoneEl = root.querySelector("[data-booking-timezone]");
    var calendarEl = root.querySelector("[data-booking-calendar]");
    var weekdaysEl = root.querySelector("[data-booking-weekdays]");
    var monthLabelEl = root.querySelector("[data-booking-month-label]");
    var durationEl = root.querySelector("[data-booking-duration]");
    var slotListEl = root.querySelector("[data-booking-slot-list]");
    var prevBtn = root.querySelector("[data-booking-prev]");
    var nextBtn = root.querySelector("[data-booking-next]");
    var confirmBtn = root.querySelector("[data-booking-confirm]");

    var today = new Date();
    var viewYear = today.getUTCFullYear();
    var viewMonth = today.getUTCMonth() + 1;
    var availableDates = [];
    var currentSlots = [];

    // Values chosen inside the modal (not yet confirmed)
    var pendingDate = null;
    var pendingSlot = null;

    // Values confirmed via the "Confirm" button
    var confirmedDate = null;
    var confirmedSlot = null;

    var widgetSection = root.closest(".shopify-section");
    var nearbyForm =
      (widgetSection &&
        widgetSection.querySelector('form[action*="/cart/add"]')) ||
      document.querySelector('form[action*="/cart/add"]');

    // Hide the theme's native buy buttons (Add to cart, dynamic checkout, etc.)
    // so ours replace them.
    if (nearbyForm) {
      var nativeControls = nearbyForm.querySelectorAll(
        '[type="submit"], [name="add"], .shopify-payment-button',
      );
      nativeControls.forEach(function (el) {
        el.style.display = "none";
      });
      var paymentButtonContainer =
        (widgetSection &&
          widgetSection.querySelector(".shopify-payment-button")) ||
        document.querySelector(".shopify-payment-button");
      if (paymentButtonContainer) {
        paymentButtonContainer.style.display = "none";
      }
    }

    weekdaysEl.innerHTML = "";
    WEEKDAY_LABELS.forEach(function (label) {
      var span = document.createElement("span");
      span.textContent = label;
      weekdaysEl.appendChild(span);
    });

    timezoneEl.textContent = timezoneLabel();

    function setStatus(container, message) {
      container.innerHTML = "";
      var p = document.createElement("p");
      p.className = "booking-widget__status";
      p.textContent = message;
      container.appendChild(p);
    }

    function showError(message) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }

    function clearError() {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }

    function openModal() {
      pendingDate = confirmedDate;
      pendingSlot = confirmedSlot;
      overlayEl.hidden = false;
      document.body.classList.add("booking-widget-lock-scroll");
      updateConfirmButton();
      loadMonth();
      if (pendingDate) {
        loadSlots(pendingDate);
      }
    }

    function closeModal() {
      overlayEl.hidden = true;
      document.body.classList.remove("booking-widget-lock-scroll");
    }

    function submitCartForm() {
      if (!nearbyForm) return;

      var dateInput = nearbyForm.querySelector(
        'input[name="properties[Booking Date]"]',
      );
      var timeInput = nearbyForm.querySelector(
        'input[name="properties[Booking Time]"]',
      );
      if (!dateInput) {
        dateInput = document.createElement("input");
        dateInput.type = "hidden";
        dateInput.name = "properties[Booking Date]";
        nearbyForm.appendChild(dateInput);
      }
      if (!timeInput) {
        timeInput = document.createElement("input");
        timeInput.type = "hidden";
        timeInput.name = "properties[Booking Time]";
        nearbyForm.appendChild(timeInput);
      }
      dateInput.value = confirmedDate;
      timeInput.value = confirmedSlot.start;

      if (typeof nearbyForm.requestSubmit === "function") {
        nearbyForm.requestSubmit();
      } else {
        var evt = document.createEvent("Event");
        evt.initEvent("submit", true, true);
        nearbyForm.dispatchEvent(evt);
        nearbyForm.submit();
      }
    }

    function handleAddToCartClick() {
      clearError();
      if (!confirmedDate || !confirmedSlot) {
        showError(strings.pleaseSelectSlot);
        return;
      }
      submitCartForm();
    }

    function loadMonth() {
      monthLabelEl.textContent = monthFormatter.format(
        new Date(Date.UTC(viewYear, viewMonth - 1, 1)),
      );
      setStatus(calendarEl, strings.loadingAvailability);

      var url =
        proxyBase +
        "/availability?productId=" +
        encodeURIComponent(productId) +
        "&year=" +
        viewYear +
        "&month=" +
        viewMonth;

      fetch(url)
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          availableDates = data.availableDates || [];
          if (data.timeFormat === "12h" || data.timeFormat === "24h") {
            timeFormat = data.timeFormat;
          }
          renderCalendar();
        })
        .catch(function () {
          setStatus(calendarEl, strings.availabilityError);
        });
    }

    function renderCalendar() {
      if (availableDates.length === 0) {
        setStatus(calendarEl, strings.noAvailability);
        return;
      }

      var availableSet = {};
      availableDates.forEach(function (d) {
        availableSet[d] = true;
      });

      var daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
      var firstWeekday = new Date(
        Date.UTC(viewYear, viewMonth - 1, 1),
      ).getUTCDay();

      calendarEl.innerHTML = "";
      var grid = document.createElement("div");
      grid.className = "booking-widget__grid";

      for (var i = 0; i < firstWeekday; i++) {
        grid.appendChild(document.createElement("span"));
      }

      for (var day = 1; day <= daysInMonth; day++) {
        var dateStr = viewYear + "-" + pad(viewMonth) + "-" + pad(day);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = String(day);
        btn.className = "booking-widget__day";

        if (availableSet[dateStr]) {
          btn.classList.add("booking-widget__day--available");
          btn.addEventListener(
            "click",
            (function (ds) {
              return function () {
                selectDate(ds);
              };
            })(dateStr),
          );
        } else {
          btn.disabled = true;
        }

        if (dateStr === pendingDate) {
          btn.classList.add("booking-widget__day--selected");
        }

        grid.appendChild(btn);
      }

      calendarEl.appendChild(grid);
    }

    function selectDate(dateStr) {
      pendingDate = dateStr;
      pendingSlot = null;
      renderCalendar();
      updateConfirmButton();
      loadSlots(dateStr);
    }

    function loadSlots(dateStr) {
      durationEl.hidden = true;
      setStatus(slotListEl, strings.loadingTimes);

      var url =
        proxyBase +
        "/slots?productId=" +
        encodeURIComponent(productId) +
        "&date=" +
        dateStr;

      fetch(url)
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          currentSlots = data.slots || [];
          renderSlots();
        })
        .catch(function () {
          setStatus(slotListEl, strings.timesError);
        });
    }

    function renderSlots() {
      slotListEl.innerHTML = "";

      if (currentSlots.length === 0) {
        setStatus(slotListEl, strings.noTimes);
        return;
      }

      durationEl.hidden = false;
      durationEl.textContent = format(strings.durationMinutes, {
        count: slotDurationMinutes(currentSlots[0]),
      });

      currentSlots.forEach(function (slot) {
        var row = document.createElement("label");
        row.className = "booking-widget__slot-row";

        var input = document.createElement("input");
        input.type = "radio";
        input.name = "booking-widget-slot-" + root.dataset.productId;
        input.className = "booking-widget__slot-radio";
        input.value = slot.startsAt;

        var textWrap = document.createElement("span");
        textWrap.className = "booking-widget__slot-text";
        textWrap.textContent = formatTimeRangeDisplay(
          slot.start,
          slot.end,
          timeFormat,
        );

        if (slot.available === false) {
          row.classList.add("booking-widget__slot-row--unavailable");
          input.disabled = true;
          var bookedTag = document.createElement("span");
          bookedTag.className = "booking-widget__slot-tag";
          bookedTag.textContent = strings.booked;
          row.appendChild(input);
          row.appendChild(textWrap);
          row.appendChild(bookedTag);
          slotListEl.appendChild(row);
          return;
        }

        if (
          typeof slot.remainingCapacity === "number" &&
          slot.remainingCapacity <= LOW_AVAILABILITY_THRESHOLD
        ) {
          var remainingTag = document.createElement("span");
          remainingTag.className =
            "booking-widget__slot-tag booking-widget__slot-tag--low";
          remainingTag.textContent =
            slot.remainingCapacity === 1
              ? strings.spotLeft
              : format(strings.spotsLeft, { count: slot.remainingCapacity });
          row.appendChild(input);
          row.appendChild(textWrap);
          row.appendChild(remainingTag);
        } else {
          row.appendChild(input);
          row.appendChild(textWrap);
        }

        if (pendingSlot && pendingSlot.startsAt === slot.startsAt) {
          input.checked = true;
          row.classList.add("booking-widget__slot-row--selected");
        }

        input.addEventListener("change", function () {
          pendingSlot = slot;
          renderSlots();
          updateConfirmButton();
        });

        slotListEl.appendChild(row);
      });
    }

    function updateConfirmButton() {
      confirmBtn.disabled = !(pendingDate && pendingSlot);
    }

    function updateSummaryDisplay() {
      if (confirmedDate && confirmedSlot) {
        triggerEl.hidden = true;
        summaryBlockEl.hidden = false;
        summaryBarEl.textContent =
          formatSummaryDate(confirmedDate, locale) +
          " | " +
          formatTimeRangeDisplay(
            confirmedSlot.start,
            confirmedSlot.end,
            timeFormat,
          );
      } else {
        triggerEl.hidden = false;
        summaryBlockEl.hidden = true;
      }
    }

    function goToMonth(delta) {
      viewMonth += delta;
      if (viewMonth < 1) {
        viewMonth = 12;
        viewYear -= 1;
      } else if (viewMonth > 12) {
        viewMonth = 1;
        viewYear += 1;
      }
      pendingDate = null;
      pendingSlot = null;
      currentSlots = [];
      durationEl.hidden = true;
      setStatus(slotListEl, strings.noTimes);
      updateConfirmButton();
      loadMonth();
    }

    openBtn.addEventListener("click", function () {
      clearError();
      openModal();
    });
    summaryBarEl.addEventListener("click", function () {
      openModal();
    });
    closeBtn.addEventListener("click", closeModal);
    overlayEl.addEventListener("click", function (event) {
      if (event.target === overlayEl) closeModal();
    });
    prevBtn.addEventListener("click", function () {
      goToMonth(-1);
    });
    nextBtn.addEventListener("click", function () {
      goToMonth(1);
    });
    confirmBtn.addEventListener("click", function () {
      if (!pendingDate || !pendingSlot) return;
      confirmedDate = pendingDate;
      confirmedSlot = pendingSlot;
      updateSummaryDisplay();
      closeModal();
    });
    cartTriggerBtn.addEventListener("click", handleAddToCartClick);
    cartConfirmedBtn.addEventListener("click", handleAddToCartClick);

    updateSummaryDisplay();
  }

  function init() {
    document.querySelectorAll("[data-booking-widget]").forEach(initWidget);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();