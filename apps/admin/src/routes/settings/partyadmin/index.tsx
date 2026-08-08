import React, { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { EarningsAllocationDialog } from "#/components/dialogs/EarningsAllocationDialog";
import { SlotCostDialog } from "#/components/dialogs/SlotCostDialog";
import { TestRequirementsDialog } from "#/components/dialogs/TestRequirementsDialog";
import { LiveVotersReferredDialog } from "#/components/dialogs/LiveVotersReferredDialog";
import { TargetUpdatesCountDialog } from "#/components/dialogs/TargetUpdatesCountDialog";

export const Route = createFileRoute("/settings/partyadmin/")({
  component: RouteComponent,
});

function SettingsHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="py-5 space-y-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium text-c-50 pb-2 border-b border-border">
        {title}
      </h3>
      <div className="">{children}</div>
    </div>
  );
}

interface SettingsTileProps {
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
}

function SettingsTile({
  title,
  description,
  buttonText,
  onClick,
}: SettingsTileProps) {
  return (
    <div className="flex py-3">
      <div className="w-full space-y-1.5">
        <h3 className="text-c-90">{title}</h3>
        <p className="text-sm* text-muted-foreground">{description}</p>
      </div>
      <Button
        variant="outline"
        size="lg"
        className="px-6 py-1"
        onClick={onClick}
      >
        {buttonText}
      </Button>
    </div>
  );
}

type SelectedRole = {
  key: string;
  name: string;
} | null;

function RouteComponent() {
  const [selectedRole, setSelectedRole] = useState<SelectedRole>(null);
  const [selectedTestRole, setSelectedTestRole] = useState<SelectedRole>(null);
  const [isSlotCostOpen, setIsSlotCostOpen] = useState(false);
  const [isLiveVotersReferredOpen, setIsLiveVotersReferredOpen] = useState(false);
  const [isTargetUpdatesCountOpen, setIsTargetUpdatesCountOpen] = useState(false);

  const handleEdit = (key: string, name: string) => {
    setSelectedRole({ key, name });
  };

  const handleEditTestRequirements = (key: string, name: string) => {
    setSelectedTestRole({ key, name });
  };

  return (
    <div className="flex items-center justify-center">
      <main className="px-4 max-w-[560px] w-full space-y-8 md:mr-32">
        <SettingsHeader
          title="Partyadmins"
          description="Manage party admin settings"
        />

        <SettingsSection title="General">
          <SettingsTile
            title="Slots price"
            description="Cost per slot purchase."
            buttonText="Edit"
            onClick={() => setIsSlotCostOpen(true)}
          />
          <SettingsTile
            title="Live Voters Referred"
            description="Target live voters for agents to refer."
            buttonText="Edit"
            onClick={() => setIsLiveVotersReferredOpen(true)}
          />
          <SettingsTile
            title="Target Updates Count"
            description="Target number of updates required from agents."
            buttonText="Edit"
            onClick={() => setIsTargetUpdatesCountOpen(true)}
          />
        </SettingsSection>
        <SettingsSection title="Earnings Allocation">
          <SettingsTile
            title="Polling Agents"
            description="Earnings percentage allocation."
            buttonText="Edit"
            onClick={() =>
              handleEdit("earnings_allocation_polling_agent", "Polling Agent")
            }
          />
          <SettingsTile
            title="Ward Supervisors"
            description="Earnings percentage allocation."
            buttonText="Edit"
            onClick={() =>
              handleEdit(
                "earnings_allocation_ward_supervisor",
                "Ward Supervisor",
              )
            }
          />
          <SettingsTile
            title="LGA Supervisors"
            description="Earnings percentage allocation."
            buttonText="Edit"
            onClick={() =>
              handleEdit("earnings_allocation_lga_supervisor", "LGA Supervisor")
            }
          />
          <SettingsTile
            title="State Supervisors"
            description="Earnings percentage allocation."
            buttonText="Edit"
            onClick={() =>
              handleEdit(
                "earnings_allocation_state_supervisor",
                "State Supervisor",
              )
            }
          />
        </SettingsSection>
        <SettingsSection title="Test Requirements">
          <SettingsTile
            title="Polling Agents"
            description="Election day practice tests settings."
            buttonText="Edit"
            onClick={() =>
              handleEditTestRequirements(
                "test_requirements_polling_agent",
                "Polling Agent",
              )
            }
          />
          <SettingsTile
            title="Ward Supervisors"
            description="Election day practice tests settings."
            buttonText="Edit"
            onClick={() =>
              handleEditTestRequirements(
                "test_requirements_ward_supervisor",
                "Ward Supervisor",
              )
            }
          />
          <SettingsTile
            title="LGA Supervisors"
            description="Election day practice tests settings."
            buttonText="Edit"
            onClick={() =>
              handleEditTestRequirements(
                "test_requirements_lga_supervisor",
                "LGA Supervisor",
              )
            }
          />
          <SettingsTile
            title="State Supervisors"
            description="Election day practice tests settings."
            buttonText="Edit"
            onClick={() =>
              handleEditTestRequirements(
                "test_requirements_state_supervisor",
                "State Supervisor",
              )
            }
          />
        </SettingsSection>
      </main>

      {selectedRole && (
        <EarningsAllocationDialog
          settingKey={selectedRole.key}
          roleName={selectedRole.name}
          open={!!selectedRole}
          onClose={() => setSelectedRole(null)}
        />
      )}

      {selectedTestRole && (
        <TestRequirementsDialog
          settingKey={selectedTestRole.key}
          roleName={selectedTestRole.name}
          open={!!selectedTestRole}
          onClose={() => setSelectedTestRole(null)}
        />
      )}

      <SlotCostDialog
        open={isSlotCostOpen}
        onClose={() => setIsSlotCostOpen(false)}
      />

      <LiveVotersReferredDialog
        open={isLiveVotersReferredOpen}
        onClose={() => setIsLiveVotersReferredOpen(false)}
      />

      <TargetUpdatesCountDialog
        open={isTargetUpdatesCountOpen}
        onClose={() => setIsTargetUpdatesCountOpen(false)}
      />
    </div>
  );
}
