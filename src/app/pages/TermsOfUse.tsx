import { Link } from 'react-router';

export default function TermsOfUse() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-800">
      <article className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm md:p-10">
        <Link to="/signup" className="text-sm font-medium text-[#D32F2F]">Voltar ao cadastro</Link>
        <h1 className="mt-6 text-3xl font-bold text-gray-900">Termos de Uso</h1>
        <p className="mt-2 text-sm text-gray-500">Versão inicial | Atualizada em 02/09/2026</p>
        <section className="mt-8 space-y-6 leading-7">
          <div><h2 className="text-xl font-semibold text-gray-900">1. Uso do serviço</h2><p>O PathFinder oferece recursos de organização, acompanhamento e segurança para pessoas responsáveis por dependentes. O serviço não substitui atendimento médico ou emergencial.</p></div>
          <div><h2 className="text-xl font-semibold text-gray-900">2. Responsabilidade do usuário</h2><p>O responsável deve manter seus dados atualizados, proteger suas credenciais e informar somente dados para os quais tenha autorização.</p></div>
          <div><h2 className="text-xl font-semibold text-gray-900">3. Alertas e emergências</h2><p>Alertas e informações exibidos pela aplicação são recursos de apoio. Em uma emergência, procure imediatamente os serviços oficiais apropriados.</p></div>
          <div><h2 className="text-xl font-semibold text-gray-900">4. Conta e encerramento</h2><p>A conta pode ser suspensa em caso de uso indevido. O titular pode solicitar o encerramento e a exclusão dos dados conforme a legislação aplicável.</p></div>
        </section>
        <p className="mt-8 border-t pt-6 text-sm text-gray-500">Este é um texto inicial de implementação e deve ser revisado pelo responsável jurídico antes da operação comercial.</p>
      </article>
    </main>
  );
}
