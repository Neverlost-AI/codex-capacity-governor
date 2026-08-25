import { useFormStatus } from "react-dom";

export const FieldError = ({
  errors,
  id,
}: {
  errors?: string[];
  id: string;
}) => {
  if (!errors?.length) return null;
  return (
    <p className="field-error" id={id} role="alert">
      {errors[0]}
    </p>
  );
};

export const SubmitButton = ({ children }: { children: string }) => {
  const { pending } = useFormStatus();
  return (
    <button className="button" disabled={pending} type="submit">
      {pending ? "Saving…" : children}
    </button>
  );
};
