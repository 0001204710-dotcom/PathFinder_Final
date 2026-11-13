import { Link } from 'react-router';

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-800">
      <article className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm md:p-10">
        <Link to="/signup" className="text-sm font-medium text-[#D32F2F]">Voltar ao cadastro</Link>
        <h1 className="mt-6 text-3xl font-bold text-gray-900">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-gray-500">Versão inicial | Atualizada em 02/09/2026</p>
        <section className="mt-8 space-y-6 leading-7">
          <div><h2 className="text-xl font-semibold text-gray-900">1. Dados coletados</h2><p>O PathFinder pode coletar dados de identificação, contato, dependentes, informações de saúde, medicamentos, alertas e localização, conforme as funcionalidades utilizadas.</p></div>
          <div><h2 className="text-xl font-semibold text-gray-900">2. Finalidade</h2><p>Os dados são utilizados para permitir o cadastro, o acompanhamento de dependentes, a ficha médica, os alertas e os recursos de segurança solicitados pelo responsável.</p></div>
          <div><h2 className="text-xl font-semibold text-gray-900">3. Proteção e compartilhamento</h2><p>Adotamos medidas técnicas e administrativas para proteger os dados. O compartilhamento somente ocorrerá quando necessário para prestar o serviço, cumprir obrigação legal ou mediante autorização.</p></div>
          <div><h2 className="text-xl font-semibold text-gray-900">4. Direitos do titular</h2><p>Você pode solicitar confirmação, acesso, correção, portabilidade ou exclusão dos seus dados, observadas as obrigações legais de conservação.</p></div>
          <div><h2 className="text-xl font-semibold text-gray-900">5. Contato</h2><p>Para dúvidas ou solicitações sobre privacidade, utilize o canal de atendimento informado pelo responsável pelo PathFinder.</p></div>
        </section>
        <p className="mt-8 border-t pt-6 text-sm text-gray-500">Este é um texto inicial de implementação e deve ser revisado pelo responsável jurídico antes da operação comercial.</p>
      </article>
    </main>
  );
}
