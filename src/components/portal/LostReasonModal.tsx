import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const QUICK_REASONS = [
  "Signed with another agency",
  "Family decided not to proceed",
  "Player stopped playing",
  "Lost contact with family",
  "Not the right fit",
  "Club advised against",
];

interface Props {
  lead: any;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

export default function LostReasonModal({ lead, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    const reason = [selected, freeText.trim()].filter(Boolean).join(" — ");
    if (!reason) return;
    setSaving(true);
    try {
      await onConfirm(reason);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark "{lead?.first_name} {lead?.last_name}" as lost</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Reason</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelected(r)}
                  className={`text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                    selected === r
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Additional context (optional)</Label>
            <Textarea rows={2} value={freeText} onChange={(e) => setFreeText(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={saving || (!selected && !freeText.trim())}>
            {saving ? "Saving…" : "Mark as lost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
