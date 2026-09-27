/** Test-launch output never transports runtime pairing or session/challenge data. */
export const createE2ETerminalSink = (
  write,
  capturePairing,
  onRedaction = () => {},
) => {
  let pending = "";
  const line = (value) => {
    if (value.includes("Local pairing secret")) {
      const secret = /terminal only\): ([a-f0-9]{64})/.exec(value)?.[1];
      if (secret) capturePairing(secret);
      return;
    }
    // All runtime boundary tokens are 256-bit hexadecimal. Buffering whole
    // lines prevents chunk boundaries from defeating redaction on either pipe.
    const protectedValue = value.replace(/\b[a-f0-9]{64}\b/gi, () => {
      onRedaction();
      return "[redacted runtime token/digest]";
    });
    write(protectedValue + "\n");
  };
  return {
    push(chunk) {
      pending += String(chunk);
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() ?? "";
      for (const value of lines) line(value);
    },
    end() {
      if (pending) line(pending);
      pending = "";
    },
  };
};
