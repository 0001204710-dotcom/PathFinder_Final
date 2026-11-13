import { apiFetch } from '../api';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Download, FileText, AlertCircle, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GeneratedReport {
  id: string;
  name: string;
  date: string;
  size: string;
  type: 'Alertas' | 'Dispositivos' | 'Atividades';
  dataUrl?: string;
}

export default function AdminReports() {
  const [alertas, setAlertas] = useState<any[]>([]);
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [dependentes, setDependentes] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    const fetchData = () => {
      setLoading(true);
      Promise.all([
        apiFetch('http://localhost:4000/api/alertas').then((r) => r.json()),
        apiFetch('http://localhost:4000/api/dispositivos').then((r) => r.json()),
        apiFetch('http://localhost:4000/api/dependentes').then((r) => r.json()),
        apiFetch('http://localhost:4000/api/usuarios').then((r) => r.json())
      ])
        .then(([a, d, dep, u]) => {
          setAlertas(a || []);
          setDispositivos(d || []);
          setDependentes(dep || []);
          setUsuarios(u || []);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper para filtrar dados por período
  const filterByPeriod = (data: any[], days: number) => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return data.filter(item => {
      const itemDate = new Date(item.data_hora || item.data_criacao || item.data_nascimento || 0);
      return itemDate >= cutoff;
    });
  };

  const getPeriodDays = (period: string) => {
    return period === '7d' ? 7 : period === '30d' ? 30 : 90;
  };

  // Dispositivos online baseado em dependentes
  const dispositivosOnline = dispositivos.filter((d: any) => d.gps_online === true).length;

  const createSimplePdf = (lines: string[]) => {
    const escapePdfText = (text: string) =>
      text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/\r/g, '');

    const contentStream = lines
      .map((line, index) => {
        const y = 760 - index * 14;
        return `BT /F1 10 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
      })
      .join('\n');

    const objects: string[] = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj',
      `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj`,
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];

    objects.forEach((obj) => {
      offsets.push(pdf.length);
      pdf += obj + '\n';
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';

    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });

    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;

    return new Blob([pdf], { type: 'application/pdf' });
  };

  const generatePdfReport = (type: 'alertas' | 'dispositivos' | 'atividades') => {
    const days = getPeriodDays(selectedPeriod);
    let reportName = '';
    let data: any[] = [];
    let lines: string[] = [];

    if (type === 'alertas') {
      reportName = `Relatorio_Alertas_${selectedPeriod}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}`;
      data = filterByPeriod(alertas, days);
      lines = [
        'PATHFINDER - Relatorio de Alertas',
        `Periodo: ${selectedPeriod === '7d' ? 'Ultimos 7 dias' : selectedPeriod === '30d' ? 'Ultimos 30 dias' : 'Ultimos 90 dias'}`,
        `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`,
        '',
        `Resumo: ${data.length} alertas encontrados`,
        '',
        ...data.slice(0, 12).map((a, index) => {
          const date = a.data_hora ? new Date(a.data_hora).toLocaleString('pt-BR') : '-';
          return `${index + 1}. ${a.titulo || 'Alerta'} | ${a.status || '-'} | ${a.prioridade || '-'} | ${date}`;
        }),
      ];
    } else if (type === 'dispositivos') {
      reportName = `Relatorio_Dispositivos_${selectedPeriod}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}`;
      data = dispositivos;
      lines = [
        'PATHFINDER - Relatorio de Dispositivos',
        `Periodo: ${selectedPeriod === '7d' ? 'Ultimos 7 dias' : selectedPeriod === '30d' ? 'Ultimos 30 dias' : 'Ultimos 90 dias'}`,
        `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`,
        '',
        `Resumo: ${data.length} dispositivos cadastrados`,
        '',
        ...data.slice(0, 12).map((d, index) => {
          const status = d.gps_online ? 'Online' : 'Offline';
          return `${index + 1}. ${d.modelo || 'Dispositivo'} | ${status} | Bateria ${d.bateria || '-'}%`;
        }),
      ];
    } else {
      reportName = `Relatorio_Atividades_${selectedPeriod}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}`;
      data = filterByPeriod(usuarios, days);
      lines = [
        'PATHFINDER - Relatorio de Atividades',
        `Periodo: ${selectedPeriod === '7d' ? 'Ultimos 7 dias' : selectedPeriod === '30d' ? 'Ultimos 30 dias' : 'Ultimos 90 dias'}`,
        `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`,
        '',
        `Resumo: ${data.length} usuarios ativos`,
        '',
        ...data.slice(0, 12).map((u, index) => {
          return `${index + 1}. ${u.nome || 'Usuario'} | ${u.email || '-'} | Dependentes ${u.dependentes?.length || 0}`;
        }),
      ];
    }

    const blob = createSimplePdf(lines);
    const link = URL.createObjectURL(blob);
    const size = (blob.size / 1024).toFixed(2);

    const newReport: GeneratedReport = {
      id: `${type}_${Date.now()}`,
      name: reportName,
      date: new Date().toLocaleDateString('pt-BR'),
      size: `${size} KB`,
      type: type === 'alertas' ? 'Alertas' : type === 'dispositivos' ? 'Dispositivos' : 'Atividades',
      dataUrl: link,
    };

    setGeneratedReports((prev) => [newReport, ...prev]);
  };

  const downloadReport = (report: GeneratedReport) => {
    if (report.dataUrl) {
      const link = document.createElement('a');
      link.href = report.dataUrl;
      link.download = `${report.name}.pdf`;
      link.click();
    }
  };

  const reports = [
    { id: 1, name: 'Relatório de Atividades', description: 'Análise completa de atividades dos usuários', period: 'Customizável', type: 'atividades', icon: Activity },
    { id: 2, name: 'Relatório de Dispositivos', description: 'Status e performance dos dispositivos GPS', period: 'Tempo real', type: 'dispositivos', icon: LineChartIcon },
    { id: 3, name: 'Relatório de Alertas', description: 'Análise dos alertas gerados', period: 'Customizável', type: 'alertas', icon: AlertCircle },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Relatórios e Análises</h1>
        <p className="text-gray-600">Gere e visualize relatórios do sistema</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        {(['7d', '30d', '90d'] as const).map(period => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedPeriod === period
                ? 'bg-[#7d1f1f] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {period === '7d' ? 'Últimos 7 dias' : period === '30d' ? 'Últimos 30 dias' : 'Últimos 90 dias'}
          </button>
        ))}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Modelos de Relatórios</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <div key={report.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-[#f5e6e6] rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#7d1f1f]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">{report.name}</h3>
                    <p className="text-sm text-gray-500">{report.period}</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">{report.description}</p>
                <button 
                  onClick={() => generatePdfReport(report.type as 'alertas' | 'dispositivos' | 'atividades')}
                  className="w-full bg-[#7d1f1f] hover:bg-[#6b1919] text-white py-2.5 rounded-lg font-medium transition-colors"
                >
                  Exportar PDF
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Relatórios Gerados</h2>
        {generatedReports.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-100 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum relatório gerado ainda. Clique em "Gerar Relatório" acima para criar um.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nome do Relatório</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Data de Geração</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tipo</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tamanho</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {generatedReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{report.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600">{report.date}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          report.type === 'Alertas'
                            ? 'bg-orange-100 text-orange-700'
                            : report.type === 'Dispositivos'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {report.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600">{report.size}</p>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => downloadReport(report)}
                          className="flex items-center gap-2 text-[#7d1f1f] hover:bg-red-50 px-3 py-2 rounded-lg transition-colors font-medium"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <p className="text-gray-600 text-sm mb-2">Total de Alertas</p>
          <p className="text-3xl font-bold text-gray-900">{loading ? '—' : filterByPeriod(alertas, getPeriodDays(selectedPeriod)).length}</p>
          <p className="text-xs text-gray-500 mt-2">Período: {selectedPeriod === '7d' ? '7 dias' : selectedPeriod === '30d' ? '30 dias' : '90 dias'}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <p className="text-gray-600 text-sm mb-2">Dispositivos Online</p>
          <p className="text-3xl font-bold text-gray-900">{loading ? '—' : `${dispositivosOnline}/${dependentes.length}`}</p>
          <p className="text-xs text-gray-500 mt-2">Tempo real</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <p className="text-gray-600 text-sm mb-2">Relatórios Gerados</p>
          <p className="text-3xl font-bold text-gray-900">{generatedReports.length}</p>
          <p className="text-xs text-gray-500 mt-2">Nesta sessão</p>
        </div>
      </div>
    </div>
  );
}
