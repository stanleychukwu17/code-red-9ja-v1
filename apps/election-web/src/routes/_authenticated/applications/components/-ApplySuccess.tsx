import { useNavigate } from "@tanstack/react-router";
import { PageWrapper } from "#/components/Wrappers";
import { PageHeader } from "#/components/Headers";
import { StickyFooter } from "#/components/Footers";
import { Button } from "@repo/ui/components/button";

export function ApplySuccess() {
  const navigate = useNavigate();
  return (
    <PageWrapper>
      <div className="relative w-full flex flex-col justify-between px-4 pt-4 pb-20 h-full">
        <div className="flex flex-col gap-3 w-full py-7">
          <div className="space-y-4">
            <h3 className="text-primary font-bold uppercase">FINAL STAGE</h3>
            <h1 className="text-4xl font-bold text-gray-900 leading-tight">
              Take the polling agent practice test.
            </h1>
            <p className="text-c-80 leading-6">
              Without this your application will not be considered.
            </p>
          </div>
          <div className="absolute bottom-0 left-0">
            {/* The image from the design can be placed here. Using a placeholder or an existing illustration. */}
            <img
              src="https://res.cloudinary.com/dhtcwqsx4/image/upload/v1786222821/Free9ja/senior-agents_v4vdcn.webp"
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
