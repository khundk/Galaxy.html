<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Mini Galaxy — 3D Particle Generator</title>
<style>
  html,body { height:100%; margin:0; background:#000; overflow:hidden; font-family:Arial,Helvetica,sans-serif; }
  #info { position: absolute; left: 12px; top: 12px; color: #ddd; user-select: none; z-index: 2; }
  #info b{ color:#fff }
  a { color: #88f; }
  #credit { position: absolute; left: 12px; bottom: 12px; color: rgba(255,255,255,0.6); z-index:2; font-size:12px; }
</style>
</head>
<body>
<div id="info">
  <div><b>Mini Galaxy</b> — drag to rotate, scroll to zoom</div>
  <div style="margin-top:6px; font-size:13px">Adjust parameters in the GUI (top-right). Try increasing <i>particles</i> and <i>spin</i>.</div>
</div>
<div id="credit">Generated with Three.js — mini galaxy demo</div>

<!-- Three.js -->
<script src="https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.min.js"></script>
<!-- Orbit Controls -->
<script src="https://cdn.jsdelivr.net/npm/three@0.158.0/examples/js/controls/OrbitControls.js"></script>
<!-- dat.GUI for controls -->
<script src="https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.min.js"></script>

<script>
(() => {
  // Scene setup
  const scene = new THREE.Scene();
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 20, 40);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // Light for subtle effect (not necessary for Points but helps if you add meshes)
  const amb = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(amb);

  // Parameters (GUI)
  const params = {
    particles: 25000,
    radius: 20,
    branches: 4,
    spin: 1.5,
    randomness: 0.5,
    randomnessPower: 2,
    insideColor: '#ffddaa',
    outsideColor: '#2255ff',
    size: 0.06,
    rotateSpeed: 0.02,
    autoRotate: true,
    regenerate: generateGalaxy
  };

  let galaxyPoints = null;

  // Generate galaxy geometry & points
  function generateGalaxy() {
    // Dispose old
    if (galaxyPoints !== null) {
      galaxyPoints.geometry.dispose();
      galaxyPoints.material.dispose();
      scene.remove(galaxyPoints);
      galaxyPoints = null;
    }

    const positions = new Float32Array(params.particles * 3);
    const colors = new Float32Array(params.particles * 3);
    const sizes = new Float32Array(params.particles);

    const insideColor = new THREE.Color(params.insideColor);
    const outsideColor = new THREE.Color(params.outsideColor);

    for (let i = 0; i < params.particles; i++) {
      const i3 = i * 3;

      // Radius from center (0 .. radius)
      const r = Math.random() ** 1.2 * params.radius;

      // Place particle in arm
      const branch = i % params.branches;
      const branchAngle = (branch / params.branches) * Math.PI * 2;
      // add spin proportional to radius
      const spinAngle = r * params.spin * 0.1;
      const angle = branchAngle + spinAngle;

      // Random offsets (control with randomnessPower for distribution)
      const randomX = (Math.random() ** params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * r;
      const randomY = (Math.random() ** params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * r * 0.3; // thin disk
      const randomZ = (Math.random() ** params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * r;

      const x = Math.cos(angle) * r + randomX;
      const y = randomY * 0.6; // compress height a bit
      const z = Math.sin(angle) * r + randomZ;

      positions[i3 + 0] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      // Color interpolation: center -> insideColor; edge -> outsideColor
      const t = r / params.radius;
      const mixed = insideColor.clone().lerp(outsideColor, t);

      colors[i3 + 0] = mixed.r;
      colors[i3 + 1] = mixed.g;
      colors[i3 + 2] = mixed.b;

      sizes[i] = params.size * (0.6 + (1 - t) * 0.8 * Math.random());
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Use a custom shader material for additive glow-like points
    const vertexShader = `
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z); // size attenuation
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      void main() {
        // circular soft point
        float dist = length(gl_PointCoord - vec2(0.5));
        float alpha = smoothstep(0.5, 0.0, dist);
        // Additive feel
        gl_FragColor = vec4(vColor, alpha);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexColors: true,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    galaxyPoints = new THREE.Points(geometry, material);
    scene.add(galaxyPoints);
  }

  // Initial generate
  generateGalaxy();

  // GUI
  const gui = new dat.GUI({ width: 330 });
  gui.add(params, 'particles', 1000, 150000, 1000).name('Particles').onFinishChange(generateGalaxy);
  gui.add(params, 'radius', 5, 60, 1).name('Radius').onFinishChange(generateGalaxy);
  gui.add(params, 'branches', 2, 12, 1).name('Arms').onFinishChange(generateGalaxy);
  gui.add(params, 'spin', -5, 5, 0.01).name('Spin').onFinishChange(generateGalaxy);
  gui.add(params, 'randomness', 0, 2, 0.01).name('Randomness').onFinishChange(generateGalaxy);
  gui.add(params, 'randomnessPower', 0.1, 10, 0.1).name('Random Power').onFinishChange(generateGalaxy);
  gui.addColor(params, 'insideColor').name('Inner Color').onChange(generateGalaxy);
  gui.addColor(params, 'outsideColor').name('Outer Color').onChange(generateGalaxy);
  gui.add(params, 'size', 0.01, 0.5, 0.01).name('Base Size').onFinishChange(() => {
    if (galaxyPoints) {
      const sizes = galaxyPoints.geometry.attributes.size.array;
      for (let i=0;i<sizes.length;i++) sizes[i] = params.size*(0.6 + Math.random()*0.8);
      galaxyPoints.geometry.attributes.size.needsUpdate = true;
    }
  });
  gui.add(params, 'rotateSpeed', 0, 0.5, 0.001).name('Rotation Speed');
  gui.add(params, 'autoRotate').name('Auto Rotate');
  gui.add(params, 'regenerate').name('Regenerate');

  // Resize handling
  window.addEventListener('resize', onWindowResize, false);
  function onWindowResize(){
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Animation loop
  let lastTime = 0;
  function animate(time) {
    const dt = (time - lastTime) / 1000 || 0;
    lastTime = time;

    if (params.autoRotate && galaxyPoints) {
      galaxyPoints.rotation.y += params.rotateSpeed * dt * 60; // normalized
    }

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // Nice background starfield (static)
  function makeStarfield() {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1000;
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 200 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      pos[i*3] = Math.cos(theta) * Math.cos(phi) * r;
      pos[i*3+1] = Math.sin(phi) * r;
      pos[i*3+2] = Math.sin(theta) * Math.cos(phi) * r;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x9999ff, size: 0.6, sizeAttenuation: true, transparent: true, opacity: 0.65 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
  }
  makeStarfield();

  // Helpful shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'r') { params.autoRotate = !params.autoRotate; gui.updateDisplay(); }
    if (e.key === 'g') { generateGalaxy(); }
  });
})();
</script>
</body>
</html>