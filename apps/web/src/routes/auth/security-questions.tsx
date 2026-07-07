import { useState, useEffect } from "react";
import { Button } from "@repo/ui/components/button";
import { FormInput } from "@repo/ui/components/input";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { Shield } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateOnboardingData } from "@/redux/slice/authSlice";
import { checkIfRefreshTokenInCookie, verifySecurityQuestions } from "@/lib/server/auth/auth";
import { OnboardingHeader, OnboardingWrapper } from "./_components/-onboarding";
import { FormError } from "./_components/-form-error";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { APP_URL } from "@/lib/config";
import { getPageHeader } from "@/lib/shared/meta";

export const Route = createFileRoute('/auth/security-questions')({
  // Check if user is already authenticated, if so redirect to home page
  beforeLoad: async () => {
    const isAuthed = await checkIfRefreshTokenInCookie({});
    if (isAuthed.success) {
      throw redirect({ to: APP_URL.home });
    }
  },
  head: () => getPageHeader({ title: "Answer security questions", robotsAllowed: "no" }),
  validateSearch: (search) => {
    const flow = search.flow

    return {
      flow: typeof flow === "string" && (flow === "signup" || flow === "forgot-password" || flow === "login") ? flow : "signup",
    };
  },
  component: RouteComponent,
})

const securityQuestions = [
  { id: "1", question: "What is your father's first name?" },
  { id: "2", question: "What is your mother's first name?" },
  { id: "3", question: "What state is your father from?" },
  { id: "4", question: "What state is your mother from?" },
];

function RouteComponent() {
  const onboardingId = useAppSelector((state) => state.auth.onboardingData?.id);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { flow } = Route.useSearch();
  const [serverError, setServerError] = useState<string | null>(null);

  // redirect if flow is signup and there is no onboardingID
  useEffect(() => {
    if (flow == "signup" && !onboardingId) {
      navigate({
        to: APP_URL.auth.signup,
        search: { flow: "signup" },
      });
    }
  }, [flow, onboardingId, navigate])

  const form = useForm({
    defaultValues: {
      nin: "",
      securityQuestion1: "",
      securityAnswer1: "",
      securityQuestion2: "",
      securityAnswer2: "",
    },
    onSubmit: async ({ value }) => {
      setServerError(null);

      if (value.securityQuestion1 === value.securityQuestion2) {
        setServerError("Please choose different security questions.");
        return;
      }

      if (flow === "signup") {
        dispatch(updateOnboardingData({
          question1: Number(value.securityQuestion1),
          answer1: value.securityAnswer1,
          question2: Number(value.securityQuestion2),
          answer2: value.securityAnswer2,
        }));
        navigate({ to: APP_URL.auth.onboarding });
        return;
      } else if (flow === "login" || flow === "forgot-password") {
        try {
          const res = await verifySecurityQuestions({
            data: {
              nin: value.nin,
              question1: Number(value.securityQuestion1),
              answer1: value.securityAnswer1,
              question2: Number(value.securityQuestion2),
              answer2: value.securityAnswer2,
            }
          });

          if (!res.success) {
            setServerError(res.message || "Failed to verify security questions");
            return;
          }

          dispatch(updateOnboardingData({ changePasswordId: res.data.change_password_id, changeUserFid: res.data.user_fid }));
          navigate({ to: APP_URL.auth.forgotPassword });
        } catch (error) {
          setServerError((error as Error).message);
        }
      }

    },
  });

  // go back to previous page
  const goBack = () => {
    if (flow === "signup") {
      navigate({ to: APP_URL.auth.signup });
    } else {
      navigate({ to: APP_URL.auth.login });
    }
  };

  return (
    <OnboardingWrapper>
      <OnboardingHeader
        icon={<Shield className="size-6 text-primary" strokeWidth={1.8} />}
        title={"Security Questions"}
        subtitle={`Please answer the following security questions`}
        onBack={goBack}
      />

      <FormError message={serverError} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="flex flex-col gap-4"
      >
        {(flow === "forgot-password" || flow === "login") && (
          <form.Field
            name="nin"
            validators={{
              onChange: ({ value }) =>
                !value ? "NIN is required"
                  : value.length !== 11 ? "NIN must be 11 digits"
                    : undefined,
            }}
            children={(field) => (
              <FormInput
                placeholder="Enter your NIN"
                value={field.state.value}
                inputMode="numeric"
                maxLength={11}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))}
                errorMsg={
                  field.state.meta.isTouched && field.state.meta.errors.length
                    ? (field.state.meta.errors[0] as string)
                    : undefined
                }
              />
            )}
          />
        )}

        <div className="flex flex-col gap-4 mt-5">
          <form.Field
            name="securityQuestion1"
            validators={{
              onChange: ({ value }) => (!value ? "Security question 1 is required" : undefined),
            }}
            children={(field) => (
              <div className="flex flex-col gap-1 mt-2">
                <label className="text-md font-medium text-c-70 mb-1 mx-2">Security Question 1</label>
                <Select
                  onValueChange={(val) => {
                    field.handleChange(val);
                  }}
                  defaultValue={field.state.value}
                >
                  <SelectTrigger className="w-full text-[17px]">
                    <SelectValue placeholder="Select a security question" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Questions</SelectLabel>
                      {securityQuestions.map((question) => (
                        <SelectItem key={question.id} value={question.id}>
                          {question.question}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {field.state.meta.isTouched && field.state.meta.errors.length ? (
                  <span className="text-xs text-destructive">
                    {field.state.meta.errors[0] as string}
                  </span>
                ) : null}
              </div>
            )}
          />

          <form.Field
            name="securityAnswer1"
            validators={{
              onChange: ({ value }) => (!value ? "Answer is required" : undefined),
            }}
            children={(field) => (
              <FormInput
                placeholder="Enter your answer"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                errorMsg={
                  field.state.meta.isTouched && field.state.meta.errors.length
                    ? (field.state.meta.errors[0] as string)
                    : undefined
                }
              />
            )}
          />

          <form.Field
            name="securityQuestion2"
            validators={{
              onChange: ({ value }) => (!value ? "Security question 2 is required" : undefined),
            }}
            children={(field) => (
              <div className="flex flex-col gap-1 mt-5">
                <label className="text-md font-medium text-c-70 mb-1 mx-2">Security Question 2</label>
                <Select
                  onValueChange={(val) => {
                    field.handleChange(val);
                  }}
                  defaultValue={field.state.value}
                >
                  <SelectTrigger className="w-full text-[17px]">
                    <SelectValue placeholder="Select a security question" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Questions</SelectLabel>
                      {securityQuestions.map((question) => (
                        <SelectItem key={question.id} value={question.id}>
                          {question.question}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {field.state.meta.isTouched && field.state.meta.errors.length ? (
                  <span className="text-xs text-destructive">
                    {field.state.meta.errors[0] as string}
                  </span>
                ) : null}
              </div>
            )}
          />

          <form.Field
            name="securityAnswer2"
            validators={{
              onChange: ({ value }) => (!value ? "Answer is required" : undefined),
            }}
            children={(field) => (
              <FormInput
                placeholder="Enter your answer"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                errorMsg={
                  field.state.meta.isTouched && field.state.meta.errors.length
                    ? (field.state.meta.errors[0] as string)
                    : undefined
                }
              />
            )}
          />
        </div>

        <div className="pt-10 md:pt-12">
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                variant="secondary"
                disabled={!canSubmit}
                loading={isSubmitting}
                className="h-14 w-full rounded-[18px] font-bold mb-4"
              >
                Continue
              </Button>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            className="h-14 w-full rounded-[18px] font-bold"
          >
            Go back
          </Button>
        </div>
      </form>
    </OnboardingWrapper>
  );
}
