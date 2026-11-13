import { apiFetch } from '../api';
import { Users, MapPin, Bell, Battery, Plus, AlertTriangle, CheckCircle, Edit, Trash2, Upload, Cpu, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useOutletContext } from 'react-router';

type AvatarStyle = {
  skin: string;
  hair: string;
  shirt: string;
  background: string;
  hairStyle: 'short' | 'pixie' | 'curls' | 'swept' | 'long' | 'bun' | 'afro' | 'locs' | 'bald' | 'wave';
  faceShape: 'oval' | 'round' | 'angular';
  glasses: 'none' | 'round' | 'dark' | 'cat-eye';
  beard: 'none' | 'mustache' | 'full' | 'goatee';
  wrinkles: boolean;
  whiteCane?: boolean;
};

const AVATAR_STYLES: AvatarStyle[] = [
  { skin: '#C9825B', hair: '#D9D5CC', shirt: '#315B78', background: '#E7F0F5', hairStyle: 'short', faceShape: 'oval', glasses: 'round', beard: 'mustache', wrinkles: true },
  { skin: '#F0C7A5', hair: '#BDB8AE', shirt: '#557C68', background: '#EAF2EC', hairStyle: 'long', faceShape: 'round', glasses: 'none', beard: 'none', wrinkles: true, whiteCane: true },
  { skin: '#754632', hair: '#C8C4BB', shirt: '#795D8C', background: '#F0EAF4', hairStyle: 'afro', faceShape: 'angular', glasses: 'dark', beard: 'full', wrinkles: true },
  { skin: '#E6AC7D', hair: '#F1EEE6', shirt: '#A34E45', background: '#F8ECE9', hairStyle: 'pixie', faceShape: 'round', glasses: 'cat-eye', beard: 'none', wrinkles: true, whiteCane: true },
  { skin: '#9A5D3D', hair: '#D2C9B8', shirt: '#397C82', background: '#E8F2F1', hairStyle: 'bald', faceShape: 'angular', glasses: 'none', beard: 'goatee', wrinkles: true },
  { skin: '#DFAE8A', hair: '#8A8176', shirt: '#526A91', background: '#E9EDF5', hairStyle: 'swept', faceShape: 'oval', glasses: 'round', beard: 'full', wrinkles: true },
  { skin: '#593B30', hair: '#C8C0B4', shirt: '#A76942', background: '#F4ECE5', hairStyle: 'curls', faceShape: 'round', glasses: 'none', beard: 'mustache', wrinkles: true, whiteCane: true },
  { skin: '#F1C9A8', hair: '#E2DED5', shirt: '#447264', background: '#EAF1ED', hairStyle: 'bun', faceShape: 'angular', glasses: 'dark', beard: 'none', wrinkles: true },
  { skin: '#B8744F', hair: '#A29A8B', shirt: '#6B5B87', background: '#EFEBF4', hairStyle: 'bald', faceShape: 'round', glasses: 'cat-eye', beard: 'none', wrinkles: true, whiteCane: true },
  { skin: '#8B523A', hair: '#D8D2C8', shirt: '#3E708C', background: '#E8F0F5', hairStyle: 'locs', faceShape: 'angular', glasses: 'round', beard: 'full', wrinkles: true },
  { skin: '#F0C7A5', hair: '#C8C1B6', shirt: '#9C5C70', background: '#F5EAF0', hairStyle: 'wave', faceShape: 'oval', glasses: 'none', beard: 'none', wrinkles: true, whiteCane: true },
  { skin: '#A96848', hair: '#E3DDD1', shirt: '#526D5A', background: '#EBF0E9', hairStyle: 'afro', faceShape: 'round', glasses: 'dark', beard: 'goatee', wrinkles: true },
  { skin: '#D99C72', hair: '#B7B0A6', shirt: '#AD7740', background: '#F5EFE5', hairStyle: 'pixie', faceShape: 'angular', glasses: 'none', beard: 'none', wrinkles: true },
  { skin: '#684332', hair: '#D0C8BB', shirt: '#4B7188', background: '#E9F0F4', hairStyle: 'long', faceShape: 'oval', glasses: 'cat-eye', beard: 'none', wrinkles: true, whiteCane: true },
  { skin: '#F2D0B3', hair: '#F2EEE5', shirt: '#846A9B', background: '#F0ECF4', hairStyle: 'bun', faceShape: 'round', glasses: 'round', beard: 'none', wrinkles: true },
  { skin: '#9F674A', hair: '#8A8176', shirt: '#4C786D', background: '#EAF1EE', hairStyle: 'curls', faceShape: 'angular', glasses: 'none', beard: 'full', wrinkles: true, whiteCane: true },
  { skin: '#C7855E', hair: '#D6D0C5', shirt: '#A6534F', background: '#F5EAE8', hairStyle: 'swept', faceShape: 'round', glasses: 'dark', beard: 'mustache', wrinkles: true },
  { skin: '#704633', hair: '#C7C0B5', shirt: '#4F668B', background: '#EAEDF4', hairStyle: 'locs', faceShape: 'oval', glasses: 'none', beard: 'goatee', wrinkles: true, whiteCane: true },
  { skin: '#E7B58D', hair: '#E7E2D8', shirt: '#98723D', background: '#F4F0E5', hairStyle: 'wave', faceShape: 'angular', glasses: 'round', beard: 'none', wrinkles: true },
  { skin: '#B87552', hair: '#A79D8F', shirt: '#4A7A80', background: '#E8F1F1', hairStyle: 'short', faceShape: 'round', glasses: 'cat-eye', beard: 'full', wrinkles: true, whiteCane: true },
  { skin: '#F0C6A3', hair: '#D3CEC3', shirt: '#8A5D7B', background: '#F1EAF0', hairStyle: 'long', faceShape: 'oval', glasses: 'dark', beard: 'none', wrinkles: true },
];

function createAvatarDataUrl(style: AvatarStyle) {
  const hairShapes: Record<AvatarStyle['hairStyle'], string> = {
    short: '<path d="M31 54Q25 14 60 14t29 40l-12-8-3-13q-13 9-38 5l-2 13z"/>',
    pixie: '<path d="M32 55Q22 36 34 22q7-10 18-7l-5 11q13-10 30-5 15 6 11 31l-11-9-2-11q-14 9-39 7z"/>',
    curls: '<path d="M31 53Q21 44 30 34q-4-12 9-15 4-14 18-8 10-8 18 2 14-1 14 13 12 8 4 24l-9-10-5-12q-13 11-39 8z"/><g fill="none" stroke="${style.hair}" stroke-width="3"><circle cx="33" cy="28" r="6"/><circle cx="47" cy="17" r="6"/><circle cx="64" cy="15" r="6"/><circle cx="79" cy="23" r="6"/></g>',
    swept: '<path d="M30 55Q24 20 49 15q24-7 40 12l-5 9q-21-12-43-3l-1 19z"/>',
    long: '<path d="M31 54Q24 14 60 14t29 40l-11-7-3-13q-13 9-38 5l-2 13z"/>',
    bun: '<circle cx="60" cy="15" r="13" fill="${style.hair}"/><path d="M31 54Q25 22 60 22t29 32l-12-9-3-12q-13 9-38 5l-2 13z"/>',
    afro: '<path d="M28 55Q18 43 27 32q-2-14 13-18 9-15 23-8 15-6 22 8 15 5 10 21 9 11-4 21l-8-15-8-10q-14 12-42 8z"/>',
    locs: '<path d="M28 53Q23 24 43 16q23-12 42 7 10 12 5 30l-10-8-4-14q-16 11-42 8z"/><g stroke="${style.hair}" stroke-width="7" stroke-linecap="round"><path d="M34 37l-4 31m15-39-2 41m17-43v45m17-39 4 34m10-26 3 25"/></g>',
    bald: '<path d="M33 49Q31 18 60 16q29 2 27 33l-10-8-2-9q-15 8-30 0l-2 9z"/>',
    wave: '<path d="M30 55Q25 31 35 20q10-10 21 1 10-12 20-3 12 8 12 37l-10-9-3-14q-15 9-39 5z"/>',
  };
  const hairBehind = ['long', 'bun'].includes(style.hairStyle)
    ? `<path d="M31 43Q25 20 42 15v78H29zM89 43Q95 20 78 15v78h13z" fill="${style.hair}"/>`
    : '';
  const hairShape = hairShapes[style.hairStyle].replaceAll('${style.hair}', style.hair).replace('<path ', `<path fill="${style.hair}" `);
  const faceShape = {
    oval: '<path d="M35 52q0-29 25-29t25 29v12q0 25-25 25T35 64z"/>',
    round: '<path d="M33 54q0-31 27-31t27 31q0 37-27 37T33 54z"/>',
    angular: '<path d="M35 48q2-25 25-25t25 25l-3 25q-7 17-22 17T38 73z"/>',
  }[style.faceShape];
  const face = faceShape.replace('<path ', `<path fill="${style.skin}" `);
  const glasses = {
    none: '',
    round: '<g fill="#F8F4E8" fill-opacity=".38" stroke="#263B4A" stroke-width="3"><circle cx="44" cy="59" r="10"/><circle cx="76" cy="59" r="10"/><path d="M54 58h12M34 56l-5-2m57 2 5-2"/></g>',
    dark: '<g fill="#263B4A" stroke="#142632" stroke-width="2"><path d="M33 51h22l-2 13q-2 5-9 5-9 0-10-8z"/><path d="M65 51h22l-1 10q-1 8-10 8-7 0-9-5z"/><path d="M55 55h10"/></g>',
    'cat-eye': '<g fill="#F8F4E8" fill-opacity=".35" stroke="#503C55" stroke-width="3"><path d="M32 54l-4-6 25 2 2 10q-2 8-11 8-10 0-12-14z"/><path d="M66 50l25-2-4 6q-2 14-12 14-9 0-11-8z"/><path d="M55 53h11"/></g>',
  }[style.glasses];
  const beard = {
    none: '',
    mustache: '<path d="M43 73q8-8 17 0 9-8 17 0-3 8-12 5l-5-3-5 3q-9 3-12-5z" fill="${style.hair}"/>',
    full: '<path d="M37 72q8 5 15 2l8 3 8-3q7 3 15-2-2 18-23 20-21-2-23-20z" fill="${style.hair}"/>',
    goatee: '<path d="M51 78q9-6 18 0l-3 12q-6 7-12 0z" fill="${style.hair}"/>',
  }[style.beard].replaceAll('${style.hair}', style.hair);
  const wrinkles = style.wrinkles
    ? '<g fill="none" stroke="#805C4B" stroke-width="1.2" opacity=".65"><path d="M37 72l8 1m30-1 8-1M39 76l6 1m30-1 6-1M53 37h14"/></g>'
    : '';
  const eyeColor = style.glasses === 'dark' ? '#263B4A' : '#45372F';
  const cane = style.whiteCane
    ? '<path d="M98 73l13 42" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/><path d="M107 102l4 13" stroke="#D32F2F" stroke-width="5"/><circle cx="111" cy="116" r="2.5" fill="#263B4A"/>'
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="${style.background}"/><path d="M13 120c2-24 20-37 47-37s45 13 47 37" fill="${style.shirt}"/><path d="M49 76h22v19H49z" fill="${style.skin}"/>${hairBehind}${face}${hairShape}<path d="M45 61h4m24 0h4" stroke="${eyeColor}" stroke-width="2.4" stroke-linecap="round"/>${glasses}<path d="M56 71q4 3 8 0m-10 10q6 4 12 0" fill="none" stroke="#805C4B" stroke-width="1.7" stroke-linecap="round"/>${beard}${wrinkles}${cane}</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const AVATAR_OPTIONS = AVATAR_STYLES.map((style, index) => ({
  label: `Pessoa idosa, cabelo ${style.hairStyle === 'afro' ? 'crespo volumoso' : style.hairStyle === 'locs' ? 'com locs' : style.hairStyle === 'bald' ? 'calvo' : style.hairStyle === 'pixie' ? 'curto' : style.hairStyle === 'swept' ? 'penteado para o lado' : style.hairStyle === 'wave' ? 'ondulado' : style.hairStyle === 'curls' ? 'cacheado' : style.hairStyle === 'bun' ? 'preso em coque' : style.hairStyle === 'long' ? 'comprido' : 'curto'}, ${style.glasses === 'dark' ? 'com óculos escuros' : style.glasses === 'cat-eye' ? 'com óculos gatinho' : style.glasses === 'round' ? 'com óculos redondos' : 'sem óculos'}${style.beard !== 'none' ? ` e barba ${style.beard === 'full' ? 'cheia' : style.beard === 'goatee' ? 'cavanhaque' : 'bigode'}` : ''}${style.whiteCane ? ', com bengala branca' : ''}`,
  name: `Avatar ${index + 1}`,
  url: createAvatarDataUrl(style),
}));

const isFullName = (value: string) =>
  value.trim().split(/\s+/u).filter((part) => /\p{L}/u.test(part)).length >= 2;

type PhotoSelectorProps = {
  photo: string;
  onPhotoChange: (photo: string) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileLabel: string;
};

function PhotoSelector({ photo, onPhotoChange, onFileChange, fileLabel }: PhotoSelectorProps) {
  const [showAvatars, setShowAvatars] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
        <div className="relative w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-300">
          {photo ? <img src={photo} alt="Avatar selecionado para o dependente" className="w-full h-full object-cover" /> : <Upload className="w-6 h-6 text-gray-400" />}
        </div>
        <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
          {fileLabel}
          <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
        </label>
      </div>
      <div>
        <button
          type="button"
          aria-expanded={showAvatars}
          onClick={() => setShowAvatars((isOpen) => !isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <span>Escolher um avatar</span>
          {showAvatars ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showAvatars && (
          <div className="mt-3 max-h-72 overflow-y-auto pr-1">
            <div className="grid grid-cols-5 gap-2">
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar.name}
                  type="button"
                  aria-label={`${avatar.name}: ${avatar.label}`}
                  aria-pressed={photo === avatar.url}
                  onClick={() => {
                    onPhotoChange(avatar.url);
                    setShowAvatars(false);
                  }}
                  className={`rounded-full p-0.5 border-2 transition-colors ${photo === avatar.url ? 'border-[#D32F2F]' : 'border-transparent hover:border-gray-300'}`}
                >
                  <img src={avatar.url} alt="" className="w-full aspect-square rounded-full bg-gray-100" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface DependentData {
  id: string;
  name: string;
  relationship: string;
  photo: string;
  age: number;
  birthDate: string;
  gender?: string;
  cpf?: string;
  bloodType?: string;
  weight?: number;  
  height?: number;  
  allergies?: string;
  medicalNotes?: string;
  gpsStatus: 'online' | 'offline';
  batteryLevel: number;
  deviceId: string;
  lastAlert: string | null;
  alertType?: 'warning' | 'critical' | 'info';
}

interface DependenteDB {
  id: number;
  usuario_id?: number;
  nome: string;
  data_nascimento: string;
  genero?: string;
  Cpf?: string;
  tipo_sanguineo?: string;
  peso?: number;
  altura?: number;
  alergias?: string;
  observacoes_medicas?: string;
  url_foto?: string;
  id_dispositivo?: string;
  status_gps?: string;
  nivel_bateria?: number;
  medicamentos?: Array<{
    id: number;
    nome: string;
    dosagem?: string;
    horario?: string;
  }>;
}

// Funções utilitárias para converter as condições médicas do formato de String do Banco para a Lista do Frontend
function parseConditions(conditionsString?: string | null) {
  if (!conditionsString) return [];
  return conditionsString.split(/[,;]+/).map(item => {
    const match = item.match(/(.*?)\s*\((.*?)\)/); // Ex: "Diabetes (Moderada)"
    if (match) {
      return { nome: match[1].trim(), gravidade: match[2].trim() };
    }
    return { nome: item.trim(), gravidade: 'Moderada' };
  }).filter(c => c.nome !== '');
}

function stringifyConditions(conditionsArray: { nome: string; gravidade: string }[]) {
  return conditionsArray
    .filter(c => c.nome.trim() !== '')
    .map(c => `${c.nome} (${c.gravidade})`)
    .join(', ');
}

export default function Dependents() {
  const { currentUser, currentDependent, setCurrentDependent } = useOutletContext<{ currentUser: any; currentDependent: any; setCurrentDependent: (dependent: any | null) => void }>();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDependentId, setEditingDependentId] = useState<string | null>(null);
  const [dependents, setDependents] = useState<DependentData[]>([]);
  const [loading, setLoading] = useState(true);
  
 // States para Cadastro
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [genero, setGenero] = useState('');
  const [cpf, setCpf] = useState('');
  const [tipoSanguineo, setTipoSanguineo] = useState('');
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [alergias, setAlergias] = useState('');
  const [observacoesMedicasArray, setObservacoesMedicasArray] = useState<{ nome: string; gravidade: string }[]>([]);
  const [urlFoto, setUrlFoto] = useState('');
  const [idDispositivo, setIdDispositivo] = useState('');
  const [statusGps, setStatusGps] = useState<'online' | 'offline'>('online');
  const [nivelBateria, setNivelBateria] = useState(100);

  // States para Edição
  const [editNome, setEditNome] = useState('');
  const [editDataNascimento, setEditDataNascimento] = useState('');
  const [editGenero, setEditGenero] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editTipoSanguineo, setEditTipoSanguineo] = useState('');
  const [editPeso, setEditPeso] = useState('');
  const [editAltura, setEditAltura] = useState('');
  const [editAlergias, setEditAlergias] = useState('');
  const [editObservacoesMedicasArray, setEditObservacoesMedicasArray] = useState<{ nome: string; gravidade: string }[]>([]);
  const [editUrlFoto, setEditUrlFoto] = useState('');
  const [editIdDispositivo, setEditIdDispositivo] = useState('');
  const [editStatusGps, setEditStatusGps] = useState<'online' | 'offline'>('online');
  const [editNivelBateria, setEditNivelBateria] = useState(100);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  // Máscara do CPF
  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  // Máscara do ID do Dispositivo (PF-XXXX)
  const maskDeviceId = (value: string) => {
    const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!clean) return '';
    let core = clean;
    if (clean.startsWith('PF')) {
      core = clean.slice(2);
    }
    return `PF-${core.slice(0, 4)}`;
  };

  // Conversão da foto para Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem é muito grande! Escolha uma foto de até 2MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) {
          setEditUrlFoto(reader.result as string);
        } else {
          setUrlFoto(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchDependents = async () => {
    try {
      setLoading(true);

      // Se ainda não carregou o usuário do contexto, não busca nada
      if (!currentUser) {
        setDependents([]);
        return;
      }

      // Traz todo mundo do banco
      const response = await apiFetch(`${apiUrl}/api/dependentes`);
      const data: DependenteDB[] = await response.json();

      // Filtra só os dependentes do usuário logado
      const meusDependentes = data.filter((dep) => dep.usuario_id === currentUser.id);

      const mapped = meusDependentes.map((dep) => ({
        id: String(dep.id),
        name: dep.nome,
        relationship: dep.genero || dep.tipo_sanguineo || 'Dependente',
        photo: dep.url_foto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(dep.nome)}`,
        age: Math.max(0, new Date().getFullYear() - new Date(dep.data_nascimento).getFullYear()),
        birthDate: dep.data_nascimento ? new Date(dep.data_nascimento).toISOString().split('T')[0] : '',
        gender: dep.genero || '',
        cpf: dep.Cpf || '',
        bloodType: dep.tipo_sanguineo || '',
        weight: dep.peso ?? undefined,   
        height: dep.altura ?? undefined,  
        allergies: dep.alergias || '',
        medicalNotes: dep.observacoes_medicas || '',
        deviceId: dep.id_dispositivo || 'Não Vinculado',
        gpsStatus: (dep.status_gps === 'offline' ? 'offline' : 'online') as 'online' | 'offline',
        batteryLevel: dep.nivel_bateria !== undefined ? Number(dep.nivel_bateria) : 100,
        lastAlert: dep.medicamentos && dep.medicamentos.length > 0 ? `${dep.medicamentos.length} medicamentos` : null,
        alertType: 'info' as const,
      }));

      setDependents(mapped);
    } catch (err) {
      console.error('Erro ao buscar dependentes:', err);
      setDependents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependents();
  }, [currentUser]);

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFullName(nome)) {
      alert('Digite o nome completo do dependente, incluindo pelo menos nome e sobrenome.');
      return;
    }
    if (!dataNascimento) {
      alert('Por favor, preencha a Data de Nascimento.');
      return;
    }

    const parsedPeso = parseFloat(peso);
    const parsedAltura = parseFloat(altura);

    if (peso && (isNaN(parsedPeso) || parsedPeso <= 0 || parsedPeso > 300)) {
      alert('Por favor, insira um peso válido (entre 1 e 300 kg).');
      return;
    }

    if (altura && (isNaN(parsedAltura) || parsedAltura < 100 || parsedAltura > 230)) {
      alert('Por favor, insira uma altura válida (entre 100 e 230 cm).');
      return;
    }

    try {
      // 🔥 A CORREÇÃO ESTÁ AQUI: Lemos quem está logado antes de tentar usar a variável!
      const userStorage = localStorage.getItem('user');
      const usuarioLogado = userStorage ? JSON.parse(userStorage) : null;

      const response = await apiFetch(`${apiUrl}/api/dependentes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: currentUser ? currentUser.id : 1, // Envia o ID do Pedro vindo do contexto (ou 1 se falhar)
          nome: nome.trim().replace(/\s+/g, ' '),
          data_nascimento: dataNascimento,
          genero,
          Cpf: cpf,
          tipo_sanguineo: tipoSanguineo,
          peso: peso ? parseFloat(parsedPeso.toFixed(1)) : null,     
          altura: altura ? parsedAltura : null,
          alergias,
          observacoes_medicas: stringifyConditions(observacoesMedicasArray),
          url_foto: urlFoto,
          id_dispositivo: idDispositivo,
          status_gps: statusGps,
          nivel_bateria: nivelBateria
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        resetAddForm();
        await fetchDependents(); // Atualiza a lista na tela imediatamente
        window.dispatchEvent(new Event('pathfinder:dependents-changed'));
        // Se o dependente adicionado for o primeiro, ou se houver lógica para selecioná-lo,
        // o contexto do dependente atual precisaria ser atualizado aqui ou no componente pai.
        // Por simplicidade, vamos assumir que o primeiro dependente adicionado pode ser o selecionado.
        // Em um cenário real, você pode querer selecionar o dependente recém-adicionado.
        if (setCurrentDependent) {
          const newDependent = await response.json();
          // Se não houver um dependente selecionado, ou se o novo dependente for o primeiro,
          // defina-o como o dependente atual.
          if (!currentDependent || dependents.length === 0) {
            setCurrentDependent(newDependent); // Passa o objeto completo do novo dependente
          }
        }
      } else {
        const errorData = await response.json().catch(() => null);
        alert(errorData?.error || 'Erro ao cadastrar dependente');
      }
    } catch (err) {
      console.error('Erro ao cadastrar dependente:', err);
      alert('Erro de conexão ao cadastrar dependente');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDependentId) return;

    if (!isFullName(editNome)) {
      alert('Digite o nome completo do dependente, incluindo pelo menos nome e sobrenome.');
      return;
    }

    const parsedEditPeso = parseFloat(editPeso);
    const parsedEditAltura = parseFloat(editAltura);

    if (editPeso && (isNaN(parsedEditPeso) || parsedEditPeso <= 0 || parsedEditPeso > 300)) {
      alert('Por favor, insira um peso válido (entre 1 e 300 kg) para edição.');
      return;
    }

    if (editAltura && (isNaN(parsedEditAltura) || parsedEditAltura < 100 || parsedEditAltura > 230)) {
      alert('Por favor, insira uma altura válida (entre 100 e 230 cm) para edição.');
      return;
    }

    try {
      const response = await apiFetch(`${apiUrl}/api/dependentes/${editingDependentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: editNome.trim().replace(/\s+/g, ' '),
          data_nascimento: editDataNascimento,
          genero: editGenero,
          Cpf: editCpf,
          tipo_sanguineo: editTipoSanguineo,
          peso: editPeso ? parseFloat(parsedEditPeso.toFixed(1)) : null,     
          altura: editAltura ? parsedEditAltura : null,
          alergias: editAlergias,
          observacoes_medicas: stringifyConditions(editObservacoesMedicasArray),
          url_foto: editUrlFoto,
          id_dispositivo: editIdDispositivo,
          status_gps: editStatusGps,
          nivel_bateria: editNivelBateria
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        resetEditForm();
        await fetchDependents();
        window.dispatchEvent(new Event('pathfinder:dependents-changed'));
        // Se o dependente editado for o dependente atualmente selecionado no contexto,
        // atualiza o contexto para que a Ficha Médica reflita as mudanças.
        if (setCurrentDependent && editingDependentId && Number(editingDependentId) === currentDependent?.id) {
          // Não é necessário chamar response.json() novamente aqui, pois a API pode não retornar corpo em PUT.
          // Em vez disso, vamos buscar o dependente atualizado via fetchDependents para garantir que o contexto esteja com os dados mais recentes.
          const updatedDependentResponse = await apiFetch(`${apiUrl}/api/dependentes/${editingDependentId}`);
          const updatedDependent = await updatedDependentResponse.json();
          setCurrentDependent(updatedDependent); // Passa o objeto completo do dependente atualizado
        }
      } else {
        const errorData = await response.json().catch(() => null);
        alert(errorData?.error || 'Erro ao atualizar dependente');
      }
    } catch (err) {
      console.error('Erro ao atualizar dependente:', err);
      alert('Erro ao atualizar dependente');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja realmente remover este dependente?')) return;

    try {
      const response = await apiFetch(`${apiUrl}/api/dependentes/${id}`, { method: 'DELETE' });
      if (response.ok || response.status === 204) {
        setDependents((prev) => prev.filter((dep) => dep.id !== id));
        if (Number(currentDependent?.id) === Number(id)) {
          setCurrentDependent(null);
        }
        window.dispatchEvent(new Event('pathfinder:dependents-changed'));
      } else {
        const errorData = await response.json().catch(() => null);
        alert(errorData?.error || 'Erro ao remover dependente');
      }
    } catch (err) {
      console.error('Erro ao remover dependente:', err);
    }
  };

  const openEditModal = (dependent: DependentData) => {
    setEditingDependentId(dependent.id);
    setEditNome(dependent.name);
    setEditDataNascimento(dependent.birthDate);
    setEditGenero(dependent.gender ?? '');
    setEditCpf(dependent.cpf ?? '');
    setEditTipoSanguineo(dependent.bloodType ?? '');
    setEditPeso(dependent.weight !== undefined ? dependent.weight.toFixed(1) : '');   
    setEditAltura(dependent.height !== undefined ? String(dependent.height) : '');
    setEditAlergias(dependent.allergies ?? '');
    setEditObservacoesMedicasArray(parseConditions(dependent.medicalNotes));
    setEditUrlFoto(dependent.photo);
    setEditIdDispositivo(dependent.deviceId);
    setEditStatusGps(dependent.gpsStatus);
    setEditNivelBateria(dependent.batteryLevel);
    setShowEditModal(true);
  };

  const resetAddForm = () => {
    setNome('');
    setDataNascimento('');
    setGenero('');
    setCpf('');
    setTipoSanguineo('');
    setPeso('');     
    setAltura('');   
    setAlergias('');
    setObservacoesMedicasArray([]);
    setUrlFoto('');
    setIdDispositivo('');
    setStatusGps('online');
    setNivelBateria(100);
  };

  const resetEditForm = () => {
    setEditingDependentId(null);
    setEditNome('');
    setEditDataNascimento('');
    setEditGenero('');
    setEditCpf('');
    setEditTipoSanguineo('');
    setEditPeso('');     
    setEditAltura('');   
    setEditAlergias('');
    setEditObservacoesMedicasArray([]);
    setEditUrlFoto('');
    setEditIdDispositivo('');
    setEditStatusGps('online');
    setEditNivelBateria(100);
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-600 bg-green-50';
    if (level > 20) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getAlertColor = (type?: string) => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-700';
      case 'warning': return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Dependentes</h1>
          <p className="text-gray-600 text-lg">Gerencie e monitore todos os seus dependentes</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded-xl font-medium transition-colors shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Adicionar Dependente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-blue-600" />
            <p className="text-gray-600">Total de Dependentes</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{dependents.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <p className="text-gray-600">Dispositivos Ativos</p>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {dependents.filter((d) => d.gpsStatus === 'online').length}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <p className="text-gray-600">Alertas Pendentes</p>
          </div>
          <p className="text-3xl font-bold text-orange-600">
            {dependents.filter((d) => d.lastAlert).length}
          </p>
        </div>
      </div>

      {/* Grid de Dependentes */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-md h-[420px] animate-pulse border-2 border-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Mapeamento de todos os dependentes */}
          {dependents.map((dependent) => (
            <div key={dependent.id} className="bg-white rounded-xl shadow-md overflow-hidden border-2 border-gray-100 hover:border-[#FF8A65] transition-all hover:shadow-lg flex flex-col">
              <div className="relative h-32 bg-gradient-to-br from-[#D32F2F] to-[#FF8A65] flex-shrink-0">
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                  <img src={dependent.photo} alt={dependent.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg bg-white" />
                </div>
              </div>

              <div className="pt-14 p-6 flex-1 flex flex-col">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{dependent.name}</h3>
                  <p className="text-gray-600 text-sm">{dependent.relationship}</p>
                  
                  {/* Exibição estilizada do ID do Dispositivo */}
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1 font-mono">
                      <Cpu className="w-3 h-3 text-gray-500" /> {dependent.deviceId}
                    </span>
                  </div>
                </div>

                {/* Status da Bateria e GPS */}
                <div className="space-y-3 mb-auto">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">GPS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${dependent.gpsStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={`text-sm font-medium ${dependent.gpsStatus === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                        {dependent.gpsStatus === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Battery className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Bateria</span>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${getBatteryColor(dependent.batteryLevel)}`}>
                      {dependent.batteryLevel}%
                    </span>
                  </div>

                  {dependent.lastAlert && (
                    <div className={`p-3 rounded-lg border ${getAlertColor(dependent.alertType)}`}>
                      <div className="flex items-start gap-2">
                        <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Informação de Cuidados</p>
                          <p className="text-xs mt-1">{dependent.lastAlert}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button onClick={() => openEditModal(dependent)} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors">
                    <Edit className="w-4 h-4" /> Editar
                  </button>
                  <button onClick={() => handleDelete(dependent.id)} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 font-medium transition-colors">
                    <Trash2 className="w-4 h-4" /> Remover
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* O Card Pontilhado para Adicionar Novo Dependente */}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-white rounded-xl shadow-md border-2 border-dashed border-gray-300 hover:border-[#D32F2F] hover:bg-gray-50 transition-all min-h-[420px] flex flex-col items-center justify-center gap-4 p-6 group"
          >
            <div className="w-20 h-20 bg-gray-100 group-hover:bg-[#D32F2F] rounded-full flex items-center justify-center transition-colors">
              <Plus className="w-10 h-10 text-gray-400 group-hover:text-white transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 mb-1 group-hover:text-[#D32F2F] transition-colors">Adicionar Novo Dependente</p>
              <p className="text-gray-600">Cadastre um novo dependente para monitoramento</p>
            </div>
          </button>
        </div>
      )}

      {/* MODAL DE CADASTRO */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-lg">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Cadastrar Novo Dependente</h2>
                  <button onClick={() => setShowAddModal(false)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center">
                    <Plus className="w-5 h-5 text-gray-600 rotate-45" />
                  </button>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  {/* Foto - Cadastro */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Foto do Dependente</label>
                    <PhotoSelector
                      photo={urlFoto}
                      onPhotoChange={setUrlFoto}
                      onFileChange={(event) => handleFileChange(event, false)}
                      fileLabel="Selecione um arquivo"
                    />
                  </div>

                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                    <input type="text" placeholder="Ex: Maria Silva" value={nome} onChange={(e) => { setNome(e.target.value); e.currentTarget.setCustomValidity(isFullName(e.target.value) ? '' : 'Digite o nome completo, incluindo o sobrenome.'); }} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F]" required />
                  </div>

                  {/* Configurações IoT - Cadastro */}
                  <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 space-y-3">
                    <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Configurações do Dispositivo IoT</p>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">ID do Dispositivo</label>
                      <input 
                        type="text" 
                        placeholder="Ex: PF-1234" 
                        value={idDispositivo} 
                        onChange={(e) => setIdDispositivo(maskDeviceId(e.target.value))} 
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg font-mono placeholder:font-sans focus:outline-none focus:border-[#D32F2F]" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Status Inicial GPS</label>
                        <select value={statusGps} onChange={(e) => setStatusGps(e.target.value as 'online' | 'offline')} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-white focus:outline-none">
                          <option value="online">Online</option>
                          <option value="offline">Offline</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Carga da Bateria ({nivelBateria}%)</label>
                        <input type="range" min="0" max="100" value={nivelBateria} onChange={(e) => setNivelBateria(Number(e.target.value))} className="w-full accent-[#D32F2F] mt-2" />
                      </div>
                    </div>
                  </div>

                  {/* Nascimento e Gênero */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento</label>
                      <input 
                        type="date" 
                        value={dataNascimento} 
                        onChange={(e) => setDataNascimento(e.target.value)} 
                        // 🔥 Correção: Trava a data máxima no dia de hoje e a mínima em 1900
                        max={new Date().toISOString().split("T")[0]}
                        min="1910-01-01"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F]" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gênero</label>
                      <select value={genero} onChange={(e) => setGenero(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#D32F2F]">
                        <option value="">Selecione</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                  </div>

                  {/* CPF e Sangue */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CPF</label>
                      <input type="text" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Sanguíneo</label>
                      <select
                        value={tipoSanguineo}
                        onChange={(e) => setTipoSanguineo(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#D32F2F]"
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>

                  {/* Peso e Altura */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg)</label>
                      <input type="number" step="0.1" min="0" placeholder="Ex: 70" value={peso} onChange={(e) => setPeso(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Altura (cm)</label>
                      <input type="number" step="1" min="100" max="230" placeholder="Ex: 170" value={altura} onChange={(e) => setAltura(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F]" />
                    </div>
                  </div>

                  {/* Alergias */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alergias</label>
                    <input type="text" placeholder="Ex: Penicilina, Amendoim" value={alergias} onChange={(e) => setAlergias(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F]" />
                  </div>

                  {/* Condições Médicas (Observações Médicas) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Condições Médicas</label>
                      <button 
                        type="button"
                        onClick={() => setObservacoesMedicasArray([...observacoesMedicasArray, { nome: '', gravidade: 'Moderada' }])}
                        className="text-sm text-[#D32F2F] font-semibold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Adicionar Condição
                      </button>
                    </div>
                    
                    {observacoesMedicasArray.length === 0 ? (
                      <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-center">
                        Nenhuma condição médica registrada. Clique em adicionar.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {observacoesMedicasArray.map((condicao, index) => (
                          <div key={index} className="flex gap-2 items-start">
                            <input
                              type="text"
                              placeholder="Ex: Diabetes"
                              value={condicao.nome}
                              onChange={(e) => {
                                const novasCondicoes = [...observacoesMedicasArray];
                                novasCondicoes[index].nome = e.target.value;
                                setObservacoesMedicasArray(novasCondicoes);
                              }}
                              className="flex-1 border-2 border-gray-200 rounded-lg p-2 focus:outline-none focus:border-[#D32F2F]"
                            />
                            <select
                              value={condicao.gravidade}
                              onChange={(e) => {
                                const novasCondicoes = [...observacoesMedicasArray];
                                novasCondicoes[index].gravidade = e.target.value;
                                setObservacoesMedicasArray(novasCondicoes);
                              }}
                              className="w-32 border-2 border-gray-200 rounded-lg p-2 bg-white focus:outline-none focus:border-[#D32F2F]"
                            >
                              <option value="Leve">Leve</option>
                              <option value="Moderada">Moderada</option>
                              <option value="Grave">Grave</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => setObservacoesMedicasArray(observacoesMedicasArray.filter((_, i) => i !== index))}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Botões */}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">Cancelar</button>
                    <button type="submit" className="flex-1 px-6 py-3 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded-lg font-medium transition-colors">Cadastrar</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}

        {/* MODAL DE EDIÇÃO */}
        {showEditModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50" onClick={() => { setShowEditModal(false); resetEditForm(); }} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-lg">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Editar Dependente</h2>
                  <button onClick={() => { setShowEditModal(false); resetEditForm(); }} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center">
                    <Plus className="w-5 h-5 text-gray-600 rotate-45" />
                  </button>
                </div>

                <form className="space-y-4" onSubmit={handleEditSubmit}>
                  {/* Foto - Edição */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Foto do Dependente</label>
                    <PhotoSelector
                      photo={editUrlFoto}
                      onPhotoChange={setEditUrlFoto}
                      onFileChange={(event) => handleFileChange(event, true)}
                      fileLabel="Alterar foto"
                    />
                  </div>

                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                    <input type="text" value={editNome} onChange={(e) => { setEditNome(e.target.value); e.currentTarget.setCustomValidity(isFullName(e.target.value) ? '' : 'Digite o nome completo, incluindo o sobrenome.'); }} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F]" required />
                  </div>

                  {/* Configurações IoT - Edição */}
                  <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 space-y-3">
                    <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Configurações do Dispositivo IoT</p>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">ID do Dispositivo</label>
                      <input 
                        type="text" 
                        placeholder="Ex: PF-1234" 
                        value={editIdDispositivo} 
                        onChange={(e) => setEditIdDispositivo(maskDeviceId(e.target.value))} 
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg font-mono placeholder:font-sans focus:outline-none focus:border-[#D32F2F]" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Status GPS</label>
                        <select value={editStatusGps} onChange={(e) => setEditStatusGps(e.target.value as 'online' | 'offline')} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-white focus:outline-none">
                          <option value="online">Online</option>
                          <option value="offline">Offline</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Carga da Bateria ({editNivelBateria}%)</label>
                        <input type="range" min="0" max="100" value={editNivelBateria} onChange={(e) => setEditNivelBateria(Number(e.target.value))} className="w-full accent-[#D32F2F] mt-2" />
                      </div>
                    </div>
                  </div>

                  {/* Nascimento e Gênero */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento</label>
                      <input type="date" value={editDataNascimento} onChange={(e) => setEditDataNascimento(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F]" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gênero</label>
                      <select value={editGenero} onChange={(e) => setEditGenero(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#D32F2F]">
                        <option value="">Selecione</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                  </div>

                  {/* CPF e Sangue */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CPF</label>
                      <input type="text" placeholder="000.000.000-00" value={editCpf} onChange={(e) => setEditCpf(maskCPF(e.target.value))} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Sanguíneo</label>
                      <select
                        value={editTipoSanguineo}
                        onChange={(e) => setEditTipoSanguineo(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#D32F2F]"
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>

                  {/* Peso e Altura */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg)</label>
                      <input type="number" step="0.1" min="0" placeholder="Ex: 70" value={editPeso} onChange={(e) => setEditPeso(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Altura (cm)</label>
                      <input type="number" step="1" min="100" max="230" placeholder="Ex: 170" value={editAltura} onChange={(e) => setEditAltura(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F]" />
                    </div>
                  </div>

                  {/* Alergias */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alergias</label>
                    <input type="text" value={editAlergias} onChange={(e) => setEditAlergias(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F]" />
                  </div>

                  {/* Condições Médicas (Observações Médicas) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Condições Médicas</label>
                      <button 
                        type="button"
                        onClick={() => setEditObservacoesMedicasArray([...editObservacoesMedicasArray, { nome: '', gravidade: 'Moderada' }])}
                        className="text-sm text-[#D32F2F] font-semibold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Adicionar Condição
                      </button>
                    </div>
                    
                    {editObservacoesMedicasArray.length === 0 ? (
                      <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-center">
                        Nenhuma condição médica registrada. Clique em adicionar.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {editObservacoesMedicasArray.map((condicao, index) => (
                          <div key={index} className="flex gap-2 items-start">
                            <input
                              type="text"
                              placeholder="Ex: Diabetes"
                              value={condicao.nome}
                              onChange={(e) => {
                                const novasCondicoes = [...editObservacoesMedicasArray];
                                novasCondicoes[index].nome = e.target.value;
                                setEditObservacoesMedicasArray(novasCondicoes);
                              }}
                              className="flex-1 border-2 border-gray-200 rounded-lg p-2 focus:outline-none focus:border-[#D32F2F]"
                            />
                            <select
                              value={condicao.gravidade}
                              onChange={(e) => {
                                const novasCondicoes = [...editObservacoesMedicasArray];
                                novasCondicoes[index].gravidade = e.target.value;
                                setEditObservacoesMedicasArray(novasCondicoes);
                              }}
                              className="w-32 border-2 border-gray-200 rounded-lg p-2 bg-white focus:outline-none focus:border-[#D32F2F]"
                            >
                              <option value="Leve">Leve</option>
                              <option value="Moderada">Moderada</option>
                              <option value="Grave">Grave</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => setEditObservacoesMedicasArray(editObservacoesMedicasArray.filter((_, i) => i !== index))}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Botões */}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setShowEditModal(false); resetEditForm(); }} className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">Cancelar</button>
                    <button type="submit" className="flex-1 px-6 py-3 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded-lg font-medium transition-colors">Salvar Alterações</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}