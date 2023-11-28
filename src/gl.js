function makeShader(gl, type, src) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error('Error compiling shader: ' + gl.getShaderInfoLog(shader));
  }
  return shader;
}

export class Program {
  constructor({ gl, vert, frag }) {
    this.gl = gl;
    const vertShader = makeShader(gl, gl.VERTEX_SHADER, vert);
    const fragShader = makeShader(gl, gl.FRAGMENT_SHADER, frag);
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertShader);
    gl.attachShader(this.program, fragShader);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error('Unable to initialize the shader program');
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
}

export class Texture {
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
        0, // level
        gl.RGBA,
        this.width,
        this.height,
        0, //border
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        data || null
      );
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0, // level
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
}

export class Buffer {
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
}
