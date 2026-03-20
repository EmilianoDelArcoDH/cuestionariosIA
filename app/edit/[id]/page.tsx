'use client';

import { QuestionnaireEditor } from '@/components/questionnaire-editor';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type QuestionnaireDetail = {
  id: number;
  title: string;
  description: string;
  questions: any[];
};

export default function EditQuestionnairePage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<QuestionnaireDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = params?.id;

    if (!id) {
      setError('No se encontro el identificador del cuestionario.');
      setLoading(false);
      return;
    }

    fetch(`/api/questionnaires/${id}`)
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || 'No se pudo cargar el cuestionario.');
        }

        return payload;
      })
      .then((payload) => {
        setData(payload);
      })
      .catch((fetchError) => {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'No se pudo cargar el cuestionario.'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params?.id]);

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-72px)] px-4 py-8 md:py-10">
        <div className="mx-auto max-w-5xl">
          <div className="glass-panel rounded-[2rem] px-6 py-5 text-sm text-[var(--muted)]">
            Cargando cuestionario...
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-[calc(100vh-72px)] px-4 py-8 md:py-10">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error || 'No se encontro el cuestionario.'}
          </div>
          <Link href="/" className="ghost-button">
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  return <QuestionnaireEditor mode="edit" initialData={data} />;
}
