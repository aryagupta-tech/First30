import { CaseDetail } from '@/components/CaseDetail';
export default async function CasePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <CaseDetail id={id} />; }
