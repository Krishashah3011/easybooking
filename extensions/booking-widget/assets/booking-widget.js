(function () {
  "use strict";

  var LOW_AVAILABILITY_THRESHOLD = 2;
  var WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  var ENGLISH_STRINGS = {
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
    selected: "{date} | {time}",
    triggerBook: "Book your slot",
    modalTitle: "Appointment - Booking",
    modalSubtitle: "Select your preferred date & time",
    selectLocation: "Select location",
    selectLocationPlaceholder: "Select location",
    locationRequired: "Please select a location to continue.",
    noLocationsConfigured:
      "Booking isn't available for this product yet. Please check back soon.",
    next: "Next",
    changeLocation: "Change",
    confirm: "Confirm",
    close: "Close",
    durationMinutes: "{count} Mins",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    availableTimes: "Available times",
    alreadyBooked: "This slots are added to Cart for this product:",
    askMoreMessage:
      "{date} | {time} added. Want to book another slot for this product?",
    addAnotherSlot: "Yes, add another slot",
    doneAddToCart: "No, I'm done",
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

  function formatTimeInBrowserTZ(isoString) {
    try {
      var dtf = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return dtf.format(new Date(isoString));
    } catch (e) {
      return "";
    }
  }

  function formatTimeRangeDisplay(slot, convertToLocal) {
    if (convertToLocal === false) {
      return slot.start + " - " + slot.end;
    }
    var startLabel = formatTimeInBrowserTZ(slot.startsAt);
    if (!startLabel) {
      return slot.start + " - " + slot.end;
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
    var timezoneEl = root.querySelector("[data-booking-timezone]");
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
    var locationSummaryEl = root.querySelector("[data-booking-location-summary]");
    var locationSummaryTextEl = root.querySelector(
      "[data-booking-location-summary-text]",
    );
    var locationChangeBtn = root.querySelector("[data-booking-location-change]");
    var calendarEl = root.querySelector("[data-booking-calendar]");
    var weekdaysEl = root.querySelector("[data-booking-weekdays]");
    var monthLabelEl = root.querySelector("[data-booking-month-label]");
    var durationEl = root.querySelector("[data-booking-duration]");
    var slotListEl = root.querySelector("[data-booking-slot-list]");
    var prevBtn = root.querySelector("[data-booking-prev]");
    var nextBtn = root.querySelector("[data-booking-next]");
    var confirmBtn = root.querySelector("[data-booking-confirm]");
    var customFieldsEl = root.querySelector("[data-booking-custom-fields]");
    var askMoreEl = root.querySelector("[data-booking-ask-more]");
    var askMoreMessageEl = root.querySelector("[data-booking-ask-more-message]");
    var askMoreYesBtn = root.querySelector("[data-booking-ask-more-yes]");
    var askMoreNoBtn = root.querySelector("[data-booking-ask-more-no]");
    var quantityWrapEl = root.querySelector("[data-booking-quantity]");
    var quantityInputEl = root.querySelector("[data-booking-quantity-input]");
    var quantityDecreaseBtn = root.querySelector(
      "[data-booking-quantity-decrease]",
    );
    var quantityIncreaseBtn = root.querySelector(
      "[data-booking-quantity-increase]",
    );
    var quantityNoteEl = root.querySelector("[data-booking-quantity-note]");
    var reviewStepEl = root.querySelector("[data-booking-review-step]");
    var reviewListEl = root.querySelector("[data-booking-review-list]");
    var reviewBackBtn = root.querySelector("[data-booking-review-back]");

    var today = new Date();
    var viewYear = today.getUTCFullYear();
    var viewMonth = today.getUTCMonth() + 1;
    var availableDates = [];
    var currentSlots = [];

    var productBookingType = "SLOT";
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

    weekdaysEl.innerHTML = "";
    WEEKDAY_LABELS.forEach(function (label) {
      var span = document.createElement("span");
      span.textContent = label;
      weekdaysEl.appendChild(span);
    });

    timezoneEl.textContent = timezoneLabel();
    loadCustomFields();
    loadLocations();

    function setStatus(container, message) {
      container.innerHTML = "";
      var p = document.createElement("p");
      p.className = "booking-widget__status";
      p.textContent = message;
      container.appendChild(p);
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
      fetch(proxyBase + "/locations")
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          locations = data.locations || [];
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
      var hasLocations = locations.length > 0;
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
      showDatetimeStep();
      if (locationChanged) {
        pendingDate = null;
        pendingSlot = null;
        pendingEndDate = null;
        bundleSessions = [];
        bundleQuantity = 1;
        refreshQuantityForSelection();
        updateConfirmButton();
      }
      loadMonth();
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
      if (locationSummaryEl) locationSummaryEl.hidden = true;
      if (locationErrorEl) {
        locationErrorEl.hidden = true;
        locationErrorEl.textContent = "";
      }
      if (locationTriggerEl) {
        locationTriggerEl.classList.remove(
          "booking-widget__location-trigger--error",
        );
      }
      confirmBtn.hidden = true;
      if (subheaderEl) subheaderEl.hidden = true;
    }

    function showDatetimeStep() {
      exitReviewStep();
      if (locationStepEl) locationStepEl.hidden = true;
      datetimeStepEl.hidden = false;
      confirmBtn.hidden = false;
      if (subheaderEl) subheaderEl.hidden = false;

      if (locationSummaryEl && locationSummaryTextEl) {
        if (pendingLocation) {
          locationSummaryTextEl.textContent = pendingLocation.name;
          locationSummaryEl.hidden = false;
        } else {
          locationSummaryEl.hidden = true;
        }
      }

      if (timezoneEl) {
        var showsConvertedTimes =
          productBookingType === "SLOT" || productBookingType === "BUNDLE";
        timezoneEl.textContent = showsConvertedTimes || !pendingLocation
          ? timezoneLabel()
          : locationTimezoneLabel(pendingLocation.timezone);
      }
    }

    if (locationChangeBtn) {
      locationChangeBtn.addEventListener("click", function () {
        showLocationStep();
      });
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
      bundleSessions = [];
      bundleQuantity = 1;
      atReviewStep = false;
      if (reviewStepEl) reviewStepEl.hidden = true;
      refreshQuantityForSelection();
      askMoreEl.hidden = true;
      modalBodyEl.hidden = false;
      modalFooterEl.hidden = false;
      overlayEl.hidden = false;
      document.body.classList.add("booking-widget-lock-scroll");
      updateConfirmButton();
      renderCustomFields();

      if (locationStepEl && locations.length > 0 && !pendingLocation) {
        showLocationStep();
      } else {
        showDatetimeStep();
        loadMonth();
      }
    }

    function closeModal() {
      overlayEl.hidden = true;
      document.body.classList.remove("booking-widget-lock-scroll");
    }

    function showAskMore(date, slot) {
      askMoreMessageEl.textContent = format(strings.askMoreMessage, {
        date: formatDateDisplay(date),
        time: formatTimeRangeDisplay(slot, productBookingType === "SLOT"),
      });
      modalBodyEl.hidden = true;
      modalFooterEl.hidden = true;
      if (quantityWrapEl) quantityWrapEl.hidden = true;
      if (reviewStepEl) reviewStepEl.hidden = true;
      if (customFieldsEl) customFieldsEl.hidden = true;
      if (subheaderEl) subheaderEl.hidden = true;
      askMoreEl.hidden = false;
    }

    function resumeModalForAnotherSlot() {
      askMoreEl.hidden = true;
      modalBodyEl.hidden = false;
      modalFooterEl.hidden = false;
      if (subheaderEl) subheaderEl.hidden = false;
      pendingDate = null;
      pendingSlot = null;
      pendingEndDate = null;
      bundleSessions = [];
      bundleQuantity = 1;
      atReviewStep = false;
      if (reviewStepEl) reviewStepEl.hidden = true;
      refreshQuantityForSelection();
      currentSlots = [];
      durationEl.hidden = true;
      setStatus(slotListEl, strings.noTimes);
      updateConfirmButton();
      renderCustomFields();
      renderCalendar();
    }

    function isTwoMonthType(type) {
      return type === "FULL_DAY" || type === "MULTI_DAY";
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
      if (slotsPaneEl) slotsPaneEl.hidden = isTwoMonthType(productBookingType);
    }

    function loadMonth() {
      setStatus(calendarEl, strings.loadingAvailability);

      fetchAvailability(viewYear, viewMonth)
        .then(function (data) {
          availableDates = applyAvailabilityData(data);
          applyLayoutForType();

          if (isTwoMonthType(productBookingType)) {
            var second = addMonths(viewYear, viewMonth, 1);
            fetchAvailability(second.year, second.month)
              .then(function (data2) {
                secondMonthAvailableDates = applyAvailabilityData(data2);
                renderCalendar();
                if (!pendingEndDate) showMultiDayRangeInfo();
              })
              .catch(function () {
                setStatus(calendarEl, strings.availabilityError);
              });
          } else {
            secondMonthAvailableDates = null;
            renderCalendar();
            if (!pendingEndDate) showMultiDayRangeInfo();
          }
        })
        .catch(function () {
          setStatus(calendarEl, strings.availabilityError);
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
      row.className = "booking-widget__weekdays booking-widget__weekdays--pane";
      WEEKDAY_LABELS.forEach(function (label) {
        var span = document.createElement("span");
        span.textContent = label;
        row.appendChild(span);
      });
      return row;
    }

    function buildMonthPane(year, month, choosingMultiDayCheckout, showNoAvailability) {
      var pane = document.createElement("div");
      pane.className = "booking-widget__month-pane";

      var heading = document.createElement("div");
      heading.className = "booking-widget__month-pane-label";
      heading.textContent = monthFormatter.format(
        new Date(Date.UTC(year, month - 1, 1)),
      );
      pane.appendChild(heading);
      pane.appendChild(buildWeekdaysRow());

      if (showNoAvailability) {
        var status = document.createElement("p");
        status.className = "booking-widget__status";
        status.textContent = strings.noAvailability;
        pane.appendChild(status);
      } else {
        pane.appendChild(buildGrid(year, month, choosingMultiDayCheckout));
      }

      return pane;
    }

    function renderCalendar() {
      var choosingMultiDayCheckout =
        productBookingType === "MULTI_DAY" && pendingDate && !pendingEndDate;

      calendarEl.innerHTML = "";

      if (isTwoMonthType(productBookingType) && secondMonthAvailableDates !== null) {
        monthLabelEl.hidden = true;
        weekdaysEl.hidden = true;
        calendarEl.classList.add("booking-widget__calendar--dual");

        var second = addMonths(viewYear, viewMonth, 1);
        var pane1NoAvail = availableDates.length === 0 && !choosingMultiDayCheckout;
        var pane2NoAvail =
          secondMonthAvailableDates.length === 0 && !choosingMultiDayCheckout;

        calendarEl.appendChild(
          buildMonthPane(viewYear, viewMonth, choosingMultiDayCheckout, pane1NoAvail),
        );
        calendarEl.appendChild(
          buildMonthPane(second.year, second.month, choosingMultiDayCheckout, pane2NoAvail),
        );
        return;
      }

      monthLabelEl.hidden = false;
      weekdaysEl.hidden = false;
      calendarEl.classList.remove("booking-widget__calendar--dual");
      monthLabelEl.textContent = monthFormatter.format(
        new Date(Date.UTC(viewYear, viewMonth - 1, 1)),
      );

      if (availableDates.length === 0 && !choosingMultiDayCheckout) {
        setStatus(calendarEl, strings.noAvailability);
        return;
      }

      calendarEl.appendChild(buildGrid(viewYear, viewMonth, choosingMultiDayCheckout));
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

    // Shows the configured min/max stay length while the shopper is still
    // picking a check-in/check-out range (storefront side of the min/max
    // days messaging requirement). Returns true if a message was shown.
    function showMultiDayRangeInfo() {
      if (productBookingType !== "MULTI_DAY") return false;
      var text = multiDayRangeInfoText();
      if (!text) return false;
      durationEl.hidden = false;
      durationEl.textContent = text;
      return true;
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
        if (!showMultiDayRangeInfo()) durationEl.hidden = true;
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
      durationEl.hidden = false;
      durationEl.textContent = format(strings.nightsSelected, { count: nights });
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
        start: "00:00",
        end: "23:59",
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
          bookedTag.textContent = strings.booked;
          row.appendChild(input);
          row.appendChild(textWrap);
          row.appendChild(bookedTag);
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
          isTwoMonthType(productBookingType) &&
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
      // For bundle bookings, quantity can only be chosen while selecting the
      // 1st session; once a session has been confirmed, quantity is locked.
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

    function updateConfirmButton() {
      confirmBtn.disabled = atReviewStep ? false : !(pendingDate && pendingSlot);
    }

    function buildReviewSummary() {
      if (!reviewListEl) return;
      reviewListEl.innerHTML = "";
      if (!pendingDate || !pendingSlot) return;

      var rows;
      if (productBookingType === "BUNDLE") {
        rows = [
          pendingLocation
            ? { label: "Location", value: pendingLocation.name }
            : null,
        ];
        bundleSessions.forEach(function (session, index) {
          rows.push({
            label: format(strings.sessionConfirmed, { number: index + 1 }),
            value:
              formatDateDisplay(session.date) +
              " · " +
              formatTimeRangeDisplay(session.slot),
          });
        });
      } else if (productBookingType === "MULTI_DAY") {
        rows = [
          pendingLocation
            ? { label: "Location", value: pendingLocation.name }
            : null,
          { label: "Check-in", value: formatDateDisplay(pendingDate) },
          { label: "Check-out", value: formatDateDisplay(pendingSlot.endDate) },
          { label: "Quantity", value: String(pendingQuantity) },
        ];
      } else {
        rows = [
          pendingLocation
            ? { label: "Location", value: pendingLocation.name }
            : null,
          { label: "Date", value: formatDateDisplay(pendingDate) },
          productBookingType === "FULL_DAY"
            ? { label: "Booking", value: "Whole day" }
            : {
                label: "Time",
                value: formatTimeRangeDisplay(pendingSlot),
              },
          { label: "Quantity", value: String(pendingQuantity) },
        ];
      }

      rows.forEach(function (row) {
        if (!row) return;
        var dt = document.createElement("dt");
        dt.textContent = row.label;
        var dd = document.createElement("dd");
        dd.textContent = row.value;
        reviewListEl.appendChild(dt);
        reviewListEl.appendChild(dd);
      });
    }

    function showReviewStep() {
      atReviewStep = true;
      buildReviewSummary();
      modalBodyEl.hidden = true;
      if (quantityWrapEl) quantityWrapEl.hidden = true;
      if (reviewStepEl) reviewStepEl.hidden = false;
      if (subheaderEl) subheaderEl.hidden = true;
      renderCustomFields();
      updateConfirmButton();
    }

    function exitReviewStep() {
      atReviewStep = false;
      if (reviewStepEl) reviewStepEl.hidden = true;
      modalBodyEl.hidden = false;
      renderCustomFields();
    }

    if (reviewBackBtn) {
      reviewBackBtn.addEventListener("click", function () {
        if (productBookingType === "BUNDLE" && bundleSessions.length > 0) {
          var last = bundleSessions.pop();
          pendingDate = last.date;
          pendingSlot = last.slot;
          showDatetimeStep();
          loadSlots(pendingDate);
          refreshQuantityForSelection();
          updateConfirmButton();
          return;
        }
        showDatetimeStep();
        renderSlots();
        refreshQuantityForSelection();
        updateConfirmButton();
      });
    }

    function updateSelectionDisplay() {
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
        var chipText;
        if (entry.slot.bundleSessions && entry.slot.bundleSessions.length > 1) {
          chipText = format(strings.bundleSelected, {
            count: entry.slot.bundleSessions.length,
          });
        } else {
          chipText = format(strings.selected, {
            date: formatDateDisplay(entry.date),
            time: formatTimeRangeDisplay(
              entry.slot,
              productBookingType === "SLOT" || productBookingType === "BUNDLE",
            ),
          });
        }
        if (entry.quantity && entry.quantity > 1) {
          chipText += " \u00d7 " + entry.quantity;
        }
        label.textContent = chipText;
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
        li.textContent = format(strings.selected, {
          date: formatDateDisplay(date),
          time: time,
        });
        cartReminderListEl.appendChild(li);
      });

      cartReminderEl.hidden = false;
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
      pendingEndDate = null;
      bundleSessions = [];
      bundleQuantity = 1;
      refreshQuantityForSelection();
      currentSlots = [];
      durationEl.hidden = true;
      setStatus(slotListEl, strings.noTimes);
      updateConfirmButton();
      renderCustomFields();
      loadMonth();
    }

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

      if (productBookingType === "BUNDLE") {
        var totalSessions = bundleSessionCount || 1;

        if (!atReviewStep) {
          if (bundleSessions.length === 0) {
            // Quantity is only editable while choosing the 1st session —
            // lock it in now before it gets reset for later sessions.
            bundleQuantity = pendingQuantity;
          }
          bundleSessions.push({ date: pendingDate, slot: pendingSlot });
          var remaining = totalSessions - bundleSessions.length;

          if (remaining > 0) {
            pendingDate = null;
            pendingSlot = null;
            renderCalendar();
            updateConfirmButton();
            renderCustomFields();
            refreshQuantityForSelection();
            if (slotsPaneEl) slotsPaneEl.hidden = false;
            setStatus(slotListEl, strings.noTimes);
            durationEl.hidden = false;
            durationEl.textContent = sessionProgressText();
            return;
          }
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
      var alreadyQueued = confirmedSlots.some(function (entry) {
        return entry.date === date && entry.slot.startsAt === slot.startsAt;
      });
      if (!alreadyQueued) {
        confirmedSlots.push({
          date: date,
          slot: slot,
          location: pendingLocation ? pendingLocation.name : null,
          locationId: pendingLocation ? pendingLocation.id : null,
          quantity: quantity,
        });
        updateSelectionDisplay();
      }
      refreshQuantityForSelection();
      showAskMore(date, slot);
    });
    askMoreYesBtn.addEventListener("click", resumeModalForAnotherSlot);
    askMoreNoBtn.addEventListener("click", function () {
      askMoreEl.hidden = true;
      closeModal();
    });

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