import { getLocalBoundary } from "../../server/local-boundary";
import { accessMode } from "../../server/hosted-config";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function PairPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (accessMode() === "hosted") redirect("/signin");
  const { error } = await searchParams;
  return (
    <div className="narrow-shell form-card">
      <h1>Pair this local browser</h1>
      <p>
        Enter the server-start secret shown only in your local launch terminal.
        This admits one local session; it does not verify legal identity. Use a
        trusted OS account and browser. Do not expose this prototype through
        tunnels, forwarding or shared hosting.
      </p>
      {error ? (
        <p role="alert">
          Pairing failed. Reload and use the local terminal secret.
        </p>
      ) : null}
      <form action="/access/pair" method="post">
        <input
          type="hidden"
          name="bootstrap"
          value={getLocalBoundary().bootstrap()}
        />
        <label htmlFor="pairing-secret">Local pairing secret</label>
        <input
          id="pairing-secret"
          name="secret"
          type="password"
          autoComplete="off"
          required
        />
        <button type="submit">Pair browser</button>
      </form>
    </div>
  );
}
