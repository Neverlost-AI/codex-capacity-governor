import { redirect } from "next/navigation";
import { accessMode, hostedConfiguration } from "../../server/hosted-config";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (accessMode() !== "hosted") redirect("/pair");
  const config = hostedConfiguration();
  const { error } = await searchParams;
  return (
    <div className="narrow-shell form-card">
      <h1>Private Capacity Governor</h1>
      <p>
        Sign in with the approved founder identity to access saved planning and
        outcome evidence. Access is not open to visitors.
      </p>
      {error ? (
        <p role="alert">
          Sign-in could not be completed. Check the approved account and try
          again.
        </p>
      ) : null}
      {config.testMode ? (
        <form action="/access/test-signin" method="post">
          <label htmlFor="test-identity">Local test identity</label>
          <select id="test-identity" name="identity">
            <option value="founder">Founder test identity</option>
            <option value="secondary">Second test identity</option>
          </select>
          <label htmlFor="test-secret">Local test access secret</label>
          <input
            id="test-secret"
            name="testSecret"
            type="password"
            required
            autoComplete="off"
          />
          <button type="submit">Enter local test session</button>
        </form>
      ) : (
        <a className="button" href="/access/google/start">
          Sign in with Google
        </a>
      )}
    </div>
  );
}
