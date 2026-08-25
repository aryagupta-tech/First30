import { FinancialFraudJourney } from '@/components/FinancialFraudJourney';
export default async function CasePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <FinancialFraudJourney caseId={id} />; }
