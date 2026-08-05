import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@repo/ui/components/button";
import { FormInput } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { AuthWrapper } from "./_components/-auth-wrapper";
import { FormError } from "./_components/-form-error";
import { getPageHeader } from "#/lib/shared/meta";
import {
  checkIfRefreshTokenInCookie,
  verifySecurityQuestions,
} from "#/lib/server/auth/auth";
import { APP_URL } from "#/lib/config";
import { useAppDispatch } from "#/redux/hooks";
import { updateOnboardingData } from "#/redux/slice/authSlice";

const SECURITY_QUESTIONS = [
  { id: "1", question: "What is your father's first name?" },
  { id: "2", question: "What is your mother's first name?" },
  { id: "3", question: "What state is your father from?" },
  { id: "4", question: "What state is your mother from?" },
];

export const Route = createFileRoute("/auth/security-questions")({
  beforeLoad: async () => {
    const isLoggedIn = await checkIfRefreshTokenInCookie({});
    if (isLoggedIn.status === "success") {
      throw redirect({ to: APP_URL.home });
    }
  },

  validateSearch: (search) => ({
    flow: (search.flow as string) || "forgot-password",
    nin: (search.nin as string) || "",
  }),

  head: () =>
    getPageHeader({ title: "Verify your identity", robotsAllowed: "no" }),

  component: RouteComponent,
});

type FormValues = {
  nin: string;
  question1: string;
  answer1: string;
  question2: string;
  answer2: string;
};

function RouteComponent() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      nin: "",
      question1: "",
      answer1: "",
      question2: "",
      answer2: "",
    },
  });

  const question1 = watch("question1");
  const question2 = watch("question2");

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    if (!values.question1 || !values.question2) {
      setServerError("Please select both security questions.");
      return;
    }
    if (values.question1 === values.question2) {
      setServerError("Please choose two different security questions.");
      return;
    }

    const result = await verifySecurityQuestions({
      data: {
        nin: values.nin,
        question1: Number(values.question1),
        answer1: values.answer1,
        question2: Number(values.question2),
        answer2: values.answer2,
      },
    });

    if (result.success) {
      dispatch(
        updateOnboardingData({
          changePasswordId: result.data?.changePasswordId,
          changeUserFid: result.data?.userFid,
        }),
      );
      navigate({ to: APP_URL.auth.forgotPassword });
    } else {
      setServerError(
        result.message || "Verification failed. Check your answers.",
      );
    }
  };

  return (
    <AuthWrapper type="forgot-password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormError message={serverError} />

        <FormInput
          id="nin-input"
          placeholder="NIN (11 digits)"
          inputMode="numeric"
          maxLength={11}
          {...register("nin", { required: true })}
          onChange={(e) =>
            setValue("nin", e.target.value.replace(/[^0-9]/g, "").slice(0, 11))
          }
        />

        {/* Question 1 */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-c-70 mx-2">
            Security question 1
          </label>
          <Select
            value={question1}
            onValueChange={(v) => setValue("question1", v)}
          >
            <SelectTrigger id="sq1-trigger" className="w-full text-[17px]">
              <SelectValue placeholder="Select a question" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Questions</SelectLabel>
                {SECURITY_QUESTIONS.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.question}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <FormInput
          id="sa1-input"
          placeholder="Your answer"
          {...register("answer1", { required: true })}
        />

        {/* Question 2 */}
        <div className="flex flex-col gap-1 mt-2">
          <label className="text-sm font-medium text-c-70 mx-2">
            Security question 2
          </label>
          <Select
            value={question2}
            onValueChange={(v) => setValue("question2", v)}
          >
            <SelectTrigger id="sq2-trigger" className="w-full text-[17px]">
              <SelectValue placeholder="Select a question" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Questions</SelectLabel>
                {SECURITY_QUESTIONS.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.question}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <FormInput
          id="sa2-input"
          placeholder="Your answer"
          {...register("answer2", { required: true })}
        />

        <Button
          type="submit"
          variant="secondary"
          loading={isSubmitting}
          className="h-14 w-full rounded-[18px] font-bold mt-6"
        >
          Verify identity
        </Button>
      </form>
    </AuthWrapper>
  );
}
