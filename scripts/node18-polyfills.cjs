'use strict';

if (!Array.prototype.toReversed) {
  Object.defineProperty(Array.prototype, 'toReversed', {
    configurable: true,
    writable: true,
    value: function toReversed() {
      if (this == null) {
        throw new TypeError('Array.prototype.toReversed called on null or undefined');
      }

      const source = Object(this);
      const length = Math.min(
        Math.max(Math.trunc(Number(source.length)) || 0, 0),
        Number.MAX_SAFE_INTEGER
      );
      const result = new Array(length);

      for (let index = 0; index < length; index += 1) {
        result[index] = source[length - index - 1];
      }

      return result;
    },
  });
}
