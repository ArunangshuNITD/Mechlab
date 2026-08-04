/**
 * HydraulicParticleSystem - WebGL2 Module
 * Renders glowing, animated fluid particles traversing a 2D hydraulic piping system
 * Sump Pipe → Centrifugal Pump → Discharge Pipe
 */

export class HydraulicParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
    
    if (!this.gl) {
      throw new Error('WebGL2 not supported');
    }

    this.flowRate = 1.0; // Multiplier for particle speed
    this.particleCount = 256; // Number of particles in the system
    this.particles = [];
    this.elapsedTime = 0;

    // Define waypoint paths (pixel coordinates)
    this.suctionPath = [
      { x: 150, y: 400 },  // Sump inlet
      { x: 150, y: 300 },  // Moving up
      { x: 150, y: 150 },  // Pump eye
    ];

    this.dischargePath = [
      { x: 150, y: 150 },  // Pump outlet
      { x: 200, y: 100 },  // Moving up-right
      { x: 300, y: 80 },   // Discharge tank
    ];

    // Calculate total path length for speed normalization
    this.suctionPathLength = this.calculatePathLength(this.suctionPath);
    this.dischargPathLength = this.calculatePathLength(this.dischargePath);
    this.totalPathLength = this.suctionPathLength + this.dischargPathLength;

    this.initShaders();
    this.initBuffers();
    this.initParticles();
    this.setupBlending();
  }

  /**
   * Calculate cumulative distance along a path
   */
  calculatePathLength(path) {
    let length = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  /**
   * Compile and link shaders
   */
  initShaders() {
    const gl = this.gl;

    // Vertex Shader: Position and point size
    const vertexShaderSource = `#version 300 es
      precision highp float;

      in vec2 position;
      in float age;

      uniform mat4 projection;
      uniform float pointSize;

      out float vAge;

      void main() {
        vAge = age;
        gl_Position = projection * vec4(position, 0.0, 1.0);
        gl_PointSize = pointSize;
      }
    `;

    // Fragment Shader: Soft glowing particle
    const fragmentShaderSource = `#version 300 es
      precision highp float;

      in float vAge;

      out vec4 fragColor;

      void main() {
        // Distance from center of point sprite
        vec2 coords = gl_PointCoord - vec2(0.5);
        float distance = length(coords);

        // Soft circle with smooth falloff
        float circle = smoothstep(0.5, 0.0, distance);

        // Cyan glow color with brightness variation
        vec3 glowColor = vec3(0.0, 0.8, 1.0); // #00d8ff

        // Alpha with falloff
        float alpha = circle * 0.9;

        // Brighten core
        float brightness = 1.0 + (1.0 - distance * 2.0) * 0.5;

        fragColor = vec4(glowColor * brightness, alpha);
      }
    `;

    // Compile vertex shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
      throw new Error('Vertex shader compilation failed');
    }

    // Compile fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
      throw new Error('Fragment shader compilation failed');
    }

    // Link program
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(this.program));
      throw new Error('Program linking failed');
    }

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    // Get uniform and attribute locations
    this.positionLoc = gl.getAttribLocation(this.program, 'position');
    this.ageLoc = gl.getAttribLocation(this.program, 'age');
    this.projectionLoc = gl.getUniformLocation(this.program, 'projection');
    this.pointSizeLoc = gl.getUniformLocation(this.program, 'pointSize');
  }

  /**
   * Initialize vertex buffers
   */
  initBuffers() {
    const gl = this.gl;

    // Create VAO
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // Position buffer
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.particleCount * 2 * 4, gl.DYNAMIC_DRAW);

    gl.enableVertexAttribArray(this.positionLoc);
    gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 8, 0);

    // Age buffer
    this.ageBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ageBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.particleCount * 4, gl.DYNAMIC_DRAW);

    gl.enableVertexAttribArray(this.ageLoc);
    gl.vertexAttribPointer(this.ageLoc, 1, gl.FLOAT, false, 4, 0);

    gl.bindVertexArray(null);
  }

  /**
   * Initialize particle pool
   */
  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        progress: (i / this.particleCount) * 1.5, // Stagger spawn
        age: 0,
      });
    }
  }

  /**
   * Setup WebGL blending for glow effect
   */
  setupBlending() {
    const gl = this.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive blending
  }

  /**
   * Get position along the complete path
   */
  getPositionAtProgress(progress) {
    // Normalize progress to [0, 2] to cover both paths
    const normalizedProgress = progress % 2.0;

    if (normalizedProgress < 1.0) {
      // Suction path (0 to 1)
      return this.getPositionOnPath(this.suctionPath, normalizedProgress);
    } else {
      // Discharge path (1 to 2)
      return this.getPositionOnPath(
        this.dischargePath,
        normalizedProgress - 1.0
      );
    }
  }

  /**
   * Interpolate position along a specific path
   */
  getPositionOnPath(path, segmentProgress) {
    let remainingDistance = segmentProgress * this.calculatePathLength(path);

    for (let i = 1; i < path.length; i++) {
      const p0 = path[i - 1];
      const p1 = path[i];

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);

      if (remainingDistance <= segmentLength) {
        // Interpolate within this segment
        const t = segmentLength > 0 ? remainingDistance / segmentLength : 0;
        return {
          x: p0.x + dx * t,
          y: p0.y + dy * t,
        };
      }

      remainingDistance -= segmentLength;
    }

    // Fallback to end of path
    return { ...path[path.length - 1] };
  }

  /**
   * Update particle system
   */
  update(deltaTime) {
    const gl = this.gl;
    this.elapsedTime += deltaTime;

    // Update particle positions and collect data
    const positionData = new Float32Array(this.particleCount * 2);
    const ageData = new Float32Array(this.particleCount);

    this.particles.forEach((particle, index) => {
      // Advance particle along path based on flow rate
      particle.progress += (deltaTime * 0.5 * this.flowRate); // Speed factor

      // Recycle particle if it completes both paths
      if (particle.progress >= 2.0) {
        particle.progress = 0;
      }

      // Get current position
      const pos = this.getPositionAtProgress(particle.progress);

      // Convert pixel coordinates to clip space
      const clipX = (pos.x / this.canvas.width) * 2 - 1;
      const clipY = 1 - (pos.y / this.canvas.height) * 2;

      positionData[index * 2] = clipX;
      positionData[index * 2 + 1] = clipY;

      ageData[index] = particle.progress;
    });

    // Update buffers
    gl.bindBuffer(gl.COPY_WRITE_BUFFER, this.positionBuffer);
    gl.bufferSubData(gl.COPY_WRITE_BUFFER, 0, positionData);

    gl.bindBuffer(gl.COPY_WRITE_BUFFER, this.ageBuffer);
    gl.bufferSubData(gl.COPY_WRITE_BUFFER, 0, ageData);
  }

  /**
   * Render particles
   */
  render() {
    const gl = this.gl;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Set up projection matrix (orthographic for 2D)
    const projection = new Float32Array([
      2.0 / gl.canvas.width, 0, 0, 0,
      0, 2.0 / gl.canvas.height, 0, 0,
      0, 0, 1, 0,
      -1, -1, 0, 1,
    ]);

    gl.uniformMatrix4fv(this.projectionLoc, false, projection);
    gl.uniform1f(this.pointSizeLoc, 12.0);

    // Draw particles
    gl.drawArrays(gl.POINTS, 0, this.particleCount);

    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  /**
   * Set flow rate (speed multiplier)
   * @param {number} speed - Flow rate multiplier (e.g., 0.5 to 2.0)
   */
  setFlowRate(speed) {
    this.flowRate = Math.max(0, speed);
  }

  /**
   * Update canvas size
   */
  resizeCanvas(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  /**
   * Update waypoint paths
   */
  setSuctionPath(path) {
    this.suctionPath = path;
    this.suctionPathLength = this.calculatePathLength(path);
  }

  setDischargePath(path) {
    this.dischargePath = path;
    this.dischargPathLength = this.calculatePathLength(path);
  }

  /**
   * Cleanup resources
   */
  dispose() {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteBuffer(this.ageBuffer);
    gl.deleteVertexArray(this.vao);
  }
}

/**
 * Animation loop helper
 */
export function createAnimationLoop(canvas, system) {
  let lastTime = performance.now();

  function animate(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;

    // Clear canvas
    const gl = system.gl;
    gl.clearColor(0.05, 0.05, 0.08, 1.0); // Dark background
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Update and render
    system.update(deltaTime);
    system.render();

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
