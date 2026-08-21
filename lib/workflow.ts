import type { CaseStatus } from './contracts';

export type WorkflowAction = 'submit' | 'provide_evidence' | 'confirm_restoration';

const transitions: Record<WorkflowAction, Partial<Record<CaseStatus, CaseStatus>>> = {
  submit: { draft: 'action_required' },
  provide_evidence: { action_required: 'funds_held' },
  confirm_restoration: { funds_held: 'partially_restored' },
};

export function transition(status: CaseStatus, action: WorkflowAction): CaseStatus | null {
  return transitions[action][status] || null;
}

export function isCompleted(status: CaseStatus) {
  return status === 'partially_restored';
}
