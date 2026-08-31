import { useEffect, useState } from "react";

// Windows IME composition must finish before the value is sent to parent state.
export default function ImeTextInput({ value = "", onValueChange, ...inputProps }) {
  const [draft, setDraft] = useState(value);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (!isComposing) setDraft(value);
  }, [value, isComposing]);

  const change = (event) => {
    const nextValue = event.target.value;
    setDraft(nextValue);
    if (!isComposing && !event.nativeEvent.isComposing) onValueChange(nextValue);
  };

  const finishComposition = (event) => {
    const finalValue = event.currentTarget.value;
    setIsComposing(false);
    setDraft(finalValue);
    onValueChange(finalValue);
  };

  return <input {...inputProps} value={draft} onChange={change}
    onCompositionStart={() => setIsComposing(true)} onCompositionEnd={finishComposition} />;
}
