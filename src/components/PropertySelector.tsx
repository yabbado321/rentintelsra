import { Plus, ChevronDown, Building2, Trash2, Pencil, Check, X } from "lucide-react";
import { useState } from "react";
import { usePropertyStore, useActiveProperty } from "@/lib/propertyStore";

/**
 * Global property dropdown that sits above every calculator. Switching the
 * active property instantly re-renders every calculator wired into
 * `useSharedField` / `useActiveProperty`.
 */
export default function PropertySelector() {
  const properties = usePropertyStore((s) => s.properties);
  const setActive = usePropertyStore((s) => s.setActiveProperty);
  const addProperty = usePropertyStore((s) => s.addProperty);
  const removeProperty = usePropertyStore((s) => s.removeProperty);
  const rename = usePropertyStore((s) => s.renameActiveProperty);
  const active = useActiveProperty();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(active.address);

  const startEdit = () => { setDraft(active.address); setEditing(true); };
  const commit = () => { if (draft.trim()) rename(draft.trim()); setEditing(false); };

  return (
    <div className="panel flex flex-wrap items-center gap-3">
      <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground shrink-0">
        <Building2 size={18} />
      </div>

      <div className="flex-1 min-w-[220px]">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Active property</div>
        {editing ? (
          <div className="flex gap-1.5 items-center">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
              className="input-field font-semibold py-1.5"
            />
            <button onClick={commit} className="p-1.5 rounded-md hover:bg-secondary text-success" aria-label="Save name"><Check size={16} /></button>
            <button onClick={() => setEditing(false)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground" aria-label="Cancel rename"><X size={16} /></button>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-secondary/40 hover:bg-secondary border border-border/60 text-left"
              aria-haspopup="listbox"
              aria-expanded={open}
            >
              <span className="font-semibold truncate">{active.address}</span>
              <ChevronDown size={16} className={`transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
              <>
                <button className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} aria-label="Close menu" tabIndex={-1} />
                <ul role="listbox" className="absolute z-20 mt-1.5 w-full max-h-72 overflow-auto rounded-lg border border-border bg-popover shadow-elegant">
                  {properties.map((p) => (
                    <li key={p.id}>
                      <div className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/60 ${p.id === active.id ? "bg-secondary/40" : ""}`}>
                        <button
                          onClick={() => { setActive(p.id); setOpen(false); }}
                          className="flex-1 text-left truncate"
                          role="option"
                          aria-selected={p.id === active.id}
                        >
                          <div className="font-medium truncate">{p.address}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            ${p.purchasePrice.toLocaleString()} · ${p.grossRent}/mo
                          </div>
                        </button>
                        {properties.length > 1 && (
                          <button
                            onClick={() => removeProperty(p.id)}
                            className="p-1 rounded text-destructive hover:bg-destructive/10"
                            aria-label={`Delete ${p.address}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {!editing && (
        <button onClick={startEdit} className="btn-ghost text-xs" aria-label="Rename property">
          <Pencil size={13} /> Rename
        </button>
      )}
      <button
        onClick={() => { addProperty(); setOpen(false); }}
        className="text-xs font-semibold px-3 py-2 rounded-lg gradient-primary text-primary-foreground inline-flex items-center gap-1.5 shadow-elegant"
      >
        <Plus size={14} /> Add New Property
      </button>
    </div>
  );
}
