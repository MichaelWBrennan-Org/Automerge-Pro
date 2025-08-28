'use client';
import useSWR from 'swr';
import { MergeViewer } from '@/components/MergeViewer';

export default function MergePage({ params }: { params: { repo: string; pr: string } }) {
  const fetcher = (u: string) => fetch(u).then(r => r.json());
  const { data } = useSWR(`/api/merge/${params.repo}/${params.pr}/dry-run`, fetcher);
  return <MergeViewer data={data} />;
}

