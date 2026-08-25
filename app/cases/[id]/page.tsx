import { ResponseWorkspace } from '@/components/ResponseWorkspace';
export default async function CasePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ResponseWorkspace caseId={id} />; }
