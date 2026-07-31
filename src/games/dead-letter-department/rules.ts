import type { ActiveRule, Evaluation, MessageFacts, ShiftRules } from './types';

function rule(id: string, title: string, text: string, family: ActiveRule['family'], priority: number): ActiveRule {
  return { id, title, text, family, priority };
}

export function rulesForShift(shift: number): ShiftRules {
  const rules: ActiveRule[] = [
    rule('precedence-curse', 'SEAL FIRST', 'A curse signal overrides every other destination.', 'precedence', 100),
    rule('registry-code', 'REGISTRY CODE', 'Guild and office mail must show the sender’s exact registry code.', 'registry', 60),
    rule('address-ward', 'ADDRESS WARD', 'The ward suffix must match the named destination office.', 'address', 55),
    rule('postmark-age', 'POSTMARK AGE', 'A postmark older than three nights is invalid.', 'date', 50),
    rule('deadline', 'NIGHT EXPRESS', 'A valid letter with a deadline within two nights is urgent.', 'urgency', 20),
  ];
  if (shift >= 2) {
    rules.push(rule('curse-black-wax', 'BLACK WAX', 'Black wax is a curse signal. Seal it.', 'curse', 90));
    rules.push(rule('curse-open-last', 'OPEN ME LAST', 'The phrase OPEN ME LAST is a curse signal. Seal it.', 'curse', 90));
  }
  if (shift >= 3) {
    rules.push(rule('fog-exception', 'FOG EXCEPTION', 'During fog, a violet seal is valid for Ash Ward letters.', 'exception', 70));
    rules.push(rule('seal-match', 'SEAL MATCH', 'Ash Ward medical mail normally requires an ivory seal.', 'seal', 45));
  }
  if (shift >= 4) {
    rules.push(rule('curse-self-addressed', 'THE READER', 'A letter addressed to THE READER is a curse signal. Seal it.', 'curse', 90));
    rules.push(rule('priority-stamp', 'PRIORITY STAMP', 'A priority stamp alone never makes a letter urgent.', 'urgency', 21));
  }
  if (shift >= 5) {
    rules.push(rule('curse-shadow', 'MISSING SHADOW', 'A missing-shadow anomaly is a curse signal. Seal it.', 'curse', 90));
    rules.push(rule('deadline-postage', 'PAID FOR SPEED', 'Urgent mail must show priority postage or a deadline within two nights.', 'urgency', 20));
  }
  return {
    shift,
    rules: rules.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id)),
    examples: shift < 2 ? ['A clean standard letter goes to DISPATCH.', 'A valid near deadline goes to EXPRESS.'] : ['When two red flags appear, follow SEAL FIRST.'],
  };
}

function evidence(field: string, value: unknown): { field: string; value: string } {
  return { field, value: String(value ?? '—') };
}

export function evaluateMessage(facts: MessageFacts, rules: ShiftRules): Evaluation {
  const curseEvidence: { id: string; evidence: { field: string; value: string }; explanation: string }[] = [];
  const invalidEvidence: { id: string; evidence: { field: string; value: string }; explanation: string }[] = [];
  let urgent = false;
  let urgentEvidence = evidence('deadline', facts.deliveryDeadline);
  for (const active of rules.rules) {
    switch (active.id) {
      case 'curse-black-wax':
        if (facts.seal === 'black') curseEvidence.push({ id: active.id, evidence: evidence('seal', 'BLACK WAX'), explanation: 'Black wax is listed as a curse signal.' });
        break;
      case 'curse-open-last':
        if (facts.bodyText.includes('OPEN ME LAST')) curseEvidence.push({ id: active.id, evidence: evidence('body', 'OPEN ME LAST'), explanation: 'The body contains the prohibited phrase OPEN ME LAST.' });
        break;
      case 'curse-self-addressed':
        if (facts.recipientName === 'THE READER') curseEvidence.push({ id: active.id, evidence: evidence('recipient', facts.recipientName), explanation: 'A letter addressed to THE READER must be sealed.' });
        break;
      case 'curse-shadow':
        if (facts.anomalies.includes('missing-shadow')) curseEvidence.push({ id: active.id, evidence: evidence('anomaly', 'MISSING SHADOW'), explanation: 'The envelope reports a missing-shadow anomaly.' });
        break;
      case 'registry-code':
        if (!facts.senderRegistryCode || !/^[A-Z]{3}-\d{2}$/.test(facts.senderRegistryCode)) invalidEvidence.push({ id: active.id, evidence: evidence('registry', facts.senderRegistryCode), explanation: 'The sender registry code is missing or malformed.' });
        break;
      case 'address-ward':
        if (!facts.recipientAddress.includes(officeSuffix(facts.destinationOffice))) invalidEvidence.push({ id: active.id, evidence: evidence('address', facts.recipientAddress), explanation: 'The address suffix does not match the destination office.' });
        break;
      case 'postmark-age':
        if (facts.issueDate < rules.shift - 3) invalidEvidence.push({ id: active.id, evidence: evidence('issue date', facts.issueDate), explanation: 'The postmark is older than three nights.' });
        break;
      case 'seal-match':
        if (facts.destinationOffice === 'ASH WARD' && facts.seal !== 'ivory' && !(facts.seal === 'violet' && rules.rules.some(r => r.id === 'fog-exception'))) invalidEvidence.push({ id: active.id, evidence: evidence('seal', facts.seal.toUpperCase()), explanation: 'Ash Ward requires an ivory seal outside the fog exception.' });
        break;
      case 'deadline':
      case 'deadline-postage':
        if (facts.deliveryDeadline !== null && facts.deliveryDeadline <= 2) {
          urgent = true;
          urgentEvidence = evidence('deadline', 'NIGHT ' + facts.deliveryDeadline);
        }
        break;
      case 'priority-stamp':
        break;
      default:
        break;
    }
  }
  if (curseEvidence.length) return { expected: 'seal', decisiveRuleId: curseEvidence[0].id, evidence: curseEvidence.map(item => item.evidence), explanations: curseEvidence.map(item => item.explanation) };
  if (invalidEvidence.length) return { expected: 'return', decisiveRuleId: invalidEvidence[0].id, evidence: invalidEvidence.map(item => item.evidence), explanations: invalidEvidence.map(item => item.explanation) };
  if (urgent) return { expected: 'express', decisiveRuleId: 'deadline', evidence: [urgentEvidence], explanations: ['This valid letter has a deadline within two nights.'] };
  return { expected: 'dispatch', decisiveRuleId: 'clean-mail', evidence: [evidence('status', 'ALL CHECKS PASS')], explanations: ['The letter satisfies every active authenticity rule and has no urgent deadline.'] };
}

function officeSuffix(office: string): string {
  return ({ 'FOG OFFICE': 'FOG-2', 'ASH WARD': 'ASH-9', 'NIGHT COURT': 'NIGHT-1', OBSERVATORY: 'OBS-4', 'FERRY OFFICE': 'FERRY-3', ARCHIVE: 'ARCH-6' } as Record<string, string>)[office] || office;
}
