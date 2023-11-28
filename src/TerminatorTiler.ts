// @ts-nocheck
import { Buffer, Program, Texture } from './gl.js';
import { sunCoords, toDays } from './SunCalc.js';

function tileBounds3857(
  x: number,
  y: number,
  z: number
): [number, number, number, number] {
  const res: number = Math.pow(2, z);
  const MAXEXTENT: number = 20037508.342789244;
  const xmin: number = MAXEXTENT * (-1 + (2 * x) / res);
  const ymin: number = MAXEXTENT * (1 - (2 * (y + 1)) / res);
  const xmax: number = MAXEXTENT * (-1 + (2 * (x + 1)) / res);
  const ymax: number = MAXEXTENT * (1 - (2 * y) / res);
  return [xmin, ymin, xmax, ymax];
}

type RenderOptions = {
  x?: number;
  y?: number;
  z?: number;
  date?: number;
  fadeRange?: [number, number];
  texture?: WebGLTexture;
  stepping?: number;
};

export default class TerminatorTiler {
  constructor(canvas) {
    this.canvas = canvas;

    const gl = canvas.getContext('experimental-webgl', {
      willReadFrequently: true,
      attributes: {
        antialias: false,
        depthStencil: false,
        preserveDrawingBuffer: true,
      },
    });
    this.gl = gl;

    this.tileTex = new Texture({
      gl,
      width: this.canvas.width,
      height: this.canvas.width,
    });

    this.vertexBuffer = new Buffer({
      gl,
      data: new Float32Array([-4, -4, 4, -4, 0, 4]),
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
        }`,
    });

    this.attribs = this.program.getAttribLocations(['xy']);
    this.vertexBuffer.bind();
    gl.vertexAttribPointer(this.attribs.xy, 2, gl.FLOAT, false, 0, 0);

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.uniforms = this.program.getUniformLocations([
      'resolution',
      'aabb',
      'sunCoords',
      'days',
      'fadeRange',
      'stepping',
      'texture',
      'siderealTimeOffset',
    ]);
  }

  render({
    x = 0,
    y = 0,
    z = 0,
    date = Date.now(),
    fadeRange = [0, -18],
    texture = null,
    stepping = 0,
  }: RenderOptions): Promise<void> {
    const gl = this.gl;
    const { width, height } = this.canvas;
    if (texture) this.tileTex.subData({ data: texture });

    this.program.use();
    gl.enableVertexAttribArray(this.attribs.xy);

    const days = toDays(date === undefined ? Date.now() : date);
    const { sinDec, cosDec, ra } = sunCoords(days);
    const siderealTimeOffset =
      ((Math.PI / 180) * (280.16 + 360.9856235 * days)) % (2 * Math.PI);

    const aabb = tileBounds3857(x, y, z).map((v) => v / 6378137.0);
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
      imageOrientation: 'flipY',
    });
  }
}
