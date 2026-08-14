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
    selectBeforeCart:
      "Please select a date and time before adding this to your cart.",
    selected: "{date} | {time}",
    triggerBook: "Book your slot",
    modalTitle: "Appointment - Booking",
    modalSubtitle: "Select your preferred date & time",
    confirm: "Confirm",
    close: "Close",
    durationMinutes: "{count} Mins",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    availableTimes: "Available times",
    alreadyBooked: "You already have this booked for this product:",
    askMoreMessage:
      "{date} | {time} added. Want to book another slot for this product?",
    addAnotherSlot: "Yes, add another slot",
    doneAddToCart: "No, I'm done",
    removeSlot: "Remove this slot",
    addAnotherSlotLink: "+ Add another slot",
    multiAddError:
      "Something went wrong adding your slots to cart. Please try again.",
    addingToCart: "Adding your slots to cart…",
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

    // Guard: if the Liquid `t` filter ever returns a missing-translation
    // placeholder (stale deploy, cache, etc.), never show that raw string
    // to the shopper — fall back to English instead.
    function safe(value, fallback) {
      if (!value) return fallback;
      if (/^Translation missing/i.test(value)) return fallback;
      return value;
    }

    return {
      loadingAvailability: safe(
        d.i18nLoadingAvailability,
        FALLBACK_STRINGS.loadingAvailability,
      ),
      availabilityError: safe(
        d.i18nAvailabilityError,
        FALLBACK_STRINGS.availabilityError,
      ),
      noAvailability: safe(d.i18nNoAvailability, FALLBACK_STRINGS.noAvailability),
      loadingTimes: safe(d.i18nLoadingTimes, FALLBACK_STRINGS.loadingTimes),
      timesError: safe(d.i18nTimesError, FALLBACK_STRINGS.timesError),
      noTimes: safe(d.i18nNoTimes, FALLBACK_STRINGS.noTimes),
      booked: safe(d.i18nBooked, FALLBACK_STRINGS.booked),
      spotLeft: safe(d.i18nSpotLeft, FALLBACK_STRINGS.spotLeft),
      spotsLeft: safe(d.i18nSpotsLeft, FALLBACK_STRINGS.spotsLeft),
      selectBeforeCart: safe(
        d.i18nSelectBeforeCart,
        FALLBACK_STRINGS.selectBeforeCart,
      ),
      selected: safe(d.i18nSelected, FALLBACK_STRINGS.selected),
      triggerBook: safe(d.i18nTriggerBook, FALLBACK_STRINGS.triggerBook),
      modalTitle: safe(d.i18nModalTitle, FALLBACK_STRINGS.modalTitle),
      modalSubtitle: safe(d.i18nModalSubtitle, FALLBACK_STRINGS.modalSubtitle),
      confirm: safe(d.i18nConfirm, FALLBACK_STRINGS.confirm),
      close: safe(d.i18nClose, FALLBACK_STRINGS.close),
      durationMinutes: safe(
        d.i18nDurationMinutes,
        FALLBACK_STRINGS.durationMinutes,
      ),
      previousMonth: safe(d.i18nPreviousMonth, FALLBACK_STRINGS.previousMonth),
      nextMonth: safe(d.i18nNextMonth, FALLBACK_STRINGS.nextMonth),
      availableTimes: safe(d.i18nAvailableTimes, FALLBACK_STRINGS.availableTimes),
      alreadyBooked: safe(d.i18nAlreadyBooked, FALLBACK_STRINGS.alreadyBooked),
      askMoreMessage: safe(d.i18nAskMoreMessage, FALLBACK_STRINGS.askMoreMessage),
      addAnotherSlot: safe(d.i18nAddAnotherSlot, FALLBACK_STRINGS.addAnotherSlot),
      doneAddToCart: safe(d.i18nDoneAddToCart, FALLBACK_STRINGS.doneAddToCart),
      removeSlot: safe(d.i18nRemoveSlot, FALLBACK_STRINGS.removeSlot),
      addAnotherSlotLink: safe(
        d.i18nAddAnotherSlotLink,
        FALLBACK_STRINGS.addAnotherSlotLink,
      ),
      multiAddError: safe(d.i18nMultiAddError, FALLBACK_STRINGS.multiAddError),
      addingToCart: safe(d.i18nAddingToCart, FALLBACK_STRINGS.addingToCart),
    };
  }

  function formatTimeRangeDisplay(start, end) {
    return start + " - " + end;
  }

  function slotDurationMinutes(slot) {
    var s = slot.start.split(":").map(Number);
    var e = slot.end.split(":").map(Number);
    return e[0] * 60 + e[1] - (s[0] * 60 + s[1]);
  }

  // Dates are always shown as DD-MM-YYYY across the whole store — not
  // locale-dependent, not configurable. Kept deliberately simple.
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

  function initWidget(root) {
    var productId = root.dataset.productId;
    var proxyBase = root.dataset.proxyBase;
    var locale = root.dataset.locale || "en";
    var strings = readStrings(root);
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

    var selectionEl = root.querySelector("[data-booking-selection]");
    var errorEl = root.querySelector("[data-booking-error]");
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
    var modalBodyEl = root.querySelector("[data-booking-modal-body]");
    var modalFooterEl = root.querySelector("[data-booking-modal-footer]");
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

    var today = new Date();
    var viewYear = today.getUTCFullYear();
    var viewMonth = today.getUTCMonth() + 1;
    var availableDates = [];
    var currentSlots = [];

    var pendingDate = null;
    var pendingSlot = null;
    // Slots the shopper has confirmed in this modal session but hasn't
    // added to cart yet — can be more than one if they chose "add
    // another slot" after confirming. Each entry is { date, slot }.
    var confirmedSlots = [];

    // The numeric product id, pulled out of the GID we already use for
    // the availability/slots API calls, so we can match this product's
    // line items in the Shopify cart (cart.js only exposes numeric ids).
    var numericProductId = (productId || "").split("/").pop();

    // Custom field definitions fetched once from the app, and the
    // shopper's current answers, keyed by fieldKey. None are required —
    // these are optional notes collected alongside the booking.
    var customFields = [];
    var customFieldValues = {};

    var widgetSection = root.closest(".shopify-section");

    // ---- Place our own "Book your slot" button right above Add to cart ----
    // We never touch or relabel the theme's native Add to cart / dynamic
    // checkout ("Buy it now") buttons — those stay 100% default Shopify.
    // Instead we physically move this whole widget (trigger button +
    // selection display + modal) so it sits immediately before the real
    // Add to cart button, regardless of where the app block itself was
    // placed in the theme editor.
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

    // A page can have more than one form[action*="/cart/add"] — e.g. an
    // empty/hidden form injected by another app (selling plans, quick-add
    // modals for other products, etc). Blindly taking "the first match" can
    // grab a form with no real button in it at all. Instead, walk every
    // matching form (scoped to this section first, then the whole page as a
    // fallback) and use the first one that actually contains a real
    // add-to-cart button.
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
    // If we couldn't confidently find the Add to cart button, the widget
    // simply stays wherever the app block was placed — same as before,
    // nothing breaks either way.

    var triggerBtn = root.querySelector("[data-booking-trigger]");
    triggerBtn.addEventListener("click", function () {
      clearError();
      openModal();
    });

    // ---- Require a booked slot before Add to cart goes through ----
    // Some themes use a native form "submit" event for Add to cart; others
    // intercept the button's "click" directly and fire their own fetch()
    // without ever dispatching a real submit event. We guard both paths so
    // this works regardless of how the theme implements add-to-cart. We
    // never call requestSubmit() ourselves — we only ever block/allow the
    // theme's own normal flow (AJAX, cart drawer, redirect, whatever it
    // does) so it's otherwise completely unaffected.
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

    // Builds the request body for a single "add to cart" call for one
    // booked slot, based on the real theme form (so variant id, quantity,
    // and any other apps' hidden fields all come along), with just the
    // booking properties swapped in for this slot.
    function buildFormDataForSlot(form, entry) {
      var fd = new FormData(form);
      fd.set("properties[Booking Date]", entry.date);
      fd.set("properties[Booking Time]", entry.slot.start);
      customFields.forEach(function (field) {
        var value = customFieldValues[field.fieldKey];
        if (!value) return;
        fd.set("properties[" + field.label + "]", value);
      });
      return fd;
    }

    // A native form submit can only carry one set of line item
    // properties, so multiple booked slots for the same product have to
    // become multiple separate cart lines. We add them one at a time via
    // Shopify's AJAX Cart API so a failure partway through (e.g. a slot
    // that got booked by someone else in the meantime) is easy to catch.
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

    // Returns true if the add-to-cart attempt should be BLOCKED.
    function guardAddToCart(event) {
      if (confirmedSlots.length === 0) {
        event.preventDefault();
        // preventDefault() alone only cancels the native default action —
        // it does NOT stop other listeners (like the theme's own
        // click/submit AJAX handler) from still running on this same
        // event. Without these, themes that add to cart via their own
        // listener would add the item anyway even though we "blocked" it.
        event.stopPropagation();
        event.stopImmediatePropagation();
        showError(strings.selectBeforeCart);
        root.scrollIntoView({ behavior: "smooth", block: "center" });
        return true;
      }
      clearError();

      if (confirmedSlots.length === 1) {
        // Single slot: leave the theme's own add-to-cart flow completely
        // untouched (AJAX, cart drawer, redirect, upsells — whatever it
        // normally does). We just make sure our two hidden fields are on
        // the form before it submits.
        if (nearbyForm) injectBookingFields(nearbyForm, confirmedSlots[0]);
        // IMPORTANT: don't clear confirmedSlots here. Clicking a submit
        // button fires a "click" event and then, synchronously as part
        // of its default action, a "submit" event on the form — we guard
        // both (see the two listeners below), so this function can run
        // twice for the one interaction. Clearing on the first run would
        // make the second run think nothing was selected and block the
        // add. Defer the reset to a macrotask instead, so it only runs
        // once both of those synchronous firings are done.
        setTimeout(function () {
          confirmedSlots = [];
          updateSelectionDisplay();
          // Some themes add to cart via AJAX without a page navigation,
          // so re-check the cart shortly after in case this add
          // succeeded — that's what keeps the "already booked" reminder
          // up to date.
          refreshCartReminder();
        }, 1200);
        return false;
      }

      // Multiple slots: take over, since a single form submit can't carry
      // more than one set of booking properties.
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
        // Reload so the theme's own cart UI (drawer, count bubble, mini
        // cart, etc.) picks up the new lines exactly the way it would
        // after any normal full-page add-to-cart — we don't try to guess
        // which cart-refresh events this particular theme listens for.
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
          // Non-critical — booking still works without the extra
          // questions, so fail silently rather than blocking the widget.
          customFields = [];
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

      // Only shown once a time slot is picked — asked as the natural next
      // step after date + time, same as the confirm button appearing.
      customFieldsEl.hidden = !pendingSlot;
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
      askMoreEl.hidden = true;
      modalBodyEl.hidden = false;
      modalFooterEl.hidden = false;
      overlayEl.hidden = false;
      document.body.classList.add("booking-widget-lock-scroll");
      updateConfirmButton();
      renderCustomFields();
      loadMonth();
    }

    function closeModal() {
      overlayEl.hidden = true;
      document.body.classList.remove("booking-widget-lock-scroll");
    }

    function showAskMore(date, slot) {
      askMoreMessageEl.textContent = format(strings.askMoreMessage, {
        date: formatDateDisplay(date),
        time: formatTimeRangeDisplay(slot.start, slot.end),
      });
      modalBodyEl.hidden = true;
      modalFooterEl.hidden = true;
      askMoreEl.hidden = false;
    }

    function resumeModalForAnotherSlot() {
      askMoreEl.hidden = true;
      modalBodyEl.hidden = false;
      modalFooterEl.hidden = false;
      pendingDate = null;
      pendingSlot = null;
      currentSlots = [];
      durationEl.hidden = true;
      setStatus(slotListEl, strings.noTimes);
      updateConfirmButton();
      renderCustomFields();
      renderCalendar();
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
      renderCustomFields();
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
        textWrap.textContent = formatTimeRangeDisplay(slot.start, slot.end);

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
          renderCustomFields();
        });

        slotListEl.appendChild(row);
      });
    }

    function updateConfirmButton() {
      confirmBtn.disabled = !(pendingDate && pendingSlot);
    }

    function updateSelectionDisplay() {
      selectionEl.innerHTML = "";

      if (confirmedSlots.length === 0) {
        selectionEl.hidden = true;
        triggerBtn.hidden = false;
        return;
      }

      triggerBtn.hidden = true;
      selectionEl.hidden = false;

      confirmedSlots.forEach(function (entry, index) {
        var chip = document.createElement("span");
        chip.className = "booking-widget__selection-chip";

        var label = document.createElement("span");
        label.textContent = format(strings.selected, {
          date: formatDateDisplay(entry.date),
          time: formatTimeRangeDisplay(entry.slot.start, entry.slot.end),
        });
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

    // ---- Reminder that a slot for this product is already sitting in
    // the cart from an earlier visit/add. This reflects the real cart,
    // not just in-page state, so it's still accurate after a reload or a
    // fresh visit to the product page. ----
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
          // Non-critical — if we can't read the cart, just skip the
          // reminder rather than blocking anything else on the page.
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
      var date = pendingDate;
      var slot = pendingSlot;
      var alreadyQueued = confirmedSlots.some(function (entry) {
        return entry.date === date && entry.slot.startsAt === slot.startsAt;
      });
      if (!alreadyQueued) {
        confirmedSlots.push({ date: date, slot: slot });
        updateSelectionDisplay();
      }
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

  function init() {
    document.querySelectorAll("[data-booking-widget]").forEach(initWidget);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();