(function () {
  "use strict";

  var MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Show a "X left" badge on a slot once its remaining capacity drops to
  // this number or below. Keeps normal slots clean while still creating
  // urgency when a slot is close to full.
  var LOW_AVAILABILITY_THRESHOLD = 2;

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function initWidget(root) {
    var productId = root.dataset.productId;
    var proxyBase = root.dataset.proxyBase;

    var calendarEl = root.querySelector("[data-booking-calendar]");
    var monthLabelEl = root.querySelector("[data-booking-month-label]");
    var slotsEl = root.querySelector("[data-booking-slots]");
    var slotListEl = root.querySelector("[data-booking-slot-list]");
    var selectionEl = root.querySelector("[data-booking-selection]");
    var prevBtn = root.querySelector("[data-booking-prev]");
    var nextBtn = root.querySelector("[data-booking-next]");

    var today = new Date();
    var viewYear = today.getUTCFullYear();
    var viewMonth = today.getUTCMonth() + 1; // 1-12
    var availableDates = [];
    var selectedDate = null;
    var selectedSlot = null;

    // Soft UX touch only: find the nearby add-to-cart form (if any) just to
    // disable its submit button until a date/time is picked. This is NOT
    // where the booking data actually gets attached — see the document-level
    // submit listener below for that.
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

    // Some themes rebuild/replace the buy-box <form> when a variant
    // (color/size) is picked, or when the cart-drawer re-renders — which
    // silently wipes out any hidden inputs we attached earlier. So instead
    // of attaching inputs once at page load, we attach them at the exact
    // moment "Add to cart" is submitted, onto whichever form is actually
    // live right then. Using the capturing phase (the `true` at the end)
    // means this runs BEFORE the theme's own submit handler reads the form.
    document.addEventListener(
      "submit",
      function (event) {
        var target = event.target;
        if (!(target instanceof HTMLFormElement)) return;
        if (!/\/cart\/add/.test(target.getAttribute("action") || "")) return;

        // If there's more than one add-to-cart form on the page (e.g. a
        // recommended-products section), only act on the one inside this
        // widget's own section — leave unrelated products' forms alone.
        var allCartForms = document.querySelectorAll('form[action*="/cart/add"]');
        if (allCartForms.length > 1 && widgetSection && !widgetSection.contains(target)) {
          return;
        }

        if (!selectedDate || !selectedSlot) {
          event.preventDefault();
          selectionEl.hidden = false;
          selectionEl.textContent =
            "Please select a date and time before adding this to your cart.";
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
      monthLabelEl.textContent = MONTH_NAMES[viewMonth - 1] + " " + viewYear;
      setStatus(calendarEl, "Loading availability…");

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
          renderCalendar();
        })
        .catch(function () {
          setStatus(calendarEl, "Unable to load availability right now.");
        });
    }

    function renderCalendar() {
      if (availableDates.length === 0) {
        setStatus(calendarEl, "No availability this month.");
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
      setStatus(slotListEl, "Loading times…");

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
          setStatus(slotListEl, "Unable to load times right now.");
        });
    }

    function renderSlots(slots) {
      slotListEl.innerHTML = "";

      if (slots.length === 0) {
        setStatus(slotListEl, "No times at all on this date.");
        return;
      }

      slots.forEach(function (slot) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "booking-widget__slot";

        // Slots the server considers fully booked are simply left out of
        // the response entirely (see slotAvailability.server.ts), so
        // slot.available should always be truthy here in practice — this
        // branch is kept as a defensive fallback only.
        if (slot.available === false) {
          btn.classList.add("booking-widget__slot--unavailable");
          btn.disabled = true;
          btn.textContent = slot.start + " \u2013 " + slot.end + " (Booked)";
          slotListEl.appendChild(btn);
          return;
        }

        var timeLabel = document.createElement("span");
        timeLabel.textContent = slot.start + " \u2013 " + slot.end;
        btn.appendChild(timeLabel);

        // "Spots left" — only shown once availability is getting low, so
        // normal slots stay clean and this reads as a genuine signal.
        if (
          typeof slot.remainingCapacity === "number" &&
          slot.remainingCapacity <= LOW_AVAILABILITY_THRESHOLD
        ) {
          var remainingLabel = document.createElement("span");
          remainingLabel.className = "booking-widget__slot-remaining";
          remainingLabel.textContent =
            slot.remainingCapacity === 1
              ? "1 spot left"
              : slot.remainingCapacity + " spots left";
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
        selectionEl.textContent =
          "Selected: " + selectedDate + " at " + selectedSlot.start;
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