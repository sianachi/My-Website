import { StateField, type Extension } from "@codemirror/state";
import { showTooltip, type Tooltip } from "@codemirror/view";
import { pathFromCmSelection, type JsonSelection } from "./jsonPath";

export function selectionTooltip(
  onEdit: (info: JsonSelection) => void,
): Extension {
  const field = StateField.define<Tooltip | null>({
    create: () => null,
    update(prev, tr) {
      const info = pathFromCmSelection(tr.state);
      if (!info) return null;
      if (prev && prev.pos === info.from && prev.end === info.to) return prev;
      return {
        pos: info.from,
        end: info.to,
        above: true,
        strictSide: true,
        arrow: false,
        create() {
          const dom = document.createElement("div");
          dom.className = "cm-tooltip-edit-host";
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "core-tooltip-edit";
          btn.textContent = "Edit as form →";
          btn.addEventListener("mousedown", (e) => {
            e.preventDefault();
          });
          btn.addEventListener("click", () => onEdit(info));
          dom.appendChild(btn);
          return { dom };
        },
      };
    },
    provide: (f) => showTooltip.from(f),
  });
  return [field];
}
