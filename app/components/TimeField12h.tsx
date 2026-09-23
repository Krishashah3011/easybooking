import { useEffect, useState, type CSSProperties } from "react";
import {
  to12HourParts,
  fromTwelveHourParts,
  sanitizeHourInput,
  sanitizeMinuteInput,
} from "../utils/time12h";

type FieldChangeEvent = { currentTarget: { value: string } };

// Renders a 24-hour "HH:MM" (or null) value as three controls — hour,
// minute, and an AM/PM toggle — and reports changes back as the same
// 24-hour "HH:MM" string, so nothing downstream (validation, storage,
// slot math) needs to know this exists. Hour is clamped to 1-12 and
// minute to 0-59 as you type, so an out-of-range value like "50:00"
// can't be entered here the way a raw digit-grouping text field allowed.
export function TimeField12h({
  value,
  placeholder,
  onChange,
  inputBoxStyle,
  inputStyle,
  borderColor = "#E9E9EA",
  textColor = "#000000",
  periodButtonStyle,
}: {
  value: string | null;
  placeholder?: string;
  onChange: (next: string | null) => void;
  inputBoxStyle: CSSProperties;
  inputStyle: CSSProperties;
  borderColor?: string;
  textColor?: string;
  /** Optional overrides for the AM/PM toggle button (e.g. a tighter size for compact rows). */
  periodButtonStyle?: CSSProperties;
}) {
  const [parts, setParts] = useState(() => to12HourParts(value));

  useEffect(() => {
    if (fromTwelveHourParts(parts) !== (value ?? null)) {
      setParts(to12HourParts(value));
    }
    // Only resync from the parent when its value no longer matches what
    // these parts would produce (e.g. an external reset/load) — not on
    // every keystroke, so typing across the hour/minute fields isn't
    // clobbered mid-entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (next: typeof parts) => {
    setParts(next);
    onChange(fromTwelveHourParts(next));
  };

  const placeholderParts = to12HourParts(
    placeholder && /^\d{1,2}:\d{2}$/.test(placeholder) ? placeholder : null,
  );

  return (
    <div style={{ ...inputBoxStyle, gap: "6px" }}>
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        style={{ ...inputStyle, flex: "0 0 22px", textAlign: "right" }}
        placeholder={placeholderParts.hour || "09"}
        value={parts.hour}
        onChange={(e: FieldChangeEvent) =>
          commit({ ...parts, hour: sanitizeHourInput(e.currentTarget.value) })
        }
      />
      <span style={{ color: textColor }}>:</span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        style={{ ...inputStyle, flex: "0 0 22px" }}
        placeholder={placeholderParts.minute || "00"}
        value={parts.minute}
        onChange={(e: FieldChangeEvent) =>
          commit({ ...parts, minute: sanitizeMinuteInput(e.currentTarget.value) })
        }
      />
      <button
        type="button"
        onClick={() =>
          commit({ ...parts, period: parts.period === "AM" ? "PM" : "AM" })
        }
        style={{
          marginLeft: "auto",
          flex: "0 0 auto",
          border: `1px solid ${borderColor}`,
          borderRadius: "4px",
          background: "#fff",
          color: textColor,
          fontFamily: "Inter",
          fontWeight: 600,
          fontSize: "12px",
          padding: "3px 8px",
          cursor: "pointer",
          ...periodButtonStyle,
        }}
      >
        {parts.period}
      </button>
    </div>
  );
}
