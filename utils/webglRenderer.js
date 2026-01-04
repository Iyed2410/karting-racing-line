/* Minimal WebGL renderer for track and racing line
 * Draws lines as GL_LINES with simple color
 */
class WebGLRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.program = null;
    this.positionBuffer = null;
    this.color = [0.0, 0.8, 0.0, 1.0];
    this.lineWidth = 2;
    this.init();
  }

  init() {
    try {
      const gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
      if (!gl) return;
      this.gl = gl;

      const vsSource = `attribute vec2 a_pos; uniform vec2 u_resolution; void main(){ vec2 zeroToOne = a_pos / u_resolution; vec2 clip = zeroToOne * 2.0 - 1.0; gl_Position = vec4(clip * vec2(1,-1), 0, 1); }`;
      const fsSource = `precision mediump float; uniform vec4 u_color; void main(){ gl_FragColor = u_color; }`;

      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, vsSource);
      gl.compileShader(vs);

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, fsSource);
      gl.compileShader(fs);

      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      this.program = program;
      this.u_resolution = gl.getUniformLocation(program, 'u_resolution');
      this.u_color = gl.getUniformLocation(program, 'u_color');
      this.a_pos = gl.getAttribLocation(program, 'a_pos');

      this.positionBuffer = gl.createBuffer();
    } catch (e) {
      console.warn('WebGL init failed', e);
    }
  }

  resizeIfNeeded() {
    if (!this.gl) return;
    const gl = this.gl;
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;
    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      gl.viewport(0, 0, displayWidth, displayHeight);
    }
  }

  drawLine(points, color = [0.0, 0.6, 0.0, 1.0]) {
    if (!this.gl || !points || points.length < 2) return;
    this.resizeIfNeeded();
    const gl = this.gl;

    const verts = new Float32Array(points.length * 2);
    for (let i = 0; i < points.length; i++) {
      verts[i * 2] = points[i].x;
      verts[i * 2 + 1] = points[i].y;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STREAM_DRAW);

    gl.useProgram(this.program);
    gl.enableVertexAttribArray(this.a_pos);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(this.a_pos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(this.u_resolution, this.canvas.width, this.canvas.height);
    gl.uniform4fv(this.u_color, color);

    // draw as line strip
    gl.lineWidth(this.lineWidth);
    gl.drawArrays(gl.LINE_STRIP, 0, points.length);
  }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebGLRenderer;
}
