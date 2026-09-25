(function () {
  "use strict";

  var LOW_AVAILABILITY_THRESHOLD_ML = 2;
  var WEEKDAY_LABELS_ML = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  var YEAR_PICKER_SPAN_ML = 5;

  var CAL_BLUE_ML = "#0060E6";
  var NAV_ARROW_ML = "#4C4C4C";

  var NAV_CHEVRON_PATH_ML =
    "M32.4806 34.9941C32.8398 34.6529 32.8398 34.0998 32.4806 33.7586L27.4706 29L32.4806 24.2414C32.8398 23.9002 32.8398 23.3471 32.4806 23.0059C32.1214 22.6647 31.539 22.6647 31.1798 23.0059L25.5194 28.3822C25.1602 28.7234 25.1602 29.2766 25.5194 29.6178L31.1798 34.9941C31.539 35.3353 32.1214 35.3353 32.4806 34.9941Z";
  var DROPDOWN_CHEVRON_SVG_ML =
    '<svg width="14" height="12" viewBox="192.5 23 14 12" fill="none" aria-hidden="true" focusable="false">' +
    '<path fill-rule="evenodd" clip-rule="evenodd" d="M205.494 25.5194C205.153 25.1602 204.6 25.1602 204.259 25.5194L199.5 30.5294L194.741 25.5194C194.4 25.1602 193.847 25.1602 193.506 25.5194C193.165 25.8786 193.165 26.461 193.506 26.8202L198.882 32.4806C199.223 32.8398 199.777 32.8398 200.118 32.4806L205.494 26.8202C205.835 26.461 205.835 25.8786 205.494 25.5194Z" fill="#1A1A1A"/>' +
    "</svg>";

  function navChevronSvgML(colorML) {
    return (
      '<svg width="14" height="14" viewBox="22 22 14 14" fill="none" aria-hidden="true" focusable="false">' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="' +
      NAV_CHEVRON_PATH_ML +
      '" fill="' +
      colorML +
      '"/></svg>'
    );
  }

  var ENGLISH_STRINGS_ML = {
    loadingAvailability: "Loading availability…",
    availabilityError: "Unable to load availability right now.",
    bookingUnavailable: "Booking is temporarily unavailable. Please check back later.",
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
    modalTitle: "Book Your Spot",
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
    selectYear: "Select year, currently {year}",
    alreadyBooked: "This slots are added to Cart for this product:",
    addedToCartSuccess: "Yay, Slot is successfully added to cart.",
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
    sessionProgressWithWindow:
      "Session {current} of {total} — pick a date and time (all sessions within {days} days of your first)",
    done: "Done",
    sessionProgressWithDeadline: "Session {current} of {total} — pick a date and time (by {deadline})",
    sessionConfirmed: "Session {number}",
    bundleSelected: "Bundle: {count} sessions",
    sessionsBooked: "{count} sessions booked",
  };

  function padML(nML) {
    return String(nML).padStart(2, "0");
  }

  function formatML(templateML, varsML) {
    return templateML.replace(/\{(\w+)\}/g, function (matchML, keyML) {
      return Object.prototype.hasOwnProperty.call(varsML, keyML)
        ? varsML[keyML]
        : matchML;
    });
  }

  function to12HourML(timeStrML) {
    var mML = /^(\d{1,2}):(\d{2})$/.exec(timeStrML);
    if (!mML) return timeStrML;
    var hourML = parseInt(mML[1], 10);
    var minuteML = mML[2];
    var periodML = hourML >= 12 ? "PM" : "AM";
    hourML = hourML % 12;
    if (hourML === 0) hourML = 12;
    return hourML + ":" + minuteML + " " + periodML;
  }

  function formatTimeInBrowserTZML(isoStringML) {
    try {
      var dtfML = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return dtfML.format(new Date(isoStringML));
    } catch (eML) {
      return "";
    }
  }

  function formatTimeRangeDisplayML(slotML, convertToLocalML) {
    if (convertToLocalML === false) {
      return to12HourML(slotML.start) + " - " + to12HourML(slotML.end);
    }
    var startLabelML = formatTimeInBrowserTZML(slotML.startsAt);
    if (!startLabelML) {
      return to12HourML(slotML.start) + " - " + to12HourML(slotML.end);
    }
    var durationMsML = slotDurationMinutesML(slotML) * 60 * 1000;
    var endLabelML = formatTimeInBrowserTZML(
      new Date(new Date(slotML.startsAt).getTime() + durationMsML).toISOString(),
    );
    return endLabelML ? startLabelML + " - " + endLabelML : startLabelML;
  }

  function slotDurationMinutesML(slotML) {
    var sML = slotML.start.split(":").map(Number);
    var eML = slotML.end.split(":").map(Number);
    return eML[0] * 60 + eML[1] - (sML[0] * 60 + sML[1]);
  }

  function formatDateDisplayML(dateStrML) {
    var mML = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStrML);
    if (!mML) return dateStrML;
    return mML[3] + "-" + mML[2] + "-" + mML[1];
  }

  var chipDateFormatterML;
  try {
    chipDateFormatterML = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch (eML) {
    chipDateFormatterML = null;
  }

  function formatChipDateML(dateStrML) {
    if (!chipDateFormatterML) return formatDateDisplayML(dateStrML);
    try {
      return chipDateFormatterML.format(new Date(dateStrML + "T00:00:00.000Z"));
    } catch (eML) {
      return formatDateDisplayML(dateStrML);
    }
  }

  function inclusiveDayCountML(startStrML, endStrML) {
    var startML = new Date(startStrML + "T00:00:00.000Z");
    var endML = new Date(endStrML + "T00:00:00.000Z");
    var diffML = Math.round((endML.getTime() - startML.getTime()) / 86400000);
    return diffML + 1;
  }

  function timezoneLabelML() {
    try {
      var tzML = Intl.DateTimeFormat().resolvedOptions().timeZone;
      var offsetMinutesML = -new Date().getTimezoneOffset();
      var signML = offsetMinutesML >= 0 ? "+" : "-";
      var absML = Math.abs(offsetMinutesML);
      var hhML = padML(Math.floor(absML / 60));
      var mmML = padML(absML % 60);
      return "(UTC" + signML + hhML + ":" + mmML + ") " + tzML;
    } catch (eML) {
      return "";
    }
  }

  function locationTimezoneLabelML(tzML) {
    if (!tzML) return "";
    try {
      var dtfML = new Intl.DateTimeFormat("en-US", {
        timeZone: tzML,
        timeZoneName: "shortOffset",
      });
      var partsML = dtfML.formatToParts(new Date());
      var offsetML = "";
      for (var iML = 0; iML < partsML.length; iML++) {
        if (partsML[iML].type === "timeZoneName") offsetML = partsML[iML].value;
      }
      return (offsetML ? "(" + offsetML + ") " : "") + tzML;
    } catch (eML) {
      return tzML;
    }
  }

  function initWidgetML(rootML) {
    var productIdML = rootML.dataset.productId;
    var proxyBaseML = rootML.dataset.proxyBase;
    var unitPriceML = parseFloat(rootML.dataset.unitPrice || "");
    if (!isFinite(unitPriceML)) unitPriceML = null;
    var currencyCodeML = rootML.dataset.currencyCode || "USD";
    var countryCodeML = rootML.dataset.country || "";
    function resolveAssetUrlML(fromLiquidML, filenameML) {
      if (fromLiquidML) return fromLiquidML;
      var scriptElML = document.querySelector('script[src*="booking-widget.js"]');
      if (!scriptElML || !scriptElML.src) return "";
      return scriptElML.src.split("?")[0].replace(/booking-widget\.js$/, filenameML);
    }
    var tickIconUrlML = resolveAssetUrlML(rootML.dataset.tickIcon, "tick.svg");
    var calendarIconUrlML = resolveAssetUrlML(rootML.dataset.calendarIcon, "calendar.svg");
    var moneyFormatterML;
    try {
      moneyFormatterML = new Intl.NumberFormat(navigator.language || "en-US", {
        style: "currency",
        currency: currencyCodeML,
      });
    } catch (eML) {
      moneyFormatterML = null;
    }
    function formatMoneyML(amountML) {
      if (moneyFormatterML) return moneyFormatterML.format(amountML);
      return currencyCodeML + " " + amountML.toFixed(2);
    }
    var stringsML = ENGLISH_STRINGS_ML;
    var monthFormatterML;
    try {
      monthFormatterML = new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch (eML) {
      monthFormatterML = new Intl.DateTimeFormat("en", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
    }

    var monthShortFormatterML;
    try {
      monthShortFormatterML = new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch (eML) {
      monthShortFormatterML = monthFormatterML;
    }

    var selectionElML = rootML.querySelector("[data-booking-selection]");
    var errorElML = rootML.querySelector("[data-booking-error]");
    var unavailableElML = rootML.querySelector("[data-booking-unavailable]");
    var multiAddStatusElML = rootML.querySelector("[data-booking-multi-add-status]");
    var cartReminderElML = rootML.querySelector("[data-booking-cart-reminder]");

    var overlayElML = rootML.querySelector("[data-booking-overlay]");
    if (overlayElML && overlayElML.parentNode !== document.body) {
      document.body.appendChild(overlayElML);
    }
    var closeBtnML = rootML.querySelector("[data-booking-close]");
    var locationTimezoneElML = rootML.querySelector("[data-booking-location-timezone]");
    var subheaderElML = rootML.querySelector("[data-booking-subheader]");
    var modalBodyElML = rootML.querySelector("[data-booking-modal-body]");
    var modalFooterElML = rootML.querySelector("[data-booking-modal-footer]");
    var locationStepElML = rootML.querySelector("[data-booking-location-step]");
    var locationTriggerElML = rootML.querySelector("[data-booking-location-trigger]");
    var locationTriggerTextElML = rootML.querySelector(
      "[data-booking-location-trigger-text]",
    );
    var locationListElML = rootML.querySelector("[data-booking-location-list]");
    var locationErrorElML = rootML.querySelector("[data-booking-location-error]");
    var datetimeStepElML = rootML.querySelector("[data-booking-datetime-step]");
    var locationEmptyStateElML = rootML.querySelector(
      "[data-booking-location-empty-state]",
    );
    var calendarElML = rootML.querySelector("[data-booking-calendar]");
    var calendarPaneElML = rootML.querySelector("[data-booking-calendar-pane]");
    var datetimeCardElML = rootML.querySelector("[data-booking-datetime-card]");
    var durationElML = rootML.querySelector("[data-booking-duration]");
    var rangeSummaryElML = rootML.querySelector("[data-booking-range-summary]");
    var rangeHintElML = rootML.querySelector("[data-booking-range-hint]");
    var selectedDatesElML = rootML.querySelector("[data-booking-selected-dates]");
    var selectedDatesLabelElML = rootML.querySelector(
      "[data-booking-selected-dates-label]",
    );
    var selectedDatesTextElML = rootML.querySelector(
      "[data-booking-selected-dates-text]",
    );
    var selectedDatesClearBtnML = rootML.querySelector(
      "[data-booking-selected-dates-clear]",
    );
    var slotsPaneOuterElML = rootML.querySelector("[data-booking-slots-pane]");
    var bundleProgressElML = rootML.querySelector("[data-booking-bundle-progress]");
    var bundleProgressLabelElML = rootML.querySelector(
      "[data-booking-bundle-progress-label]",
    );
    var bundleProgressFillElML = rootML.querySelector(
      "[data-booking-bundle-progress-fill]",
    );
    var slotListElML = rootML.querySelector("[data-booking-slot-list]");
    var confirmBtnML = rootML.querySelector("[data-booking-confirm]");
    var nextSlotBtnML = rootML.querySelector("[data-booking-next-slot]");
    var customFieldsEntryElML = rootML.querySelector(
      "[data-booking-custom-fields-entry]",
    );
    var quantityWrapElML = rootML.querySelector("[data-booking-quantity]");
    var quantityInputElML = rootML.querySelector("[data-booking-quantity-input]");
    var quantityDecreaseBtnML = rootML.querySelector(
      "[data-booking-quantity-decrease]",
    );
    var quantityIncreaseBtnML = rootML.querySelector(
      "[data-booking-quantity-increase]",
    );
    var quantityNoteElML = rootML.querySelector("[data-booking-quantity-note]");
    var noteWrapElML = rootML.querySelector("[data-booking-note]");
    var noteInputElML = rootML.querySelector("[data-booking-note-input]");
    var noteLabelElML = rootML.querySelector("[data-booking-note-label]");
    var reviewBodyElML = rootML.querySelector("[data-booking-review-body]");
    var reviewStepElML = rootML.querySelector("[data-booking-review-step]");
    var reviewListElML = rootML.querySelector("[data-booking-review-list]");
    var reviewBackBtnML = rootML.querySelector("[data-booking-review-back]");

    var todayML = new Date();
    var viewYearML = todayML.getUTCFullYear();
    var viewMonthML = todayML.getUTCMonth() + 1;
    var availableDatesML = [];
    var currentSlotsML = [];

    var productBookingTypeML = "SLOT";
    var productBookingEnabledML = true;
    var fullDayStartTimeML = "00:00";
    var fullDayEndTimeML = "23:59";
    var slotsPaneElML = rootML.querySelector("[data-booking-slots]");
    var availableDatesByDayML = {};
    var remainingCapacityByDateML = {};
    var multiDayMinNightsML = null;
    var multiDayMaxNightsML = null;
    var pendingEndDateML = null;
    var bundleSessionsML = [];
    var bundleSessionCountML = null;
    var bundleValidityDaysML = null;
    var bundleQuantityML = 1;

    var locationsML = [];
    var locationsLoadedML = false;
    var pendingLocationML = null;
    var selectedLocationRecordML = null;

    var pendingDateML = null;
    var pendingSlotML = null;
    var quantityLockedML = true;
    var pendingQuantityML = 1;
    var pendingNoteML = "";
    var atReviewStepML = false;
    var confirmedSlotsML = [];
    var numericProductIdML = (productIdML || "").split("/").pop();

    function pendingSlotsStorageKeyML() {
      return "booking-widget:pending-slots:" + numericProductIdML;
    }

    function saveConfirmedSlotsML() {
      try {
        if (confirmedSlotsML.length === 0) {
          sessionStorage.removeItem(pendingSlotsStorageKeyML());
        } else {
          sessionStorage.setItem(
            pendingSlotsStorageKeyML(),
            JSON.stringify(confirmedSlotsML),
          );
        }
      } catch (eML) {}
    }

    function loadConfirmedSlotsML() {
      try {
        var rawML = sessionStorage.getItem(pendingSlotsStorageKeyML());
        if (!rawML) return;
        var parsedML = JSON.parse(rawML);
        if (Array.isArray(parsedML)) confirmedSlotsML = parsedML;
      } catch (eML) {
      }
    }

    function clearPersistedSlotsML() {
      try {
        sessionStorage.removeItem(pendingSlotsStorageKeyML());
      } catch (eML) {}
    }

    var customFieldsML = [];
    var customFieldValuesML = {};

    function getNoteKeyML() {
      return "Note";
    }

    function applyNoteQuestionML() {
      if (noteLabelElML) noteLabelElML.textContent = "Note";
      if (noteInputElML) {
        noteInputElML.setAttribute("aria-label", "Note");
        noteInputElML.placeholder = "Enter Your Request";
      }
    }

    var widgetSectionML = rootML.closest(".shopify-section");

    var KNOWN_NON_ADD_TO_CART_SELECTORS_ML = [
      ".shopify-payment-button",
      ".shopify-payment-button__button",
    ];

    function findAddToCartButtonML(formML) {
      if (!formML) return null;
      var byNameML = formML.querySelector('[name="add"]');
      if (byNameML) return byNameML;
      var candidatesML = formML.querySelectorAll('button, input[type="submit"]');
      for (var iML = 0; iML < candidatesML.length; iML++) {
        var elML = candidatesML[iML];
        var typeML =
          elML.tagName === "INPUT" ? elML.type : elML.getAttribute("type") || "submit";
        if (typeML !== "submit") continue;
        var isExcludedML = KNOWN_NON_ADD_TO_CART_SELECTORS_ML.some(function (selML) {
          return elML.closest(selML);
        });
        if (!isExcludedML) return elML;
      }
      return null;
    }

    function pickAddToCartFormML(scopeML) {
      if (!scopeML) return { form: null, btn: null };
      var formsML = scopeML.querySelectorAll('form[action*="/cart/add"]');
      for (var iML = 0; iML < formsML.length; iML++) {
        var btnML = findAddToCartButtonML(formsML[iML]);
        if (btnML) return { form: formsML[iML], btn: btnML };
      }
      return { form: null, btn: null };
    }

    var pickedML = pickAddToCartFormML(widgetSectionML);
    if (!pickedML.form) pickedML = pickAddToCartFormML(document);

    var nearbyFormML = pickedML.form;
    var addToCartBtnML = pickedML.btn;

    if (addToCartBtnML && addToCartBtnML.parentNode) {
      addToCartBtnML.parentNode.insertBefore(rootML, addToCartBtnML);
    }

    if (addToCartBtnML && addToCartBtnML.parentNode && cartReminderElML) {
      var reminderWrapML = document.createElement("div");
      reminderWrapML.className = "booking-widget booking-widget__reminder-wrap";
      reminderWrapML.appendChild(cartReminderElML);
      addToCartBtnML.insertAdjacentElement("afterend", reminderWrapML);
    }

    var triggerBtnML = rootML.querySelector("[data-booking-trigger]");
    var dynamicCheckoutElML = document.querySelector(".shopify-payment-button");
    triggerBtnML.addEventListener("click", function () {
      clearErrorML();
      openModalML();
    });
    function timeLabelForSlotML(slotML) {
      return formatTimeRangeDisplayML(
        slotML,
        productBookingTypeML === "SLOT" || productBookingTypeML === "BUNDLE",
      );
    }

    var TIME_LABELS_KEY_ML = "bookingWidgetTimeLabels:" + productIdML;

    function rememberTimeLabelML(dateML, startTimeML, labelML) {
      try {
        var mapML = JSON.parse(window.localStorage.getItem(TIME_LABELS_KEY_ML) || "{}");
        mapML[dateML + "|" + startTimeML] = labelML;
        window.localStorage.setItem(TIME_LABELS_KEY_ML, JSON.stringify(mapML));
      } catch (eML) {}
    }

    function recallTimeLabelML(dateML, startTimeML) {
      try {
        var mapML = JSON.parse(window.localStorage.getItem(TIME_LABELS_KEY_ML) || "{}");
        return mapML[dateML + "|" + startTimeML] || "";
      } catch (eML) {
        return "";
      }
    }

    function firstSessionSlotML(entryML) {
      return entryML.slot.bundleSessions && entryML.slot.bundleSessions.length > 1
        ? entryML.slot.bundleSessions[0].slot
        : entryML.slot;
    }

    function setHiddenPropertyML(formML, nameML, valueML) {
      var inputML = formML.querySelector('input[name="' + cssEscapeML(nameML) + '"]');
      if (!inputML) {
        inputML = document.createElement("input");
        inputML.type = "hidden";
        inputML.name = nameML;
        formML.appendChild(inputML);
      }
      inputML.value = valueML;
    }

    function injectBookingFieldsML(formML, entryML) {
      var dateInputML = formML.querySelector(
        'input[name="properties[Booking Date]"]',
      );
      var timeInputML = formML.querySelector(
        'input[name="properties[Booking Time]"]',
      );
      if (!dateInputML) {
        dateInputML = document.createElement("input");
        dateInputML.type = "hidden";
        dateInputML.name = "properties[Booking Date]";
        formML.appendChild(dateInputML);
      }
      if (!timeInputML) {
        timeInputML = document.createElement("input");
        timeInputML.type = "hidden";
        timeInputML.name = "properties[Booking Time]";
        formML.appendChild(timeInputML);
      }
      dateInputML.value = entryML.date;
      timeInputML.value = entryML.slot.start;
      setHiddenPropertyML(
        formML,
        "properties[_Booking Time Label]",
        timeLabelForSlotML(firstSessionSlotML(entryML)),
      );
      rememberTimeLabelML(entryML.date, entryML.slot.start, timeLabelForSlotML(firstSessionSlotML(entryML)));

      if (entryML.slot.endDate) {
        var checkoutInputML = formML.querySelector(
          'input[name="properties[Checkout Date]"]',
        );
        if (!checkoutInputML) {
          checkoutInputML = document.createElement("input");
          checkoutInputML.type = "hidden";
          checkoutInputML.name = "properties[Checkout Date]";
          formML.appendChild(checkoutInputML);
        }
        checkoutInputML.value = entryML.slot.endDate;
      }

      if (entryML.slot.bundleSessions && entryML.slot.bundleSessions.length > 1) {
        entryML.slot.bundleSessions.slice(1).forEach(function (sessionML, iML) {
          var nML = iML + 2;
          var sDateInputML = formML.querySelector(
            'input[name="properties[Session ' + nML + ' Date]"]',
          );
          var sTimeInputML = formML.querySelector(
            'input[name="properties[Session ' + nML + ' Time]"]',
          );
          if (!sDateInputML) {
            sDateInputML = document.createElement("input");
            sDateInputML.type = "hidden";
            sDateInputML.name = "properties[Session " + nML + " Date]";
            formML.appendChild(sDateInputML);
          }
          if (!sTimeInputML) {
            sTimeInputML = document.createElement("input");
            sTimeInputML.type = "hidden";
            sTimeInputML.name = "properties[Session " + nML + " Time]";
            formML.appendChild(sTimeInputML);
          }
          sDateInputML.value = sessionML.date;
          sTimeInputML.value = sessionML.slot.start;
          setHiddenPropertyML(
            formML,
            "properties[_Session " + nML + " Time Label]",
            timeLabelForSlotML(sessionML.slot),
          );
          rememberTimeLabelML(sessionML.date, sessionML.slot.start, timeLabelForSlotML(sessionML.slot));
        });
      }

      if (entryML.location) {
        var locationInputML = formML.querySelector(
          'input[name="properties[Location]"]',
        );
        if (!locationInputML) {
          locationInputML = document.createElement("input");
          locationInputML.type = "hidden";
          locationInputML.name = "properties[Location]";
          formML.appendChild(locationInputML);
        }
        locationInputML.value = entryML.location;
      }

      if (entryML.locationId) {
        var locationIdInputML = formML.querySelector(
          'input[name="properties[_Location Id]"]',
        );
        if (!locationIdInputML) {
          locationIdInputML = document.createElement("input");
          locationIdInputML.type = "hidden";
          locationIdInputML.name = "properties[_Location Id]";
          formML.appendChild(locationIdInputML);
        }
        locationIdInputML.value = entryML.locationId;
      }

      var quantityInputML = formML.querySelector('input[name="quantity"]');
      if (!quantityInputML) {
        quantityInputML = document.createElement("input");
        quantityInputML.type = "hidden";
        quantityInputML.name = "quantity";
        formML.appendChild(quantityInputML);
      }
      quantityInputML.value = String(entryML.quantity || 1);

      if (entryML.note) {
        var noteInputNameML = "properties[" + getNoteKeyML() + "]";
        var noteInputML = formML.querySelector(
          'input[name="' + cssEscapeML(noteInputNameML) + '"]',
        );
        if (!noteInputML) {
          noteInputML = document.createElement("input");
          noteInputML.type = "hidden";
          noteInputML.name = noteInputNameML;
          formML.appendChild(noteInputML);
        }
        noteInputML.value = entryML.note;
      }

      customFieldsML.forEach(function (fieldML) {
        var valueML = customFieldValuesML[fieldML.fieldKey];
        if (!valueML) return;
        var inputNameML = "properties[" + fieldML.label + "]";
        var inputML = formML.querySelector(
          'input[name="' + cssEscapeML(inputNameML) + '"]',
        );
        if (!inputML) {
          inputML = document.createElement("input");
          inputML.type = "hidden";
          inputML.name = inputNameML;
          formML.appendChild(inputML);
        }
        inputML.value = valueML;
      });
    }

    function buildFormDataForSlotML(formML, entryML) {
      var fdML = new FormData(formML);
      fdML.set("properties[Booking Date]", entryML.date);
      fdML.set("properties[Booking Time]", entryML.slot.start);
      fdML.set("properties[_Booking Time Label]", timeLabelForSlotML(firstSessionSlotML(entryML)));
      rememberTimeLabelML(entryML.date, entryML.slot.start, timeLabelForSlotML(firstSessionSlotML(entryML)));
      fdML.set("quantity", String(entryML.quantity || 1));
      if (entryML.slot.endDate) {
        fdML.set("properties[Checkout Date]", entryML.slot.endDate);
      }
      if (entryML.slot.bundleSessions && entryML.slot.bundleSessions.length > 1) {
        entryML.slot.bundleSessions.slice(1).forEach(function (sessionML, iML) {
          var nML = iML + 2;
          fdML.set("properties[Session " + nML + " Date]", sessionML.date);
          fdML.set("properties[Session " + nML + " Time]", sessionML.slot.start);
          fdML.set(
            "properties[_Session " + nML + " Time Label]",
            timeLabelForSlotML(sessionML.slot),
          );
          rememberTimeLabelML(sessionML.date, sessionML.slot.start, timeLabelForSlotML(sessionML.slot));
        });
      }
      if (entryML.location) {
        fdML.set("properties[Location]", entryML.location);
      }
      if (entryML.locationId) {
        fdML.set("properties[_Location Id]", entryML.locationId);
      }
      if (entryML.note) {
        fdML.set("properties[" + getNoteKeyML() + "]", entryML.note);
      }
      customFieldsML.forEach(function (fieldML) {
        var valueML = customFieldValuesML[fieldML.fieldKey];
        if (!valueML) return;
        fdML.set("properties[" + fieldML.label + "]", valueML);
      });
      return fdML;
    }

    function addSlotsToCartSequentiallyML(formML, entriesML, onDoneML) {
      var actionML = formML.getAttribute("action") || "/cart/add";
      var indexML = 0;

      function nextML() {
        if (indexML >= entriesML.length) {
          onDoneML(null);
          return;
        }
        fetch(actionML, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: buildFormDataForSlotML(formML, entriesML[indexML]),
        })
          .then(function (resML) {
            if (!resML.ok) throw new Error("add-to-cart failed");
            return resML.json();
          })
          .then(function () {
            indexML += 1;
            nextML();
          })
          .catch(onDoneML);
      }

      nextML();
    }

    function cssEscapeML(valueML) {
      return window.CSS && CSS.escape
        ? CSS.escape(valueML)
        : valueML.replace(/["\\\]]/g, "\\$&");
    }

    function guardAddToCartML(eventML) {
      if (confirmedSlotsML.length === 0) {
        eventML.preventDefault();
        eventML.stopPropagation();
        eventML.stopImmediatePropagation();
        showErrorML(stringsML.selectBeforeCart);
        rootML.scrollIntoView({ behavior: "smooth", block: "center" });
        return true;
      }
      clearErrorML();

      if (confirmedSlotsML.length === 1) {
        if (nearbyFormML) injectBookingFieldsML(nearbyFormML, confirmedSlotsML[0]);
        setTimeout(function () {
          confirmedSlotsML = [];
          updateSelectionDisplayML();
          refreshCartReminderML();
        }, 1200);
        [2500, 4500].forEach(function (delayML) {
          setTimeout(refreshCartReminderML, delayML);
        });
        return false;
      }

      eventML.preventDefault();
      eventML.stopPropagation();
      eventML.stopImmediatePropagation();

      if (!nearbyFormML) {
        showErrorML(stringsML.multiAddError);
        return true;
      }

      var entriesML = confirmedSlotsML.slice();
      multiAddStatusElML.hidden = false;
      multiAddStatusElML.textContent = stringsML.addingToCart;

      addSlotsToCartSequentiallyML(nearbyFormML, entriesML, function (errML) {
        if (errML) {
          multiAddStatusElML.hidden = true;
          showErrorML(stringsML.multiAddError);
          return;
        }
        confirmedSlotsML = [];
        clearPersistedSlotsML();
        window.location.reload();
      });

      return true;
    }

    document.addEventListener(
      "submit",
      function (eventML) {
        var targetML = eventML.target;
        if (!(targetML instanceof HTMLFormElement)) return;
        if (targetML !== nearbyFormML) return;
        if (!/\/cart\/add/.test(targetML.getAttribute("action") || "")) return;
        guardAddToCartML(eventML);
      },
      true,
    );

    document.addEventListener("booking-widget:cart-added", function () {
      refreshCartReminderML();
    });

    if (!window.__bookingWidgetCartHooked) {
      window.__bookingWidgetCartHooked = true;

      var isCartAddUrlML = function (urlML) {
        return /\/cart\/add(\.js)?(\?|$)/.test(String(urlML || ""));
      };
      var notifyCartAddedML = function () {
        document.dispatchEvent(new CustomEvent("booking-widget:cart-added"));
      };

      var originalFetchML = window.fetch;
      if (typeof originalFetchML === "function") {
        window.fetch = function (inputML) {
          var promiseML = originalFetchML.apply(this, arguments);
          try {
            var urlML = typeof inputML === "string" ? inputML : inputML && inputML.url;
            if (isCartAddUrlML(urlML)) {
              promiseML
                .then(function (resML) {
                  if (resML && resML.ok) notifyCartAddedML();
                })
                .catch(function () {});
            }
          } catch (eML) {}
          return promiseML;
        };
      }

      var originalOpenML = XMLHttpRequest.prototype.open;
      var originalSendML = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (methodML, urlML) {
        this.__bwCartAdd = isCartAddUrlML(urlML);
        return originalOpenML.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function () {
        if (this.__bwCartAdd) {
          this.addEventListener("load", function () {
            if (this.status >= 200 && this.status < 300) notifyCartAddedML();
          });
        }
        return originalSendML.apply(this, arguments);
      };
    }

    if (addToCartBtnML) {
      addToCartBtnML.addEventListener("click", guardAddToCartML, true);
    }

    if (locationTimezoneElML) locationTimezoneElML.textContent = timezoneLabelML();
    loadLocationsML();
    loadCustomFieldsML();

    function setStatusML(containerML, messageML, onRetryML) {
      containerML.innerHTML = "";
      var pML = document.createElement("p");
      pML.className = "booking-widget__status";
      pML.textContent = messageML;
      containerML.appendChild(pML);
      if (onRetryML) {
        var retryBtnML = document.createElement("button");
        retryBtnML.type = "button";
        retryBtnML.className = "booking-widget__status-retry";
        retryBtnML.textContent = stringsML.retry || "Try again";
        retryBtnML.addEventListener("click", onRetryML);
        containerML.appendChild(retryBtnML);
      }
    }

    function loadCustomFieldsML() {
      fetch(proxyBaseML + "/custom-fields")
        .then(function (resML) {
          return resML.json();
        })
        .then(function (dataML) {
          customFieldsML = dataML.fields || [];
          applyNoteQuestionML();
          renderCustomFieldsML();
        })
        .catch(function () {
          customFieldsML = [];
          applyNoteQuestionML();
        });
    }

    function loadLocationsML() {
      if (!locationStepElML || !locationListElML) return;
      var urlML = proxyBaseML + "/locations?productId=" + encodeURIComponent(productIdML);
      if (countryCodeML) {
        urlML += "&country=" + encodeURIComponent(countryCodeML);
      }
      fetch(urlML)
        .then(function (resML) {
          return resML.json();
        })
        .then(function (dataML) {
          locationsML = dataML.locations || [];
          productBookingEnabledML = dataML.productBookingEnabled !== false;
          locationsLoadedML = true;
          populateLocationListML();
          updateAvailabilityML();
        })
        .catch(function () {
          locationsML = [];
          locationsLoadedML = true;
          updateAvailabilityML();
        });
    }

    function updateAvailabilityML() {
      if (!locationsLoadedML) return;
      var hasLocationsML = locationsML.length > 0 && productBookingEnabledML;
      if (triggerBtnML) {
        triggerBtnML.hidden = !hasLocationsML || confirmedSlotsML.length > 0;
      }
      if (unavailableElML) {
        unavailableElML.hidden = hasLocationsML;
        if (!hasLocationsML) {
          unavailableElML.textContent = stringsML.noLocationsConfigured;
        }
      }
      if (dynamicCheckoutElML) {
        dynamicCheckoutElML.style.display = "none";
      }
    }

    function isLocationListOpenML() {
      return !!locationListElML && !locationListElML.hidden;
    }

    function openLocationListML() {
      if (!locationListElML) return;
      locationListElML.hidden = false;
      if (locationTriggerElML) {
        locationTriggerElML.classList.add("booking-widget__location-trigger--open");
        locationTriggerElML.setAttribute("aria-expanded", "true");
      }
    }

    function closeLocationListML() {
      if (!locationListElML) return;
      locationListElML.hidden = true;
      if (locationTriggerElML) {
        locationTriggerElML.classList.remove("booking-widget__location-trigger--open");
        locationTriggerElML.setAttribute("aria-expanded", "false");
      }
    }

    function toggleLocationListML() {
      if (isLocationListOpenML()) {
        closeLocationListML();
      } else {
        openLocationListML();
      }
    }

    if (locationTriggerElML) {
      locationTriggerElML.addEventListener("click", toggleLocationListML);
      locationTriggerElML.addEventListener("keydown", function (eventML) {
        if (eventML.key === "Enter" || eventML.key === " ") {
          eventML.preventDefault();
          toggleLocationListML();
        } else if (eventML.key === "Escape") {
          closeLocationListML();
        }
      });
    }

    document.addEventListener("click", function (eventML) {
      if (!isLocationListOpenML()) return;
      if (
        locationTriggerElML &&
        (locationTriggerElML === eventML.target ||
          locationTriggerElML.contains(eventML.target))
      ) {
        return;
      }
      if (
        locationListElML &&
        (locationListElML === eventML.target || locationListElML.contains(eventML.target))
      ) {
        return;
      }
      closeLocationListML();
    });

    function populateLocationListML() {
      if (!locationListElML) return;
      locationListElML.innerHTML = "";
      var currentIdML = pendingLocationML ? pendingLocationML.id : null;

      locationsML.forEach(function (locationML) {
        var liML = document.createElement("li");
        liML.className = "booking-widget__location-option";
        liML.setAttribute("role", "option");
        liML.dataset.locationId = locationML.id;
        liML.textContent = locationML.name;
        var isSelectedML = locationML.id === currentIdML;
        liML.setAttribute("aria-selected", isSelectedML ? "true" : "false");
        if (isSelectedML) {
          liML.classList.add("booking-widget__location-option--selected");
        }
        liML.addEventListener("click", function () {
          selectLocationML(locationML);
        });
        locationListElML.appendChild(liML);
      });
    }

    function selectLocationML(locationML) {
      var locationChangedML = !pendingLocationML || pendingLocationML.id !== locationML.id;
      pendingLocationML = locationML;
      selectedLocationRecordML = locationML;
      if (locationTriggerTextElML) {
        locationTriggerTextElML.textContent = locationML.name;
        locationTriggerTextElML.classList.remove(
          "booking-widget__location-trigger-text--placeholder",
        );
      }
      if (locationErrorElML) {
        locationErrorElML.hidden = true;
        locationErrorElML.textContent = "";
      }
      if (locationTriggerElML) {
        locationTriggerElML.classList.remove(
          "booking-widget__location-trigger--error",
        );
      }
      populateLocationListML();
      closeLocationListML();
      updateConfirmButtonML();
      if (locationChangedML) {
        pendingDateML = null;
        pendingSlotML = null;
        pendingEndDateML = null;
        bundleSessionsML = [];
        bundleQuantityML = 1;
        availableDatesML = [];
        availableDatesByDayML = {};
        remainingCapacityByDateML = {};
        slotRequestIdML++;
        refreshQuantityForSelectionML();
        updateRangeSummaryML();
        updateTimezoneDisplayML();
        loadMonthML();
      }
    }

    function locationRequiredML() {
      return locationsML.length > 0;
    }

    function isLocationSelectedML() {
      return !locationRequiredML() || !!pendingLocationML;
    }

    function updateCalendarLockStateML() {
      if (!calendarPaneElML) return;
      calendarPaneElML.classList.toggle(
        "booking-widget__calendar-pane--locked",
        !isLocationSelectedML(),
      );
    }

    function updateTimezoneDisplayML() {
      if (!locationTimezoneElML) return;
      var showsConvertedTimesML =
        productBookingTypeML === "SLOT" || productBookingTypeML === "BUNDLE";
      var labelML = showsConvertedTimesML || !pendingLocationML
        ? timezoneLabelML()
        : locationTimezoneLabelML(pendingLocationML.timezone);
      if (locationTimezoneElML) locationTimezoneElML.textContent = labelML;
    }

    function showBookingStepML() {
      exitReviewStepML();
      closeLocationListML();
      selectedLocationRecordML = pendingLocationML;
      if (locationTriggerTextElML) {
        if (pendingLocationML) {
          locationTriggerTextElML.textContent = pendingLocationML.name;
          locationTriggerTextElML.classList.remove(
            "booking-widget__location-trigger-text--placeholder",
          );
        } else {
          locationTriggerTextElML.textContent = stringsML.selectLocationPlaceholder;
          locationTriggerTextElML.classList.add(
            "booking-widget__location-trigger-text--placeholder",
          );
        }
      }
      if (locationStepElML) {
        if (locationRequiredML()) {
          populateLocationListML();
          locationStepElML.hidden = false;
        } else {
          locationStepElML.hidden = true;
        }
      }
      if (locationEmptyStateElML) locationEmptyStateElML.hidden = true;
      datetimeStepElML.hidden = false;
      if (locationErrorElML) {
        locationErrorElML.hidden = true;
        locationErrorElML.textContent = "";
      }
      if (locationTriggerElML) {
        locationTriggerElML.classList.remove(
          "booking-widget__location-trigger--error",
        );
      }
      confirmBtnML.hidden = false;
      if (subheaderElML) subheaderElML.hidden = false;
      updateCalendarLockStateML();
      updateConfirmButtonML();
      updateTimezoneDisplayML();
      loadMonthML();
    }

    function renderCustomFieldsML() {
      if (!customFieldsEntryElML) return;
      customFieldsEntryElML.innerHTML = "";

      if (customFieldsML.length === 0) {
        customFieldsEntryElML.hidden = true;
        return;
      }

      customFieldsML.forEach(function (fieldML) {
        var wrapperML = document.createElement("div");
        wrapperML.className = "booking-widget__field";

        var labelML = document.createElement("label");
        labelML.className = "booking-widget__field-label";
        var inputIdML = "booking-field-" + rootML.dataset.productId + "-" + fieldML.fieldKey;
        labelML.setAttribute("for", inputIdML);
        var noteIconImgML = noteWrapElML
          ? noteWrapElML.querySelector(".booking-widget__note-icon img")
          : null;
        if (noteIconImgML) {
          var iconSpanML = document.createElement("span");
          iconSpanML.className = "booking-widget__field-icon";
          iconSpanML.setAttribute("aria-hidden", "true");
          var iconImgML = document.createElement("img");
          iconImgML.src = noteIconImgML.src;
          iconImgML.width = 28;
          iconImgML.height = 28;
          iconImgML.alt = "";
          iconSpanML.appendChild(iconImgML);
          labelML.appendChild(iconSpanML);
        }
        var labelTextML = document.createElement("span");
        labelTextML.textContent = fieldML.label;
        labelML.appendChild(labelTextML);
        wrapperML.appendChild(labelML);

        var inputML;
        if (fieldML.type === "TEXTAREA") {
          inputML = document.createElement("textarea");
          inputML.rows = 3;
        } else if (fieldML.type === "SELECT") {
          inputML = document.createElement("select");
          var placeholderOptML = document.createElement("option");
          placeholderOptML.value = "";
          placeholderOptML.textContent = "";
          inputML.appendChild(placeholderOptML);
          (fieldML.options || []).forEach(function (optionValueML) {
            var optML = document.createElement("option");
            optML.value = optionValueML;
            optML.textContent = optionValueML;
            inputML.appendChild(optML);
          });
        } else {
          inputML = document.createElement("input");
          inputML.type = fieldML.type === "NUMBER" ? "number" : "text";
        }

        inputML.id = inputIdML;
        inputML.className = "booking-widget__field-input";
        inputML.value = customFieldValuesML[fieldML.fieldKey] || "";
        inputML.disabled = quantityLockedML;
        inputML.addEventListener("input", function () {
          customFieldValuesML[fieldML.fieldKey] = inputML.value;
        });
        inputML.addEventListener("change", function () {
          customFieldValuesML[fieldML.fieldKey] = inputML.value;
        });

        wrapperML.classList.toggle("is-locked", quantityLockedML);

        wrapperML.appendChild(inputML);
        customFieldsEntryElML.appendChild(wrapperML);
      });

      customFieldsEntryElML.hidden = false;
    }

    function showErrorML(messageML) {
      errorElML.hidden = false;
      errorElML.textContent = messageML;
    }

    function clearErrorML() {
      errorElML.hidden = true;
      errorElML.textContent = "";
    }

    function openModalML() {
      pendingDateML = null;
      pendingSlotML = null;
      pendingEndDateML = null;
      pendingQuantityML = 1;
      pendingNoteML = "";
      if (noteInputElML) noteInputElML.value = "";
      bundleSessionsML = [];
      bundleQuantityML = 1;
      customFieldValuesML = {};
      atReviewStepML = false;
      currentSlotsML = [];
      availableDatesML = [];
      availableDatesByDayML = {};
      remainingCapacityByDateML = {};
      slotRequestIdML++;
      if (slotListElML) slotListElML.innerHTML = "";
      if (durationElML) durationElML.hidden = true;
      if (slotsPaneElML) slotsPaneElML.hidden = true;
      var freshTodayML = new Date();
      viewYearML = freshTodayML.getUTCFullYear();
      viewMonthML = freshTodayML.getUTCMonth() + 1;
      if (reviewStepElML) reviewStepElML.hidden = true;
      if (reviewBodyElML) reviewBodyElML.hidden = true;
      if (quantityWrapElML) quantityWrapElML.hidden = false;
      if (noteWrapElML) noteWrapElML.hidden = false;
      refreshQuantityForSelectionML();
      modalBodyElML.hidden = false;
      modalFooterElML.hidden = false;
      overlayElML.hidden = false;
      document.body.classList.add("booking-widget-lock-scroll");
      updateConfirmButtonML();
      renderCustomFieldsML();
      updateRangeSummaryML();
      updateBundleProgressML();

      showBookingStepML();
    }

    function closeModalML() {
      monthRequestIdML++;
      slotRequestIdML++;
      if (atReviewStepML) exitReviewStepML();
      overlayElML.hidden = true;
      document.body.classList.remove("booking-widget-lock-scroll");
    }

    function isDateOnlyTypeML(typeML) {
      return typeML === "FULL_DAY" || typeML === "MULTI_DAY";
    }

    function showSelectDateHintML() {
      slotRequestIdML++;
      currentSlotsML = [];
      if (durationElML) durationElML.hidden = true;
      if (slotListElML) setStatusML(slotListElML, stringsML.selectDateHint);
    }

    function nightsBetweenML(startStrML, endStrML) {
      var outML = [];
      var aML = Date.parse(startStrML + "T00:00:00Z");
      var bML = Date.parse(endStrML + "T00:00:00Z");
      if (!isFinite(aML) || !isFinite(bML)) return outML;
      for (var tML = aML; tML < bML && outML.length < 366; tML += 86400000) {
        outML.push(new Date(tML).toISOString().slice(0, 10));
      }
      return outML;
    }

    function cartSlotKeyML(dateML, startML) {
      return dateML + "|" + startML;
    }

    function fetchCartBookedQtyML() {
      var locIdML = pendingLocationML ? String(pendingLocationML.id) : "";
      return fetch("/cart.js", { headers: { Accept: "application/json" } })
        .then(function (resML) {
          return resML.json();
        })
        .then(function (cartML) {
          var outML = { slots: {}, days: {} };
          (cartML.items || []).forEach(function (itemML) {
            var propsML = itemML.properties || {};
            if (String(itemML.product_id) !== numericProductIdML) return;
            if (!propsML["Booking Date"]) return;
            if (locIdML && String(propsML["_Location Id"] || "") !== locIdML) return;
            var qtyML = itemML.quantity || 0;

            var kML = cartSlotKeyML(propsML["Booking Date"], propsML["Booking Time"] || "");
            outML.slots[kML] = (outML.slots[kML] || 0) + qtyML;

            var nML = 2;
            while (propsML["Session " + nML + " Date"]) {
              var skML = cartSlotKeyML(
                propsML["Session " + nML + " Date"],
                propsML["Session " + nML + " Time"] || "",
              );
              outML.slots[skML] = (outML.slots[skML] || 0) + qtyML;
              nML += 1;
            }

            var nightsML = propsML["Checkout Date"]
              ? nightsBetweenML(propsML["Booking Date"], propsML["Checkout Date"])
              : [propsML["Booking Date"]];
            nightsML.forEach(function (dML) {
              outML.days[dML] = (outML.days[dML] || 0) + qtyML;
            });
          });
          return outML;
        })
        .catch(function () {
          return { slots: {}, days: {} };
        });
    }

    function subtractCartFromSlotsML(slotsML, dateStrML, cartQtyML) {
      return slotsML.map(function (slotML) {
        if (typeof slotML.remainingCapacity !== "number") return slotML;
        var usedML = cartQtyML.slots[cartSlotKeyML(dateStrML, slotML.start)] || 0;
        if (usedML <= 0) return slotML;
        var nextML = Object.assign({}, slotML);
        nextML.remainingCapacity = Math.max(0, slotML.remainingCapacity - usedML);
        if (nextML.remainingCapacity === 0) nextML.available = false;
        return nextML;
      });
    }

    function fetchAvailabilityML(yearML, monthML) {
      var urlML =
        proxyBaseML +
        "/availability?productId=" +
        encodeURIComponent(productIdML) +
        "&year=" +
        yearML +
        "&month=" +
        monthML;
      if (pendingLocationML) {
        urlML += "&locationId=" + encodeURIComponent(pendingLocationML.id);
      }
      return fetch(urlML).then(function (resML) {
        if (resML.status === 403) {
          return resML.json().catch(function () {
            return {};
          }).then(function (bodyML) {
            var errML = new Error((bodyML && bodyML.error) || "Booking unavailable");
            errML.code = "APP_DISABLED";
            throw errML;
          });
        }
        return resML.json();
      });
    }

    function applyAvailabilityDataML(dataML, cartQtyML) {
      var datesML = dataML.availableDates || [];
      if (dataML.bookingType) productBookingTypeML = dataML.bookingType;
      if (typeof dataML.dailyStartTime === "string") fullDayStartTimeML = dataML.dailyStartTime;
      if (typeof dataML.dailyEndTime === "string") fullDayEndTimeML = dataML.dailyEndTime;
      if (typeof dataML.minNights === "number") multiDayMinNightsML = dataML.minNights;
      if (typeof dataML.maxNights === "number") multiDayMaxNightsML = dataML.maxNights;
      if (typeof dataML.bundleSessionCount === "number") bundleSessionCountML = dataML.bundleSessionCount;
      if (typeof dataML.bundleValidityDays === "number") {
        bundleValidityDaysML = dataML.bundleValidityDays;
      }
      datesML.forEach(function (dML) {
        availableDatesByDayML[dML] = true;
      });
      if (dataML.remainingCapacityByDate) {
        Object.keys(dataML.remainingCapacityByDate).forEach(function (dML) {
          remainingCapacityByDateML[dML] = dataML.remainingCapacityByDate[dML];
        });
      }
      if (cartQtyML && isDateOnlyTypeML(productBookingTypeML)) {
        Object.keys(cartQtyML.days).forEach(function (dML) {
          if (typeof remainingCapacityByDateML[dML] !== "number") return;
          remainingCapacityByDateML[dML] = Math.max(
            0,
            remainingCapacityByDateML[dML] - cartQtyML.days[dML],
          );
          if (remainingCapacityByDateML[dML] === 0) availableDatesByDayML[dML] = false;
        });
        datesML = datesML.filter(function (dML) {
          return remainingCapacityByDateML[dML] !== 0;
        });
      }
      return datesML;
    }

    function applyLayoutForTypeML() {
      var showTimesML = !isDateOnlyTypeML(productBookingTypeML);
      if (slotsPaneElML) slotsPaneElML.hidden = !showTimesML;
      if (slotsPaneOuterElML) slotsPaneOuterElML.hidden = !showTimesML;
      if (datetimeCardElML) {
        datetimeCardElML.classList.toggle(
          "booking-widget__datetime-card--times",
          showTimesML,
        );
      }
      if (showTimesML && !pendingDateML) showSelectDateHintML();
    }

    function updateRangeSummaryML() {
      if (!rangeSummaryElML) return;
      var showSummaryML = productBookingTypeML === "MULTI_DAY";
      rangeSummaryElML.hidden = !showSummaryML;
      if (!showSummaryML) return;

      if (rangeHintElML) rangeHintElML.textContent = multiDayRangeInfoTextML() || "";

      if (!selectedDatesElML) return;
      if (pendingDateML) {
        var countML = pendingEndDateML
          ? inclusiveDayCountML(pendingDateML, pendingEndDateML)
          : 1;
        selectedDatesElML.hidden = false;
        if (selectedDatesLabelElML) {
          selectedDatesLabelElML.textContent = "Selected Dates (" + countML + ")";
        }
        if (selectedDatesTextElML) {
          selectedDatesTextElML.textContent = pendingEndDateML
            ? formatChipDateML(pendingDateML) + " - " + formatChipDateML(pendingEndDateML)
            : formatChipDateML(pendingDateML);
        }
      } else {
        selectedDatesElML.hidden = true;
      }
    }

    if (selectedDatesClearBtnML) {
      selectedDatesClearBtnML.addEventListener("click", function () {
        pendingDateML = null;
        pendingEndDateML = null;
        pendingSlotML = null;
        clearErrorML();
        renderCalendarML();
        updateConfirmButtonML();
        renderCustomFieldsML();
        refreshQuantityForSelectionML();
        updateRangeSummaryML();
      });
    }

    var monthRequestIdML = 0;

    function loadMonthML() {
      var requestIdML = ++monthRequestIdML;
      setStatusML(calendarElML, stringsML.loadingAvailability);

      Promise.all([fetchAvailabilityML(viewYearML, viewMonthML), fetchCartBookedQtyML()])
        .then(function (resultsML) {
          if (requestIdML !== monthRequestIdML) return;
          availableDatesML = applyAvailabilityDataML(resultsML[0], resultsML[1]);
          updateBundleProgressML();
          applyLayoutForTypeML();
          renderCalendarML();
          if (!pendingEndDateML) updateRangeSummaryML();
        })
        .catch(function (errML) {
          if (requestIdML !== monthRequestIdML) return;
          if (errML && errML.code === "APP_DISABLED") {
            setStatusML(calendarElML, stringsML.bookingUnavailable);
            return;
          }
          setStatusML(calendarElML, stringsML.availabilityError, loadMonthML);
        });
    }

    function bundleWindowStartML() {
      if (
        productBookingTypeML !== "BUNDLE" ||
        bundleValidityDaysML === null ||
        bundleSessionsML.length === 0
      ) {
        return null;
      }
      return bundleSessionsML
        .map(function (sessionML) {
          return sessionML.date;
        })
        .sort()[0];
    }

    function bundleValidityDeadlineML() {
      var startML = bundleWindowStartML();
      if (!startML) return null;
      var deadlineML = new Date(startML + "T00:00:00.000Z");
      deadlineML.setUTCDate(deadlineML.getUTCDate() + bundleValidityDaysML);
      return deadlineML.toISOString().slice(0, 10);
    }

    function sessionProgressTextML() {
      var deadlineStrML = bundleValidityDeadlineML();
      if (deadlineStrML) {
        return formatML(stringsML.sessionProgressWithDeadline, {
          current: bundleSessionsML.length + 1,
          total: bundleSessionCountML,
          deadline: formatDateDisplayML(deadlineStrML),
        });
      }
      if (productBookingTypeML === "BUNDLE" && bundleValidityDaysML !== null) {
        return formatML(stringsML.sessionProgressWithWindow, {
          current: bundleSessionsML.length + 1,
          total: bundleSessionCountML,
          days: bundleValidityDaysML,
        });
      }
      return formatML(stringsML.sessionProgress, {
        current: bundleSessionsML.length + 1,
        total: bundleSessionCountML,
      });
    }

    function updateBundleProgressML() {
      if (!bundleProgressElML) return;
      if (productBookingTypeML !== "BUNDLE" || !bundleSessionCountML) {
        bundleProgressElML.hidden = true;
        return;
      }
      bundleProgressElML.hidden = false;
      var completedML = bundleSessionsML.length;
      var totalML = bundleSessionCountML;
      var pctML = totalML > 0 ? Math.min(100, Math.round((completedML / totalML) * 100)) : 0;
      if (bundleProgressFillElML) bundleProgressFillElML.style.width = pctML + "%";
      if (bundleProgressLabelElML) {
        bundleProgressLabelElML.textContent =
          completedML + " of " + totalML + " sessions selected";
      }
    }

    function buildDayButtonML(dateStrML, choosingMultiDayCheckoutML) {
      var dayML = Number(dateStrML.slice(8, 10));
      var btnML = document.createElement("button");
      btnML.type = "button";
      btnML.textContent = String(dayML);
      btnML.className = "booking-widget__day";

      var isCheckoutCandidateML =
        choosingMultiDayCheckoutML && dateStrML > pendingDateML;
      var windowStartML = bundleWindowStartML();
      var windowEndML = bundleValidityDeadlineML();
      var withinBundleValidityML =
        productBookingTypeML !== "BUNDLE" ||
        !windowStartML ||
        (dateStrML >= windowStartML && dateStrML <= windowEndML);
      var isClickableML =
        (availableDatesByDayML[dateStrML] || isCheckoutCandidateML) &&
        withinBundleValidityML &&
        isLocationSelectedML();

      if (isClickableML) {
        btnML.classList.add("booking-widget__day--available");
        btnML.addEventListener("click", function () {
          if (productBookingTypeML === "MULTI_DAY") {
            selectMultiDayDateML(dateStrML);
          } else {
            selectDateML(dateStrML);
          }
        });
      } else {
        btnML.disabled = true;
      }

      if (productBookingTypeML === "MULTI_DAY") {
        if (dateStrML === pendingDateML || dateStrML === pendingEndDateML) {
          btnML.classList.add("booking-widget__day--selected");
        } else if (
          pendingDateML &&
          pendingEndDateML &&
          dateStrML > pendingDateML &&
          dateStrML < pendingEndDateML
        ) {
          btnML.classList.add("booking-widget__day--in-range");
        }
      } else if (dateStrML === pendingDateML) {
        btnML.classList.add("booking-widget__day--selected");
      }

      return btnML;
    }

    function buildGridML(yearML, monthML, choosingMultiDayCheckoutML) {
      var gridML = document.createElement("div");
      gridML.className = "booking-widget__grid";

      var daysInMonthML = new Date(Date.UTC(yearML, monthML, 0)).getUTCDate();
      var firstWeekdayML = new Date(Date.UTC(yearML, monthML - 1, 1)).getUTCDay();

      for (var iML = 0; iML < firstWeekdayML; iML++) {
        gridML.appendChild(document.createElement("span"));
      }
      for (var dayML = 1; dayML <= daysInMonthML; dayML++) {
        var dateStrML = yearML + "-" + padML(monthML) + "-" + padML(dayML);
        gridML.appendChild(buildDayButtonML(dateStrML, choosingMultiDayCheckoutML));
      }

      return gridML;
    }

    function buildWeekdaysRowML() {
      var rowML = document.createElement("div");
      rowML.className = "booking-widget__weekdays";
      WEEKDAY_LABELS_ML.forEach(function (labelML) {
        var spanML = document.createElement("span");
        spanML.textContent = labelML;
        rowML.appendChild(spanML);
      });
      return rowML;
    }

    function buildMonthPickerML(yearML, monthML, offsetML) {
      var labelML = monthShortFormatterML.format(
        new Date(Date.UTC(yearML, monthML - 1, 1)),
      );

      var wrapML = document.createElement("div");
      wrapML.className = "booking-widget__month-picker";

      var textML = document.createElement("span");
      textML.className = "booking-widget__month-picker-text";
      textML.textContent = labelML;
      wrapML.appendChild(textML);
      wrapML.insertAdjacentHTML("beforeend", DROPDOWN_CHEVRON_SVG_ML);

      var selectML = document.createElement("select");
      selectML.className = "booking-widget__month-picker-select";
      selectML.setAttribute(
        "aria-label",
        formatML(stringsML.selectYear, { year: yearML }),
      );

      var nowML = new Date();
      var todayIndexML = nowML.getUTCFullYear() * 12 + nowML.getUTCMonth();
      var thisYearML = nowML.getUTCFullYear();
      var firstYearML = Math.min(thisYearML, yearML);
      var lastYearML = Math.max(thisYearML + YEAR_PICKER_SPAN_ML - 1, yearML);
      for (var yML = firstYearML; yML <= lastYearML; yML++) {
        var optionML = document.createElement("option");
        optionML.value = String(yML);
        optionML.textContent = String(yML);
        selectML.appendChild(optionML);
      }
      selectML.value = String(yearML);
      selectML.addEventListener("change", function () {
        var targetML = Math.max(
          Number(selectML.value) * 12 + (monthML - 1),
          todayIndexML + offsetML,
        );
        changeViewMonthML(targetML - offsetML);
      });
      wrapML.appendChild(selectML);

      return wrapML;
    }

    function buildMonthPaneML(
      yearML,
      monthML,
      choosingMultiDayCheckoutML,
      showNoAvailabilityML,
      offsetML,
    ) {
      var paneML = document.createElement("div");
      paneML.className = "booking-widget__month-pane";

      var headingML = document.createElement("div");
      headingML.className = "booking-widget__month-pane-heading";

      var prevML = document.createElement("button");
      prevML.type = "button";
      prevML.className = "booking-widget__nav";
      prevML.setAttribute("aria-label", stringsML.previousMonth);
      prevML.innerHTML = navChevronSvgML(NAV_ARROW_ML);
      prevML.addEventListener("click", function () {
        goToMonthML(-1);
      });
      headingML.appendChild(prevML);

      headingML.appendChild(buildMonthPickerML(yearML, monthML, offsetML));

      var nextML = document.createElement("button");
      nextML.type = "button";
      nextML.className = "booking-widget__nav booking-widget__nav--next";
      nextML.setAttribute("aria-label", stringsML.nextMonth);
      nextML.innerHTML = navChevronSvgML(CAL_BLUE_ML);
      nextML.addEventListener("click", function () {
        goToMonthML(1);
      });
      headingML.appendChild(nextML);

      paneML.appendChild(headingML);
      paneML.appendChild(buildWeekdaysRowML());
      paneML.appendChild(buildGridML(yearML, monthML, choosingMultiDayCheckoutML));

      if (showNoAvailabilityML) {
        var statusML = document.createElement("p");
        statusML.className = "booking-widget__status booking-widget__month-note";
        statusML.textContent = stringsML.noAvailability;
        paneML.appendChild(statusML);
      }

      return paneML;
    }

    function renderCalendarML() {
      var choosingMultiDayCheckoutML =
        productBookingTypeML === "MULTI_DAY" && pendingDateML && !pendingEndDateML;

      var pane1NoAvailML = availableDatesML.length === 0 && !choosingMultiDayCheckoutML;

      calendarElML.innerHTML = "";
      calendarElML.appendChild(
        buildMonthPaneML(
          viewYearML,
          viewMonthML,
          choosingMultiDayCheckoutML,
          pane1NoAvailML,
          0,
        ),
      );
      updateCalendarLockStateML();
    }

    function multiDayRangeInfoTextML() {
      if (multiDayMinNightsML !== null && multiDayMaxNightsML !== null) {
        return formatML(stringsML.multiDayMinMaxNights, {
          min: multiDayMinNightsML,
          max: multiDayMaxNightsML,
        });
      }
      if (multiDayMinNightsML !== null) {
        return formatML(stringsML.multiDayMinNights, { count: multiDayMinNightsML });
      }
      if (multiDayMaxNightsML !== null) {
        return formatML(stringsML.multiDayMaxNights, { count: multiDayMaxNightsML });
      }
      return null;
    }

    function selectMultiDayDateML(dateStrML) {
      var choosingCheckoutML = pendingDateML && !pendingEndDateML && dateStrML > pendingDateML;

      if (!choosingCheckoutML) {
        pendingDateML = dateStrML;
        pendingEndDateML = null;
        pendingSlotML = null;
        clearErrorML();
        renderCalendarML();
        updateConfirmButtonML();
        renderCustomFieldsML();
        refreshQuantityForSelectionML();
        updateRangeSummaryML();
        return;
      }

      var nightsML = 0;
      var cursorML = pendingDateML;
      var allNightsAvailableML = true;
      while (cursorML < dateStrML) {
        if (!availableDatesByDayML[cursorML]) {
          allNightsAvailableML = false;
          break;
        }
        nightsML += 1;
        var dML = new Date(cursorML + "T00:00:00.000Z");
        dML.setUTCDate(dML.getUTCDate() + 1);
        cursorML = dML.toISOString().slice(0, 10);
      }

      if (!allNightsAvailableML) {
        showErrorML(stringsML.multiDayRangeUnavailable);
        return;
      }
      if (multiDayMinNightsML !== null && nightsML < multiDayMinNightsML) {
        showErrorML(formatML(stringsML.multiDayMinNights, { count: multiDayMinNightsML }));
        return;
      }
      if (multiDayMaxNightsML !== null && nightsML > multiDayMaxNightsML) {
        showErrorML(formatML(stringsML.multiDayMaxNights, { count: multiDayMaxNightsML }));
        return;
      }

      clearErrorML();
      pendingEndDateML = dateStrML;
      pendingSlotML = buildMultiDaySlotML(pendingDateML, pendingEndDateML);
      renderCalendarML();
      updateConfirmButtonML();
      renderCustomFieldsML();
      refreshQuantityForSelectionML();
      updateRangeSummaryML();
    }

    function minRemainingCapacityForRangeML(checkinStrML, checkoutStrML) {
      var minML = null;
      var cursorML = checkinStrML;
      while (cursorML < checkoutStrML) {
        var capML = remainingCapacityByDateML[cursorML];
        if (typeof capML === "number" && (minML === null || capML < minML)) {
          minML = capML;
        }
        var dML = new Date(cursorML + "T00:00:00.000Z");
        dML.setUTCDate(dML.getUTCDate() + 1);
        cursorML = dML.toISOString().slice(0, 10);
      }
      return minML;
    }

    function buildMultiDaySlotML(checkinStrML, checkoutStrML) {
      return {
        start: "00:00",
        end: "00:00",
        startsAt: checkinStrML + "T00:00:00.000Z",
        endDate: checkoutStrML,
        remainingCapacity: minRemainingCapacityForRangeML(checkinStrML, checkoutStrML),
        available: true,
      };
    }

    function buildFullDaySlotML(dateStrML) {
      var capML = remainingCapacityByDateML[dateStrML];
      return {
        start: fullDayStartTimeML,
        end: fullDayEndTimeML,
        startsAt: dateStrML + "T00:00:00.000Z",
        remainingCapacity: typeof capML === "number" ? capML : null,
        available: true,
      };
    }

    function selectDateML(dateStrML) {
      pendingDateML = dateStrML;
      pendingSlotML = productBookingTypeML === "FULL_DAY" ? buildFullDaySlotML(dateStrML) : null;
      renderCalendarML();
      updateConfirmButtonML();
      renderCustomFieldsML();
      refreshQuantityForSelectionML();
      if (productBookingTypeML === "FULL_DAY") {
        if (slotsPaneElML) slotsPaneElML.hidden = true;
        durationElML.hidden = true;
      } else {
        if (slotsPaneElML) slotsPaneElML.hidden = false;
        loadSlotsML(dateStrML);
      }
    }

    var slotRequestIdML = 0;

    function loadSlotsML(dateStrML) {
      var requestIdML = ++slotRequestIdML;
      durationElML.hidden = true;
      setStatusML(slotListElML, stringsML.loadingTimes);

      var urlML =
        proxyBaseML +
        "/slots?productId=" +
        encodeURIComponent(productIdML) +
        "&date=" +
        dateStrML;
      if (pendingLocationML) {
        urlML += "&locationId=" + encodeURIComponent(pendingLocationML.id);
      }

      fetch(urlML)
        .then(function (resML) {
          if (resML.status === 403) {
            return resML.json().catch(function () {
              return {};
            }).then(function (bodyML) {
              var errML = new Error((bodyML && bodyML.error) || "Booking unavailable");
              errML.code = "APP_DISABLED";
              throw errML;
            });
          }
          return resML.json();
        })
        .then(function (dataML) {
          return fetchCartBookedQtyML().then(function (cartQtyML) {
            return [dataML, cartQtyML];
          });
        })
        .then(function (pairML) {
          if (requestIdML !== slotRequestIdML) return;
          currentSlotsML = subtractCartFromSlotsML(pairML[0].slots || [], dateStrML, pairML[1]);
          renderSlotsML();
        })
        .catch(function (errML) {
          if (requestIdML !== slotRequestIdML) return;
          if (errML && errML.code === "APP_DISABLED") {
            setStatusML(slotListElML, stringsML.bookingUnavailable);
            return;
          }
          setStatusML(slotListElML, stringsML.timesError, function () {
            loadSlotsML(dateStrML);
          });
        });
    }

    function isSlotTakenML(dateStrML, slotML) {
      if (!dateStrML || !slotML) return false;
      var inBundleML = bundleSessionsML.some(function (sessionML) {
        return (
          sessionML.date === dateStrML && sessionML.slot.startsAt === slotML.startsAt
        );
      });
      if (inBundleML) return true;
      return confirmedSlotsML.some(function (entryML) {
        return entryML.date === dateStrML && entryML.slot.startsAt === slotML.startsAt;
      });
    }

    function renderSlotsML() {
      slotListElML.innerHTML = "";

      if (currentSlotsML.length === 0) {
        setStatusML(slotListElML, stringsML.noTimes);
        return;
      }

      durationElML.hidden = false;
      if (productBookingTypeML === "BUNDLE" && bundleSessionCountML) {
        durationElML.textContent = sessionProgressTextML();
      } else {
        durationElML.textContent = formatML(stringsML.durationMinutes, {
          count: slotDurationMinutesML(currentSlotsML[0]),
        });
      }

      currentSlotsML.forEach(function (slotML) {
        var rowML = document.createElement("label");
        rowML.className = "booking-widget__slot-row";

        var inputML = document.createElement("input");
        inputML.type = "radio";
        inputML.name = "booking-widget-slot-" + rootML.dataset.productId;
        inputML.className = "booking-widget__slot-radio";
        inputML.value = slotML.startsAt;

        var textWrapML = document.createElement("span");
        textWrapML.className = "booking-widget__slot-text";
        textWrapML.textContent = formatTimeRangeDisplayML(slotML);

        if (slotML.available === false) {
          rowML.classList.add("booking-widget__slot-row--unavailable");
          inputML.disabled = true;
          var bookedTagML = document.createElement("span");
          bookedTagML.className = "booking-widget__slot-tag";
          bookedTagML.textContent = "(" + stringsML.booked + ")";
          rowML.appendChild(inputML);
          rowML.appendChild(textWrapML);
          rowML.appendChild(bookedTagML);
          slotListElML.appendChild(rowML);
          return;
        }

        if (isSlotTakenML(pendingDateML, slotML)) {
          rowML.classList.add("booking-widget__slot-row--unavailable");
          inputML.disabled = true;
          var takenTagML = document.createElement("span");
          takenTagML.className = "booking-widget__slot-tag";
          takenTagML.textContent = "(" + stringsML.alreadySelected + ")";
          rowML.appendChild(inputML);
          rowML.appendChild(textWrapML);
          rowML.appendChild(takenTagML);
          slotListElML.appendChild(rowML);
          return;
        }

        if (typeof slotML.remainingCapacity === "number") {
          var isLowML = slotML.remainingCapacity <= LOW_AVAILABILITY_THRESHOLD_ML;
          var remainingTagML = document.createElement("span");
          remainingTagML.className =
            "booking-widget__slot-tag" +
            (isLowML ? " booking-widget__slot-tag--low" : "");
          remainingTagML.textContent =
            "(" +
            (slotML.remainingCapacity === 1
              ? stringsML.spotLeft
              : formatML(stringsML.spotsLeft, { count: slotML.remainingCapacity })) +
            ")";
          rowML.appendChild(inputML);
          rowML.appendChild(textWrapML);
          rowML.appendChild(remainingTagML);
        } else {
          rowML.appendChild(inputML);
          rowML.appendChild(textWrapML);
        }

        if (pendingSlotML && pendingSlotML.startsAt === slotML.startsAt) {
          inputML.checked = true;
          rowML.classList.add("booking-widget__slot-row--selected");
        }

        inputML.addEventListener("change", function () {
          pendingSlotML = slotML;
          renderSlotsML();
          updateConfirmButtonML();
          renderCustomFieldsML();
          refreshQuantityForSelectionML();
        });

        slotListElML.appendChild(rowML);
      });
    }

    var DEFAULT_MAX_QUANTITY_ML = 99;

    function maxQuantityForPendingSlotML() {
      if (!pendingSlotML || typeof pendingSlotML.remainingCapacity !== "number") {
        return DEFAULT_MAX_QUANTITY_ML;
      }
      return Math.max(1, pendingSlotML.remainingCapacity);
    }

    function setPendingQuantityML(valueML) {
      var maxML = maxQuantityForPendingSlotML();
      var nextML = Math.round(Number(valueML));
      if (!Number.isFinite(nextML) || nextML < 1) nextML = 1;
      if (nextML > maxML) nextML = maxML;
      pendingQuantityML = nextML;
      if (quantityInputElML) {
        quantityInputElML.value = String(pendingQuantityML);
        quantityInputElML.disabled = quantityLockedML;
      }
      if (quantityDecreaseBtnML) {
        quantityDecreaseBtnML.disabled = quantityLockedML || pendingQuantityML <= 1;
      }
      if (quantityIncreaseBtnML) {
        quantityIncreaseBtnML.disabled = quantityLockedML || pendingQuantityML >= maxML;
      }
      if (quantityNoteElML) {
        var showsCapacityAlwaysML =
          isDateOnlyTypeML(productBookingTypeML) &&
          pendingSlotML &&
          typeof pendingSlotML.remainingCapacity === "number";

        if (showsCapacityAlwaysML) {
          quantityNoteElML.textContent =
            maxML === 1
              ? stringsML.unitAvailable
              : formatML(stringsML.unitsAvailable, { count: maxML });
          quantityNoteElML.hidden = false;
        } else if (maxML <= 5) {
          quantityNoteElML.textContent = formatML(stringsML.quantityMaxReached, {
            count: maxML,
          });
          quantityNoteElML.hidden = false;
        } else {
          quantityNoteElML.hidden = true;
        }
      }
    }

    function refreshQuantityForSelectionML() {
      var isBundleFollowupSessionML =
        productBookingTypeML === "BUNDLE" && bundleSessionsML.length > 0;
      quantityLockedML = !pendingSlotML || isBundleFollowupSessionML;
      if (quantityWrapElML) {
        quantityWrapElML.classList.toggle("is-locked", quantityLockedML);
      }
      if (noteWrapElML) {
        noteWrapElML.classList.toggle("is-locked", quantityLockedML);
      }
      if (noteInputElML) noteInputElML.disabled = quantityLockedML;
      if (customFieldsEntryElML) {
        var customFieldCardsML = customFieldsEntryElML.querySelectorAll(
          ".booking-widget__field",
        );
        customFieldCardsML.forEach(function (cardML) {
          cardML.classList.toggle("is-locked", quantityLockedML);
        });
        var customFieldInputsML = customFieldsEntryElML.querySelectorAll(
          "input, textarea, select",
        );
        customFieldInputsML.forEach(function (elML) {
          elML.disabled = quantityLockedML;
        });
      }
      setPendingQuantityML(
        pendingSlotML && !isBundleFollowupSessionML ? pendingQuantityML : 1,
      );
    }

    if (noteInputElML) {
      noteInputElML.addEventListener("input", function () {
        pendingNoteML = noteInputElML.value;
      });
    }

    if (quantityDecreaseBtnML) {
      quantityDecreaseBtnML.addEventListener("click", function () {
        setPendingQuantityML(pendingQuantityML - 1);
      });
    }
    if (quantityIncreaseBtnML) {
      quantityIncreaseBtnML.addEventListener("click", function () {
        setPendingQuantityML(pendingQuantityML + 1);
      });
    }
    if (quantityInputElML) {
      quantityInputElML.addEventListener("change", function () {
        setPendingQuantityML(quantityInputElML.value);
      });
    }
    setPendingQuantityML(1);

    function updateConfirmButtonML() {
      if (locationRequiredML() && !pendingLocationML) {
        confirmBtnML.disabled = true;
        confirmBtnML.textContent = stringsML.next;
        if (reviewBackBtnML) reviewBackBtnML.hidden = true;
        if (nextSlotBtnML) nextSlotBtnML.hidden = true;
        return;
      }

      if (productBookingTypeML === "BUNDLE" && !atReviewStepML) {
        var totalSessionsML = bundleSessionCountML || 1;
        var isLastSessionML = bundleSessionsML.length >= totalSessionsML - 1;

        if (nextSlotBtnML) {
          nextSlotBtnML.hidden = totalSessionsML <= 1 || isLastSessionML;
          nextSlotBtnML.disabled = isLastSessionML || !(pendingDateML && pendingSlotML);
        }
        confirmBtnML.disabled = !(isLastSessionML && pendingDateML && pendingSlotML);
        confirmBtnML.textContent = isLastSessionML ? stringsML.done : stringsML.next;
        if (!confirmBtnML.disabled && nextSlotBtnML) {
          nextSlotBtnML.disabled = true;
        }
        if (reviewBackBtnML) reviewBackBtnML.hidden = true;
        return;
      }

      if (nextSlotBtnML) nextSlotBtnML.hidden = true;
      confirmBtnML.disabled = atReviewStepML ? false : !(pendingDateML && pendingSlotML);
      confirmBtnML.textContent = atReviewStepML ? stringsML.confirm : stringsML.next;
      if (reviewBackBtnML) reviewBackBtnML.hidden = !atReviewStepML;
    }

    var REVIEW_ICONS_ML = {
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

    function buildReviewSummaryML() {
      if (!reviewListElML) return;
      reviewListElML.innerHTML = "";
      if (!pendingDateML || !pendingSlotML) return;

      var rowsML;
      if (productBookingTypeML === "BUNDLE") {
        rowsML = [
          pendingLocationML
            ? { label: "Location", value: pendingLocationML.name, icon: "location" }
            : null,
        ];
        bundleSessionsML.forEach(function (sessionML, indexML) {
          rowsML.push({
            label: formatML(stringsML.sessionConfirmed, { number: indexML + 1 }),
            value:
              formatDateDisplayML(sessionML.date) +
              " · " +
              formatTimeRangeDisplayML(sessionML.slot),
            icon: "calendar",
          });
        });
        rowsML.push({
          label: "Quantity",
          value: String(bundleQuantityML),
          icon: "quantity",
        });
      } else if (productBookingTypeML === "MULTI_DAY") {
        rowsML = [
          pendingLocationML
            ? { label: "Location", value: pendingLocationML.name, icon: "location" }
            : null,
          {
            label: "Check-in",
            value: formatDateDisplayML(pendingDateML),
            icon: "calendar",
          },
          {
            label: "Check-out",
            value: formatDateDisplayML(pendingSlotML.endDate),
            icon: "calendar",
          },
          {
            label: "Quantity",
            value: String(pendingQuantityML),
            icon: "quantity",
          },
        ];
      } else {
        rowsML = [
          pendingLocationML
            ? { label: "Location", value: pendingLocationML.name, icon: "location" }
            : null,
          { label: "Date", value: formatDateDisplayML(pendingDateML), icon: "calendar" },
          productBookingTypeML === "FULL_DAY"
            ? {
                label: "Booking",
                value: formatTimeRangeDisplayML(pendingSlotML, false),
                icon: "clock",
              }
            : {
                label: "Time",
                value: formatTimeRangeDisplayML(pendingSlotML),
                icon: "clock",
              },
          {
            label: "Quantity",
            value: String(pendingQuantityML),
            icon: "quantity",
          },
        ];
      }

      var requestTextML = (pendingNoteML || "").trim();
      rowsML.push({
        label: "Note",
        value: requestTextML || "-",
        icon: "note",
      });

      customFieldsML.forEach(function (fieldML) {
        var valueML = (customFieldValuesML[fieldML.fieldKey] || "").trim();
        rowsML.push({
          label: fieldML.label,
          value: valueML || "-",
          icon: "note",
        });
      });

      rowsML.forEach(function (rowML) {
        if (!rowML) return;
        var dtML = document.createElement("dt");
        dtML.textContent = rowML.label;

        var ddML = document.createElement("dd");
        ddML.className = "booking-widget__review-row";
        var labelSpanML = document.createElement("span");
        labelSpanML.className = "booking-widget__review-label";
        labelSpanML.textContent = rowML.label;
        if (rowML.sub) {
          var subSpanML = document.createElement("span");
          subSpanML.className = "booking-widget__review-sub";
          subSpanML.textContent = rowML.sub;
          labelSpanML.appendChild(subSpanML);
        }
        var valueSpanML = document.createElement("span");
        valueSpanML.className = "booking-widget__review-value";
        valueSpanML.textContent = rowML.value;
        ddML.appendChild(labelSpanML);
        ddML.appendChild(valueSpanML);

        reviewListElML.appendChild(dtML);
        reviewListElML.appendChild(ddML);
      });

      if (unitPriceML !== null) {
        var reviewQuantityML =
          productBookingTypeML === "BUNDLE" ? bundleQuantityML : pendingQuantityML;
        var totalML = unitPriceML * reviewQuantityML;
        var totalDtML = document.createElement("dt");
        totalDtML.textContent = "Total";

        var totalDdML = document.createElement("dd");
        totalDdML.className =
          "booking-widget__review-row booking-widget__review-row--total";
        var totalLabelML = document.createElement("span");
        totalLabelML.className = "booking-widget__review-label";
        totalLabelML.textContent = "Total";
        var totalValueML = document.createElement("span");
        totalValueML.className = "booking-widget__review-value";
        totalValueML.textContent = formatMoneyML(totalML);
        totalDdML.appendChild(totalLabelML);
        totalDdML.appendChild(totalValueML);

        reviewListElML.appendChild(totalDtML);
        reviewListElML.appendChild(totalDdML);
      }
    }

    function showReviewStepML() {
      atReviewStepML = true;
      buildReviewSummaryML();
      modalBodyElML.hidden = true;
      if (reviewStepElML) reviewStepElML.hidden = false;
      if (reviewBodyElML) reviewBodyElML.hidden = false;
      if (subheaderElML) subheaderElML.hidden = true;
      renderCustomFieldsML();
      updateConfirmButtonML();
    }

    function exitReviewStepML() {
      atReviewStepML = false;
      if (reviewStepElML) reviewStepElML.hidden = true;
      if (reviewBodyElML) reviewBodyElML.hidden = true;
      modalBodyElML.hidden = false;
      if (quantityWrapElML) quantityWrapElML.hidden = false;
      if (noteWrapElML) noteWrapElML.hidden = false;
      renderCustomFieldsML();
    }

    if (reviewBackBtnML) {
      reviewBackBtnML.addEventListener("click", function () {
        if (productBookingTypeML === "BUNDLE" && bundleSessionsML.length > 0) {
          var lastML = bundleSessionsML.pop();
          pendingDateML = lastML.date;
          pendingSlotML = lastML.slot;
          updateBundleProgressML();
          exitReviewStepML();
          loadSlotsML(pendingDateML);
          refreshQuantityForSelectionML();
          updateConfirmButtonML();
          return;
        }
        exitReviewStepML();
        renderSlotsML();
        refreshQuantityForSelectionML();
        updateConfirmButtonML();
      });
    }

    function createIconImgML(srcML, sizeML) {
      var imgML = document.createElement("img");
      imgML.src = srcML;
      imgML.alt = "";
      imgML.width = sizeML;
      imgML.height = sizeML;
      imgML.decoding = "async";
      imgML.setAttribute("aria-hidden", "true");
      return imgML;
    }

    function createSelectionRowML(textML, onRemoveML) {
      var rowML = document.createElement("div");
      rowML.className = "booking-widget__selection-row";

      var iconML = document.createElement("span");
      iconML.className = "booking-widget__selection-row-icon";
      if (calendarIconUrlML) iconML.appendChild(createIconImgML(calendarIconUrlML, 24));
      rowML.appendChild(iconML);

      var labelML = document.createElement("span");
      labelML.className = "booking-widget__selection-row-text";
      labelML.textContent = textML;
      rowML.appendChild(labelML);

      if (onRemoveML) {
        var removeBtnML = document.createElement("button");
        removeBtnML.type = "button";
        removeBtnML.className = "booking-widget__selection-row-remove";
        removeBtnML.setAttribute("aria-label", stringsML.removeSlot);
        removeBtnML.textContent = "\u00d7";
        removeBtnML.addEventListener("click", onRemoveML);
        rowML.appendChild(removeBtnML);
      }

      return rowML;
    }

    function buildSelectionCardML(rowsML) {
      var cardML = document.createElement("div");
      cardML.className = "booking-widget__selection-card";

      rowsML.forEach(function (rowML, iML) {
        cardML.appendChild(rowML);
        if (iML < rowsML.length - 1) {
          var dividerML = document.createElement("hr");
          dividerML.className = "booking-widget__selection-divider";
          cardML.appendChild(dividerML);
        }
      });

      return cardML;
    }

    function updateSelectionDisplayML() {
      saveConfirmedSlotsML();
      selectionElML.innerHTML = "";

      if (confirmedSlotsML.length === 0) {
        selectionElML.hidden = true;
        if (triggerBtnML) {
          triggerBtnML.textContent = stringsML.triggerBook;
          triggerBtnML.hidden = !(locationsLoadedML && locationsML.length > 0);
        }
        return;
      }

      if (triggerBtnML) triggerBtnML.hidden = true;
      selectionElML.hidden = false;

      var rowsML = [];

      confirmedSlotsML.forEach(function (entryML, indexML) {
        var removeEntryML = function () {
          confirmedSlotsML.splice(indexML, 1);
          updateSelectionDisplayML();
        };

        if (entryML.slot.bundleSessions && entryML.slot.bundleSessions.length > 1) {
          entryML.slot.bundleSessions.forEach(function (sessionML, sessionIndexML) {
            var lineTextML =
              formatML(stringsML.sessionConfirmed, { number: sessionIndexML + 1 }) +
              ": " +
              formatDateDisplayML(sessionML.date) +
              ", " +
              formatTimeRangeDisplayML(sessionML.slot);
            if (entryML.quantity && entryML.quantity > 1) {
              lineTextML += " \u00d7 " + entryML.quantity;
            }
            rowsML.push(
              createSelectionRowML(lineTextML, sessionIndexML === 0 ? removeEntryML : null),
            );
          });
        } else {
          var rowTextML =
            formatDateDisplayML(entryML.date) +
            ", " +
            formatTimeRangeDisplayML(
              entryML.slot,
              productBookingTypeML === "SLOT" || productBookingTypeML === "BUNDLE",
            );
          if (entryML.quantity && entryML.quantity > 1) {
            rowTextML += " \u00d7 " + entryML.quantity;
          }
          rowsML.push(createSelectionRowML(rowTextML, removeEntryML));
        }
      });

      selectionElML.appendChild(buildSelectionCardML(rowsML));
    }

    function refreshCartReminderML() {
      if (!cartReminderElML) return;
      fetch("/cart.js", { headers: { Accept: "application/json" } })
        .then(function (resML) {
          return resML.json();
        })
        .then(function (cartML) {
          var itemsML = (cartML.items || []).filter(function (itemML) {
            return (
              String(itemML.product_id) === numericProductIdML &&
              itemML.properties &&
              itemML.properties["Booking Date"]
            );
          });
          renderCartReminderML(itemsML);
        })
        .catch(function () {
        });
    }

    function renderCartReminderML(itemsML) {
      cartReminderElML.innerHTML = "";

      if (itemsML.length === 0) {
        cartReminderElML.hidden = true;
        return;
      }

      var bannerML = document.createElement("div");
      bannerML.className = "booking-widget__cart-success-banner";

      var iconML = document.createElement("span");
      iconML.className = "booking-widget__cart-success-icon";
      if (tickIconUrlML) iconML.appendChild(createIconImgML(tickIconUrlML, 24));
      bannerML.appendChild(iconML);

      var messageML = document.createElement("p");
      messageML.className = "booking-widget__cart-success-message";
      messageML.textContent = stringsML.addedToCartSuccess;
      [
        ["font-family", '"Inter", sans-serif'],
        ["font-size", "20px"],
        ["font-weight", "600"],
        ["line-height", "100%"],
        ["letter-spacing", "0"],
        ["text-transform", "none"],
        ["color", "#1f9900"],
        ["margin", "0"],
      ].forEach(function (ruleML) {
        messageML.style.setProperty(ruleML[0], ruleML[1], "important");
      });
      bannerML.appendChild(messageML);

      cartReminderElML.appendChild(bannerML);

      var groupedML = [];
      var groupIndexML = {};

      itemsML.forEach(function (itemML) {
        var propsML = itemML.properties;
        var qtyML = itemML.quantity || 1;

        var sessionCountML = 1;
        while (propsML["Session " + (sessionCountML + 1) + " Date"]) {
          sessionCountML += 1;
        }

        for (var sML = 1; sML <= sessionCountML; sML++) {
          var sDateML = sML === 1 ? propsML["Booking Date"] : propsML["Session " + sML + " Date"];
          var sTimeML = sML === 1 ? propsML["Booking Time"] : propsML["Session " + sML + " Time"];
          var sLabelML =
            (sML === 1 ? propsML["_Booking Time Label"] : propsML["_Session " + sML + " Time Label"]) ||
            recallTimeLabelML(sDateML, sTimeML) ||
            (sTimeML ? to12HourML(sTimeML) : "");

          var textML = formatDateDisplayML(sDateML) + ", " + sLabelML;
          if (sessionCountML > 1) {
            textML = formatML(stringsML.sessionConfirmed, { number: sML }) + ": " + textML;
          }
          var keyML = textML + "|" + (propsML["_Location Id"] || "");
          if (groupIndexML[keyML] === undefined) {
            groupIndexML[keyML] = groupedML.length;
            groupedML.push({ text: textML, qty: qtyML });
          } else {
            groupedML[groupIndexML[keyML]].qty += qtyML;
          }
        }
      });

      var rowsML = groupedML.map(function (gML) {
        return createSelectionRowML(gML.text + (gML.qty > 1 ? " \u00d7 " + gML.qty : ""));
      });

      cartReminderElML.appendChild(buildSelectionCardML(rowsML));
      cartReminderElML.hidden = false;
    }

    function changeViewMonthML(indexML) {
      viewYearML = Math.floor(indexML / 12);
      viewMonthML = (indexML % 12) + 1;
      pendingDateML = null;
      pendingSlotML = null;
      pendingEndDateML = null;
      refreshQuantityForSelectionML();
      showSelectDateHintML();
      updateConfirmButtonML();
      renderCustomFieldsML();
      loadMonthML();
    }

    function goToMonthML(deltaML) {
      changeViewMonthML(viewYearML * 12 + (viewMonthML - 1) + deltaML);
    }

    closeBtnML.addEventListener("click", closeModalML);
    var pressStartedInsideModalML = false;
    overlayElML.addEventListener("pointerdown", function (eventML) {
      pressStartedInsideModalML = eventML.target !== overlayElML;
    });
    overlayElML.addEventListener("click", function (eventML) {
      var startedInsideML = pressStartedInsideModalML;
      pressStartedInsideModalML = false;
      if (eventML.target === overlayElML && !startedInsideML) closeModalML();
    });
    if (nextSlotBtnML) {
      nextSlotBtnML.addEventListener("click", function () {
        if (!pendingDateML || !pendingSlotML) return;
        if (isSlotTakenML(pendingDateML, pendingSlotML)) {
          showErrorML(stringsML.slotAlreadySelectedError);
          return;
        }
        clearErrorML();
        if (bundleSessionsML.length === 0) {
          bundleQuantityML = pendingQuantityML;
        }
        bundleSessionsML.push({ date: pendingDateML, slot: pendingSlotML });
        updateBundleProgressML();
        pendingDateML = null;
        pendingSlotML = null;
        renderCalendarML();
        updateConfirmButtonML();
        renderCustomFieldsML();
        refreshQuantityForSelectionML();
        if (slotsPaneElML) slotsPaneElML.hidden = false;
        setStatusML(slotListElML, stringsML.selectDateHint);
        durationElML.hidden = false;
        durationElML.textContent = sessionProgressTextML();
      });
    }
    confirmBtnML.addEventListener("click", function () {
      if (locationRequiredML() && !pendingLocationML) {
        if (locationErrorElML) {
          locationErrorElML.hidden = false;
          locationErrorElML.textContent = stringsML.locationRequired;
        }
        if (locationTriggerElML) {
          locationTriggerElML.classList.add(
            "booking-widget__location-trigger--error",
          );
        }
        return;
      }

      if (!pendingDateML || !pendingSlotML) return;

      if (productBookingTypeML === "BUNDLE") {
        var totalSessionsML = bundleSessionCountML || 1;

        if (!atReviewStepML) {
          if (isSlotTakenML(pendingDateML, pendingSlotML)) {
            showErrorML(stringsML.slotAlreadySelectedError);
            return;
          }
          clearErrorML();
          if (bundleSessionsML.length === 0) {
            bundleQuantityML = pendingQuantityML;
          }
          bundleSessionsML.push({ date: pendingDateML, slot: pendingSlotML });
          updateBundleProgressML();
          showReviewStepML();
          return;
        }

        var firstSessionML = bundleSessionsML[0];
        var combinedSlotML = Object.assign({}, firstSessionML.slot, {
          bundleSessions: bundleSessionsML.slice(),
        });
        confirmedSlotsML.push({
          date: firstSessionML.date,
          slot: combinedSlotML,
          location: pendingLocationML ? pendingLocationML.name : null,
          locationId: pendingLocationML ? pendingLocationML.id : null,
          quantity: bundleQuantityML,
          note: pendingNoteML,
        });
        updateSelectionDisplayML();
        bundleSessionsML = [];
        bundleQuantityML = 1;
        updateBundleProgressML();
        closeModalML();
        return;
      }

      if (!atReviewStepML) {
        showReviewStepML();
        return;
      }

      var dateML = pendingDateML;
      var slotML = pendingSlotML;
      var quantityML = pendingQuantityML;
      if (isSlotTakenML(dateML, slotML)) {
        showErrorML(stringsML.slotAlreadySelectedError);
        return;
      }
      clearErrorML();
      confirmedSlotsML.push({
        date: dateML,
        slot: slotML,
        location: pendingLocationML ? pendingLocationML.name : null,
        locationId: pendingLocationML ? pendingLocationML.id : null,
        quantity: quantityML,
        note: pendingNoteML,
      });
      updateSelectionDisplayML();
      refreshQuantityForSelectionML();
      closeModalML();
    });

    loadConfirmedSlotsML();
    updateSelectionDisplayML();
    refreshCartReminderML();
  }

  var BUY_BUTTON_CONTAINER_SELECTORS_ML = [
    "product-form",
    "form[action*='/cart/add'] .product-form__buttons",
    "form[action*='/cart/add']",
    ".shopify-payment-button",
    ".product__info-container",
    ".product-form",
  ];

  function relocateNextToBuyButtonML(rootML) {
    if (rootML.closest("form[action*='/cart/add']")) return;
    if (rootML.dataset.bookingWidgetPlaced === "true") return;

    for (var iML = 0; iML < BUY_BUTTON_CONTAINER_SELECTORS_ML.length; iML++) {
      var targetML = document.querySelector(BUY_BUTTON_CONTAINER_SELECTORS_ML[iML]);
      if (targetML && targetML.parentNode) {
        targetML.insertAdjacentElement("afterend", rootML);
        rootML.dataset.bookingWidgetPlaced = "true";
        return;
      }
    }
  }

  function initML() {
    document.querySelectorAll("[data-booking-widget]").forEach(function (rootML) {
      relocateNextToBuyButtonML(rootML);
      initWidgetML(rootML);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initML);
  } else {
    initML();
  }
})();