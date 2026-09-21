(function () {
  "use strict";

  var LOW_AVAILABILITY_THRESHOLD = 2;
  var WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // How many months (from the current month) each month dropdown lists.
  var MONTH_PICKER_SPAN = 24;

  // Calendar colours (match the admin "Add New Booking" calendar).
  var CAL_BLUE = "#0060E6";
  var NAV_ARROW = "#4C4C4C";

  // Chevron icons taken from the admin design (same paths as the Figma SVG).
  var NAV_CHEVRON_PATH =
    "M32.4806 34.9941C32.8398 34.6529 32.8398 34.0998 32.4806 33.7586L27.4706 29L32.4806 24.2414C32.8398 23.9002 32.8398 23.3471 32.4806 23.0059C32.1214 22.6647 31.539 22.6647 31.1798 23.0059L25.5194 28.3822C25.1602 28.7234 25.1602 29.2766 25.5194 29.6178L31.1798 34.9941C31.539 35.3353 32.1214 35.3353 32.4806 34.9941Z";
  var DROPDOWN_CHEVRON_SVG =
    '<svg width="14" height="12" viewBox="192.5 23 14 12" fill="none" aria-hidden="true" focusable="false">' +
    '<path fill-rule="evenodd" clip-rule="evenodd" d="M205.494 25.5194C205.153 25.1602 204.6 25.1602 204.259 25.5194L199.5 30.5294L194.741 25.5194C194.4 25.1602 193.847 25.1602 193.506 25.5194C193.165 25.8786 193.165 26.461 193.506 26.8202L198.882 32.4806C199.223 32.8398 199.777 32.8398 200.118 32.4806L205.494 26.8202C205.835 26.461 205.835 25.8786 205.494 25.5194Z" fill="#1A1A1A"/>' +
    "</svg>";

  function navChevronSvg(color) {
    return (
      '<svg width="14" height="14" viewBox="22 22 14 14" fill="none" aria-hidden="true" focusable="false">' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="' +
      NAV_CHEVRON_PATH +
      '" fill="' +
      color +
      '"/></svg>'
    );
  }

  var ENGLISH_STRINGS = {
    loadingAvailability: "Loading availability…",
    availabilityError: "Unable to load availability right now.",
    noAvailability: "No availability this month.",
    loadingTimes: "Loading times…",
    timesError: "Unable to load times right now.",
    retry: "Try again",
    noTimes: "No times available on this date.",
    booked: "Booked",
    alreadySelected: "Already selected",
    slotAlreadySelectedError:
      "You've already selected this time slot. Please choose a different one.",
    spotLeft: "1 spot left",
    spotsLeft: "{count} spots left",
    selectBeforeCart:
      "Please select a date and time before adding this to your cart.",
    selected: "{date} | {time}",
    triggerBook: "Book your slot",
    modalTitle: "Appointment - Booking",
    modalSubtitle: "Select your preferred date & time",
    selectLocation: "Select location",
    selectLocationPlaceholder: "Location",
    locationRequired: "Please select a location to continue.",
    noLocationsConfigured:
      "Booking isn't available for this product.",
    next: "Next",
    nextSlot: "Next Slot",
    changeLocation: "Change",
    confirm: "Confirm",
    close: "Close",
    durationMinutes: "{count} Mins",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    availableTimes: "Available times",
    selectDateHint: "Select a date to see available times.",
    selectMonth: "Select month, currently {month}",
    alreadyBooked: "This slots are added to Cart for this product:",
    removeSlot: "Remove this slot",
    addAnotherSlotLink: "+ Add another slot",
    multiAddError:
      "Something went wrong adding your slots to cart. Please try again.",
    addingToCart: "Adding your slots to cart…",
    quantityLabel: "Quantity",
    quantityDecrease: "Decrease quantity",
    quantityIncrease: "Increase quantity",
    quantityMaxReached: "Only {count} left for this slot.",
    unitAvailable: "1 available",
    unitsAvailable: "{count} available",
    nightsSelected: "{count} nights selected",
    multiDayRangeUnavailable: "Some nights in that range aren't available. Please pick a different range.",
    multiDayMinNights: "Minimum stay is {count} nights.",
    multiDayMaxNights: "Maximum stay is {count} nights.",
    multiDayMinMaxNights: "Stay must be between {min} and {max} nights.",
    sessionProgress: "Session {current} of {total} — pick a date and time",
    sessionProgressWithDeadline: "Session {current} of {total} — pick a date and time (by {deadline})",
    sessionConfirmed: "Session {number}",
    bundleSelected: "Bundle: {count} sessions",
    sessionsBooked: "{count} sessions booked",
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

  function to12Hour(timeStr) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(timeStr);
    if (!m) return timeStr;
    var hour = parseInt(m[1], 10);
    var minute = m[2];
    var period = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return hour + ":" + minute + " " + period;
  }

  function formatTimeInBrowserTZ(isoString) {
    try {
      var dtf = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return dtf.format(new Date(isoString));
    } catch (e) {
      return "";
    }
  }

  function formatTimeRangeDisplay(slot, convertToLocal) {
    if (convertToLocal === false) {
      return to12Hour(slot.start) + " - " + to12Hour(slot.end);
    }
    var startLabel = formatTimeInBrowserTZ(slot.startsAt);
    if (!startLabel) {
      return to12Hour(slot.start) + " - " + to12Hour(slot.end);
    }
    var durationMs = slotDurationMinutes(slot) * 60 * 1000;
    var endLabel = formatTimeInBrowserTZ(
      new Date(new Date(slot.startsAt).getTime() + durationMs).toISOString(),
    );
    return endLabel ? startLabel + " - " + endLabel : startLabel;
  }

  function slotDurationMinutes(slot) {
    var s = slot.start.split(":").map(Number);
    var e = slot.end.split(":").map(Number);
    return e[0] * 60 + e[1] - (s[0] * 60 + s[1]);
  }

  function formatDateDisplay(dateStr) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!m) return dateStr;
    return m[3] + "-" + m[2] + "-" + m[1];
  }

  var chipDateFormatter;
  try {
    chipDateFormatter = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch (e) {
    chipDateFormatter = null;
  }

  function formatChipDate(dateStr) {
    if (!chipDateFormatter) return formatDateDisplay(dateStr);
    try {
      return chipDateFormatter.format(new Date(dateStr + "T00:00:00.000Z"));
    } catch (e) {
      return formatDateDisplay(dateStr);
    }
  }

  function inclusiveDayCount(startStr, endStr) {
    var start = new Date(startStr + "T00:00:00.000Z");
    var end = new Date(endStr + "T00:00:00.000Z");
    var diff = Math.round((end.getTime() - start.getTime()) / 86400000);
    return diff + 1;
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

  function locationTimezoneLabel(tz) {
    if (!tz) return "";
    try {
      var dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "shortOffset",
      });
      var parts = dtf.formatToParts(new Date());
      var offset = "";
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === "timeZoneName") offset = parts[i].value;
      }
      return (offset ? "(" + offset + ") " : "") + tz;
    } catch (e) {
      return tz;
    }
  }

  function initWidget(root) {
    var productId = root.dataset.productId;
    var proxyBase = root.dataset.proxyBase;
    var unitPrice = parseFloat(root.dataset.unitPrice || "");
    if (!isFinite(unitPrice)) unitPrice = null;
    var currencyCode = root.dataset.currencyCode || "USD";
    var moneyFormatter;
    try {
      moneyFormatter = new Intl.NumberFormat(navigator.language || "en-US", {
        style: "currency",
        currency: currencyCode,
      });
    } catch (e) {
      moneyFormatter = null;
    }
    function formatMoney(amount) {
      if (moneyFormatter) return moneyFormatter.format(amount);
      return currencyCode + " " + amount.toFixed(2);
    }
    var strings = ENGLISH_STRINGS;
    var monthFormatter;
    try {
      monthFormatter = new Intl.DateTimeFormat("en-US", {
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

    var monthShortFormatter;
    try {
      monthShortFormatter = new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch (e) {
      monthShortFormatter = monthFormatter;
    }

    var selectionEl = root.querySelector("[data-booking-selection]");
    var errorEl = root.querySelector("[data-booking-error]");
    var unavailableEl = root.querySelector("[data-booking-unavailable]");
    var multiAddStatusEl = root.querySelector("[data-booking-multi-add-status]");
    var cartReminderEl = root.querySelector("[data-booking-cart-reminder]");
    var cartReminderTitleEl = root.querySelector(
      "[data-booking-cart-reminder-title]",
    );
    var cartReminderListEl = root.querySelector(
      "[data-booking-cart-reminder-list]",
    );

    var overlayEl = root.querySelector("[data-booking-overlay]");
    var closeBtn = root.querySelector("[data-booking-close]");
    var locationTimezoneEl = root.querySelector("[data-booking-location-timezone]");
    var subheaderEl = root.querySelector("[data-booking-subheader]");
    var modalBodyEl = root.querySelector("[data-booking-modal-body]");
    var modalFooterEl = root.querySelector("[data-booking-modal-footer]");
    var locationStepEl = root.querySelector("[data-booking-location-step]");
    var locationTriggerEl = root.querySelector("[data-booking-location-trigger]");
    var locationTriggerTextEl = root.querySelector(
      "[data-booking-location-trigger-text]",
    );
    var locationListEl = root.querySelector("[data-booking-location-list]");
    var locationErrorEl = root.querySelector("[data-booking-location-error]");
    var datetimeStepEl = root.querySelector("[data-booking-datetime-step]");
    var locationEmptyStateEl = root.querySelector(
      "[data-booking-location-empty-state]",
    );
    var calendarEl = root.querySelector("[data-booking-calendar]");
    var datetimeCardEl = root.querySelector("[data-booking-datetime-card]");
    var durationEl = root.querySelector("[data-booking-duration]");
    var rangeSummaryEl = root.querySelector("[data-booking-range-summary]");
    var rangeHintEl = root.querySelector("[data-booking-range-hint]");
    var selectedDatesEl = root.querySelector("[data-booking-selected-dates]");
    var selectedDatesLabelEl = root.querySelector(
      "[data-booking-selected-dates-label]",
    );
    var selectedDatesTextEl = root.querySelector(
      "[data-booking-selected-dates-text]",
    );
    var selectedDatesClearBtn = root.querySelector(
      "[data-booking-selected-dates-clear]",
    );
    var slotsPaneOuterEl = root.querySelector("[data-booking-slots-pane]");
    var bundleProgressEl = root.querySelector("[data-booking-bundle-progress]");
    var bundleProgressLabelEl = root.querySelector(
      "[data-booking-bundle-progress-label]",
    );
    var bundleProgressFillEl = root.querySelector(
      "[data-booking-bundle-progress-fill]",
    );
    var slotListEl = root.querySelector("[data-booking-slot-list]");
    var confirmBtn = root.querySelector("[data-booking-confirm]");
    var nextSlotBtn = root.querySelector("[data-booking-next-slot]");
    var customFieldsEl = root.querySelector("[data-booking-custom-fields]");
    var quantityWrapEl = root.querySelector("[data-booking-quantity]");
    var quantityInputEl = root.querySelector("[data-booking-quantity-input]");
    var quantityDecreaseBtn = root.querySelector(
      "[data-booking-quantity-decrease]",
    );
    var quantityIncreaseBtn = root.querySelector(
      "[data-booking-quantity-increase]",
    );
    var quantityNoteEl = root.querySelector("[data-booking-quantity-note]");
    var reviewBodyEl = root.querySelector("[data-booking-review-body]");
    var reviewStepEl = root.querySelector("[data-booking-review-step]");
    var reviewListEl = root.querySelector("[data-booking-review-list]");
    var reviewBackBtn = root.querySelector("[data-booking-review-back]");

    var today = new Date();
    var viewYear = today.getUTCFullYear();
    var viewMonth = today.getUTCMonth() + 1;
    var availableDates = [];
    var currentSlots = [];

    var productBookingType = "SLOT";
    var productBookingEnabled = true;
    var fullDayStartTime = "00:00";
    var fullDayEndTime = "23:59";
    var slotsPaneEl = root.querySelector("[data-booking-slots]");
    var availableDatesByDay = {};
    var remainingCapacityByDate = {};
    var secondMonthAvailableDates = null;
    var multiDayMinNights = null;
    var multiDayMaxNights = null;
    var pendingEndDate = null;
    var bundleSessions = [];
    var bundleSessionCount = null;
    var bundleValidityDays = null;
    var bundleValidityDeadline = null;
    var bundleQuantity = 1;

    var locations = [];
    var locationsLoaded = false;
    var pendingLocation = null;
    var selectedLocationRecord = null;

    var pendingDate = null;
    var pendingSlot = null;
    var pendingQuantity = 1;
    var atReviewStep = false;
    var confirmedSlots = [];
    var numericProductId = (productId || "").split("/").pop();

    function pendingSlotsStorageKey() {
      return "booking-widget:pending-slots:" + numericProductId;
    }

    function saveConfirmedSlots() {
      try {
        if (confirmedSlots.length === 0) {
          sessionStorage.removeItem(pendingSlotsStorageKey());
        } else {
          sessionStorage.setItem(
            pendingSlotsStorageKey(),
            JSON.stringify(confirmedSlots),
          );
        }
      } catch (e) {}
    }

    function loadConfirmedSlots() {
      try {
        var raw = sessionStorage.getItem(pendingSlotsStorageKey());
        if (!raw) return;
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) confirmedSlots = parsed;
      } catch (e) {
      }
    }

    function clearPersistedSlots() {
      try {
        sessionStorage.removeItem(pendingSlotsStorageKey());
      } catch (e) {}
    }

    var customFields = [];
    var customFieldValues = {};

    var widgetSection = root.closest(".shopify-section");

    var KNOWN_NON_ADD_TO_CART_SELECTORS = [
      ".shopify-payment-button",
      ".shopify-payment-button__button",
    ];

    function findAddToCartButton(form) {
      if (!form) return null;
      var byName = form.querySelector('[name="add"]');
      if (byName) return byName;
      var candidates = form.querySelectorAll('button, input[type="submit"]');
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        var type =
          el.tagName === "INPUT" ? el.type : el.getAttribute("type") || "submit";
        if (type !== "submit") continue;
        var isExcluded = KNOWN_NON_ADD_TO_CART_SELECTORS.some(function (sel) {
          return el.closest(sel);
        });
        if (!isExcluded) return el;
      }
      return null;
    }

    function pickAddToCartForm(scope) {
      if (!scope) return { form: null, btn: null };
      var forms = scope.querySelectorAll('form[action*="/cart/add"]');
      for (var i = 0; i < forms.length; i++) {
        var btn = findAddToCartButton(forms[i]);
        if (btn) return { form: forms[i], btn: btn };
      }
      return { form: null, btn: null };
    }

    var picked = pickAddToCartForm(widgetSection);
    if (!picked.form) picked = pickAddToCartForm(document);

    var nearbyForm = picked.form;
    var addToCartBtn = picked.btn;

    if (addToCartBtn && addToCartBtn.parentNode) {
      addToCartBtn.parentNode.insertBefore(root, addToCartBtn);
    }

    var triggerBtn = root.querySelector("[data-booking-trigger]");
    triggerBtn.addEventListener("click", function () {
      clearError();
      openModal();
    });

    function injectBookingFields(form, entry) {
      var dateInput = form.querySelector(
        'input[name="properties[Booking Date]"]',
      );
      var timeInput = form.querySelector(
        'input[name="properties[Booking Time]"]',
      );
      if (!dateInput) {
        dateInput = document.createElement("input");
        dateInput.type = "hidden";
        dateInput.name = "properties[Booking Date]";
        form.appendChild(dateInput);
      }
      if (!timeInput) {
        timeInput = document.createElement("input");
        timeInput.type = "hidden";
        timeInput.name = "properties[Booking Time]";
        form.appendChild(timeInput);
      }
      dateInput.value = entry.date;
      timeInput.value = entry.slot.start;

      if (entry.slot.endDate) {
        var checkoutInput = form.querySelector(
          'input[name="properties[Checkout Date]"]',
        );
        if (!checkoutInput) {
          checkoutInput = document.createElement("input");
          checkoutInput.type = "hidden";
          checkoutInput.name = "properties[Checkout Date]";
          form.appendChild(checkoutInput);
        }
        checkoutInput.value = entry.slot.endDate;
      }

      if (entry.slot.bundleSessions && entry.slot.bundleSessions.length > 1) {
        entry.slot.bundleSessions.slice(1).forEach(function (session, i) {
          var n = i + 2;
          var sDateInput = form.querySelector(
            'input[name="properties[Session ' + n + ' Date]"]',
          );
          var sTimeInput = form.querySelector(
            'input[name="properties[Session ' + n + ' Time]"]',
          );
          if (!sDateInput) {
            sDateInput = document.createElement("input");
            sDateInput.type = "hidden";
            sDateInput.name = "properties[Session " + n + " Date]";
            form.appendChild(sDateInput);
          }
          if (!sTimeInput) {
            sTimeInput = document.createElement("input");
            sTimeInput.type = "hidden";
            sTimeInput.name = "properties[Session " + n + " Time]";
            form.appendChild(sTimeInput);
          }
          sDateInput.value = session.date;
          sTimeInput.value = session.slot.start;
        });
      }

      if (entry.location) {
        var locationInput = form.querySelector(
          'input[name="properties[Location]"]',
        );
        if (!locationInput) {
          locationInput = document.createElement("input");
          locationInput.type = "hidden";
          locationInput.name = "properties[Location]";
          form.appendChild(locationInput);
        }
        locationInput.value = entry.location;
      }

      if (entry.locationId) {
        var locationIdInput = form.querySelector(
          'input[name="properties[_Location Id]"]',
        );
        if (!locationIdInput) {
          locationIdInput = document.createElement("input");
          locationIdInput.type = "hidden";
          locationIdInput.name = "properties[_Location Id]";
          form.appendChild(locationIdInput);
        }
        locationIdInput.value = entry.locationId;
      }

      var quantityInput = form.querySelector('input[name="quantity"]');
      if (!quantityInput) {
        quantityInput = document.createElement("input");
        quantityInput.type = "hidden";
        quantityInput.name = "quantity";
        form.appendChild(quantityInput);
      }
      quantityInput.value = String(entry.quantity || 1);

      customFields.forEach(function (field) {
        var value = customFieldValues[field.fieldKey];
        if (!value) return;
        var inputName = "properties[" + field.label + "]";
        var input = form.querySelector(
          'input[name="' + cssEscape(inputName) + '"]',
        );
        if (!input) {
          input = document.createElement("input");
          input.type = "hidden";
          input.name = inputName;
          form.appendChild(input);
        }
        input.value = value;
      });
    }

    function buildFormDataForSlot(form, entry) {
      var fd = new FormData(form);
      fd.set("properties[Booking Date]", entry.date);
      fd.set("properties[Booking Time]", entry.slot.start);
      fd.set("quantity", String(entry.quantity || 1));
      if (entry.slot.endDate) {
        fd.set("properties[Checkout Date]", entry.slot.endDate);
      }
      if (entry.slot.bundleSessions && entry.slot.bundleSessions.length > 1) {
        entry.slot.bundleSessions.slice(1).forEach(function (session, i) {
          var n = i + 2;
          fd.set("properties[Session " + n + " Date]", session.date);
          fd.set("properties[Session " + n + " Time]", session.slot.start);
        });
      }
      if (entry.location) {
        fd.set("properties[Location]", entry.location);
      }
      if (entry.locationId) {
        fd.set("properties[_Location Id]", entry.locationId);
      }
      customFields.forEach(function (field) {
        var value = customFieldValues[field.fieldKey];
        if (!value) return;
        fd.set("properties[" + field.label + "]", value);
      });
      return fd;
    }

    function addSlotsToCartSequentially(form, entries, onDone) {
      var action = form.getAttribute("action") || "/cart/add";
      var index = 0;

      function next() {
        if (index >= entries.length) {
          onDone(null);
          return;
        }
        fetch(action, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: buildFormDataForSlot(form, entries[index]),
        })
          .then(function (res) {
            if (!res.ok) throw new Error("add-to-cart failed");
            return res.json();
          })
          .then(function () {
            index += 1;
            next();
          })
          .catch(onDone);
      }

      next();
    }

    function cssEscape(value) {
      return window.CSS && CSS.escape
        ? CSS.escape(value)
        : value.replace(/["\\\]]/g, "\\$&");
    }

    function guardAddToCart(event) {
      if (confirmedSlots.length === 0) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        showError(strings.selectBeforeCart);
        root.scrollIntoView({ behavior: "smooth", block: "center" });
        return true;
      }
      clearError();

      if (confirmedSlots.length === 1) {
        if (nearbyForm) injectBookingFields(nearbyForm, confirmedSlots[0]);
        setTimeout(function () {
          confirmedSlots = [];
          updateSelectionDisplay();
          refreshCartReminder();
        }, 1200);
        return false;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (!nearbyForm) {
        showError(strings.multiAddError);
        return true;
      }

      var entries = confirmedSlots.slice();
      multiAddStatusEl.hidden = false;
      multiAddStatusEl.textContent = strings.addingToCart;

      addSlotsToCartSequentially(nearbyForm, entries, function (err) {
        if (err) {
          multiAddStatusEl.hidden = true;
          showError(strings.multiAddError);
          return;
        }
        confirmedSlots = [];
        clearPersistedSlots();
        window.location.reload();
      });

      return true;
    }

    document.addEventListener(
      "submit",
      function (event) {
        var target = event.target;
        if (!(target instanceof HTMLFormElement)) return;
        if (target !== nearbyForm) return;
        if (!/\/cart\/add/.test(target.getAttribute("action") || "")) return;
        guardAddToCart(event);
      },
      true,
    );

    if (addToCartBtn) {
      addToCartBtn.addEventListener("click", guardAddToCart, true);
    }

    if (locationTimezoneEl) locationTimezoneEl.textContent = timezoneLabel();
    loadCustomFields();
    loadLocations();

    function setStatus(container, message, onRetry) {
      container.innerHTML = "";
      var p = document.createElement("p");
      p.className = "booking-widget__status";
      p.textContent = message;
      container.appendChild(p);
      if (onRetry) {
        var retryBtn = document.createElement("button");
        retryBtn.type = "button";
        retryBtn.className = "booking-widget__status-retry";
        retryBtn.textContent = strings.retry || "Try again";
        retryBtn.addEventListener("click", onRetry);
        container.appendChild(retryBtn);
      }
    }

    function loadCustomFields() {
      fetch(proxyBase + "/custom-fields")
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          customFields = data.fields || [];
          renderCustomFields();
        })
        .catch(function () {
          customFields = [];
        });
    }

    function loadLocations() {
      if (!locationStepEl || !locationListEl) return;
      fetch(proxyBase + "/locations?productId=" + encodeURIComponent(productId))
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          locations = data.locations || [];
          productBookingEnabled = data.productBookingEnabled !== false;
          locationsLoaded = true;
          populateLocationList();
          updateAvailability();
        })
        .catch(function () {
          locations = [];
          locationsLoaded = true;
          updateAvailability();
        });
    }

    function updateAvailability() {
      if (!locationsLoaded) return;
      var hasLocations = locations.length > 0 && productBookingEnabled;
      if (triggerBtn) triggerBtn.hidden = !hasLocations;
      if (unavailableEl) {
        unavailableEl.hidden = hasLocations;
        if (!hasLocations) {
          unavailableEl.textContent = strings.noLocationsConfigured;
        }
      }
    }

    function isLocationListOpen() {
      return !!locationListEl && !locationListEl.hidden;
    }

    function openLocationList() {
      if (!locationListEl) return;
      locationListEl.hidden = false;
      if (locationTriggerEl) {
        locationTriggerEl.classList.add("booking-widget__location-trigger--open");
        locationTriggerEl.setAttribute("aria-expanded", "true");
      }
    }

    function closeLocationList() {
      if (!locationListEl) return;
      locationListEl.hidden = true;
      if (locationTriggerEl) {
        locationTriggerEl.classList.remove("booking-widget__location-trigger--open");
        locationTriggerEl.setAttribute("aria-expanded", "false");
      }
    }

    function toggleLocationList() {
      if (isLocationListOpen()) {
        closeLocationList();
      } else {
        openLocationList();
      }
    }

    if (locationTriggerEl) {
      locationTriggerEl.addEventListener("click", toggleLocationList);
      locationTriggerEl.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleLocationList();
        } else if (event.key === "Escape") {
          closeLocationList();
        }
      });
    }

    document.addEventListener("click", function (event) {
      if (!isLocationListOpen()) return;
      if (
        locationTriggerEl &&
        (locationTriggerEl === event.target ||
          locationTriggerEl.contains(event.target))
      ) {
        return;
      }
      if (
        locationListEl &&
        (locationListEl === event.target || locationListEl.contains(event.target))
      ) {
        return;
      }
      closeLocationList();
    });

    function populateLocationList() {
      if (!locationListEl) return;
      locationListEl.innerHTML = "";
      var currentId = pendingLocation ? pendingLocation.id : null;

      locations.forEach(function (location) {
        var li = document.createElement("li");
        li.className = "booking-widget__location-option";
        li.setAttribute("role", "option");
        li.dataset.locationId = location.id;
        li.textContent = location.name;
        var isSelected = location.id === currentId;
        li.setAttribute("aria-selected", isSelected ? "true" : "false");
        if (isSelected) {
          li.classList.add("booking-widget__location-option--selected");
        }
        li.addEventListener("click", function () {
          selectLocation(location);
        });
        locationListEl.appendChild(li);
      });
    }

    function selectLocation(location) {
      var locationChanged = !pendingLocation || pendingLocation.id !== location.id;
      pendingLocation = location;
      selectedLocationRecord = location;
      if (locationTriggerTextEl) {
        locationTriggerTextEl.textContent = location.name;
        locationTriggerTextEl.classList.remove(
          "booking-widget__location-trigger-text--placeholder",
        );
      }
      if (locationErrorEl) {
        locationErrorEl.hidden = true;
        locationErrorEl.textContent = "";
      }
      if (locationTriggerEl) {
        locationTriggerEl.classList.remove(
          "booking-widget__location-trigger--error",
        );
      }
      populateLocationList();
      closeLocationList();
      updateConfirmButton();
      if (locationChanged) {
        pendingDate = null;
        pendingSlot = null;
        pendingEndDate = null;
        bundleSessions = [];
        bundleQuantity = 1;
        refreshQuantityForSelection();
        updateRangeSummary();
        if (datetimeStepEl && !datetimeStepEl.hidden) {
          updateTimezoneDisplay();
          loadMonth();
        }
      }
    }

    function updateTimezoneDisplay() {
      if (!locationTimezoneEl) return;
      var showsConvertedTimes =
        productBookingType === "SLOT" || productBookingType === "BUNDLE";
      var label = showsConvertedTimes || !pendingLocation
        ? timezoneLabel()
        : locationTimezoneLabel(pendingLocation.timezone);
      if (locationTimezoneEl) locationTimezoneEl.textContent = label;
    }

    function showLocationStep() {
      if (!locationStepEl) return;
      exitReviewStep();
      closeLocationList();
      selectedLocationRecord = pendingLocation;
      if (locationTriggerTextEl) {
        if (pendingLocation) {
          locationTriggerTextEl.textContent = pendingLocation.name;
          locationTriggerTextEl.classList.remove(
            "booking-widget__location-trigger-text--placeholder",
          );
        } else {
          locationTriggerTextEl.textContent = strings.selectLocationPlaceholder;
          locationTriggerTextEl.classList.add(
            "booking-widget__location-trigger-text--placeholder",
          );
        }
      }
      populateLocationList();
      locationStepEl.hidden = false;
      datetimeStepEl.hidden = true;
      if (locationEmptyStateEl) locationEmptyStateEl.hidden = false;
      if (locationErrorEl) {
        locationErrorEl.hidden = true;
        locationErrorEl.textContent = "";
      }
      if (locationTriggerEl) {
        locationTriggerEl.classList.remove(
          "booking-widget__location-trigger--error",
        );
      }
      confirmBtn.hidden = false;
      if (subheaderEl) subheaderEl.hidden = true;
      updateConfirmButton();
      updateTimezoneDisplay();
    }

    function showDatetimeStep() {
      exitReviewStep();
      if (locationStepEl) locationStepEl.hidden = true;
      datetimeStepEl.hidden = false;
      confirmBtn.hidden = false;
      if (subheaderEl) subheaderEl.hidden = false;
      updateTimezoneDisplay();
      updateConfirmButton();
    }

    function revealDatetimeStep() {
      datetimeStepEl.hidden = false;
      if (locationEmptyStateEl) locationEmptyStateEl.hidden = true;
      confirmBtn.hidden = false;
      if (subheaderEl) subheaderEl.hidden = false;
      updateTimezoneDisplay();
      updateConfirmButton();
      loadMonth();
    }

    function renderCustomFields() {
      customFieldsEl.innerHTML = "";

      if (customFields.length === 0) {
        customFieldsEl.hidden = true;
        return;
      }

      customFields.forEach(function (field) {
        var wrapper = document.createElement("div");
        wrapper.className = "booking-widget__field";

        var label = document.createElement("label");
        label.className = "booking-widget__field-label";
        label.textContent = field.label;
        var inputId = "booking-field-" + root.dataset.productId + "-" + field.fieldKey;
        label.setAttribute("for", inputId);
        wrapper.appendChild(label);

        var input;
        if (field.type === "TEXTAREA") {
          input = document.createElement("textarea");
          input.rows = 3;
        } else if (field.type === "SELECT") {
          input = document.createElement("select");
          var placeholderOpt = document.createElement("option");
          placeholderOpt.value = "";
          placeholderOpt.textContent = "";
          input.appendChild(placeholderOpt);
          (field.options || []).forEach(function (optionValue) {
            var opt = document.createElement("option");
            opt.value = optionValue;
            opt.textContent = optionValue;
            input.appendChild(opt);
          });
        } else {
          input = document.createElement("input");
          input.type = field.type === "NUMBER" ? "number" : "text";
        }

        input.id = inputId;
        input.className = "booking-widget__field-input";
        input.value = customFieldValues[field.fieldKey] || "";
        input.addEventListener("input", function () {
          customFieldValues[field.fieldKey] = input.value;
        });
        input.addEventListener("change", function () {
          customFieldValues[field.fieldKey] = input.value;
        });

        wrapper.appendChild(input);
        customFieldsEl.appendChild(wrapper);
      });

      customFieldsEl.hidden = !atReviewStep;
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
      pendingDate = null;
      pendingSlot = null;
      pendingEndDate = null;
      pendingQuantity = 1;
      bundleSessions = [];
      bundleQuantity = 1;
      customFieldValues = {};
      atReviewStep = false;
      currentSlots = [];
      if (slotListEl) slotListEl.innerHTML = "";
      if (durationEl) durationEl.hidden = true;
      if (slotsPaneEl) slotsPaneEl.hidden = true;
      var freshToday = new Date();
      viewYear = freshToday.getUTCFullYear();
      viewMonth = freshToday.getUTCMonth() + 1;
      if (reviewStepEl) reviewStepEl.hidden = true;
      if (reviewBodyEl) reviewBodyEl.hidden = true;
      refreshQuantityForSelection();
      modalBodyEl.hidden = false;
      modalFooterEl.hidden = false;
      overlayEl.hidden = false;
      document.body.classList.add("booking-widget-lock-scroll");
      updateConfirmButton();
      renderCustomFields();
      updateRangeSummary();
      updateBundleProgress();

      if (locationStepEl && locations.length > 0) {
        showLocationStep();
        if (pendingLocation) {
          revealDatetimeStep();
        }
      } else {
        showDatetimeStep();
        loadMonth();
      }
    }

    function closeModal() {
      overlayEl.hidden = true;
      document.body.classList.remove("booking-widget-lock-scroll");
    }

    // FULL_DAY and MULTI_DAY bookings only pick dates (no time column).
    function isDateOnlyType(type) {
      return type === "FULL_DAY" || type === "MULTI_DAY";
    }

    // Show the "Select a date to see available times." hint in the times
    // column (used whenever no date is selected).
    function showSelectDateHint() {
      currentSlots = [];
      if (durationEl) durationEl.hidden = true;
      if (slotListEl) setStatus(slotListEl, strings.selectDateHint);
    }

    function addMonths(year, month, delta) {
      var d = new Date(Date.UTC(year, month - 1 + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    }

    function fetchAvailability(year, month) {
      var url =
        proxyBase +
        "/availability?productId=" +
        encodeURIComponent(productId) +
        "&year=" +
        year +
        "&month=" +
        month;
      if (pendingLocation) {
        url += "&locationId=" + encodeURIComponent(pendingLocation.id);
      }
      return fetch(url).then(function (res) {
        return res.json();
      });
    }

    function applyAvailabilityData(data) {
      var dates = data.availableDates || [];
      if (data.bookingType) productBookingType = data.bookingType;
      if (typeof data.dailyStartTime === "string") fullDayStartTime = data.dailyStartTime;
      if (typeof data.dailyEndTime === "string") fullDayEndTime = data.dailyEndTime;
      if (typeof data.minNights === "number") multiDayMinNights = data.minNights;
      if (typeof data.maxNights === "number") multiDayMaxNights = data.maxNights;
      if (typeof data.bundleSessionCount === "number") bundleSessionCount = data.bundleSessionCount;
      if (typeof data.bundleValidityDays === "number") {
        bundleValidityDays = data.bundleValidityDays;
        if (!bundleValidityDeadline) {
          var deadline = new Date(today);
          deadline.setUTCDate(deadline.getUTCDate() + bundleValidityDays);
          bundleValidityDeadline = deadline.toISOString().slice(0, 10);
        }
      }
      dates.forEach(function (d) {
        availableDatesByDay[d] = true;
      });
      if (data.remainingCapacityByDate) {
        Object.keys(data.remainingCapacityByDate).forEach(function (d) {
          remainingCapacityByDate[d] = data.remainingCapacityByDate[d];
        });
      }
      return dates;
    }

    function applyLayoutForType() {
      // Two month panes are always shown; the times column only exists for
      // booking types that pick a time slot.
      var showTimes = !isDateOnlyType(productBookingType);
      if (slotsPaneEl) slotsPaneEl.hidden = !showTimes;
      if (slotsPaneOuterEl) slotsPaneOuterEl.hidden = !showTimes;
      if (datetimeCardEl) {
        datetimeCardEl.classList.toggle(
          "booking-widget__datetime-card--times",
          showTimes,
        );
      }
      if (showTimes && !pendingDate) showSelectDateHint();
    }

    function updateRangeSummary() {
      if (!rangeSummaryEl) return;
      var showSummary = productBookingType === "MULTI_DAY";
      rangeSummaryEl.hidden = !showSummary;
      if (!showSummary) return;

      if (rangeHintEl) rangeHintEl.textContent = multiDayRangeInfoText() || "";

      if (!selectedDatesEl) return;
      if (pendingDate) {
        var count = pendingEndDate
          ? inclusiveDayCount(pendingDate, pendingEndDate)
          : 1;
        selectedDatesEl.hidden = false;
        if (selectedDatesLabelEl) {
          selectedDatesLabelEl.textContent = "Selected Dates (" + count + ")";
        }
        if (selectedDatesTextEl) {
          selectedDatesTextEl.textContent = pendingEndDate
            ? formatChipDate(pendingDate) + " - " + formatChipDate(pendingEndDate)
            : formatChipDate(pendingDate);
        }
      } else {
        selectedDatesEl.hidden = true;
      }
    }

    if (selectedDatesClearBtn) {
      selectedDatesClearBtn.addEventListener("click", function () {
        pendingDate = null;
        pendingEndDate = null;
        pendingSlot = null;
        clearError();
        renderCalendar();
        updateConfirmButton();
        renderCustomFields();
        refreshQuantityForSelection();
        updateRangeSummary();
      });
    }

    var monthRequestId = 0;

    function loadMonth() {
      var requestId = ++monthRequestId;
      var second = addMonths(viewYear, viewMonth, 1);
      setStatus(calendarEl, strings.loadingAvailability);

      Promise.all([
        fetchAvailability(viewYear, viewMonth),
        fetchAvailability(second.year, second.month),
      ])
        .then(function (results) {
          // Ignore responses for a month the shopper has already left.
          if (requestId !== monthRequestId) return;
          availableDates = applyAvailabilityData(results[0]);
          secondMonthAvailableDates = applyAvailabilityData(results[1]);
          updateBundleProgress();
          applyLayoutForType();
          renderCalendar();
          if (!pendingEndDate) updateRangeSummary();
        })
        .catch(function () {
          if (requestId !== monthRequestId) return;
          setStatus(calendarEl, strings.availabilityError, loadMonth);
        });
    }

    function sessionProgressText() {
      if (bundleValidityDeadline) {
        return format(strings.sessionProgressWithDeadline, {
          current: bundleSessions.length + 1,
          total: bundleSessionCount,
          deadline: formatDateDisplay(bundleValidityDeadline),
        });
      }
      return format(strings.sessionProgress, {
        current: bundleSessions.length + 1,
        total: bundleSessionCount,
      });
    }

    function updateBundleProgress() {
      if (!bundleProgressEl) return;
      if (productBookingType !== "BUNDLE" || !bundleSessionCount) {
        bundleProgressEl.hidden = true;
        return;
      }
      bundleProgressEl.hidden = false;
      var completed = bundleSessions.length;
      var total = bundleSessionCount;
      var pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
      if (bundleProgressFillEl) bundleProgressFillEl.style.width = pct + "%";
      if (bundleProgressLabelEl) {
        bundleProgressLabelEl.textContent =
          completed + " of " + total + " sessions selected";
      }
    }

    function buildDayButton(dateStr, choosingMultiDayCheckout) {
      var day = Number(dateStr.slice(8, 10));
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = String(day);
      btn.className = "booking-widget__day";

      var isCheckoutCandidate =
        choosingMultiDayCheckout && dateStr > pendingDate;
      var withinBundleValidity =
        productBookingType !== "BUNDLE" ||
        !bundleValidityDeadline ||
        dateStr <= bundleValidityDeadline;
      var isClickable =
        (availableDatesByDay[dateStr] || isCheckoutCandidate) &&
        withinBundleValidity;

      if (isClickable) {
        btn.classList.add("booking-widget__day--available");
        btn.addEventListener("click", function () {
          if (productBookingType === "MULTI_DAY") {
            selectMultiDayDate(dateStr);
          } else {
            selectDate(dateStr);
          }
        });
      } else {
        btn.disabled = true;
      }

      if (productBookingType === "MULTI_DAY") {
        if (dateStr === pendingDate || dateStr === pendingEndDate) {
          btn.classList.add("booking-widget__day--selected");
        } else if (
          pendingDate &&
          pendingEndDate &&
          dateStr > pendingDate &&
          dateStr < pendingEndDate
        ) {
          btn.classList.add("booking-widget__day--in-range");
        }
      } else if (dateStr === pendingDate) {
        btn.classList.add("booking-widget__day--selected");
      }

      return btn;
    }

    function buildGrid(year, month, choosingMultiDayCheckout) {
      var grid = document.createElement("div");
      grid.className = "booking-widget__grid";

      var daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
      var firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

      for (var i = 0; i < firstWeekday; i++) {
        grid.appendChild(document.createElement("span"));
      }
      for (var day = 1; day <= daysInMonth; day++) {
        var dateStr = year + "-" + pad(month) + "-" + pad(day);
        grid.appendChild(buildDayButton(dateStr, choosingMultiDayCheckout));
      }

      return grid;
    }

    function buildWeekdaysRow() {
      var row = document.createElement("div");
      row.className = "booking-widget__weekdays";
      WEEKDAY_LABELS.forEach(function (label) {
        var span = document.createElement("span");
        span.textContent = label;
        row.appendChild(span);
      });
      return row;
    }

    // "Sep 2026 v" dropdown in the middle of each month header. `offset` is
    // how many months the pane sits after the first visible month.
    function buildMonthPicker(year, month, offset) {
      var shownIndex = year * 12 + (month - 1);
      var label = monthShortFormatter.format(
        new Date(Date.UTC(year, month - 1, 1)),
      );

      var wrap = document.createElement("div");
      wrap.className = "booking-widget__month-picker";

      var text = document.createElement("span");
      text.className = "booking-widget__month-picker-text";
      text.textContent = label;
      wrap.appendChild(text);
      wrap.insertAdjacentHTML("beforeend", DROPDOWN_CHEVRON_SVG);

      var select = document.createElement("select");
      select.className = "booking-widget__month-picker-select";
      select.setAttribute(
        "aria-label",
        format(strings.selectMonth, { month: label }),
      );

      var now = new Date();
      var todayIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();
      var start = todayIndex + offset;
      var end = start + MONTH_PICKER_SPAN - 1;
      // The month currently shown is always listed, even outside the range.
      var from = Math.min(start, shownIndex);
      var to = Math.max(end, shownIndex);
      for (var i = from; i <= to; i++) {
        var option = document.createElement("option");
        option.value = String(i);
        option.textContent = monthFormatter.format(
          new Date(Date.UTC(Math.floor(i / 12), i % 12, 1)),
        );
        select.appendChild(option);
      }
      select.value = String(shownIndex);
      select.addEventListener("change", function () {
        changeViewMonth(Number(select.value) - offset);
      });
      wrap.appendChild(select);

      return wrap;
    }

    function buildMonthPane(
      year,
      month,
      choosingMultiDayCheckout,
      showNoAvailability,
      offset,
    ) {
      var pane = document.createElement("div");
      pane.className = "booking-widget__month-pane";

      var heading = document.createElement("div");
      heading.className = "booking-widget__month-pane-heading";

      var prev = document.createElement("button");
      prev.type = "button";
      prev.className = "booking-widget__nav";
      prev.setAttribute("aria-label", strings.previousMonth);
      prev.innerHTML = navChevronSvg(NAV_ARROW);
      prev.addEventListener("click", function () {
        goToMonth(-1);
      });
      heading.appendChild(prev);

      heading.appendChild(buildMonthPicker(year, month, offset));

      var next = document.createElement("button");
      next.type = "button";
      next.className = "booking-widget__nav booking-widget__nav--next";
      next.setAttribute("aria-label", strings.nextMonth);
      next.innerHTML = navChevronSvg(CAL_BLUE);
      next.addEventListener("click", function () {
        goToMonth(1);
      });
      heading.appendChild(next);

      pane.appendChild(heading);
      pane.appendChild(buildWeekdaysRow());
      pane.appendChild(buildGrid(year, month, choosingMultiDayCheckout));

      if (showNoAvailability) {
        var status = document.createElement("p");
        status.className = "booking-widget__status booking-widget__month-note";
        status.textContent = strings.noAvailability;
        pane.appendChild(status);
      }

      return pane;
    }

    function renderCalendar() {
      var choosingMultiDayCheckout =
        productBookingType === "MULTI_DAY" && pendingDate && !pendingEndDate;
      var second = addMonths(viewYear, viewMonth, 1);

      var pane1NoAvail = availableDates.length === 0 && !choosingMultiDayCheckout;
      var pane2NoAvail =
        secondMonthAvailableDates !== null &&
        secondMonthAvailableDates.length === 0 &&
        !choosingMultiDayCheckout;

      calendarEl.innerHTML = "";
      calendarEl.appendChild(
        buildMonthPane(
          viewYear,
          viewMonth,
          choosingMultiDayCheckout,
          pane1NoAvail,
          0,
        ),
      );
      calendarEl.appendChild(
        buildMonthPane(
          second.year,
          second.month,
          choosingMultiDayCheckout,
          pane2NoAvail,
          1,
        ),
      );
    }

    function multiDayRangeInfoText() {
      if (multiDayMinNights !== null && multiDayMaxNights !== null) {
        return format(strings.multiDayMinMaxNights, {
          min: multiDayMinNights,
          max: multiDayMaxNights,
        });
      }
      if (multiDayMinNights !== null) {
        return format(strings.multiDayMinNights, { count: multiDayMinNights });
      }
      if (multiDayMaxNights !== null) {
        return format(strings.multiDayMaxNights, { count: multiDayMaxNights });
      }
      return null;
    }

    function selectMultiDayDate(dateStr) {
      var choosingCheckout = pendingDate && !pendingEndDate && dateStr > pendingDate;

      if (!choosingCheckout) {
        pendingDate = dateStr;
        pendingEndDate = null;
        pendingSlot = null;
        clearError();
        renderCalendar();
        updateConfirmButton();
        renderCustomFields();
        refreshQuantityForSelection();
        updateRangeSummary();
        return;
      }

      var nights = 0;
      var cursor = pendingDate;
      var allNightsAvailable = true;
      while (cursor < dateStr) {
        if (!availableDatesByDay[cursor]) {
          allNightsAvailable = false;
          break;
        }
        nights += 1;
        var d = new Date(cursor + "T00:00:00.000Z");
        d.setUTCDate(d.getUTCDate() + 1);
        cursor = d.toISOString().slice(0, 10);
      }

      if (!allNightsAvailable) {
        showError(strings.multiDayRangeUnavailable);
        return;
      }
      if (multiDayMinNights !== null && nights < multiDayMinNights) {
        showError(format(strings.multiDayMinNights, { count: multiDayMinNights }));
        return;
      }
      if (multiDayMaxNights !== null && nights > multiDayMaxNights) {
        showError(format(strings.multiDayMaxNights, { count: multiDayMaxNights }));
        return;
      }

      clearError();
      pendingEndDate = dateStr;
      pendingSlot = buildMultiDaySlot(pendingDate, pendingEndDate);
      renderCalendar();
      updateConfirmButton();
      renderCustomFields();
      refreshQuantityForSelection();
      updateRangeSummary();
    }

    function minRemainingCapacityForRange(checkinStr, checkoutStr) {
      var min = null;
      var cursor = checkinStr;
      while (cursor < checkoutStr) {
        var cap = remainingCapacityByDate[cursor];
        if (typeof cap === "number" && (min === null || cap < min)) {
          min = cap;
        }
        var d = new Date(cursor + "T00:00:00.000Z");
        d.setUTCDate(d.getUTCDate() + 1);
        cursor = d.toISOString().slice(0, 10);
      }
      return min;
    }

    function buildMultiDaySlot(checkinStr, checkoutStr) {
      return {
        start: "00:00",
        end: "00:00",
        startsAt: checkinStr + "T00:00:00.000Z",
        endDate: checkoutStr,
        remainingCapacity: minRemainingCapacityForRange(checkinStr, checkoutStr),
        available: true,
      };
    }

    function buildFullDaySlot(dateStr) {
      var cap = remainingCapacityByDate[dateStr];
      return {
        start: fullDayStartTime,
        end: fullDayEndTime,
        startsAt: dateStr + "T00:00:00.000Z",
        remainingCapacity: typeof cap === "number" ? cap : null,
        available: true,
      };
    }

    function selectDate(dateStr) {
      pendingDate = dateStr;
      pendingSlot = productBookingType === "FULL_DAY" ? buildFullDaySlot(dateStr) : null;
      renderCalendar();
      updateConfirmButton();
      renderCustomFields();
      refreshQuantityForSelection();
      if (productBookingType === "FULL_DAY") {
        if (slotsPaneEl) slotsPaneEl.hidden = true;
        durationEl.hidden = true;
      } else {
        if (slotsPaneEl) slotsPaneEl.hidden = false;
        loadSlots(dateStr);
      }
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
      if (pendingLocation) {
        url += "&locationId=" + encodeURIComponent(pendingLocation.id);
      }

      fetch(url)
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          currentSlots = data.slots || [];
          renderSlots();
        })
        .catch(function () {
          setStatus(slotListEl, strings.timesError, function () {
            loadSlots(dateStr);
          });
        });
    }

    function isSlotTaken(dateStr, slot) {
      if (!dateStr || !slot) return false;
      var inBundle = bundleSessions.some(function (session) {
        return (
          session.date === dateStr && session.slot.startsAt === slot.startsAt
        );
      });
      if (inBundle) return true;
      return confirmedSlots.some(function (entry) {
        return entry.date === dateStr && entry.slot.startsAt === slot.startsAt;
      });
    }

    function renderSlots() {
      slotListEl.innerHTML = "";

      if (currentSlots.length === 0) {
        setStatus(slotListEl, strings.noTimes);
        return;
      }

      durationEl.hidden = false;
      if (productBookingType === "BUNDLE" && bundleSessionCount) {
        durationEl.textContent = sessionProgressText();
      } else {
        durationEl.textContent = format(strings.durationMinutes, {
          count: slotDurationMinutes(currentSlots[0]),
        });
      }

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
        textWrap.textContent = formatTimeRangeDisplay(slot);

        if (slot.available === false) {
          row.classList.add("booking-widget__slot-row--unavailable");
          input.disabled = true;
          var bookedTag = document.createElement("span");
          bookedTag.className = "booking-widget__slot-tag";
          bookedTag.textContent = "(" + strings.booked + ")";
          row.appendChild(input);
          row.appendChild(textWrap);
          row.appendChild(bookedTag);
          slotListEl.appendChild(row);
          return;
        }

        if (isSlotTaken(pendingDate, slot)) {
          row.classList.add("booking-widget__slot-row--unavailable");
          input.disabled = true;
          var takenTag = document.createElement("span");
          takenTag.className = "booking-widget__slot-tag";
          takenTag.textContent = "(" + strings.alreadySelected + ")";
          row.appendChild(input);
          row.appendChild(textWrap);
          row.appendChild(takenTag);
          slotListEl.appendChild(row);
          return;
        }

        if (typeof slot.remainingCapacity === "number") {
          var isLow = slot.remainingCapacity <= LOW_AVAILABILITY_THRESHOLD;
          var remainingTag = document.createElement("span");
          remainingTag.className =
            "booking-widget__slot-tag" +
            (isLow ? " booking-widget__slot-tag--low" : "");
          remainingTag.textContent =
            "(" +
            (slot.remainingCapacity === 1
              ? strings.spotLeft
              : format(strings.spotsLeft, { count: slot.remainingCapacity })) +
            ")";
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
          renderCustomFields();
          refreshQuantityForSelection();
        });

        slotListEl.appendChild(row);
      });
    }

    var DEFAULT_MAX_QUANTITY = 99;

    function maxQuantityForPendingSlot() {
      if (!pendingSlot || typeof pendingSlot.remainingCapacity !== "number") {
        return DEFAULT_MAX_QUANTITY;
      }
      return Math.max(1, pendingSlot.remainingCapacity);
    }

    function setPendingQuantity(value) {
      var max = maxQuantityForPendingSlot();
      var next = Math.round(Number(value));
      if (!Number.isFinite(next) || next < 1) next = 1;
      if (next > max) next = max;
      pendingQuantity = next;
      if (quantityInputEl) quantityInputEl.value = String(pendingQuantity);
      if (quantityDecreaseBtn) quantityDecreaseBtn.disabled = pendingQuantity <= 1;
      if (quantityIncreaseBtn) quantityIncreaseBtn.disabled = pendingQuantity >= max;
      if (quantityNoteEl) {
        var showsCapacityAlways =
          isDateOnlyType(productBookingType) &&
          pendingSlot &&
          typeof pendingSlot.remainingCapacity === "number";

        if (showsCapacityAlways) {
          quantityNoteEl.textContent =
            max === 1
              ? strings.unitAvailable
              : format(strings.unitsAvailable, { count: max });
          quantityNoteEl.hidden = false;
        } else if (max <= 5) {
          quantityNoteEl.textContent = format(strings.quantityMaxReached, {
            count: max,
          });
          quantityNoteEl.hidden = false;
        } else {
          quantityNoteEl.hidden = true;
        }
      }
    }

    function refreshQuantityForSelection() {
      var isBundleFollowupSession =
        productBookingType === "BUNDLE" && bundleSessions.length > 0;
      if (quantityWrapEl) {
        quantityWrapEl.hidden = !pendingSlot || isBundleFollowupSession;
      }
      setPendingQuantity(
        pendingSlot && !isBundleFollowupSession ? pendingQuantity : 1,
      );
    }

    if (quantityDecreaseBtn) {
      quantityDecreaseBtn.addEventListener("click", function () {
        setPendingQuantity(pendingQuantity - 1);
      });
    }
    if (quantityIncreaseBtn) {
      quantityIncreaseBtn.addEventListener("click", function () {
        setPendingQuantity(pendingQuantity + 1);
      });
    }
    if (quantityInputEl) {
      quantityInputEl.addEventListener("change", function () {
        setPendingQuantity(quantityInputEl.value);
      });
    }
    setPendingQuantity(1);

    function isAtLocationStep() {
      return !!(
        locationStepEl &&
        !locationStepEl.hidden &&
        datetimeStepEl &&
        datetimeStepEl.hidden
      );
    }

    function updateConfirmButton() {
      if (isAtLocationStep()) {
        confirmBtn.disabled = !pendingLocation;
        confirmBtn.textContent = strings.next;
        if (reviewBackBtn) reviewBackBtn.hidden = true;
        if (nextSlotBtn) nextSlotBtn.hidden = true;
        return;
      }

      if (productBookingType === "BUNDLE" && !atReviewStep) {
        var totalSessions = bundleSessionCount || 1;
        var isLastSession = bundleSessions.length >= totalSessions - 1;

        if (nextSlotBtn) {
          nextSlotBtn.hidden = totalSessions <= 1;
          nextSlotBtn.disabled = isLastSession || !(pendingDate && pendingSlot);
        }
        confirmBtn.disabled = !(isLastSession && pendingDate && pendingSlot);
        confirmBtn.textContent = strings.next;
        if (!confirmBtn.disabled && nextSlotBtn) {
          nextSlotBtn.disabled = true;
        }
        if (reviewBackBtn) reviewBackBtn.hidden = true;
        return;
      }

      if (nextSlotBtn) nextSlotBtn.hidden = true;
      confirmBtn.disabled = atReviewStep ? false : !(pendingDate && pendingSlot);
      confirmBtn.textContent = atReviewStep ? strings.confirm : strings.next;
      if (reviewBackBtn) reviewBackBtn.hidden = !atReviewStep;
    }

    var REVIEW_ICONS = {
      location:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M12 21s-7-7.58-7-12a7 7 0 1 1 14 0c0 4.42-7 12-7 12z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />' +
        '<circle cx="12" cy="9" r="2.4" stroke="currentColor" stroke-width="1.6" />' +
        "</svg>",
      calendar:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" stroke-width="1.6" />' +
        '<path d="M3.5 9.5h17" stroke="currentColor" stroke-width="1.6" />' +
        '<path d="M8 3v3M16 3v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />' +
        "</svg>",
      clock:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6" />' +
        '<path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />' +
        "</svg>",
      quantity:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v1a1.5 1.5 0 0 0 0 3v1A2.5 2.5 0 0 1 17.5 16h-11A2.5 2.5 0 0 1 4 13.5v-1a1.5 1.5 0 0 0 0-3v-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />' +
        '<path d="M14 6.5v8.5" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 2" />' +
        "</svg>",
    };

    function buildReviewSummary() {
      if (!reviewListEl) return;
      reviewListEl.innerHTML = "";
      if (!pendingDate || !pendingSlot) return;

      var rows;
      if (productBookingType === "BUNDLE") {
        rows = [
          pendingLocation
            ? { label: "Location", value: pendingLocation.name, icon: "location" }
            : null,
        ];
        bundleSessions.forEach(function (session, index) {
          rows.push({
            label: format(strings.sessionConfirmed, { number: index + 1 }),
            value:
              formatDateDisplay(session.date) +
              " · " +
              formatTimeRangeDisplay(session.slot),
            icon: "calendar",
          });
        });
        rows.push({
          label: "Quantity",
          value: String(bundleQuantity),
          icon: "quantity",
        });
      } else if (productBookingType === "MULTI_DAY") {
        rows = [
          pendingLocation
            ? { label: "Location", value: pendingLocation.name, icon: "location" }
            : null,
          {
            label: "Check-in",
            value: formatDateDisplay(pendingDate),
            icon: "calendar",
          },
          {
            label: "Check-out",
            value: formatDateDisplay(pendingSlot.endDate),
            icon: "calendar",
          },
          {
            label: "Quantity",
            value: String(pendingQuantity),
            icon: "quantity",
          },
        ];
      } else {
        rows = [
          pendingLocation
            ? { label: "Location", value: pendingLocation.name, icon: "location" }
            : null,
          { label: "Date", value: formatDateDisplay(pendingDate), icon: "calendar" },
          productBookingType === "FULL_DAY"
            ? {
                label: "Booking",
                value: formatTimeRangeDisplay(pendingSlot, false),
                icon: "clock",
              }
            : {
                label: "Time",
                value: formatTimeRangeDisplay(pendingSlot),
                icon: "clock",
              },
          {
            label: "Quantity",
            value: String(pendingQuantity),
            icon: "quantity",
          },
        ];
      }

      rows.forEach(function (row) {
        if (!row) return;
        var dt = document.createElement("dt");
        dt.textContent = row.label;

        var dd = document.createElement("dd");
        dd.className = "booking-widget__review-row";
        var iconWrap = document.createElement("span");
        iconWrap.className = "booking-widget__review-icon";
        iconWrap.innerHTML = REVIEW_ICONS[row.icon] || "";
        iconWrap.setAttribute("aria-hidden", "true");
        var labelSpan = document.createElement("span");
        labelSpan.className = "booking-widget__review-label";
        labelSpan.textContent = row.label;
        var valueSpan = document.createElement("span");
        valueSpan.className = "booking-widget__review-value";
        valueSpan.textContent = row.value;
        dd.appendChild(iconWrap);
        dd.appendChild(labelSpan);
        dd.appendChild(valueSpan);

        reviewListEl.appendChild(dt);
        reviewListEl.appendChild(dd);
      });

      if (unitPrice !== null) {
        var reviewQuantity =
          productBookingType === "BUNDLE" ? bundleQuantity : pendingQuantity;
        var total = unitPrice * reviewQuantity;
        var totalDt = document.createElement("dt");
        totalDt.textContent = "Total";

        var totalDd = document.createElement("dd");
        totalDd.className =
          "booking-widget__review-row booking-widget__review-row--total";
        var totalLabel = document.createElement("span");
        totalLabel.className = "booking-widget__review-total-label";
        totalLabel.textContent =
          reviewQuantity > 1
            ? formatMoney(unitPrice) + " \u00d7 " + reviewQuantity
            : "Total";
        var totalValue = document.createElement("span");
        totalValue.className = "booking-widget__review-total-value";
        totalValue.textContent = formatMoney(total);
        totalDd.appendChild(totalLabel);
        totalDd.appendChild(totalValue);

        reviewListEl.appendChild(totalDt);
        reviewListEl.appendChild(totalDd);
      }
    }

    function showReviewStep() {
      atReviewStep = true;
      buildReviewSummary();
      modalBodyEl.hidden = true;
      if (quantityWrapEl) quantityWrapEl.hidden = true;
      if (reviewStepEl) reviewStepEl.hidden = false;
      if (reviewBodyEl) reviewBodyEl.hidden = false;
      if (subheaderEl) subheaderEl.hidden = true;
      renderCustomFields();
      updateConfirmButton();
    }

    function exitReviewStep() {
      atReviewStep = false;
      if (reviewStepEl) reviewStepEl.hidden = true;
      if (reviewBodyEl) reviewBodyEl.hidden = true;
      modalBodyEl.hidden = false;
      renderCustomFields();
    }

    if (reviewBackBtn) {
      reviewBackBtn.addEventListener("click", function () {
        if (productBookingType === "BUNDLE" && bundleSessions.length > 0) {
          var last = bundleSessions.pop();
          pendingDate = last.date;
          pendingSlot = last.slot;
          updateBundleProgress();
          exitReviewStep();
          loadSlots(pendingDate);
          refreshQuantityForSelection();
          updateConfirmButton();
          return;
        }
        exitReviewStep();
        renderSlots();
        refreshQuantityForSelection();
        updateConfirmButton();
      });
    }

    function updateSelectionDisplay() {
      saveConfirmedSlots();
      selectionEl.innerHTML = "";

      if (confirmedSlots.length === 0) {
        selectionEl.hidden = true;
        if (triggerBtn) {
          triggerBtn.hidden = !(locationsLoaded && locations.length > 0);
        }
        return;
      }

      triggerBtn.hidden = true;
      selectionEl.hidden = false;

      confirmedSlots.forEach(function (entry, index) {
        var chip = document.createElement("span");
        chip.className = "booking-widget__selection-chip";

        var label = document.createElement("span");
        label.className = "booking-widget__selection-chip-text";

        if (entry.slot.bundleSessions && entry.slot.bundleSessions.length > 1) {
          label.classList.add("booking-widget__selection-chip-text--bundle");
          entry.slot.bundleSessions.forEach(function (session, sessionIndex) {
            var line = document.createElement("span");
            line.className = "booking-widget__selection-chip-line";
            var lineText =
              format(strings.sessionConfirmed, { number: sessionIndex + 1 }) +
              ": " +
              formatDateDisplay(session.date) +
              " · " +
              formatTimeRangeDisplay(session.slot);
            if (entry.quantity && entry.quantity > 1) {
              lineText += " \u00d7 " + entry.quantity;
            }
            line.textContent = lineText;
            label.appendChild(line);
          });
        } else {
          var chipText = format(strings.selected, {
            date: formatDateDisplay(entry.date),
            time: formatTimeRangeDisplay(
              entry.slot,
              productBookingType === "SLOT" || productBookingType === "BUNDLE",
            ),
          });
          if (entry.quantity && entry.quantity > 1) {
            chipText += " \u00d7 " + entry.quantity;
          }
          label.textContent = chipText;
        }
        chip.appendChild(label);

        var removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "booking-widget__selection-remove";
        removeBtn.setAttribute("aria-label", strings.removeSlot);
        removeBtn.textContent = "\u00d7";
        removeBtn.addEventListener("click", function () {
          confirmedSlots.splice(index, 1);
          updateSelectionDisplay();
        });
        chip.appendChild(removeBtn);

        selectionEl.appendChild(chip);
      });

      var addMoreBtn = document.createElement("button");
      addMoreBtn.type = "button";
      addMoreBtn.className = "booking-widget__selection-add-more";
      addMoreBtn.textContent = strings.addAnotherSlotLink;
      addMoreBtn.addEventListener("click", function () {
        openModal();
      });
      selectionEl.appendChild(addMoreBtn);
    }

    function refreshCartReminder() {
      if (!cartReminderEl) return;
      fetch("/cart.js", { headers: { Accept: "application/json" } })
        .then(function (res) {
          return res.json();
        })
        .then(function (cart) {
          var items = (cart.items || []).filter(function (item) {
            return (
              String(item.product_id) === numericProductId &&
              item.properties &&
              item.properties["Booking Date"]
            );
          });
          renderCartReminder(items);
        })
        .catch(function () {
        });
    }

    function renderCartReminder(items) {
      cartReminderListEl.innerHTML = "";

      if (items.length === 0) {
        cartReminderEl.hidden = true;
        return;
      }

      cartReminderTitleEl.textContent = strings.alreadyBooked;

      items.forEach(function (item) {
        var li = document.createElement("li");
        var date = item.properties["Booking Date"];
        var time = item.properties["Booking Time"] || "";

        var sessionCount = 1;
        while (
          item.properties["Session " + (sessionCount + 1) + " Date"]
        ) {
          sessionCount += 1;
        }

        if (sessionCount > 1) {
          li.textContent = format(strings.sessionsBooked, {
            count: sessionCount,
          });
        } else {
          li.textContent = format(strings.selected, {
            date: formatDateDisplay(date),
            time: time,
          });
        }
        cartReminderListEl.appendChild(li);
      });

      cartReminderEl.hidden = false;
    }

    // Jump to a month given as (year * 12 + monthIndex). Used by the
    // prev / next arrows and by the month dropdowns.
    function changeViewMonth(index) {
      viewYear = Math.floor(index / 12);
      viewMonth = (index % 12) + 1;
      pendingDate = null;
      pendingSlot = null;
      pendingEndDate = null;
      refreshQuantityForSelection();
      showSelectDateHint();
      updateConfirmButton();
      renderCustomFields();
      loadMonth();
    }

    function goToMonth(delta) {
      changeViewMonth(viewYear * 12 + (viewMonth - 1) + delta);
    }

    closeBtn.addEventListener("click", closeModal);
    overlayEl.addEventListener("click", function (event) {
      if (event.target === overlayEl) closeModal();
    });
    if (nextSlotBtn) {
      nextSlotBtn.addEventListener("click", function () {
        if (!pendingDate || !pendingSlot) return;
        if (isSlotTaken(pendingDate, pendingSlot)) {
          showError(strings.slotAlreadySelectedError);
          return;
        }
        clearError();
        if (bundleSessions.length === 0) {
          bundleQuantity = pendingQuantity;
        }
        bundleSessions.push({ date: pendingDate, slot: pendingSlot });
        updateBundleProgress();
        pendingDate = null;
        pendingSlot = null;
        renderCalendar();
        updateConfirmButton();
        renderCustomFields();
        refreshQuantityForSelection();
        if (slotsPaneEl) slotsPaneEl.hidden = false;
        setStatus(slotListEl, strings.selectDateHint);
        durationEl.hidden = false;
        durationEl.textContent = sessionProgressText();
      });
    }
    confirmBtn.addEventListener("click", function () {
      if (isAtLocationStep()) {
        if (!pendingLocation) {
          if (locationErrorEl) {
            locationErrorEl.hidden = false;
            locationErrorEl.textContent = strings.locationRequired;
          }
          if (locationTriggerEl) {
            locationTriggerEl.classList.add(
              "booking-widget__location-trigger--error",
            );
          }
          return;
        }
        revealDatetimeStep();
        return;
      }

      if (!pendingDate || !pendingSlot) return;

      if (productBookingType === "BUNDLE") {
        var totalSessions = bundleSessionCount || 1;

        if (!atReviewStep) {
          if (isSlotTaken(pendingDate, pendingSlot)) {
            showError(strings.slotAlreadySelectedError);
            return;
          }
          clearError();
          if (bundleSessions.length === 0) {
            bundleQuantity = pendingQuantity;
          }
          bundleSessions.push({ date: pendingDate, slot: pendingSlot });
          updateBundleProgress();
          showReviewStep();
          return;
        }

        var firstSession = bundleSessions[0];
        var combinedSlot = Object.assign({}, firstSession.slot, {
          bundleSessions: bundleSessions.slice(),
        });
        confirmedSlots.push({
          date: firstSession.date,
          slot: combinedSlot,
          location: pendingLocation ? pendingLocation.name : null,
          locationId: pendingLocation ? pendingLocation.id : null,
          quantity: bundleQuantity,
        });
        updateSelectionDisplay();
        bundleSessions = [];
        bundleQuantity = 1;
        updateBundleProgress();
        closeModal();
        return;
      }

      if (!atReviewStep) {
        showReviewStep();
        return;
      }

      var date = pendingDate;
      var slot = pendingSlot;
      var quantity = pendingQuantity;
      if (isSlotTaken(date, slot)) {
        showError(strings.slotAlreadySelectedError);
        return;
      }
      clearError();
      confirmedSlots.push({
        date: date,
        slot: slot,
        location: pendingLocation ? pendingLocation.name : null,
        locationId: pendingLocation ? pendingLocation.id : null,
        quantity: quantity,
      });
      updateSelectionDisplay();
      refreshQuantityForSelection();
      closeModal();
    });

    loadConfirmedSlots();
    updateSelectionDisplay();
    refreshCartReminder();
  }

  var BUY_BUTTON_CONTAINER_SELECTORS = [
    "product-form",
    "form[action*='/cart/add'] .product-form__buttons",
    "form[action*='/cart/add']",
    ".shopify-payment-button",
    ".product__info-container",
    ".product-form",
  ];

  function relocateNextToBuyButton(root) {
    if (root.closest("form[action*='/cart/add']")) return;
    if (root.dataset.bookingWidgetPlaced === "true") return;

    for (var i = 0; i < BUY_BUTTON_CONTAINER_SELECTORS.length; i++) {
      var target = document.querySelector(BUY_BUTTON_CONTAINER_SELECTORS[i]);
      if (target && target.parentNode) {
        target.insertAdjacentElement("afterend", root);
        root.dataset.bookingWidgetPlaced = "true";
        return;
      }
    }
  }

  function init() {
    document.querySelectorAll("[data-booking-widget]").forEach(function (root) {
      relocateNextToBuyButton(root);
      initWidget(root);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();