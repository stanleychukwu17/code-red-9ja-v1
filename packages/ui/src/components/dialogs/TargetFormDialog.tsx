import { useEffect } from "react";
import { Button } from "@repo/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogPadding } from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { useForm } from "@tanstack/react-form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@repo/ui/components/accordion";
import { useQuery, useMutation } from "@tanstack/react-query";

// Schema representing target quotas for each supervisory/agent tier
export type TargetData = {
  polling_agent: number;
  ward_election_supervisor: number;
  lga_election_supervisor: number;
  state_election_supervisor: number;
};

// Form field configurations and display labels for each hierarchy level
export const TARGET_FIELDS = [
  {
    name: "polling_agent",
    label: "Polling Agent per polling unit",
  },
  {
    name: "ward_election_supervisor",
    label: "Ward Supervisor per ward",
  },
  {
    name: "lga_election_supervisor",
    label: "LGA Supervisor per lga",
  },
  {
    name: "state_election_supervisor",
    label: "State Supervisor per state",
  },
] as const;

// Component props for configuring target fetching, updating, and modal state
export type TargetFormDialogProps = {
  open: boolean;
  onClose: () => void;
  partyId: string | number;
  fetchTargets?: (partyId: string | number) => Promise<TargetData | null>;
  initialTargets?: TargetData | null;
  updateTargets: (partyId: string | number, values: TargetData) => Promise<any>;
  onSuccess?: () => void;
};

export function TargetFormDialog({ open, onClose, partyId, fetchTargets, initialTargets, updateTargets, onSuccess }: TargetFormDialogProps) {
  // Fetch targets via query only if initialTargets was not provided as a prop
  const { data: queriedTargets, isLoading: isQueryLoading } = useQuery({
    queryKey: ["party-agent-targets", partyId],
    queryFn: () => (fetchTargets ? fetchTargets(partyId) : null),
    enabled: open && !!fetchTargets && !initialTargets,
    staleTime: Infinity,
  });

  // Prioritize pre-passed targets to prevent redundant network calls and UI flickering
  const targets = initialTargets ?? queriedTargets;
  const isLoading = !initialTargets && isQueryLoading;

  // Mutation to persist updated agent quotas to the backend
  const mutation = useMutation({
    mutationFn: (values: TargetData) => updateTargets(partyId, values),
    onSuccess: () => {
      onSuccess?.();
    },
  });

  // Form controller managing editable quota counts per administrative tier
  const form = useForm({
    defaultValues: {
      polling_agent: initialTargets?.polling_agent ?? 1,
      ward_election_supervisor: initialTargets?.ward_election_supervisor ?? 1,
      lga_election_supervisor: initialTargets?.lga_election_supervisor ?? 1,
      state_election_supervisor: initialTargets?.state_election_supervisor ?? 1,
    },
    onSubmit: async ({ value }) => {
      mutation.mutate(value);
    },
  });

  // Synchronize form values whenever dialog opens or targets change
  useEffect(() => {
    if (open && targets) {
      form.setFieldValue("polling_agent", targets.polling_agent ?? 1);
      form.setFieldValue("ward_election_supervisor", targets.ward_election_supervisor ?? 1);
      form.setFieldValue("lga_election_supervisor", targets.lga_election_supervisor ?? 1);
      form.setFieldValue("state_election_supervisor", targets.state_election_supervisor ?? 1);
    }
  }, [open, targets]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[520px] p-0 rounded-2xl border-none shadow-2xl overflow-visible">
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

            {mutation.isError && (
              <div className="p-3 text-[14px] font-medium text-red-600 bg-red-50 rounded-xl">
                {(mutation.error as Error)?.message || "An error occurred"}
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
              {TARGET_FIELDS.map((item) => (
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
                        disabled={isLoading || mutation.isPending}
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
                  disabled={!canSubmit || isLoading || mutation.isPending}
                  loading={isLoading || mutation.isPending}
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
