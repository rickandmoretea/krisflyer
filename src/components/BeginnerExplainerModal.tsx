import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useState } from "react";
import explainerContent from "./explainerContent";

export default function BeginnerExplainerModal({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const [step, setStep] = useState(0);
  const steps = explainerContent.en;

  function next() {
    if (step + 1 < steps.length) {
      setStep(step + 1);
    } else {
      localStorage.setItem("kf.beginnerSeen", "1");
      setOpen(false);
    }
  }

  function prev() {
    setStep(Math.max(0, step - 1));
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) localStorage.setItem("kf.beginnerSeen", "1"); }}>
      <DialogContent className="max-w-md w-full flex flex-col items-center space-y-4">
        <Card className="w-full p-4 space-y-4 text-left">
          <DialogTitle asChild>
            <h2 className="text-xl font-bold mb-2 text-center">{steps[step].headline}</h2>
          </DialogTitle>
          <ul className="list-disc pl-6 space-y-1">
            {steps[step].bullets.map((txt: string, i: number) => <li key={i}>{txt}</li>)}
          </ul>
        </Card>
        <div className="flex w-full justify-between items-center mt-2">
          <Button variant="secondary" disabled={step === 0} onClick={prev}>Back</Button>
          <span className="text-sm font-mono text-zinc-500">{step + 1} / {steps.length}</span>
          <Button onClick={next}>{step + 1 === steps.length ? "Done" : "Next"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
