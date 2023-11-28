/*
Copyright (c) 2014, Vladimir Agafonkin

SunCalc is a JavaScript library for calculating sun/moon position and light phases.
https://github.com/mourner/suncalc

All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the following conditions are met:

   1. Redistributions of source code must retain the above copyright notice, this list of
      conditions and the following disclaimer.

   2. Redistributions in binary form must reproduce the above copyright notice, this list
      of conditions and the following disclaimer in the documentation and/or other materials
      provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*
 * The following version has been modified to pare down the code to the bare essence of
 * what's required to evaluate the sun position. There were a couple cases where arcsin
 * outside the shader was immediately followed by sine inside the shader. I optimized
 * this heavily, though the real culprit for poor precision in the shader was the timing.
 * The solution was simple: to move everything possible *outside* the shader, hence the
 * following code.
 */
const PI = Math.PI;
const sin = Math.sin;
const cos = Math.cos;
const atan = Math.atan2;
const rad = PI / 180;
const e = rad * 23.4397; // obliquity of the Earth

function rightAscension(l) {
  return atan(sin(l) * cos(e), cos(l));
}
function sineDeclination(l) {
  return sin(e) * sin(l);
}
function solarMeanAnomaly(d) {
  return rad * (357.5291 + 0.98560028 * d);
}
function eclipticLongitude(M) {
  const C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M)); // equation of center
  const P = rad * 102.9372; // perihelion of the Earth
  return M + C + P + PI;
}
export function sunCoords(d) {
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  const sinDec = sineDeclination(L);
  return {
    sinDec,
    cosDec: Math.sqrt(Math.max(0, 1 - sinDec * sinDec)),
    ra: rightAscension(L),
  };
}
const dayMs = 1000 * 60 * 60 * 24;
const J1970 = 2440588;
const J2000 = 2451545;

export function toJulian(date) {
  return date.valueOf() / dayMs - 0.5 + J1970;
}

export function toDays(date) {
  return toJulian(date) - J2000;
}
