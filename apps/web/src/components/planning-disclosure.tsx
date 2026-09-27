export function PlanningDisclosure() {
  return (
    <aside className="notice" aria-label="Planning estimate limitations">
      <p>Cold-start forecasts are uncalibrated planning estimates.</p>
      <p>
        MEDIUM confidence reflects known/reviewed characterization and profile
        evidence, not demonstrated prediction accuracy.
      </p>
      <p>
        Ranges express percentages of an identified capacity window, not
        purchased-credit cost estimates. Different windows are independent and
        cannot be added or exchanged.
      </p>
      <details>
        <summary>Technical scope and calibration limitations</summary>
        <p>
          T005 has no calibration history. The pre-T006 calibration method
          concern remains unresolved. No historical adjustment is applied to
          these planning estimates. Exact technical quantities use basis points:
          100 bp = one percentage point.
        </p>
      </details>
    </aside>
  );
}
