/* Fallback orbital elements — refreshed 2026-10-26 via tools/refresh-tles.js.
 * Used only when live CelesTrak data is unreachable at runtime. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.TLE_FALLBACK = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  return [
  {
    "name": "NAVSTAR 79 (USA 304)",
    "l1": "1 45854U 20041A   26298.49166758 -.00000068  00000+0  00000+0 0  9999",
    "l2": "2 45854  56.7456  23.8998 0069594 207.2315 243.9236  2.00572446 46653"
  },
  {
    "name": "IRIDIUM 140",
    "l1": "1 43252U 18030D   26299.23050253  .00000006  00000+0 -49194-5 0  9994",
    "l2": "2 43252  86.3975 235.6189 0001997  83.7657 276.3766 14.34217466448979"
  },
  {
    "name": "VANGUARD 1",
    "l1": "1 00005U 58002B   26299.25219049  .00000355  00000+0  46474-3 0  9990",
    "l2": "2 00005  34.2454 269.8003 1838957   9.5028 353.5925 10.86084208457535"
  },
  {
    "name": "NOAA 19",
    "l1": "1 33591U 09005A   26299.28849003  .00000019  00000+0  33678-4 0  9997",
    "l2": "2 33591  98.9395  10.1697 0014056  23.6067 336.5747 14.13490960913005"
  }
];
});
