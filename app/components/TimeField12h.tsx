import { useEffect, useState, type CSSProperties } from "react";
import {
  to12HourPartsML,
  fromTwelveHourPartsML,
  sanitizeHourInputML,
  sanitizeMinuteInputML,
} from "../utils/time12h";

type FieldChangeEvent = { currentTarget: { value: string } };

export function TimeField12h({
  value: valueML,
  placeholder: placeholderML,
  onChange: onChangeML,
  inputBoxStyle: inputBoxStyleML,
  inputStyle: inputStyleML,
  borderColor: borderColorML = "#E9E9EA",
  textColor: textColorML = "#000000",
  periodButtonStyle: periodButtonStyleML,
}: {
  value: string | null;
  placeholder?: string;
  onChange: (next: string | null) => void;
  inputBoxStyle: CSSProperties;
  inputStyle: CSSProperties;
  borderColor?: string;
  textColor?: string;
  periodButtonStyle?: CSSProperties;
}) {
  const [partsML, setPartsML] = useState(() => to12HourPartsML(valueML));

  useEffect(() => {
    if (fromTwelveHourPartsML(partsML) !== (valueML ?? null)) {
      setPartsML(to12HourPartsML(valueML));
    }
  }, [valueML]);

  const commitML = (nextML: typeof partsML) => {
    setPartsML(nextML);
    onChangeML(fromTwelveHourPartsML(nextML));
  };

  const placeholderPartsML = to12HourPartsML(
    placeholderML && /^\d{1,2}:\d{2}$/.test(placeholderML) ? placeholderML : null,
  );

  return (
    <div style={{ ...inputBoxStyleML, gap: "6px" }}>
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        style={{ ...inputStyleML, flex: "0 0 22px", textAlign: "right" }}
        placeholder={placeholderPartsML.hour || "09"}
        value={partsML.hour}
        onChange={(eML: FieldChangeEvent) =>
          commitML({ ...partsML, hour: sanitizeHourInputML(eML.currentTarget.value) })
        }
      />
      <span style={{ color: textColorML }}>:</span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        style={{ ...inputStyleML, flex: "0 0 22px" }}
        placeholder={placeholderPartsML.minute || "00"}
        value={partsML.minute}
        onChange={(eML: FieldChangeEvent) =>
          commitML({ ...partsML, minute: sanitizeMinuteInputML(eML.currentTarget.value) })
        }
      />
      <button
        type="button"
        onClick={() =>
          commitML({ ...partsML, period: partsML.period === "AM" ? "PM" : "AM" })
        }
        style={{
          marginLeft: "auto",
          flex: "0 0 auto",
          border: `1px solid ${borderColorML}`,
          borderRadius: "4px",
          background: "#fff",
          color: textColorML,
          fontFamily: "Inter",
          fontWeight: 600,
          fontSize: "12px",
          padding: "3px 8px",
          cursor: "pointer",
          ...periodButtonStyleML,
        }}
      >
        {partsML.period}
      </button>
    </div>
  );
}