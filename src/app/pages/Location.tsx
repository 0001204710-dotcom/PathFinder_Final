import { apiFetch } from '../api';
import { MapPin, Navigation, Clock, CheckCircle, Circle, Radio, Wifi, WifiOff, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Map, Marker } from 'pigeon-maps';

interface LocationRecord {
  id: number;
  endereco: string;
  latitude?: number | null;
  longitude?: number | null;
  data_hora: string;
  atual: boolean;
}

interface ArduinoLeitura {
  id: number;
  distancia: number;
  bateria: number;
  latitude: number | null;
  longitude: number | null;
  queda: boolean | number;
  sos: boolean | number;
  estado: string;
  timestamp: string;
}

export default function Location() {
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [arduino, setArduino] = useState<ArduinoLeitura | null>(null);
  const [arduinoOnline, setArduinoOnline] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Estados para localização manual
  const [manualLat, setManualLat] = useState<number | null>(null);
  const [manualLng, setManualLng] = useState<number | null>(null);

  // NOVOS ESTADOS: Para inputs de texto, busca e o endereço digitado
  const [searchQuery, setSearchQuery] = useState('');
  const [inputLat, setInputLat] = useState('');
  const [inputLng, setInputLng] = useState('');
  const [manualAddress, setManualAddress] = useState(''); // <-- NOVO: Salva o nome do lugar buscado
  const [searchError, setSearchError] = useState('');

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  useEffect(() => {
    async function loadLocations() {
      try {
        const response = await apiFetch(`${apiUrl}/api/localizacoes`);
        const data: LocationRecord[] = await response.json();
        setLocations(data);
      } catch (error) {
        console.error('Erro ao carregar localização:', error);
      } finally {
        setLoading(false);
      }
    }
    loadLocations();
  }, [apiUrl]);

  useEffect(() => {
    async function pollArduino() {
      try {
        const res = await apiFetch(`${apiUrl}/arduino/ultima`);
        if (!res.ok) { setArduinoOnline(false); return; }
        const data: ArduinoLeitura = await res.json();
        setArduino(data);
        setLastUpdate(new Date());
        const ts = new Date(data.timestamp).getTime();
        setArduinoOnline(Date.now() - ts < 10000);
      } catch {
        setArduinoOnline(false);
      }
    }
    pollArduino();
    const id = setInterval(pollArduino, 2000);
    return () => clearInterval(id);
  }, [apiUrl]);

 // FUNÇÃO DE BUSCA POR ENDEREÇO COM SUPER FILTRO DE TEXTO
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchError('');

    try {
      // FAXINA NA STRING: Limpa o formato do Google para a API não se perder
      let queryLimpa = searchQuery
        .replace(/\b[Rr]\.\s/g, 'Rua ')         // Troca "R. " por "Rua "
        .replace(/\b[Aa]v\.\s/g, 'Avenida ')    // Troca "Av. " por "Avenida "
        .replace(/-\s*[^,]+,/g, ',')            // Remove o bairro (Ex: " - Centro,") vira apenas ","
        .replace(/-\s*[A-Z]{2}.*$/, '')         // Remove estado e CEP (Ex: " - MG, 30160-040")
        .trim();

      // Se quiser ver no inspecionar elemento como a string ficou limpinha:
      console.log("Enviando para a API:", queryLimpa);

      const response = await apiFetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryLimpa)}&countrycodes=br&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const name = data[0].display_name;
        
        setManualLat(lat);
        setManualLng(lon);
        setInputLat(lat.toFixed(6));
        setInputLng(lon.toFixed(6));
        setManualAddress(name);
        
      } else {
        setSearchError('Local não encontrado. Tente digitar de forma simplificada (Ex: Rua Rio de Janeiro, 471, Belo Horizonte).');
      }
    } catch (error) {
      setSearchError('Erro ao conectar com o serviço de busca. Tente novamente.');
    }
  };
  
  // FUNÇÃO PARA ENVIAR AS COORDENADAS DIGITADAS MANUALMENTE
  const handleCoordinateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(inputLat);
    const lng = parseFloat(inputLng);

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setManualLat(lat);
      setManualLng(lng);
      setManualAddress(`Coordenadas manuais: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setSearchError('');
    } else {
      setSearchError('Coordenadas inválidas. Lat deve ser entre -90 e 90, e Lng entre -180 e 180.');
    }
  };

  const currentLocation = locations.find((l) => l.atual) || locations[0];
  const lastUpdateMinutes = currentLocation
    ? Math.max(0, Math.round((Date.now() - new Date(currentLocation.data_hora).getTime()) / 60000))
    : null;

  const hasArduinoGPS = arduino && arduinoOnline && arduino.latitude && arduino.longitude;
  const displayLat = manualLat ?? (hasArduinoGPS ? arduino!.latitude : currentLocation?.latitude);
  const displayLng = manualLng ?? (hasArduinoGPS ? arduino!.longitude : currentLocation?.longitude);
  const hasGPS = Boolean(displayLat && displayLng);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Localização</h1>
        <p className="text-gray-600 text-lg">Monitoramento de posição GPS em tempo real</p>
      </div>

      {/* Status Arduino */}
      <div className={`rounded-xl p-4 border-l-4 flex items-center justify-between gap-4 ${arduinoOnline ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-300'}`}>
        <div className="flex items-center gap-3">
          <Radio className={`w-5 h-5 ${arduinoOnline ? 'text-green-500' : 'text-gray-400'}`} />
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              Sensor Arduino —{' '}
              <span className={arduinoOnline ? 'text-green-600' : 'text-gray-400'}>
                {arduinoOnline ? 'Online' : 'Offline'}
              </span>
            </p>
            <p className="text-xs text-gray-500">
              {lastUpdate ? `Atualizado às ${lastUpdate.toLocaleTimeString('pt-BR')}` : 'Aguardando dados...'}
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${hasArduinoGPS ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
          {hasArduinoGPS ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {hasArduinoGPS ? 'GPS Ativo' : 'Sem GPS'}
        </div>
      </div>

      {/* PAINEL DE CONTROLE DE BUSCA MANUAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 rounded-2xl shadow-md border border-gray-100">
        {/* Formulário de Busca por Endereço */}
        <form onSubmit={handleSearchAddress} className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Buscar por Endereço ou Lugar</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Ex: Av. Paulista, 1000 ou Copacabana..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-24 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-500 transition-colors"
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <button
              type="submit"
              className="absolute right-2 top-1.5 bg-[#cc0000] text-white px-3 py-1 text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
            >
              Buscar
            </button>
          </div>
        </form>

        {/* Formulário para Digitar Coordenadas */}
        <form onSubmit={handleCoordinateSubmit} className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Digitar Coordenadas Diretas (Lat / Lng)</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              placeholder="Latitude (Ex: -23.561)"
              value={inputLat}
              onChange={(e) => setInputLat(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-500 text-sm"
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude (Ex: -46.656)"
              value={inputLng}
              onChange={(e) => setInputLng(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-500 text-sm"
            />
            <button
              type="submit"
              className="bg-gray-800 text-white px-4 py-2 text-sm font-bold rounded-xl hover:bg-gray-900 transition-colors"
            >
              Aplicar
            </button>
          </div>
        </form>

        {searchError && (
          <p className="text-xs font-medium text-red-600 col-span-1 md:col-span-2 mt-1">⚠️ {searchError}</p>
        )}
      </div>

      {/* Current Location Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
            <MapPin className="w-7 h-7 text-[#cc0000]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Posição Atual</h2>
            <p className="text-gray-600 text-sm">
              {manualLat ? '🎯 Posição customizada por busca/clique no painel' :
               hasArduinoGPS ? `Sensor Arduino — atualizado às ${lastUpdate?.toLocaleTimeString('pt-BR')}` : 
               currentLocation ? `Banco de dados — há ${lastUpdateMinutes} minuto${lastUpdateMinutes === 1 ? '' : 's'}` : 
               'Nenhuma localização disponível'}
            </p>
          </div>
        </div>

        {hasGPS ? (
          <div className="mb-4 overflow-hidden rounded-xl border-2 border-gray-200">
            <Map 
              height={320} 
              center={[Number(displayLat), Number(displayLng)]} 
              zoom={16}
              onClick={({ latLng }) => {
                setManualLat(latLng[0]);
                setManualLng(latLng[1]);
                setInputLat(latLng[0].toString());
                setInputLng(latLng[1].toString());
                setManualAddress(`Coordenadas clicadas: ${latLng[0].toFixed(6)}, ${latLng[1].toFixed(6)}`);
              }}
            >
              <Marker width={40} anchor={[Number(displayLat), Number(displayLng)]} color="#cc0000" />
            </Map>
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-gray-100 to-red-50 rounded-xl mb-4 relative overflow-hidden border-2 border-gray-200">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-[#D32F2F] rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(204,0,0,0.4)] animate-pulse">
                  <MapPin className="w-12 h-12 text-white" />
                </div>
                <p className="text-gray-700 font-medium text-lg">Aguardando sinal GPS</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-gray-600 text-sm mb-1">Endereço</p>
            {/* AJUSTADO: Mostra o endereço da busca real ou o do banco */}
            <p className="font-bold text-gray-900 text-sm md:text-base break-words">
              {manualLat ? manualAddress : currentLocation?.endereco ?? (hasGPS ? 'Coordenadas GPS disponíveis' : 'Nenhum endereço registrado')}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-gray-600 text-sm mb-1">Coordenadas GPS</p>
            <p className="font-bold text-gray-900 text-lg">
              {hasGPS ? `${Number(displayLat).toFixed(6)}°` : 'Sem dados'}
            </p>
            {hasGPS && <p className="font-bold text-gray-900">{Number(displayLng).toFixed(6)}°</p>}
            <p className="text-gray-600 text-sm mt-1">
              {manualLat ? '🎯 Selecionado Manualmente' : hasArduinoGPS ? '🛰️ Fonte: Sensor Arduino' : hasGPS ? 'Fonte: Banco de dados' : 'Indisponível'}
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Status Inferiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className={`w-6 h-6 ${arduinoOnline ? 'text-green-600' : 'text-gray-400'}`} />
            <h3 className="font-bold text-gray-900">Status do GPS</h3>
          </div>
          <p className={`text-2xl font-bold ${arduinoOnline ? 'text-green-600' : 'text-gray-400'}`}>{arduinoOnline ? 'Online' : 'Offline'}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Navigation className="w-6 h-6 text-blue-600" />
            <h3 className="font-bold text-gray-900">Fonte dos Dados</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600">{manualLat ? 'Manual' : hasArduinoGPS ? 'Arduino' : 'Banco'}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-[#ff914d]" />
            <h3 className="font-bold text-gray-900">Atualização</h3>
          </div>
          <p className="text-2xl font-bold text-[#ff914d]">{manualLat ? '—' : arduinoOnline ? '2s' : `${lastUpdateMinutes ?? '--'} min`}</p>
        </div>
      </div>
    </div>
  );
}