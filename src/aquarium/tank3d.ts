/**
 * The aquarium, in WebGL.
 *
 * This module is loaded on demand — nothing imports it at the top level — so
 * the three.js payload only reaches visitors who actually open the tank.
 *
 * The fish are still the 128x80 textures the painter produces; what changed is
 * that they now swim in a real volume. Depth comes from perspective and from
 * exponential fog the colour of the water, so a fish at the back of the tank
 * genuinely goes blue and small instead of merely being drawn first. The body
 * wave that used to be redrawn in fourteen canvas slices every frame is a
 * vertex shader now, which is both smoother and free.
 *
 * Everything the scene needs — sand, caustics, bubbles, kelp — is generated
 * here. No textures are fetched.
 */
import * as THREE from 'three'

export interface FishInput {
  tex: HTMLCanvasElement | HTMLImageElement
  name?: string
}

export interface Tank {
  setFish(list: FishInput[]): void
  feedAt(clientX: number, clientY: number): void
  hoverAt(clientX: number, clientY: number): { name: string; x: number; y: number } | null
  resize(): void
  dispose(): void
}

/* Tank interior, in world units. The camera sits outside the front glass. */
const HALF_W = 20
const HALF_H = 10
const BACK = -26
const FRONT = 2
const FLOOR = -HALF_H

const WATER = new THREE.Color(0x1f6fd0)

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/* ------------------------------------------------------------------ *
 * Procedural textures. All small, all built once.
 * ------------------------------------------------------------------ */

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

/** Canvas pixels are sRGB. Saying so is what makes them match colours written
 *  as hex elsewhere in the scene — the fog, most importantly. */
function srgb(t: THREE.Texture) {
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function sandTexture() {
  const [c, g] = canvas(512, 512)
  g.fillStyle = '#d9bd85'
  g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 9000; i++) {
    const v = Math.random()
    g.fillStyle = v < 0.5 ? 'rgba(255,240,205,0.5)' : 'rgba(150,120,72,0.35)'
    g.fillRect(Math.random() * 512, Math.random() * 512, 1.6, 1.6)
  }
  // shallow ripples, the way sand lies under moving water
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = 'rgba(120,95,55,0.16)'
    g.lineWidth = rand(2, 6)
    g.beginPath()
    for (let x = 0; x <= 512; x += 16) {
      const y = i * 20 + Math.sin(x * 0.02 + i) * 7
      x ? g.lineTo(x, y) : g.moveTo(x, y)
    }
    g.stroke()
  }
  const t = srgb(new THREE.CanvasTexture(c))
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(16, 14)
  return t
}

/** Overlapping soft cells, scrolled in two directions — reads as caustics. */
function causticTexture() {
  const [c, g] = canvas(256, 256)
  g.fillStyle = '#000'
  g.fillRect(0, 0, 256, 256)
  g.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const r = rand(10, 34)
    const rg = g.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, 'rgba(190,245,255,0.5)')
    rg.addColorStop(0.55, 'rgba(150,225,255,0.14)')
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = rg
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  const t = srgb(new THREE.CanvasTexture(c))
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/** A shaft of light: bright where it enters, gone before it reaches the sand. */
function shaftTexture() {
  const [c, g] = canvas(32, 256)
  const lg = g.createLinearGradient(0, 0, 0, 256)
  lg.addColorStop(0, 'rgba(210,248,255,0)')
  lg.addColorStop(0.12, 'rgba(210,248,255,1)')
  lg.addColorStop(1, 'rgba(210,248,255,0)')
  g.fillStyle = lg
  g.fillRect(0, 0, 32, 256)
  // soften the two long edges so the shaft has no sides
  const eg = g.createLinearGradient(0, 0, 32, 0)
  eg.addColorStop(0, 'rgba(0,0,0,1)')
  eg.addColorStop(0.5, 'rgba(0,0,0,0)')
  eg.addColorStop(1, 'rgba(0,0,0,1)')
  g.globalCompositeOperation = 'destination-out'
  g.fillStyle = eg
  g.fillRect(0, 0, 32, 256)
  return srgb(new THREE.CanvasTexture(c))
}

function bubbleTexture() {
  const [c, g] = canvas(64, 64)
  g.beginPath()
  g.arc(32, 32, 28, 0, Math.PI * 2)
  g.strokeStyle = 'rgba(220,250,255,0.85)'
  g.lineWidth = 3
  g.stroke()
  const rg = g.createRadialGradient(24, 22, 0, 24, 22, 12)
  rg.addColorStop(0, 'rgba(255,255,255,0.95)')
  rg.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = rg
  g.beginPath()
  g.arc(24, 22, 12, 0, Math.PI * 2)
  g.fill()
  return srgb(new THREE.CanvasTexture(c))
}

function waterTexture() {
  const [c, g] = canvas(4, 512)
  const lg = g.createLinearGradient(0, 0, 0, 512)
  lg.addColorStop(0, '#a6ecff')
  lg.addColorStop(0.24, '#5ec4f6')
  lg.addColorStop(0.5, '#1f6fd0')  // === WATER: the horizon, where fog lands
  lg.addColorStop(1, '#1f6fd0')
  g.fillStyle = lg
  g.fillRect(0, 0, 4, 512)
  return srgb(new THREE.CanvasTexture(c))
}

/* ------------------------------------------------------------------ *
 * The fish shader. A travelling wave along the body, amplitude rising
 * toward the tail, plus a roll so the fish banks as it turns.
 * ------------------------------------------------------------------ */

const FISH_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uAmp;
  uniform float uFlip;
  uniform float uBank;
  varying vec2 vUv;
  #include <fog_pars_vertex>
  void main() {
    vUv = vec2(uFlip > 0.0 ? uv.x : 1.0 - uv.x, uv.y);
    vec3 p = position;
    // 0 at the nose, 1 at the tail, whichever way the fish is facing
    float tail = uFlip > 0.0 ? (1.0 - uv.x) : uv.x;
    float wave = sin(tail * 5.2 - uTime * 6.0 + uPhase);
    p.z += wave * uAmp * tail * tail;
    p.y += wave * uAmp * 0.18 * tail;
    p.y += p.x * uBank;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

const FISH_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uLight;
  varying vec2 vUv;
  #include <fog_pars_fragment>
  void main() {
    vec4 c = texture2D(uMap, vUv);
    if (c.a < 0.04) discard;
    // a little top light, so the back is brighter than the belly
    c.rgb *= 0.82 + 0.34 * (1.0 - vUv.y) * uLight;
    gl_FragColor = c;
    #include <fog_fragment>
  }
`

interface Swimmer {
  mesh: THREE.Mesh
  mat: THREE.ShaderMaterial
  name?: string
  vx: number
  vy: number
  vz: number
  speed: number
  scale: number
  phase: number
  wanderT: number
  target: THREE.Vector3
  hunger: number
  facing: number
  bank: number
}

export function createTank(host: HTMLElement): Tank {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.domElement.className = 'aq__gl'
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(WATER.getHex(), 0.024)

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120)
  camera.position.set(0, 0, 20)

  scene.background = waterTexture()

  /* ---- floor ---- */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 240, 48, 40),
    new THREE.MeshBasicMaterial({ map: sandTexture() }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = FLOOR
  {
    // gentle dunes, so the floor is not a flat card
    const pos = floor.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      pos.setZ(i, Math.sin(x * 0.045) * 0.30 + Math.cos(y * 0.037) * 0.26)
    }
    pos.needsUpdate = true
  }
  scene.add(floor)

  /* ---- caustics: two layers of the same texture, scrolled apart ---- */
  const causticTex = causticTexture()
  const caustics: THREE.ShaderMaterial[] = []
  for (let i = 0; i < 2; i++) {
    const map = causticTex.clone()
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.repeat.set(9 + i, 8 + i)
    map.needsUpdate = true
    /* Additive light has to fade out on its own. Mixed with three's fog it
       would add the fog colour instead of vanishing, which drew a bright band
       across the seabed at exactly the distance the fog saturated. */
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: map }, uFade: { value: 52 }, uAmp: { value: i ? 0.16 : 0.24 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying float vDist;
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vDist = -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uFade;
        uniform float uAmp;
        varying vec2 vUv;
        varying float vDist;
        void main() {
          float f = 1.0 - smoothstep(uFade * 0.4, uFade, vDist);
          gl_FragColor = texture2D(uMap, vUv) * uAmp * f;
        }
      `,
    })
    const m = new THREE.Mesh(new THREE.PlaneGeometry(260, 240), mat)
    m.rotation.x = -Math.PI / 2
    m.position.y = FLOOR + 0.05 + i * 0.02
    caustics.push(mat)
    scene.add(m)
  }

  /* ---- light shafts from the surface ---- */
  const shaftTex = shaftTexture()
  const shafts = new THREE.Group()
  for (let i = 0; i < 7; i++) {
    const w = rand(1.4, 3.2)
    const g = new THREE.PlaneGeometry(w, 40)
    const m = new THREE.MeshBasicMaterial({
      map: shaftTex,
      color: 0xd2f8ff,
      transparent: true,
      opacity: rand(0.16, 0.34),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    })
    const q = new THREE.Mesh(g, m)
    q.position.set(rand(-HALF_W, HALF_W), 3, rand(BACK + 2, -2))
    q.rotation.z = rand(-0.16, 0.16)
    q.userData.drift = rand(0.1, 0.3)
    q.userData.seed = rand(0, 6.3)
    shafts.add(q)
  }
  scene.add(shafts)

  /* ---- kelp: ribbons that sway in the vertex shader ---- */
  const kelp = new THREE.Group()
  const kelpMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, ...THREE.UniformsLib.fog },
    fog: true,
    side: THREE.DoubleSide,
    transparent: true,
    vertexShader: /* glsl */ `
      uniform float uTime;
      attribute float aSeed;
      varying float vY;
      #include <fog_pars_vertex>
      void main() {
        vY = uv.y;
        vec3 p = position;
        p.x += sin(uTime * 0.9 + aSeed + uv.y * 2.4) * uv.y * uv.y * 1.6;
        p.z += cos(uTime * 0.7 + aSeed) * uv.y * uv.y * 0.7;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vY;
      #include <fog_pars_fragment>
      void main() {
        vec3 base = mix(vec3(0.04, 0.30, 0.20), vec3(0.16, 0.62, 0.36), vY);
        gl_FragColor = vec4(base, 0.92);
        #include <fog_fragment>
      }
    `,
  })
  for (let i = 0; i < 30; i++) {
    const h = rand(4, 11)
    const g = new THREE.PlaneGeometry(rand(0.5, 1.2), h, 1, 8)
    g.translate(0, h / 2, 0)
    const seed = new Float32Array(g.attributes.position.count).fill(rand(0, 6.3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const blade = new THREE.Mesh(g, kelpMat)
    blade.position.set(rand(-HALF_W - 3, HALF_W + 3), FLOOR, rand(BACK + 1, -1))
    blade.rotation.y = rand(0, Math.PI)
    kelp.add(blade)
  }
  scene.add(kelp)

  /* ---- bubbles ---- */
  const BUBBLES = 90
  const bubGeo = new THREE.BufferGeometry()
  const bubPos = new Float32Array(BUBBLES * 3)
  const bubSize = new Float32Array(BUBBLES)
  const bubVel = new Float32Array(BUBBLES)
  const resetBubble = (i: number, low = true) => {
    bubPos[i * 3] = rand(-HALF_W, HALF_W)
    bubPos[i * 3 + 1] = low ? FLOOR + rand(0, 1) : rand(FLOOR, HALF_H)
    bubPos[i * 3 + 2] = rand(BACK + 2, FRONT - 1)
    bubSize[i] = rand(0.12, 0.42)
    bubVel[i] = rand(1.2, 3.0)
  }
  for (let i = 0; i < BUBBLES; i++) resetBubble(i, false)
  bubGeo.setAttribute('position', new THREE.BufferAttribute(bubPos, 3))
  bubGeo.setAttribute('size', new THREE.BufferAttribute(bubSize, 1))
  const bubbles = new THREE.Points(
    bubGeo,
    new THREE.ShaderMaterial({
      uniforms: { uMap: { value: bubbleTexture() }, uScale: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float size;
        uniform float uScale;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        void main() {
          gl_FragColor = texture2D(uMap, gl_PointCoord) * vec4(0.85, 0.97, 1.0, 0.75);
        }
      `,
    }),
  )
  scene.add(bubbles)

  /* ---- food ---- */
  const PELLETS = 60
  const pelGeo = new THREE.BufferGeometry()
  const pelPos = new Float32Array(PELLETS * 3)
  const pelLife = new Float32Array(PELLETS)
  pelGeo.setAttribute('position', new THREE.BufferAttribute(pelPos, 3))
  const pellets = new THREE.Points(
    pelGeo,
    new THREE.PointsMaterial({ color: 0xe8a33c, size: 9, sizeAttenuation: false, transparent: true }),
  )
  pellets.frustumCulled = false
  scene.add(pellets)
  let pelNext = 0

  /* ------------------------------------------------------------------ *
   * Fish
   * ------------------------------------------------------------------ */
  const swimmers: Swimmer[] = []
  const fishGroup = new THREE.Group()
  scene.add(fishGroup)

  function clearFish() {
    for (const s of swimmers) {
      fishGroup.remove(s.mesh)
      s.mesh.geometry.dispose()
      s.mat.dispose()
    }
    swimmers.length = 0
  }

  function setFish(list: FishInput[]) {
    clearFish()
    for (const item of list) {
      const map = new THREE.CanvasTexture(item.tex as HTMLCanvasElement)
      map.colorSpace = THREE.SRGBColorSpace
      map.minFilter = THREE.LinearFilter
      map.generateMipmaps = false
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: map },
          uTime: { value: 0 },
          uPhase: { value: rand(0, 6.3) },
          uAmp: { value: 0 },
          uFlip: { value: 1 },
          uBank: { value: 0 },
          uLight: { value: 1 },
          ...THREE.UniformsLib.fog,
        },
        vertexShader: FISH_VERT,
        fragmentShader: FISH_FRAG,
        transparent: true,
        fog: true,
        side: THREE.DoubleSide,
      })
      // visitors' fish swim a little larger than the stock ones, so they read
      const scale = item.name ? rand(3.4, 4.6) : rand(2.2, 3.6)
      const geo = new THREE.PlaneGeometry(scale, scale * 0.62, 24, 2)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(
        rand(-HALF_W + 2, HALF_W - 2),
        rand(FLOOR + 2, HALF_H - 2),
        rand(BACK + 3, FRONT - 2),
      )
      mesh.renderOrder = 2
      fishGroup.add(mesh)
      swimmers.push({
        mesh,
        mat,
        name: item.name,
        vx: Math.random() < 0.5 ? -2 : 2,
        vy: 0,
        vz: 0,
        speed: rand(2.4, 4.6),
        scale,
        phase: rand(0, 6.3),
        wanderT: rand(0, 3),
        target: new THREE.Vector3(),
        hunger: 0,
        facing: 1,
        bank: 0,
      })
    }
  }

  /* ------------------------------------------------------------------ *
   * Loop
   * ------------------------------------------------------------------ */
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const rate = calm ? 0.3 : 1
  let raf = 0
  let last = performance.now()
  let clock = 0
  const tmp = new THREE.Vector3()

  function step(dt: number) {
    clock += dt

    for (const s of swimmers) {
      const p = s.mesh.position

      // find the nearest live pellet; hungry fish beat wandering fish
      let food = -1
      let best = 1e9
      for (let i = 0; i < PELLETS; i++) {
        if (pelLife[i] <= 0) continue
        const d = tmp.set(pelPos[i * 3], pelPos[i * 3 + 1], pelPos[i * 3 + 2]).distanceTo(p)
        if (d < best) {
          best = d
          food = i
        }
      }

      s.wanderT -= dt
      if (s.wanderT <= 0) {
        s.wanderT = rand(1.6, 4.5)
        s.target.set(
          rand(-HALF_W + 2, HALF_W - 2),
          rand(FLOOR + 2, HALF_H - 2),
          rand(BACK + 3, FRONT - 2),
        )
      }

      let urgency = 1
      if (food >= 0 && best < 26) {
        s.target.set(pelPos[food * 3], pelPos[food * 3 + 1], pelPos[food * 3 + 2])
        urgency = 2.1
        if (best < 0.9) {
          pelLife[food] = 0
          s.hunger = 1
        }
      }
      s.hunger = Math.max(0, s.hunger - dt * 0.4)

      const ax = (s.target.x - p.x) * 0.9 * urgency
      const ay = (s.target.y - p.y) * 1.1 * urgency
      const az = (s.target.z - p.z) * 0.6 * urgency
      s.vx += ax * dt
      s.vy += ay * dt
      s.vz += az * dt
      const sp = Math.hypot(s.vx, s.vy, s.vz)
      const max = s.speed * urgency
      if (sp > max) {
        s.vx = (s.vx / sp) * max
        s.vy = (s.vy / sp) * max
        s.vz = (s.vz / sp) * max
      }
      p.x += s.vx * dt
      p.y += s.vy * dt
      p.z += s.vz * dt

      // walls
      const pad = s.scale * 0.5
      if (p.x < -HALF_W + pad) { p.x = -HALF_W + pad; s.vx = Math.abs(s.vx) }
      if (p.x > HALF_W - pad) { p.x = HALF_W - pad; s.vx = -Math.abs(s.vx) }
      if (p.y < FLOOR + 1.2) { p.y = FLOOR + 1.2; s.vy = Math.abs(s.vy) }
      if (p.y > HALF_H - 1) { p.y = HALF_H - 1; s.vy = -Math.abs(s.vy) }
      if (p.z < BACK + 2) { p.z = BACK + 2; s.vz = Math.abs(s.vz) }
      if (p.z > FRONT - 1) { p.z = FRONT - 1; s.vz = -Math.abs(s.vz) }

      /* Turning: the fish keeps facing the camera but flips, and the flip is
         a squash through zero rather than an instant mirror — which is what
         a real fish rolling over looks like from the front. */
      const want = s.vx >= 0 ? 1 : -1
      s.facing += (want - s.facing) * Math.min(1, dt * 7)
      s.mesh.scale.x = Math.max(0.06, Math.abs(s.facing))
      s.mat.uniforms.uFlip.value = s.facing >= 0 ? 1 : 0

      // bank into vertical movement
      s.bank += (THREE.MathUtils.clamp(-s.vy * 0.06, -0.25, 0.25) - s.bank) * Math.min(1, dt * 4)
      s.mat.uniforms.uBank.value = s.bank

      s.mat.uniforms.uTime.value = clock * (0.7 + sp * 0.12)
      s.mat.uniforms.uAmp.value = 0.10 + sp * 0.045
      s.mat.uniforms.uLight.value = 1
    }

    // bubbles
    for (let i = 0; i < BUBBLES; i++) {
      bubPos[i * 3 + 1] += bubVel[i] * dt
      bubPos[i * 3] += Math.sin(clock * 2 + i) * dt * 0.25
      if (bubPos[i * 3 + 1] > HALF_H) resetBubble(i)
    }
    bubGeo.attributes.position.needsUpdate = true

    // food sinks and expires
    for (let i = 0; i < PELLETS; i++) {
      if (pelLife[i] <= 0) {
        pelPos[i * 3 + 1] = 1e4 // park it outside the tank
        continue
      }
      pelLife[i] -= dt * 0.09
      pelPos[i * 3 + 1] -= dt * 1.5
      if (pelPos[i * 3 + 1] < FLOOR + 0.4) pelLife[i] = 0
    }
    pelGeo.attributes.position.needsUpdate = true

    // scenery
    kelpMat.uniforms.uTime.value = clock
    for (let i = 0; i < caustics.length; i++) {
      const t = caustics[i].uniforms.uMap.value as THREE.Texture
      t.offset.x = clock * (0.02 + i * 0.013) * (i ? -1 : 1)
      t.offset.y = clock * 0.017
    }
    for (const q of shafts.children) {
      q.position.x += Math.sin(clock * 0.25 + q.userData.seed) * q.userData.drift * dt
    }
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000) * rate
    last = now
    step(dt)
    renderer.render(scene, camera)
    raf = requestAnimationFrame(frame)
  }

  /* ------------------------------------------------------------------ */

  function resize() {
    /* offsetWidth, not getBoundingClientRect: a window measured during its
       open animation is still scaled, and the rect reports the scaled size —
       the canvas would end up permanently smaller than its container, and
       transforms do not retrigger a ResizeObserver so it never corrects. */
    const w = Math.max(260, host.offsetWidth)
    const h = Math.max(180, host.offsetHeight)
    renderer.setSize(w, h, false)
    renderer.domElement.style.width = `${w}px`
    renderer.domElement.style.height = `${h}px`
    camera.aspect = w / h
    /* Pull the camera back on narrow windows so the tank stays full of water
       rather than showing the room around it. */
    camera.position.z = 20 + Math.max(0, (16 / camera.aspect) - 10)
    camera.updateProjectionMatrix()
    ;(bubbles.material as THREE.ShaderMaterial).uniforms.uScale.value = h * 0.55
  }

  /** Screen point -> a point on the plane the fish mostly swim in. */
  function toWorld(clientX: number, clientY: number, depth = -6) {
    const r = renderer.domElement.getBoundingClientRect()
    const v = new THREE.Vector3(
      ((clientX - r.left) / r.width) * 2 - 1,
      -((clientY - r.top) / r.height) * 2 + 1,
      0.5,
    ).unproject(camera)
    const dir = v.sub(camera.position).normalize()
    return camera.position.clone().addScaledVector(dir, (depth - camera.position.z) / dir.z)
  }

  function feedAt(clientX: number, clientY: number) {
    const at = toWorld(clientX, clientY)
    for (let n = 0; n < 6; n++) {
      const i = pelNext++ % PELLETS
      pelPos[i * 3] = at.x + rand(-1, 1)
      pelPos[i * 3 + 1] = at.y + rand(-0.6, 0.6)
      pelPos[i * 3 + 2] = at.z + rand(-2, 2)
      pelLife[i] = 1
    }
    pelGeo.attributes.position.needsUpdate = true
    // a puff of bubbles where the glass was tapped
    for (let n = 0; n < 8; n++) {
      const i = Math.floor(Math.random() * BUBBLES)
      bubPos[i * 3] = at.x + rand(-1, 1)
      bubPos[i * 3 + 1] = at.y + rand(-0.5, 0.5)
      bubPos[i * 3 + 2] = at.z
    }
  }

  function hoverAt(clientX: number, clientY: number) {
    const r = renderer.domElement.getBoundingClientRect()
    const mx = clientX - r.left
    const my = clientY - r.top
    let found: { name: string; x: number; y: number } | null = null
    let best = 1e9
    for (const s of swimmers) {
      if (!s.name) continue
      const p = s.mesh.position.clone().project(camera)
      const sx = ((p.x + 1) / 2) * r.width
      const sy = ((-p.y + 1) / 2) * r.height
      // the projected half-width of this fish, so far ones need a closer hit
      const edge = s.mesh.position.clone().add(new THREE.Vector3(s.scale / 2, 0, 0)).project(camera)
      const half = Math.abs(((edge.x + 1) / 2) * r.width - sx)
      const d = Math.hypot(mx - sx, my - sy)
      if (d < Math.max(14, half) && d < best) {
        best = d
        found = { name: s.name, x: sx, y: sy - half * 0.75 - 8 }
      }
    }
    return found
  }

  const ro = new ResizeObserver(resize)
  ro.observe(host)
  resize()

  const onVisible = () => {
    if (document.hidden) return
    cancelAnimationFrame(raf)
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }
  document.addEventListener('visibilitychange', onVisible)

  const onLost = (e: Event) => {
    // Nothing to restore from — say so rather than leaving a dead black box.
    e.preventDefault()
    cancelAnimationFrame(raf)
    host.dataset.glLost = 'true'
  }
  renderer.domElement.addEventListener('webglcontextlost', onLost)

  raf = requestAnimationFrame(frame)

  return {
    setFish,
    feedAt,
    hoverAt,
    resize,
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisible)
      renderer.domElement.removeEventListener('webglcontextlost', onLost)
      clearFish()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose?.()
        const mat = m.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
        else mat?.dispose?.()
      })
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
