"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  TerminatorSource: () => TerminatorSource
});
module.exports = __toCommonJS(src_exports);

// src/TerminatorSource.ts
var import_lru_cache = require("lru-cache");

// src/gl.js
function makeShader(gl, type, src) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error("Error compiling shader: " + gl.getShaderInfoLog(shader));
  }
  return shader;
}
var Program = class {
  constructor({ gl, vert, frag }) {
    this.gl = gl;
    const vertShader = makeShader(gl, gl.VERTEX_SHADER, vert);
    const fragShader = makeShader(gl, gl.FRAGMENT_SHADER, frag);
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertShader);
    gl.attachShader(this.program, fragShader);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error("Unable to initialize the shader program");
    }
  }
  use() {
    this.gl.useProgram(this.program);
  }
  getUniformLocations(uniformList) {
    const result = {};
    for (const uniformName of uniformList) {
      result[uniformName] = this.gl.getUniformLocation(
        this.program,
        uniformName
      );
    }
    return result;
  }
  getAttribLocations(attribList) {
    const result = {};
    for (const attrName of attribList) {
      result[attrName] = this.gl.getAttribLocation(this.program, attrName);
    }
    return result;
  }
};
var Texture = class {
  constructor({ gl, width, height, data, format, type, min, mag }) {
    this.gl = gl;
    const isArray = ArrayBuffer.isView(data) || !data;
    this.format = format ?? gl.RGBA;
    this.type = type ?? gl.UNSIGNED_BYTE;
    this.width = isArray ? width : data.width;
    this.height = isArray ? height : data.height;
    this.min = min ?? gl.NEAREST;
    this.mag = mag ?? gl.NEAREST;
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    if (isArray) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        // level
        gl.RGBA,
        this.width,
        this.height,
        0,
        //border
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        data || null
      );
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        // level
        this.format,
        this.format,
        this.type,
        data
      );
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.min);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.mag);
    this.unbind();
  }
  bind() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
  }
  unbind() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }
  subData({ data, xoffset = 0, yoffset = 0, format, type }) {
    const gl = this.gl;
    this.bind();
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      xoffset,
      yoffset,
      format || this.format,
      type || this.type,
      data
    );
    this.unbind();
  }
};
var Buffer2 = class {
  constructor({ gl, data }) {
    this.gl = gl;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
  bind() {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
  }
};

// src/SunCalc.js
var PI = Math.PI;
var sin = Math.sin;
var cos = Math.cos;
var atan = Math.atan2;
var rad = PI / 180;
var e = rad * 23.4397;
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
  const C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 3e-4 * sin(3 * M));
  const P = rad * 102.9372;
  return M + C + P + PI;
}
function sunCoords(d) {
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  const sinDec = sineDeclination(L);
  return {
    sinDec,
    cosDec: Math.sqrt(Math.max(0, 1 - sinDec * sinDec)),
    ra: rightAscension(L)
  };
}
var dayMs = 1e3 * 60 * 60 * 24;
var J1970 = 2440588;
var J2000 = 2451545;
function toJulian(date) {
  return date.valueOf() / dayMs - 0.5 + J1970;
}
function toDays(date) {
  return toJulian(date) - J2000;
}

// src/TerminatorTiler.ts
function tileBounds3857(x, y, z) {
  const res = Math.pow(2, z);
  const MAXEXTENT = 20037508342789244e-9;
  const xmin = MAXEXTENT * (-1 + 2 * x / res);
  const ymin = MAXEXTENT * (1 - 2 * (y + 1) / res);
  const xmax = MAXEXTENT * (-1 + 2 * (x + 1) / res);
  const ymax = MAXEXTENT * (1 - 2 * y / res);
  return [xmin, ymin, xmax, ymax];
}
var TerminatorTiler = class {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext("experimental-webgl", {
      willReadFrequently: true,
      attributes: {
        antialias: false,
        depthStencil: false,
        preserveDrawingBuffer: true
      }
    });
    this.gl = gl;
    this.tileTex = new Texture({
      gl,
      width: this.canvas.width,
      height: this.canvas.width
    });
    this.vertexBuffer = new Buffer2({
      gl,
      data: new Float32Array([-4, -4, 4, -4, 0, 4])
    });
    this.program = new Program({
      gl,
      vert: `precision lowp float;
      attribute vec2 xy;
      void main () {
        gl_Position = vec4(xy, 0, 1);
      }`,
      frag: `precision highp float;
        uniform vec2 resolution, fadeRange;
        uniform vec3 sunCoords;
        uniform vec4 aabb;
        uniform float days, siderealTimeOffset, stepping;
        uniform sampler2D texture;
        
        vec2 toWgs84Rad (vec2 xy) {
          return vec2(xy.x, ${Math.PI / 2} - 2.0 * atan(exp(-xy.y)));
        }
        
        // This function adapted from:
        // (c) 2011-2015, Vladimir Agafonkin
        // SunCalc is a JavaScript library for calculating sun/moon position and light phases.
        // https://github.com/mourner/suncalc
        // sun calculations are based on http://aa.quae.nl/en/reken/zonpositie.html formulas
        float getSunAltitude (float days, vec2 lngLat, vec3 sunCoords, float siderealTimeOffset) {
          float H = siderealTimeOffset + lngLat.x - sunCoords.z;
          return asin(clamp(sin(lngLat.y) * sunCoords.x + cos(lngLat.y) * sunCoords.y * cos(H),-1.0, 1.0));
        }

        float linearstep(float edge0, float edge1, float value) {
          return clamp((value - edge0) / (edge1 - edge0), 0.0, 1.0);
        }

        float smootherstep(float edge0, float edge1, float value) {
          float x = clamp((value - edge0) / (edge1 - edge0), 0.0, 1.0);
          return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
        }
        
        float steppedstep (float x, float d, float fraction) {
          float xd = x / d;
          float param = smootherstep(-1.0, 1.0, 2.0 * (xd - floor(xd - 0.5) - 1.0) / fraction);
          return d * (param + 0.5 + floor(xd - 0.5));
        }
        
        void main () {
          vec2 uv = (gl_FragCoord.xy / resolution);
        
          // Compute the bbbox in EPSG:3857, divided by the radius of the earth (A)
          vec2 xy = aabb.xw + (aabb.zy - aabb.xw) * uv;
        
          // Convert to lon/lat
          vec2 lngLatRad = toWgs84Rad(xy);
        
          // Compute the altitude of the sun (we don't care about the azimuth)
          float altitude = getSunAltitude(days, lngLatRad, sunCoords, siderealTimeOffset);
        
          // Threshold the value and output it to alpha
          const float step = 6.0;
          float angle = altitude * (180.0 / ${Math.PI});
          float withStep = linearstep(fadeRange.x + step * 0.5, fadeRange.y - step * 0.5, steppedstep(angle, step, 1.0 - stepping));

          float smoothed = smootherstep(fadeRange.x * 2.0, fadeRange.y * 2.0, angle);

          gl_FragColor = texture2D(texture, uv) * mix(smoothed, withStep, stepping);
        }`
    });
    this.attribs = this.program.getAttribLocations(["xy"]);
    this.vertexBuffer.bind();
    gl.vertexAttribPointer(this.attribs.xy, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.uniforms = this.program.getUniformLocations([
      "resolution",
      "aabb",
      "sunCoords",
      "days",
      "fadeRange",
      "stepping",
      "texture",
      "siderealTimeOffset"
    ]);
  }
  render({
    x = 0,
    y = 0,
    z = 0,
    date = Date.now(),
    fadeRange = [0, -18],
    texture = null,
    stepping = 0
  }) {
    const gl = this.gl;
    const { width, height } = this.canvas;
    if (texture)
      this.tileTex.subData({ data: texture });
    this.program.use();
    gl.enableVertexAttribArray(this.attribs.xy);
    const days = toDays(date === void 0 ? Date.now() : date);
    const { sinDec, cosDec, ra } = sunCoords(days);
    const siderealTimeOffset = Math.PI / 180 * (280.16 + 360.9856235 * days) % (2 * Math.PI);
    const aabb = tileBounds3857(x, y, z).map((v) => v / 6378137);
    gl.uniform4fv(this.uniforms.aabb, aabb);
    gl.uniform2f(this.uniforms.resolution, width, height);
    gl.uniform3f(this.uniforms.sunCoords, sinDec, cosDec, ra);
    gl.uniform1f(this.uniforms.days, days);
    gl.uniform1f(this.uniforms.siderealTimeOffset, siderealTimeOffset);
    gl.uniform1f(this.uniforms.stepping, stepping);
    const meanRange = 0.5 * (fadeRange[0] + fadeRange[1]);
    const eps = 1e-15;
    gl.uniform2f(
      this.uniforms.fadeRange,
      Math.max(meanRange + eps, fadeRange[0]),
      Math.min(meanRange - eps, fadeRange[1])
    );
    gl.activeTexture(gl.TEXTURE0);
    this.tileTex.bind();
    gl.uniform1i(this.uniforms.texture, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  async getImageBitmap() {
    return await createImageBitmap(this.canvas, {
      imageOrientation: "flipY"
    });
  }
};

// src/TerminatorSource.ts
var TerminatorSource = class {
  type;
  tileSize;
  tiler;
  _fadeRange;
  _date;
  _stepping;
  tileBitmapCache;
  constructor({
    tileSize = 256,
    fadeRange = [12, -12],
    is2x = window.devicePixelRatio > 1,
    fetchTileImageBitmap,
    date,
    stepping = 0
  }) {
    this.type = "custom";
    this.tileSize = tileSize;
    const renderSize = is2x ? 512 : 256;
    const canvas = document.createElement("canvas");
    canvas.width = renderSize;
    canvas.height = renderSize;
    this.tiler = new TerminatorTiler(canvas);
    this._fadeRange = fadeRange;
    this._date = date ?? Date.now();
    this._stepping = stepping;
    this.tileBitmapCache = new import_lru_cache.LRUCache({
      max: 50,
      fetchMethod: fetchTileImageBitmap
    });
  }
  clear() {
    this.tileBitmapCache.clear();
  }
  set fadeRange(value) {
    this._fadeRange = value;
    this.clear();
  }
  set stepping(value) {
    this._stepping = value;
    this.clear();
  }
  set date(value) {
    this._date = value;
    this.clear();
  }
  async loadTile({
    x,
    y,
    z
  }) {
    await this.tiler.render({
      x,
      y,
      z,
      date: this._date,
      fadeRange: this._fadeRange,
      stepping: this._stepping,
      texture: await this.tileBitmapCache.fetch(`${z}/${x}/${y}`)
    });
    return this.tiler.getImageBitmap();
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TerminatorSource
});
