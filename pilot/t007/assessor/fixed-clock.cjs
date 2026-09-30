// Assessor-only process fixture. The challenge starter contains no clock or solution code.
const NativeDate = Date;
const instant = NativeDate.parse("2024-01-15T12:00:00.000Z");

class FixedDate extends NativeDate {
  constructor(...arguments_) {
    super(...(arguments_.length === 0 ? [instant] : arguments_));
  }

  static now() {
    return instant;
  }
}

globalThis.Date = FixedDate;
