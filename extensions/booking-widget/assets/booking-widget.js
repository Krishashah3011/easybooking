(function () {
  "use strict";

  var LOW_AVAILABILITY_THRESHOLD = 2;

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
    selectBeforeCart:
      "Please select a date and time before adding this to your cart.",
    selected: "Selected: {date} at {time}",
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
      selectBeforeCart:
        d.i18nSelectBeforeCart || FALLBACK_STRINGS.selectBeforeCart,
      selected: d.i18nSelected || FALLBACK_STRINGS.selected,
    };
  }

  function formatDateDisplay(dateStr) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!m) return dateStr;
    return m[3] + "-" + m[2] + "-" + m[1];
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

    var calendarEl = root.querySelector("[data-booking-calendar]");
    var monthLabelEl = root.querySelector("[data-booking-month-label]");
    var slotsEl = root.querySelector("[data-booking-slots]");
    var slotListEl = root.querySelector("[data-booking-slot-list]");
    var selectionEl = root.querySelector("[data-booking-selection]");
    var prevBtn = root.querySelector("[data-booking-prev]");
    var nextBtn = root.querySelector("[data-booking-next]");

    var today = new Date();
    var viewYear = today.getUTCFullYear();
    var viewMonth = today.getUTCMonth() + 1;
    var availableDates = [];
    var selectedDate = null;
    var selectedSlot = null;
    var widgetSection = root.closest(".shopify-section");
    var nearbyForm =
      (widgetSection && widgetSection.querySelector('form[action*="/cart/add"]')) ||
      document.querySelector('form[action*="/cart/add"]');
    var submitBtn = nearbyForm
      ? nearbyForm.querySelector('[type="submit"], [name="add"]')
      : null;
    if (submitBtn) {
      submitBtn.disabled = true;
    }

    document.addEventListener(
      "submit",
      function (event) {
        var target = event.target;
        if (!(target instanceof HTMLFormElement)) return;
        if (!/\/cart\/add/.test(target.getAttribute("action") || "")) return;

        var allCartForms = document.querySelectorAll('form[action*="/cart/add"]');
        if (allCartForms.length > 1 && widgetSection && !widgetSection.contains(target)) {
          return;
        }

        if (!selectedDate || !selectedSlot) {
          event.preventDefault();
          selectionEl.hidden = false;
          selectionEl.textContent = strings.selectBeforeCart;
          root.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }

        var dateInput = target.querySelector(
          'input[name="properties[Booking Date]"]',
        );
        var timeInput = target.querySelector(
          'input[name="properties[Booking Time]"]',
        );

        if (!dateInput) {
          dateInput = document.createElement("input");
          dateInput.type = "hidden";
          dateInput.name = "properties[Booking Date]";
          target.appendChild(dateInput);
        }
        if (!timeInput) {
          timeInput = document.createElement("input");
          timeInput.type = "hidden";
          timeInput.name = "properties[Booking Time]";
          target.appendChild(timeInput);
        }
        dateInput.value = selectedDate;
        timeInput.value = selectedSlot.start;
      },
      true,
    );

    function setStatus(container, message) {
      container.innerHTML = "";
      var p = document.createElement("p");
      p.className = "booking-widget__status";
      p.textContent = message;
      container.appendChild(p);
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
          btn.addEventListener("click", (function (ds) {
            return function () {
              selectDate(ds);
            };
          })(dateStr));
        } else {
          btn.disabled = true;
        }

        if (dateStr === selectedDate) {
          btn.classList.add("booking-widget__day--selected");
        }

        grid.appendChild(btn);
      }

      calendarEl.appendChild(grid);
    }

    function selectDate(dateStr) {
      selectedDate = dateStr;
      selectedSlot = null;
      renderCalendar();
      updateSelectionDisplay();
      loadSlots(dateStr);
    }

    function loadSlots(dateStr) {
      slotsEl.hidden = false;
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
          renderSlots(data.slots || []);
        })
        .catch(function () {
          setStatus(slotListEl, strings.timesError);
        });
    }

    function renderSlots(slots) {
      slotListEl.innerHTML = "";

      if (slots.length === 0) {
        setStatus(slotListEl, strings.noTimes);
        return;
      }

      slots.forEach(function (slot) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "booking-widget__slot";

        if (slot.available === false) {
          btn.classList.add("booking-widget__slot--unavailable");
          btn.disabled = true;
          btn.textContent =
            formatTimeRangeDisplay(slot.start, slot.end, timeFormat) +
            " (" +
            strings.booked +
            ")";
          slotListEl.appendChild(btn);
          return;
        }

        var timeLabel = document.createElement("span");
        timeLabel.textContent = formatTimeRangeDisplay(
          slot.start,
          slot.end,
          timeFormat,
        );
        btn.appendChild(timeLabel);

        if (
          typeof slot.remainingCapacity === "number" &&
          slot.remainingCapacity <= LOW_AVAILABILITY_THRESHOLD
        ) {
          var remainingLabel = document.createElement("span");
          remainingLabel.className = "booking-widget__slot-remaining";
          remainingLabel.textContent =
            slot.remainingCapacity === 1
              ? strings.spotLeft
              : format(strings.spotsLeft, { count: slot.remainingCapacity });
          btn.appendChild(remainingLabel);
        }

        if (selectedSlot && selectedSlot.startsAt === slot.startsAt) {
          btn.classList.add("booking-widget__slot--selected");
        }

        btn.addEventListener("click", function () {
          selectedSlot = slot;
          renderSlots(slots);
          updateSelectionDisplay();
        });

        slotListEl.appendChild(btn);
      });
    }

    function updateSelectionDisplay() {
      if (selectedDate && selectedSlot) {
        selectionEl.hidden = false;
        selectionEl.textContent = format(strings.selected, {
          date: formatDateDisplay(selectedDate),
          time: formatTimeDisplay(selectedSlot.start, timeFormat),
        });
        if (submitBtn) submitBtn.disabled = false;
      } else {
        selectionEl.hidden = true;
        if (submitBtn) submitBtn.disabled = true;
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
      selectedDate = null;
      selectedSlot = null;
      slotsEl.hidden = true;
      updateSelectionDisplay();
      loadMonth();
    }

    prevBtn.addEventListener("click", function () {
      goToMonth(-1);
    });
    nextBtn.addEventListener("click", function () {
      goToMonth(1);
    });

    loadMonth();
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