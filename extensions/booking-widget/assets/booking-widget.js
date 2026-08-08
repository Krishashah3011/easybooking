(function () {
  "use strict";

  var MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

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

    // Wire up hidden inputs on the nearest add-to-cart form so the
    // selection is submitted as line item properties.
    var form = root.closest('form[action*="/cart/add"]');
    var dateInput = null;
    var timeInput = null;
    if (form) {
      dateInput = document.createElement("input");
      dateInput.type = "hidden";
      dateInput.name = "properties[Booking Date]";
      form.appendChild(dateInput);

      timeInput = document.createElement("input");
      timeInput.type = "hidden";
      timeInput.name = "properties[Booking Time]";
      form.appendChild(timeInput);
    }

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
        setStatus(slotListEl, "No times available on this date.");
        return;
      }

      slots.forEach(function (slot) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "booking-widget__slot";
        btn.textContent = slot.start + " \u2013 " + slot.end;

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
        if (dateInput) dateInput.value = selectedDate;
        if (timeInput) timeInput.value = selectedSlot.start;
      } else {
        selectionEl.hidden = true;
        if (dateInput) dateInput.value = "";
        if (timeInput) timeInput.value = "";
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
