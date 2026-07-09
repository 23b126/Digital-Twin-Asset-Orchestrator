import React, { useState, useEffect, useRef, Suspense, Component, ErrorInfo, ReactNode } from 'react';
import { onSnapshot, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Asset, SensorData } from '../types';
import { cn } from '../utils';
import { 
  ArrowLeft, 
  Activity, 
  Thermometer, 
  Droplets, 
  Zap, 
  RefreshCw,
  Box,
  Maximize2,
  Layers,
  Cpu,
  AlertTriangle,
  Sparkles,
  Loader2,
  Map as MapIcon,
  Home,
  Info,
  Wand2,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, Grid, PerspectiveCamera, Text, Float, Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Room } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

type ViewMode = 'Exterior' | 'FloorPlan' | 'Room';

function HolographicParticles({ count = 100 }) {
  const points = useRef<THREE.Points>(null);
  const particles = React.useMemo(() => {
    const temp = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      temp[i * 3] = (Math.random() - 0.5) * 15;
      temp[i * 3 + 1] = (Math.random() - 0.5) * 15;
      temp[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y += 0.0005;
      points.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#10b981" transparent opacity={0.3} sizeAttenuation />
    </points>
  );
}

function RoomHotspot({ room, onClick }: { room: Room, onClick: (r: Room) => void }) {
  const [hovered, setHovered] = useState(false);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (pulseRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
      pulseRef.current.scale.set(s, s, s);
    }
  });
  
  return (
    <group position={room.position}>
      <mesh 
        onClick={(e) => { e.stopPropagation(); onClick(room); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color={hovered ? "#ffffff" : "#10b981"} />
      </mesh>
      
      {/* Pulse effect */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.3} />
      </mesh>

      <Html distanceFactor={8} position={[0, 0.4, 0]}>
        <div className={cn(
          "px-2 py-1 rounded bg-black/90 border border-emerald-500/50 text-white text-[10px] font-mono whitespace-nowrap transition-all pointer-events-none",
          hovered ? "scale-110 opacity-100 translate-y-[-4px]" : "opacity-70"
        )}>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span>{room.name}</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

function ScanningLine({ width, height }: { width: number, height: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * (height / 2);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0.51]}>
      <planeGeometry args={[width, 0.05]} />
      <meshBasicMaterial color="#10b981" transparent opacity={0.8} />
    </mesh>
  );
}

function SynthesisProgress({ progress, status, steps = [] }: { progress: number, status: string, steps?: string[] }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#141414]/95 backdrop-blur-2xl">
      <div className="w-80 space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="absolute -inset-4 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
            <RefreshCw className="w-16 h-16 text-emerald-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-emerald-500 animate-bounce" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-white font-bold text-2xl tracking-tighter uppercase italic">NEURAL_SYNTHESIS_v2</h3>
            <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.4em] mt-1">{status}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-[1px]">
            <div 
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-700 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-white/40 uppercase tracking-widest">
            <span>Reconstructing Mesh</span>
            <span className="text-emerald-500">{progress}%</span>
          </div>
        </div>

        <div className="bg-black/60 border border-white/5 p-5 rounded-2xl space-y-2 max-h-40 overflow-hidden">
          {steps.length > 0 ? steps.map((step, i) => (
            <div key={i} className="flex items-center space-x-3 animate-in fade-in slide-in-from-left-2 duration-500">
              <div className={cn(
                "w-1 h-1 rounded-full",
                i === steps.length - 1 ? "bg-emerald-500 animate-ping" : "bg-emerald-500/30"
              )} />
              <p className={cn(
                "text-[9px] font-mono uppercase tracking-wider",
                i === steps.length - 1 ? "text-emerald-400" : "text-emerald-900"
              )}>
                {`> ${step}`}
              </p>
            </div>
          )) : (
            <>
              <p className="text-[8px] font-mono text-emerald-500/40">{`> INITIALIZING_NEURAL_ENGINE...`}</p>
              <p className="text-[8px] font-mono text-emerald-500/40">{`> EXTRACTING_TEXTURE_MAPS...`}</p>
              {progress > 40 && <p className="text-[8px] font-mono text-emerald-500/40">{`> SYNTHESIZING_GEOMETRY_NODES...`}</p>}
              {progress > 70 && <p className="text-[8px] font-mono text-emerald-500/40">{`> MAPPING_STRUCTURAL_COMPONENTS...`}</p>}
            </>
          )}
        </div>
        
        <p className="text-center text-[8px] text-zinc-600 font-mono uppercase animate-pulse">
          DO NOT DISCONNECT • OPTIMIZING TOPOLOGY
        </p>
      </div>
    </div>
  );
}

function ExternalModel({ url }: { url: string }) {
  if (!url) return null;
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (scene) {
      // Auto-center and auto-scale the model
      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 8 / maxDim; // Scale to fit roughly 8 units
      
      scene.scale.setScalar(scale);
      scene.position.x = -center.x * scale;
      scene.position.y = -center.y * scale + 1.5; // Lift slightly
      scene.position.z = -center.z * scale;
    }
  }, [scene]);

  return <primitive object={scene} />;
}

function BlueprintModel({ 
  type, 
  analysis, 
  imageUrl, 
  floorPlanUrl,
  viewMode, 
  rooms = [], 
  onRoomClick,
  glbUrl,
  asset,
  onSynthesize
}: { 
  type: string, 
  analysis?: string, 
  imageUrl?: string, 
  floorPlanUrl?: string,
  viewMode: ViewMode,
  rooms?: Room[],
  onRoomClick: (r: Room) => void,
  glbUrl?: string,
  asset: Asset,
  onSynthesize: (a: Asset) => void
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [floorPlanTexture, setFloorPlanTexture] = useState<THREE.Texture | null>(null);
  const [aspect, setAspect] = useState(1);
  const [fpAspect, setFpAspect] = useState(1);
  
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    if (imageUrl) {
      loader.load(imageUrl, (tex) => {
        tex.needsUpdate = true;
        if (tex.image) setAspect(tex.image.width / tex.image.height);
        setTexture(tex);
      });
    }
    if (floorPlanUrl) {
      loader.load(floorPlanUrl, (tex) => {
        tex.needsUpdate = true;
        if (tex.image) setFpAspect(tex.image.width / tex.image.height);
        setFloorPlanTexture(tex);
      });
    }
  }, [imageUrl, floorPlanUrl]);

  useFrame((state) => {
    if (groupRef.current && viewMode === 'Exterior') {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  const wallColor = "#f5f5dc"; 
  const accentColor = "#4b3621"; 

  return (
    <group ref={groupRef} name="synthesized-model">
      <HolographicParticles />
      
      {viewMode === 'Exterior' && (
        <group>
          {glbUrl ? (
            <Suspense fallback={<Html center><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></Html>}>
              <ExternalModel url={glbUrl} />
            </Suspense>
          ) : (
            <group>
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[6, 6, 6]} />
                <meshStandardMaterial color={wallColor} roughness={0.7} metalness={0.1} transparent opacity={0.2} />
              </mesh>
              <Html center>
                <div className="bg-black/80 backdrop-blur-md border border-emerald-500/50 p-6 rounded-2xl text-center min-w-[240px] shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <Cpu className="w-10 h-10 text-emerald-500 mx-auto mb-3 animate-pulse" />
                  <p className="text-xs font-mono text-emerald-500 uppercase tracking-widest mb-2">Neural Data Missing</p>
                  <p className="text-[10px] text-white/60 uppercase mb-4 leading-relaxed">Initialize 3D Synthesis to reconstruct asset architecture</p>
                  <button 
                    onClick={() => onSynthesize(asset)}
                    className="w-full py-2 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-emerald-400 transition-all"
                  >
                    Initialize Synthesis
                  </button>
                </div>
              </Html>
            </group>
          )}

          {/* Scanning Line */}
          <ScanningLine width={10} height={10} />

          {rooms.map(room => (
            <RoomHotspot key={room.id} room={room} onClick={onRoomClick} />
          ))}
        </group>
      )}

      {viewMode === 'FloorPlan' && (
        <group position={[0, -2, 0]}>
          {/* Detailed 3D Dollhouse Floor Plan */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[25, 25]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>

          {/* Grid for realism */}
          <Grid 
            infiniteGrid={false}
            args={[25, 25]}
            sectionColor="#10b981"
            cellColor="#10b981"
            sectionThickness={1.5}
            cellThickness={0.5}
            position={[0, 0.01, 0]}
          />

          {/* Realistic Room Boundaries */}
          {rooms.map((room, idx) => {
            const isGarage = room.name.toLowerCase().includes('garage');
            const isParking = room.name.toLowerCase().includes('parking');
            const isStorage = room.name.toLowerCase().includes('storage');
            const isMaintenance = room.name.toLowerCase().includes('maintenance');
            
            let roomColor = "#3d3d3d";
            if (isGarage) roomColor = "#2a2a2a";
            if (isParking) roomColor = "#1f1f1f";
            if (isStorage) roomColor = "#3e2723";
            if (isMaintenance) roomColor = "#263238";

            return (
              <group key={room.id} position={[room.position[0], 0, room.position[2]]}>
                {/* Floor for the room */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                  <planeGeometry args={[4.8, 4.8]} />
                  <meshStandardMaterial color={roomColor} />
                </mesh>
                
                {/* Thick Architectural Walls */}
                <group position={[0, 1, 0]}>
                  {/* North Wall */}
                  <mesh position={[0, 0, -2.4]}>
                    <boxGeometry args={[5, 2, 0.2]} />
                    <meshStandardMaterial color="#555" />
                  </mesh>
                  {/* South Wall */}
                  <mesh position={[0, 0, 2.4]}>
                    <boxGeometry args={[5, 2, 0.2]} />
                    <meshStandardMaterial color="#555" />
                  </mesh>
                  {/* West Wall */}
                  <mesh position={[-2.4, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <boxGeometry args={[5, 2, 0.2]} />
                    <meshStandardMaterial color="#555" />
                  </mesh>
                  {/* East Wall */}
                  <mesh position={[2.4, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <boxGeometry args={[5, 2, 0.2]} />
                    <meshStandardMaterial color="#555" />
                  </mesh>
                </group>

                {/* Room Label */}
                <Html distanceFactor={12} position={[0, 2.8, 0]}>
                  <div className="flex flex-col items-center space-y-1">
                    <div className="bg-emerald-500 text-black px-3 py-1 rounded-sm text-[9px] font-black whitespace-nowrap uppercase shadow-[4px_4px_0px_#000]">
                      {room.name}
                    </div>
                    <div className="bg-black/80 text-white/50 px-2 py-0.5 rounded-sm text-[7px] font-mono whitespace-nowrap uppercase">
                      Area_ID: {room.id.slice(0, 4)}
                    </div>
                  </div>
                </Html>

                <RoomHotspot 
                  room={room} 
                  onClick={onRoomClick} 
                />
              </group>
            );
          })}
        </group>
      )}

      <Grid 
        infiniteGrid 
        fadeDistance={50} 
        fadeStrength={5} 
        cellSize={1} 
        sectionSize={5} 
        sectionColor="#10b981" 
        cellColor="#10b981" 
        position={[0, -4, 0]}
      />
    </group>
  );
}

function RoomModel({ room, interiorStyle, onBack }: { room: Room, interiorStyle?: string, onBack: () => void }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    if (room.imageUrl) {
      new THREE.TextureLoader().load(room.imageUrl, (tex) => {
        if (tex.image) setAspect(tex.image.width / tex.image.height);
        setTexture(tex);
      });
    }
  }, [room.imageUrl]);

  const isModern = interiorStyle?.toLowerCase().includes('modern');
  const isIndustrial = interiorStyle?.toLowerCase().includes('industrial');
  const isBrutalist = interiorStyle?.toLowerCase().includes('brutalist');

  const wallColor = isIndustrial ? "#2c2c2c" : isBrutalist ? "#4a4a4a" : "#1e1e1e"; 
  const floorColor = isIndustrial ? "#1a1a1a" : isBrutalist ? "#333" : "#121212"; 

  return (
    <group>
      <PerspectiveCamera makeDefault position={[0, 8, 12]} fov={50} />
      <OrbitControls 
        makeDefault 
        enableDamping
        dampingFactor={0.05}
        enablePan={true}
        enableZoom={true}
        maxPolarAngle={Math.PI / 2.1}
      />
      
      {/* Detailed Room View - Realistic Aesthetic */}
      <group position={[0, -2, 0]}>
        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial 
            color={floorColor} 
            roughness={isModern ? 0.2 : 0.8} 
            metalness={isModern ? 0.5 : 0.2} 
          />
        </mesh>

        {/* Grid for technical feel */}
        <Grid 
          infiniteGrid={false}
          args={[20, 20]}
          sectionColor="#10b981"
          cellColor="#10b981"
          sectionThickness={1}
          cellThickness={0.5}
          position={[0, 0.01, 0]}
        />

        {/* Realistic Interior Props (Procedural) */}
        {room.name.toLowerCase().includes('storage') && (
          <group>
            {[...Array(12)].map((_, i) => (
              <mesh key={i} position={[(i % 4 - 1.5) * 3, 1.2, (Math.floor(i / 4) - 1) * 4]}>
                <boxGeometry args={[2, 2.4, 1.5]} />
                <meshStandardMaterial color={isIndustrial ? "#2c1a1a" : "#3e2723"} roughness={0.9} />
              </mesh>
            ))}
            {/* Shelving units */}
            <mesh position={[-8, 2, 0]}>
              <boxGeometry args={[0.5, 4, 15]} />
              <meshStandardMaterial color="#444" metalness={0.5} />
            </mesh>
          </group>
        )}

        {room.name.toLowerCase().includes('maintenance') && (
          <group>
            {[...Array(6)].map((_, i) => (
              <mesh key={i} position={[(i - 2.5) * 2.5, 1.5, -6]}>
                <boxGeometry args={[1.8, 3, 0.8]} />
                <meshStandardMaterial color="#37474f" metalness={0.8} roughness={0.2} />
              </mesh>
            ))}
            {/* Workbenches */}
            <mesh position={[0, 0.5, 4]}>
              <boxGeometry args={[12, 1, 3]} />
              <meshStandardMaterial color="#263238" />
            </mesh>
          </group>
        )}

        {room.name.toLowerCase().includes('garage') && (
          <group>
            <mesh position={[0, 0.1, 0]}>
              <planeGeometry args={[12, 12]} />
              <meshStandardMaterial color="#212121" />
            </mesh>
            {/* Vehicle placeholder */}
            <mesh position={[0, 0.8, 0]}>
              <boxGeometry args={[4, 1.5, 8]} />
              <meshStandardMaterial color="#10b981" metalness={0.8} roughness={0.1} />
            </mesh>
            {/* Garage door */}
            <mesh position={[0, 3, 9.8]}>
              <boxGeometry args={[10, 6, 0.2]} />
              <meshStandardMaterial color="#444" metalness={0.6} />
            </mesh>
          </group>
        )}

        {room.name.toLowerCase().includes('office') && (
          <group>
            {/* Desks */}
            {[...Array(4)].map((_, i) => (
              <group key={i} position={[(i % 2 - 0.5) * 6, 0, (Math.floor(i / 2) - 0.5) * 6]}>
                <mesh position={[0, 0.75, 0]}>
                  <boxGeometry args={[3, 0.1, 1.5]} />
                  <meshStandardMaterial color={isModern ? "#fff" : "#5d4037"} />
                </mesh>
                <mesh position={[0, 0.375, 0]}>
                  <boxGeometry args={[0.1, 0.75, 0.1]} />
                  <meshStandardMaterial color="#333" />
                </mesh>
              </group>
            ))}
          </group>
        )}

        {/* Back Wall */}
        <mesh position={[0, 5, -10]} castShadow>
          <planeGeometry args={[20, 10]} />
          <meshStandardMaterial color={wallColor} />
        </mesh>

        {/* Side Walls */}
        <mesh position={[-10, 5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[20, 10]} />
          <meshStandardMaterial color={wallColor} transparent opacity={0.6} />
        </mesh>
        <mesh position={[10, 5, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[20, 10]} />
          <meshStandardMaterial color={wallColor} transparent opacity={0.6} />
        </mesh>

        {/* Data Panels */}
        <Html position={[-7, 6, -5]} distanceFactor={12}>
          <div className="bg-black/90 backdrop-blur-xl border border-emerald-500/30 p-6 rounded-sm text-[9px] font-mono text-white space-y-3 shadow-[10px_10px_0px_rgba(16,185,129,0.1)] min-w-[180px]">
            <div className="flex items-center space-x-2 border-b border-white/10 pb-2 mb-2">
              <Activity className="w-3 h-3 text-emerald-500" />
              <span className="font-black uppercase tracking-widest">Node_Telemetry</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-40 uppercase">Status</span>
              <span className="text-emerald-500 font-bold">ACTIVE_SYNC</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-40 uppercase">Style</span>
              <span className="text-white uppercase">{interiorStyle?.split(' ')[0] || 'STANDARD'}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-40 uppercase">Load</span>
              <span className="text-white">14.2%</span>
            </div>
            <div className="pt-2 border-t border-white/10">
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[65%] animate-pulse" />
              </div>
            </div>
          </div>
        </Html>

        {/* Scanning Line in Room */}
        <ScanningLine width={20} height={10} />
      </group>

      <Html position={[0, 9, 0]} center>
        <div className="bg-[#0a0a0a] border border-white/10 p-10 rounded-sm text-white text-center w-[450px] shadow-2xl backdrop-blur-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-[0.4em]">Interior_Analysis</span>
            </div>
            <span className="text-[9px] font-mono opacity-20 tracking-widest">REF_ID: {room.id.slice(0, 8)}</span>
          </div>

          <div className="space-y-6 text-left">
            <div className="space-y-1">
              <h4 className="text-xl font-black uppercase tracking-tighter italic">{room.name}</h4>
              <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">Structural Node Synchronization Active</p>
            </div>
            
            <div className="p-4 bg-white/5 border border-white/10 rounded-sm">
              <p className="text-[11px] leading-relaxed opacity-70 font-medium">
                {room.description || "Initializing neural reconstruction of interior structural elements. Spatial mapping in progress."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div className="space-y-1">
                <span className="text-[8px] font-mono opacity-30 uppercase">Style_Analysis</span>
                <p className="text-[10px] font-bold text-emerald-500 uppercase">{interiorStyle || 'Standard'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-mono opacity-30 uppercase">Position_Vector</span>
                <p className="text-[10px] font-bold text-white uppercase">[{room.position.join(', ')}]</p>
              </div>
            </div>
          </div>

          <button 
            onClick={onBack}
            className="mt-10 w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-emerald-500 transition-all shadow-[6px_6px_0px_rgba(255,255,255,0.1)]"
          >
            Return to Blueprint
          </button>
        </div>
      </Html>
    </group>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode, fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode, fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("3D Render Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface DigitalTwinViewProps {
  assetId?: string;
  onBack: () => void;
}

function SceneWrapper({ asset, viewMode, onRoomClick, downloadGLB, selectedRoom, onSynthesize }: any) {
  const { scene } = useThree();
  
  useEffect(() => {
    const handleDownload = () => downloadGLB(scene);
    window.addEventListener('trigger-glb-download', handleDownload);
    return () => window.removeEventListener('trigger-glb-download', handleDownload);
  }, [scene, downloadGLB]);

  if (viewMode === 'Room' && selectedRoom) {
    return <RoomModel room={selectedRoom} interiorStyle={asset.interiorStyle} onBack={() => {}} />;
  }

  return (
    <BlueprintModel 
      type={asset.assetType}
      analysis={asset.aiAnalysis}
      imageUrl={asset.imageUrl}
      floorPlanUrl={asset.floorPlanUrl}
      viewMode={viewMode}
      rooms={asset.rooms}
      onRoomClick={onRoomClick}
      glbUrl={asset.glbUrl}
      asset={asset}
      onSynthesize={onSynthesize}
    />
  );
}

export function DigitalTwinView({ assetId, onBack }: DigitalTwinViewProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [selecting, setSelecting] = useState(!assetId);
  const [viewMode, setViewMode] = useState<ViewMode>('Exterior');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [synthesisProgress, setSynthesisProgress] = useState(0);
  const [synthesisStatus, setSynthesisStatus] = useState('');
  const [synthesisSteps, setSynthesisSteps] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const isSynthesizing = useRef(false);

  const downloadGLB = async (scene: THREE.Scene) => {
    if (asset?.glbUrl) {
      // If we have a direct GLB URL from fal.ai, download it directly for best quality
      try {
        setIsDownloading(true);
        const response = await fetch(asset.glbUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `digital_twin_${asset.assetId}.glb`;
        link.click();
        setIsDownloading(false);
        return;
      } catch (err) {
        console.error("Direct download failed, falling back to scene export", err);
      }
    }

    setIsDownloading(true);
    const exporter = new GLTFExporter();
    
    // Filter out helpers and non-essential objects
    const exportScene = new THREE.Scene();
    scene.children.forEach(child => {
      if (child instanceof THREE.Group || child instanceof THREE.Mesh) {
        // Only export the synthesized model parts
        if (child.name === 'synthesized-model' || child.type === 'Group') {
          exportScene.add(child.clone());
        }
      }
    });

    exporter.parse(
      scene,
      (gltf) => {
        const output = gltf instanceof ArrayBuffer ? gltf : JSON.stringify(gltf, null, 2);
        const blob = new Blob([output], { type: gltf instanceof ArrayBuffer ? 'application/octet-stream' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `digital_twin_${asset?.assetId || 'model'}.glb`;
        link.click();
        setIsDownloading(false);
      },
      (error) => {
        console.error('GLTF Export failed:', error);
        setIsDownloading(false);
      },
      { binary: true }
    );
  };

  const getBase64FromUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]); // Remove data:image/png;base64,
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const synthesize3DModel = async (assetData: Asset) => {
    if (!assetData.imageUrl || assetData.synthesisStatus === 'Completed' || isSynthesizing.current) return;

    try {
      isSynthesizing.current = true;
      setSynthesisSteps(['INITIALIZING_HIGH_FIDELITY_ENGINE', 'CONNECTING_FAL_AI_INSTANT_MESH', 'EXTRACTING_GEOMETRY_FEATURES']);
      setSynthesisStatus('Initializing Neural Engine...');
      setSynthesisProgress(5);

      // 1. Call the backend API for high-quality 3D generation (fal.ai integration)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5-minute timeout for high-fidelity generation

      const apiResponse = await fetch('/api/generate-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ 
          imageUrl: assetData.imageUrl,
          assetType: assetData.assetType 
        })
      });
      
      clearTimeout(timeoutId);
      const apiData = await apiResponse.json();
      
      if (apiData.status === 'completed' && apiData.glbUrl) {
        setSynthesisSteps(prev => [...prev, 'FAL_AI_SYNTHESIS_COMPLETE', 'ANALYZING_BUILDING_STRUCTURE']);
        setSynthesisProgress(60);
        setSynthesisStatus('Analyzing Building Design...');

        // 2. Use Gemini to analyze the image and generate a realistic floor plan + interior style
        const base64Image = await getBase64FromUrl(assetData.imageUrl);
        
        const prompt = `Analyze this building image and generate a highly detailed and realistic floor plan layout for a ${assetData.assetType}. 
        
        MANDATORY REQUIREMENTS:
        1. Identify the architectural style (Modern, Industrial, Brutalist, etc.) and describe the interior materials (e.g., "Polished concrete floors, exposed steel beams, glass partitions").
        2. Generate a floor plan with these areas:
           - Garage (Large area for vehicles)
           - Parking Lot (Exterior paved area)
           - Storage Room (Area with shelving/crates)
           - Maintenance Room (Technical area with panels)
           - Main Office (Administrative area)
        
        Provide coordinates [x, y, z] for each room within a 20x20 grid. 
        
        Return JSON format: 
        { 
          "interiorStyle": "string description",
          "rooms": [{ "id": "string", "name": "string", "position": [x, y, z], "description": "string" }] 
        }`;

        const result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ 
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: base64Image } }
            ] 
          }],
          config: { 
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                interiorStyle: { type: Type.STRING },
                rooms: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      position: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                      description: { type: Type.STRING }
                    },
                    required: ['id', 'name', 'position', 'description']
                  }
                }
              },
              required: ['rooms', 'interiorStyle']
            }
          }
        });

        const spatialData = JSON.parse(result.text);
        
        setSynthesisSteps(prev => [...prev, 'FLOOR_PLAN_SYNTHESIZED', 'INTERIOR_MAPPING_COMPLETE']);
        setSynthesisProgress(90);
        setSynthesisStatus('Finalizing Digital Twin...');

        await updateDoc(doc(db, 'assets', assetData.id), {
          synthesisStatus: 'Completed',
          glbUrl: apiData.glbUrl,
          rooms: spatialData.rooms,
          interiorStyle: spatialData.interiorStyle
        });

        setSynthesisSteps(prev => [...prev, 'SYSTEM_READY']);
        setSynthesisProgress(100);
        setSynthesisStatus('Synthesis Complete');

        setTimeout(() => {
          setSynthesisSteps([]);
          setSynthesisProgress(0);
          isSynthesizing.current = false;
        }, 2000);
        return;
      }

      throw new Error(apiData.error || "FAL_AI_GENERATION_FAILED");
    } catch (error) {
      console.error('Synthesis error:', error);
      setSynthesisStatus('Synthesis Failed');
      setSynthesisSteps(prev => [...prev, `ERROR: ${error instanceof Error ? error.message : 'ENGINE_TIMEOUT'}`]);
      
      // Update Firestore to prevent infinite retry loops
      await updateDoc(doc(db, 'assets', assetData.id), {
        synthesisStatus: 'Failed'
      });

      // Clear overlay after a delay so user can see the error
      setTimeout(() => {
        setSynthesisProgress(0);
        setSynthesisSteps([]);
        isSynthesizing.current = false;
      }, 5000);
    }
  };

  useEffect(() => {
    const unsubAll = onSnapshot(collection(db, 'assets'), (snapshot) => {
      setAllAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)));
    });
    return () => unsubAll();
  }, []);

  useEffect(() => {
    if (!assetId) {
      setAsset(null);
      setLoading(false);
      setSelecting(true);
      return;
    }

    setSelecting(false);
    setLoading(true);
    
    const unsubAsset = onSnapshot(doc(db, 'assets', assetId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Asset;
        const currentAsset = { id: docSnap.id, ...data } as Asset;
        setAsset(currentAsset);

        // Trigger synthesis if not started
        if (!data.synthesisStatus || data.synthesisStatus === 'Pending') {
          synthesize3DModel(currentAsset);
        }
      } else {
        setAsset(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching asset:", error);
      setLoading(false);
      setError("FAILED_TO_SYNC_TWIN");
    });

    const mockData: SensorData[] = [
      { id: '1', sensorId: 'S-01', twinId: assetId, dataType: 'Temperature', value: 24.5, timeStamp: new Date().toISOString() },
      { id: '2', sensorId: 'S-02', twinId: assetId, dataType: 'Humidity', value: 45, timeStamp: new Date().toISOString() },
      { id: '3', sensorId: 'S-03', twinId: assetId, dataType: 'Vibration', value: 0.02, timeStamp: new Date().toISOString() },
      { id: '4', sensorId: 'S-04', twinId: assetId, dataType: 'Usage', value: 78, timeStamp: new Date().toISOString() },
    ];
    setSensorData(mockData);

    return () => unsubAsset();
  }, [assetId]);

  if (selecting) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">DIGITAL TWIN SELECTION</h2>
          <p className="text-sm opacity-50 font-mono">Select an infrastructure node to initialize digital synchronization.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allAssets.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('select-asset', { detail: a.id }));
              }}
              className="bg-white border border-[#141414] p-6 rounded-2xl text-left hover:shadow-xl transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-black/5 rounded-lg flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                  <Cpu className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono opacity-30 uppercase">{a.assetId}</span>
              </div>
              <h4 className="font-bold text-lg">{a.assetType}</h4>
              <p className="text-xs opacity-50 mt-1">{a.location}</p>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Ready for Sync</span>
                <Maximize2 className="w-4 h-4 opacity-20 group-hover:opacity-100 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin opacity-20" />
          <p className="text-xs font-mono opacity-30 uppercase tracking-widest">Synchronizing Digital Twin...</p>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <p className="text-sm font-mono text-rose-500 uppercase tracking-widest">Error</p>
        <button onClick={onBack} className="text-xs font-bold underline">RETURN TO DASHBOARD</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Synthesis Overlay */}
      {synthesisProgress > 0 && (
        <SynthesisProgress 
          progress={synthesisProgress} 
          status={synthesisStatus} 
          steps={synthesisSteps}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-black/5 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold tracking-tighter uppercase italic">TWIN_SYNC_{asset.assetId}</h2>
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <div className="w-1.5 h-1.5 bg-emerald-500/30 rounded-full" />
              </div>
            </div>
            <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
              {asset.assetType} • {asset.location} • NEURAL_RECONSTRUCTION_ACTIVE
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={() => { setViewMode('Exterior'); setSelectedRoom(null); }}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              viewMode === 'Exterior' ? "bg-[#141414] text-white" : "bg-white border border-[#141414] text-black hover:bg-black/5"
            )}
          >
            <Home className="w-4 h-4" />
            <span>EXTERIOR</span>
          </button>
          <button 
            onClick={() => { setViewMode('FloorPlan'); setSelectedRoom(null); }}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              viewMode === 'FloorPlan' ? "bg-[#141414] text-white" : "bg-white border border-[#141414] text-black hover:bg-black/5"
            )}
          >
            <MapIcon className="w-4 h-4" />
            <span>FLOOR PLAN</span>
          </button>
          <button 
            onClick={() => synthesize3DModel(asset)}
            className="group flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-black rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            <Wand2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span>RE-SYNTHESIZE 3D</span>
          </button>
          
          <button 
            onClick={() => {
              // We'll trigger the download from the Canvas component via a custom event or state
              window.dispatchEvent(new CustomEvent('trigger-glb-download'));
            }}
            disabled={isDownloading}
            className="group flex items-center space-x-2 px-4 py-2 bg-white border border-[#141414] text-black rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-black/5 transition-all disabled:opacity-50"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isDownloading ? 'EXPORTING...' : 'DOWNLOAD .GLB'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
        {/* 3D Visualization */}
        <div className="lg:col-span-2 bg-[#141414] rounded-3xl relative overflow-hidden group border border-white/10 min-h-[400px]">
          <div className="absolute top-6 left-6 z-10 space-y-1">
            <p className="text-[10px] font-mono text-emerald-500 opacity-50 uppercase tracking-widest">Visualization Mode</p>
            <h3 className="text-white font-bold text-lg">
              {viewMode === 'Exterior' && '3D_TECHNICAL_BLUEPRINT'}
              {viewMode === 'FloorPlan' && '2D_FLOOR_PLAN_SYNC'}
              {viewMode === 'Room' && 'INTERIOR_ROOM_ANALYSIS'}
            </h3>
          </div>
          
          <div className="w-full h-full">
            {asset.synthesisStatus !== 'Completed' && (
              <SynthesisProgress progress={synthesisProgress} status={synthesisStatus} />
            )}
            <ErrorBoundary fallback={
              <div className="h-full flex flex-col items-center justify-center text-emerald-500/50">
                <AlertTriangle className="w-8 h-8 mb-2" />
                <p className="text-[10px] font-mono uppercase">3D_RENDER_ERROR</p>
              </div>
            }>
              <Canvas shadows camera={{ position: [0, 0, 10], fov: 50 }}>
                <PerspectiveCamera makeDefault position={viewMode === 'FloorPlan' ? [0, 15, 0] : [0, 0, 10]} />
                <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
                <ambientLight intensity={1} />
                <pointLight position={[10, 10, 10]} intensity={2} />
                <pointLight position={[-10, -10, -10]} intensity={1} color="#10b981" />
                
                {viewMode === 'Room' && selectedRoom ? (
                  <RoomModel room={selectedRoom} interiorStyle={asset.interiorStyle} onBack={() => { setViewMode('Exterior'); setSelectedRoom(null); }} />
                ) : (
                  <SceneWrapper 
                    asset={asset}
                    viewMode={viewMode}
                    selectedRoom={selectedRoom}
                    onRoomClick={(r: any) => { setSelectedRoom(r); setViewMode('Room'); }}
                    downloadGLB={downloadGLB}
                    onSynthesize={synthesize3DModel}
                  />
                )}
                <ContactShadows opacity={0.4} scale={20} blur={24} far={10} resolution={256} color="#000000" />
              </Canvas>
            </ErrorBoundary>
          </div>

          {/* Overlay UI */}
          <div className="absolute bottom-6 left-6 z-10 flex space-x-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3 rounded-xl">
              <p className="text-[8px] font-mono text-white/40 uppercase">STATUS</p>
              <p className="text-xs font-bold text-emerald-500">SYNCHRONIZED</p>
            </div>
            {viewMode === 'Room' && (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3 rounded-xl">
                <p className="text-[8px] font-mono text-white/40 uppercase">ROOM_ID</p>
                <p className="text-xs font-bold text-white">{selectedRoom?.id}</p>
              </div>
            )}
          </div>

          {/* Technical Mindmap Overlay */}
          {asset.aiAnalysis && viewMode !== 'Room' && (
            <div className="absolute bottom-24 right-6 z-10 max-w-[200px] space-y-4">
              <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 p-4 rounded-2xl">
                <h4 className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest mb-3 flex items-center">
                  <Sparkles className="w-3 h-3 mr-2" />
                  AI_COMPONENT_MAP
                </h4>
                <div className="space-y-2">
                  {asset.aiAnalysis.split('.').filter(s => s.trim().length > 10).slice(0, 4).map((point, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                      <p className="text-[9px] text-white/70 font-mono leading-tight uppercase">
                        {point.trim()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Telemetry & Specs */}
        <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          {/* Health Score */}
          <div className="bg-white border border-[#141414] p-6 rounded-3xl">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-xs uppercase tracking-widest">Health Analysis</h4>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-end space-x-2">
              <span className="text-5xl font-bold tracking-tighter">98</span>
              <span className="text-sm font-mono opacity-50 mb-2">/ 100</span>
            </div>
            <div className="mt-4 h-2 bg-black/5 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[98%]"></div>
            </div>
          </div>

          {/* Room List (if in Floor Plan mode) */}
          {viewMode === 'FloorPlan' && (
            <div className="bg-white border border-[#141414] p-6 rounded-3xl space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-widest">Room Registry</h4>
              <div className="space-y-2">
                {asset.rooms?.map(room => (
                  <button 
                    key={room.id}
                    onClick={() => { setSelectedRoom(room); setViewMode('Room'); }}
                    className="w-full flex items-center justify-between p-3 border border-black/5 rounded-xl hover:bg-black/5 transition-all text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span className="text-xs font-bold">{room.name}</span>
                    </div>
                    <Info className="w-3 h-3 opacity-30" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Real-time Sensors */}
          <div className="grid grid-cols-2 gap-4">
            {sensorData.map((sensor) => (
              <div key={sensor.id} className="bg-white border border-[#141414] p-4 rounded-2xl">
                <div className="flex items-center space-x-2 mb-2 opacity-50">
                  {sensor.dataType === 'Temperature' && <Thermometer className="w-3 h-3" />}
                  {sensor.dataType === 'Humidity' && <Droplets className="w-3 h-3" />}
                  <span className="text-[10px] font-mono uppercase">{sensor.dataType}</span>
                </div>
                <p className="text-xl font-bold">
                  {sensor.value}
                  <span className="text-[10px] ml-1 opacity-50">
                    {sensor.dataType === 'Temperature' ? '°C' : '%'}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

