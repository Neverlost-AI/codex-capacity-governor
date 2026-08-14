export interface FormActionState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
}

export const initialFormState: FormActionState = { status: "idle" };
