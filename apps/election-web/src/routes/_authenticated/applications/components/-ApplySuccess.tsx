import { useNavigate } from "@tanstack/react-router";
import { PageWrapper } from "#/components/Wrappers";
import { PageHeader } from "#/components/Headers";
import { StickyFooter } from "#/components/Footers";
import { Button } from "@repo/ui/components/button";

export function ApplySuccess() {
  const navigate = useNavigate();
  return (
    <PageWrapper>
      <PageHeader />
      <div className="w-full flex flex-col justify-between px-4 pt-4 pb-20 min-h-screen">
        <div className="flex flex-col gap-3 w-full">
          <div className="space-y-4">
            <h3 className="text-emerald-700 font-bold uppercase tracking-wider text-sm">
              FINAL STAGE
            </h3>
            <h1 className="text-4xl font-bold text-gray-900 leading-tight">
              Take the polling agent practice test.
            </h1>
            <p className="text-gray-600 text-lg">
              Without this your application will not be considered.
            </p>
          </div>
          <div className="mt-8 flex justify-center">
            {/* The image from the design can be placed here. Using a placeholder or an existing illustration. */}
            <img 
              src="https://res.cloudinary.com/dhtcwqsx4/image/upload/v1782886473/Free9ja/Boss_Agent_wqnxcf.png" 
              alt="Practice Test Illustration" 
              className="w-full max-w-sm"
            />
          </div>
        </div>
      </div>
      <StickyFooter>
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          onClick={() => navigate({ to: "/practice" })}
        >
          Take Practice Test
        </Button>
      </StickyFooter>
    </PageWrapper>
  );
}
