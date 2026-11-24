import { useEffect, useRef, useState, type MouseEvent, type SelectHTMLAttributes } from "react";

type Choice = { value: string; label: string; disabled: boolean };

const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;

/**
 * A drop-in <select>: same props, same <option> children, and a real <select> underneath, so selectOption, toHaveValue and
 * labels work as usual. Clicking it opens a list of role=option entries instead of the browser's own popup, so a user can
 * also click the combo box and then click an option. While that list is open, the options of every native select are
 * hidden from the accessibility tree, so an option name matches only the visible entry.
 */
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { onMouseDown, ...rest } = props;
  const select = useRef<HTMLSelectElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [choices, setChoices] = useState<Choice[] | null>(null);
  const [current, setCurrent] = useState("");
  const [place, setPlace] = useState({ top: 0, left: 0, width: 0 });
  const enhanced = !props.multiple && !(Number(props.size) > 1);

  useEffect(() => {
    if (!choices) return;
    const hidden = Array.from(document.querySelectorAll("select option")).filter((option) => !option.hasAttribute("aria-hidden"));
    hidden.forEach((option) => option.setAttribute("aria-hidden", "true"));
    const outside = (event: Event) => {
      const target = event.target as Node;
      if (!list.current?.contains(target) && target !== select.current) setChoices(null);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setChoices(null);
    const changed = () => setChoices(null);
    const element = select.current;
    document.addEventListener("mousedown", outside, true);
    document.addEventListener("keydown", escape);
    element?.addEventListener("change", changed);
    return () => {
      hidden.forEach((option) => option.removeAttribute("aria-hidden"));
      document.removeEventListener("mousedown", outside, true);
      document.removeEventListener("keydown", escape);
      element?.removeEventListener("change", changed);
    };
  }, [choices]);

  const toggle = (event: MouseEvent<HTMLSelectElement>) => {
    onMouseDown?.(event);
    const element = select.current;
    if (!enhanced || !element || element.disabled || event.button !== 0 || event.defaultPrevented) return;
    event.preventDefault();
    element.focus();
    if (choices) return setChoices(null);
    setCurrent(element.value);
    setPlace({ top: element.offsetTop + element.offsetHeight, left: element.offsetLeft, width: element.offsetWidth });
    setChoices(Array.from(element.options).map((option) => ({ value: option.value, label: option.text.trim(), disabled: option.disabled })));
  };

  const choose = (choice: Choice) => {
    const element = select.current;
    if (!element || choice.disabled) return;
    setChoices(null);
    if (element.value !== choice.value) {
      setValue.call(element, choice.value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
    element.focus();
  };

  return (
    <>
      <select ref={select} {...rest} onMouseDown={toggle} />
      {choices && (
        <div ref={list} role="listbox" aria-label={props["aria-label"] ?? select.current?.labels?.[0]?.textContent?.trim()}
          style={{ position: "absolute", top: place.top, left: place.left, minWidth: Math.max(place.width, 160), zIndex: 1000 }}
          className="max-h-64 overflow-auto rounded border border-slate-300 bg-white py-1 text-sm text-slate-900 shadow-lg">
          {choices.map((choice, index) => (
            <div key={index} role="option" aria-selected={choice.value === current} aria-disabled={choice.disabled || undefined}
              onMouseDown={(event) => event.preventDefault()} onClick={() => choose(choice)}
              className={`cursor-pointer px-3 py-1.5 hover:bg-slate-100 ${choice.value === current ? "font-medium" : ""} ${choice.disabled ? "opacity-50" : ""}`}>
              {choice.label}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
