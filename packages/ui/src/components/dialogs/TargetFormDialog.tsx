import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { useForm } from "@tanstack/react-form";
import { ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/components/accordion";
import * as React from "react";

export type TargetData = {
  pollingUnitAgent: number;
  wardSupervisor: number;
  lgaSupervisor: number;
  stateSupervisor: number;
};

export function TargetFormDialog({
  open,
  onClose,
  defaultValues,
  onSubmit,
  isPending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  defaultValues?: TargetData;
  onSubmit: (values: TargetData) => void;
  isPending?: boolean;
  error?: string | null;
}) {
  const form = useForm({
    defaultValues: defaultValues || {
      pollingUnitAgent: 2,
      wardSupervisor: 2,
      lgaSupervisor: 2,
      stateSupervisor: 1,
    },
    onSubmit: async ({ value }) => {
      onSubmit(value);
    },
  });

  React.useEffect(() => {
    if (open && defaultValues) {
      form.setFieldValue("pollingUnitAgent", defaultValues.pollingUnitAgent);
      form.setFieldValue("wardSupervisor", defaultValues.wardSupervisor);
      form.setFieldValue("lgaSupervisor", defaultValues.lgaSupervisor);
      form.setFieldValue("stateSupervisor", defaultValues.stateSupervisor);
    }
  }, [open, defaultValues]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[520px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-visible">
        <DialogHeader title="Party Agent Acquisition Target" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogPadding className="space-y-6 pb-6 pt-2">
            <p className="text-c-50 leading-[22px]">
              Election Agents are needed to ensure parties get live updates and
              real-time coalition of final results.
            </p>

            {error && (
              <div className="p-3 text-[14px] font-medium text-red-600 bg-red-50 rounded-xl">
                {error}
              </div>
            )}

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="explanation" className="border-none">
                <AccordionTrigger className="flex items-center justify-between px-4 py-4 bg-purple/10 rounded-xl hover:no-underline [&[data-state=open]]:rounded-b-none">
                  <span className="text-c-90 font-medium text-[15px]">
                    Explanation
                  </span>
                </AccordionTrigger>
                <AccordionContent className="bg-purple/10 px-4 pb-4 rounded-b-xl">
                  {/* Using a placeholder for the explanation content based on the screenshot */}
                  <div className="aspect-[16/9] w-full bg-black/5 rounded-lg flex items-center justify-center overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2000&auto=format&fit=crop"
                      alt="Explanation Video Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="space-y-4">
              {[
                {
                  name: "pollingUnitAgent",
                  label: "Polling Agent per polling unit",
                },
                {
                  name: "wardSupervisor",
                  label: "Ward Supervisor per ward",
                },
                { name: "lgaSupervisor", label: "LGA Supervisor per lga" },
                {
                  name: "stateSupervisor",
                  label: "State Supervisor per state",
                },
              ].map((item) => (
                <form.Field
                  key={item.name}
                  name={item.name as keyof TargetData}
                >
                  {(field) => (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-c-90 font-medium text-[15px]">
                        {item.label}
                      </span>
                      <Input
                        type="number"
                        value={field.state.value as number}
                        onChange={(e) =>
                          field.handleChange(Number(e.target.value))
                        }
                        className="w-[100px] md:h-10"
                      />
                    </div>
                  )}
                </form.Field>
              ))}
            </div>
          </DialogPadding>

          <DialogFooter>
            <form.Subscribe
              selector={(state) => [state.canSubmit]}
              children={([canSubmit]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || isPending}
                  loading={isPending}
                  variant="secondary"
                  size="3xl"
                >
                  Save changes
                </Button>
              )}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
